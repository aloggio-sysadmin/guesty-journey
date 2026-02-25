'use strict';

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Call Claude API with a system prompt and messages array.
 * Expects Claude to return valid JSON. Retries once on parse failure.
 */
async function callClaude(systemPrompt, messages, config) {
  const client = new Anthropic({ apiKey: config.CLAUDE_API_KEY });

  const response = await client.messages.create({
    model: config.CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages
  });

  const rawText = response.content[0].text;
  return parseJsonResponse(rawText, async () => {
    // Retry once with correction request
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: rawText },
      { role: 'user', content: 'Your previous response was not valid JSON. Please respond with ONLY valid JSON, no markdown, no backticks, no preamble.' }
    ];
    const retry = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: retryMessages
    });
    return retry.content[0].text;
  });
}

/**
 * Variant for long-form responses (summaries, reports). Uses 8192 tokens.
 */
async function callClaudeForSummary(systemPrompt, messages, config) {
  const client = new Anthropic({ apiKey: config.CLAUDE_API_KEY });

  const response = await client.messages.create({
    model: config.CLAUDE_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages
  });

  const rawText = response.content[0].text;
  try {
    return parseJsonResponse(rawText, null);
  } catch (e) {
    // For summaries, if JSON fails return as plain text in a wrapper
    return { reply: stripMarkdownJson(rawText), extractions: {}, conflicts_detected: [], open_questions: [], conversation_state: {} };
  }
}

function stripMarkdownJson(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function parseJsonResponse(rawText, retryFn) {
  const cleaned = stripMarkdownJson(rawText);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    if (retryFn) {
      const retryText = await retryFn();
      const retryCleaned = stripMarkdownJson(retryText);
      try {
        return JSON.parse(retryCleaned);
      } catch (e2) {
        throw new Error('Claude returned invalid JSON after retry: ' + e2.message);
      }
    }
    throw new Error('Claude returned invalid JSON: ' + e.message + '\nRaw: ' + rawText.slice(0, 200));
  }
}

module.exports = { callClaude, callClaudeForSummary };
