const STEPS = [
  {
    selector: '.page-header',
    title: 'Welcome to Journey Agent',
    text: 'This is your Dashboard. It shows project completion, interview progress, and recent sessions at a glance.',
    position: 'bottom'
  },
  {
    selector: 'a.nav-item[href="#/chat/new"]',
    title: 'Start an Interview',
    text: 'Begin a new AI-guided interview session with a subject matter expert to map their part of the guest journey.',
    position: 'right'
  },
  {
    selector: 'a.nav-item[href="#/sme"]',
    title: 'SME Register',
    text: 'View and manage all identified subject matter experts. Track who has been interviewed and send interview links.',
    position: 'right'
  },
  {
    selector: 'a.nav-item[href="#/journey"]',
    title: 'Journey Map',
    text: 'Explore the guest journey across all stages — from pre-booking through post-departure.',
    position: 'right'
  },
  {
    selector: 'a.nav-item[href="#/reports"]',
    title: 'Reports',
    text: 'Generate comprehensive reports summarizing findings, gaps, and recommendations.',
    position: 'right'
  },
  {
    selector: 'a.nav-item[href="#/admin/users"]',
    title: 'User Management',
    text: 'As an admin, you can invite new users, manage roles, and control platform access.',
    position: 'right'
  }
];

const STORAGE_KEY = 'admin_walkthrough_seen';
const SPOTLIGHT_PAD = 8;
const TOOLTIP_OFFSET = 16;

let currentStep = 0;
let overlay = null;
let spotlight = null;
let tooltip = null;
let onKeyDown = null;
let onResize = null;
let onHashChange = null;
let resizeTimer = null;

export function startWalkthrough() {
  if (window.innerWidth < 768) return;
  if (localStorage.getItem(STORAGE_KEY)) return;

  currentStep = 0;
  createOverlay();
  renderStep(currentStep);

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

  tooltip = document.createElement('div');
  tooltip.className = 'walkthrough-tooltip';
  tooltip.setAttribute('role', 'dialog');

  overlay.appendChild(spotlight);
  overlay.appendChild(tooltip);
  document.body.appendChild(overlay);
}

function renderStep(index) {
  const step = STEPS[index];
  if (!step) { finish(); return; }

  const target = document.querySelector(step.selector);
  if (!target) {
    // Skip missing targets
    if (index < STEPS.length - 1) { currentStep++; renderStep(currentStep); }
    else finish();
    return;
  }

  const rect = target.getBoundingClientRect();

  // Position spotlight
  spotlight.style.left = (rect.left - SPOTLIGHT_PAD) + 'px';
  spotlight.style.top = (rect.top - SPOTLIGHT_PAD) + 'px';
  spotlight.style.width = (rect.width + SPOTLIGHT_PAD * 2) + 'px';
  spotlight.style.height = (rect.height + SPOTLIGHT_PAD * 2) + 'px';

  // Build tooltip content
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  tooltip.setAttribute('aria-label', step.title);
  tooltip.innerHTML = `
    <div class="walkthrough-title">${step.title}</div>
    <div class="walkthrough-text">${step.text}</div>
    <div class="walkthrough-footer">
      <span class="walkthrough-steps">${index + 1} of ${STEPS.length}</span>
      <div class="walkthrough-actions">
        <button class="btn btn-ghost walkthrough-skip-btn">Skip</button>
        ${!isFirst ? '<button class="btn btn-ghost walkthrough-prev-btn">Previous</button>' : ''}
        <button class="btn btn-primary walkthrough-next-btn">${isLast ? 'Finish' : 'Next'}</button>
      </div>
    </div>`;

  // Attach button handlers
  tooltip.querySelector('.walkthrough-skip-btn').addEventListener('click', finish);
  if (!isFirst) tooltip.querySelector('.walkthrough-prev-btn').addEventListener('click', prev);
  tooltip.querySelector('.walkthrough-next-btn').addEventListener('click', next);

  // Position tooltip
  positionTooltip(rect, step.position);

  // Set arrow direction class
  tooltip.className = 'walkthrough-tooltip pos-' + step.position;
  tooltip.setAttribute('role', 'dialog');
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

  // Clamp to viewport
  if (left + tw > window.innerWidth - 16) left = window.innerWidth - tw - 16;
  if (top + th > window.innerHeight - 16) top = window.innerHeight - th - 16;
  if (left < 16) left = 16;
  if (top < 16) top = 16;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function next() {
  if (currentStep < STEPS.length - 1) {
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
  localStorage.setItem(STORAGE_KEY, 'true');
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = null;
  spotlight = null;
  tooltip = null;
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('hashchange', onHashChange);
  clearTimeout(resizeTimer);
}
