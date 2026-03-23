const SPOTLIGHT_PAD = 8;
const TOOLTIP_OFFSET = 16;

let activeTourName = null;
let currentStep = 0;
let currentSteps = [];
let overlay = null;
let spotlight = null;
let tooltip = null;
let onKeyDown = null;
let onResize = null;
let onHashChange = null;
let resizeTimer = null;

/**
 * Start a named guided tour for a given set of steps.
 * Only triggers if the tour has not been seen yet (tracked via localStorage).
 *
 * @param {string} name    - Unique tour identifier, used as localStorage key suffix
 * @param {Array}  steps   - Array of { selector, title, text, position } objects
 */
export function startTour(name, steps) {
  if (window.innerWidth < 768) return;
  if (localStorage.getItem('tour_seen_' + name)) return;

  activeTourName = name;
  currentStep = 0;
  currentSteps = steps;
  createOverlay();
  renderStep(0);

  onKeyDown = (e) => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  };
  onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderStep(currentStep), 100);
  };
  onHashChange = () => finish();

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  window.addEventListener('hashchange', onHashChange);
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'walkthrough-overlay';

  spotlight = document.createElement('div');
  spotlight.id = 'walkthrough-spotlight';
  spotlight.setAttribute('aria-hidden', 'true');

  tooltip = document.createElement('div');
  tooltip.className = 'walkthrough-tooltip';
  tooltip.setAttribute('role', 'dialog');

  overlay.appendChild(spotlight);
  overlay.appendChild(tooltip);
  document.body.appendChild(overlay);
}

function renderStep(index) {
  const steps = currentSteps;
  const step = steps[index];
  if (!step) { finish(); return; }

  const target = document.querySelector(step.selector);
  if (!target) {
    if (index < steps.length - 1) { currentStep++; renderStep(currentStep); }
    else finish();
    return;
  }

  const rect = target.getBoundingClientRect();

  spotlight.style.left = (rect.left - SPOTLIGHT_PAD) + 'px';
  spotlight.style.top = (rect.top - SPOTLIGHT_PAD) + 'px';
  spotlight.style.width = (rect.width + SPOTLIGHT_PAD * 2) + 'px';
  spotlight.style.height = (rect.height + SPOTLIGHT_PAD * 2) + 'px';

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  tooltip.setAttribute('aria-label', step.title);
  tooltip.innerHTML = `
    <div class="walkthrough-title">${step.title}</div>
    <div class="walkthrough-text">${step.text}</div>
    <div class="walkthrough-footer">
      <span class="walkthrough-steps">${index + 1} of ${steps.length}</span>
      <div class="walkthrough-actions">
        <button class="btn btn-ghost walkthrough-skip-btn">Skip</button>
        ${!isFirst ? '<button class="btn btn-ghost walkthrough-prev-btn">Previous</button>' : ''}
        <button class="btn btn-primary walkthrough-next-btn">${isLast ? 'Finish' : 'Next'}</button>
      </div>
    </div>`;

  tooltip.querySelector('.walkthrough-skip-btn').addEventListener('click', finish);
  if (!isFirst) tooltip.querySelector('.walkthrough-prev-btn').addEventListener('click', prev);
  tooltip.querySelector('.walkthrough-next-btn').addEventListener('click', next);

  tooltip.className = 'walkthrough-tooltip pos-' + (step.position || 'right');
  tooltip.setAttribute('role', 'dialog');

  positionTooltip(rect, step.position || 'right');
}

function positionTooltip(rect, position) {
  const tooltipRect = tooltip.getBoundingClientRect();
  const tw = tooltipRect.width || 340;
  const th = tooltipRect.height || 200;
  let left, top;

  switch (position) {
    case 'right':
      left = rect.right + SPOTLIGHT_PAD + TOOLTIP_OFFSET;
      top = rect.top - SPOTLIGHT_PAD;
      break;
    case 'bottom':
      left = rect.left - SPOTLIGHT_PAD;
      top = rect.bottom + SPOTLIGHT_PAD + TOOLTIP_OFFSET;
      break;
    case 'left':
      left = rect.left - SPOTLIGHT_PAD - TOOLTIP_OFFSET - tw;
      top = rect.top - SPOTLIGHT_PAD;
      break;
    case 'top':
      left = rect.left - SPOTLIGHT_PAD;
      top = rect.top - SPOTLIGHT_PAD - TOOLTIP_OFFSET - th;
      break;
    default:
      left = rect.right + SPOTLIGHT_PAD + TOOLTIP_OFFSET;
      top = rect.top - SPOTLIGHT_PAD;
  }

  if (left + tw > window.innerWidth - 16) left = window.innerWidth - tw - 16;
  if (top + th > window.innerHeight - 16) top = window.innerHeight - th - 16;
  if (left < 16) left = 16;
  if (top < 16) top = 16;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function next() {
  if (currentStep < currentSteps.length - 1) {
    currentStep++;
    renderStep(currentStep);
  } else {
    finish();
  }
}

function prev() {
  if (currentStep > 0) {
    currentStep--;
    renderStep(currentStep);
  }
}

function finish() {
  if (activeTourName) localStorage.setItem('tour_seen_' + activeTourName, 'true');
  activeTourName = null;
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = null;
  spotlight = null;
  tooltip = null;
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('hashchange', onHashChange);
  clearTimeout(resizeTimer);
}
