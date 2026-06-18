/**
 * ui-controller.js — DOM manipulation and visual transitions
 * Pure UI functions — no business logic, no state mutation.
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Safe querySelector — returns null (and warns) if not found.
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) console.warn(`[UI] element not found: ${selector}`);
  return el;
}

/**
 * Safe querySelectorAll.
 * @param {string} selector
 * @returns {NodeListOf<HTMLElement>}
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/* ------------------------------------------------------------------ */
/*  Connection UI                                                      */
/* ------------------------------------------------------------------ */

/**
 * Update the header connection indicator and connect button.
 * @param {boolean} isConnected
 * @param {boolean} isConnecting
 */
export function updateConnectionUI(isConnected, isConnecting) {
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');

  if (!navigator.onLine) {
    statusDot.classList.remove('connected', 'connecting');
    statusDot.classList.add('disconnected');
    statusLabel.textContent = 'Offline Mode Active';
    return;
  }

  if (isConnected) {
    statusDot.classList.remove('disconnected');
    statusDot.classList.add('connected');
    statusLabel.textContent = 'Connected to Car';
  } else if (isConnecting) {
    statusDot.classList.remove('connected');
    statusDot.classList.add('connecting');
    statusLabel.textContent = 'Connecting...';
  } else {
    statusDot.classList.remove('connected', 'connecting');
    statusDot.classList.add('disconnected');
    statusLabel.textContent = 'Disconnected';
  }
}


/* ------------------------------------------------------------------ */
/*  Security gate overlay                                              */
/* ------------------------------------------------------------------ */

/**
 * Show the PIN security overlay with a fade-in.
 */
export function showSecurityGate() {
  const overlay = $('.security-overlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  // Force reflow before adding the visible class
  void overlay.offsetWidth;
  overlay.classList.add('visible');
  overlay.classList.remove('hidden');
}

/**
 * Hide the security overlay with a ripple + fade-out.
 */
export function hideSecurityGate() {
  const overlay = $('.security-overlay');
  if (!overlay) return;

  overlay.classList.add('unlock-ripple');
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');

  // Clean up after the CSS animation completes
  const onEnd = () => {
    overlay.style.display = 'none';
    overlay.classList.remove('unlock-ripple');
    overlay.removeEventListener('animationend', onEnd);
    overlay.removeEventListener('transitionend', onEnd);
  };
  overlay.addEventListener('transitionend', onEnd, { once: true });
  overlay.addEventListener('animationend', onEnd, { once: true });

  // Fallback in case events don't fire
  setTimeout(onEnd, 1000);
}

/* ------------------------------------------------------------------ */
/*  PIN display                                                        */
/* ------------------------------------------------------------------ */

/**
 * Update the PIN indicator dots.
 * @param {number} length  number of digits entered (0-6)
 */
export function updatePinDots(length) {
  const dots = $$('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < length);
  });
}

/**
 * Show an error message on the PIN screen.
 * @param {string} message
 */
export function showPinError(message) {
  const status = $('.pin-status');
  if (status) {
    status.textContent = message;
    status.className = 'pin-status error';
  }

  const keypad = $('.pin-keypad');
  if (keypad) {
    keypad.classList.add('shake');
    setTimeout(() => keypad.classList.remove('shake'), 600);
  }
}

/**
 * Show a success message on the PIN screen.
 * @param {string} message
 */
export function showPinSuccess(message) {
  const status = $('.pin-status');
  if (status) {
    status.textContent = message;
    status.className = 'pin-status success';
  }
}

/**
 * Clear PIN status text and classes.
 */
export function clearPinStatus() {
  const status = $('.pin-status');
  if (status) {
    status.textContent = '';
    status.className = 'pin-status';
  }
}

/* ------------------------------------------------------------------ */
/*  Telemetry                                                          */
/* ------------------------------------------------------------------ */

/**
 * Update dashboard telemetry displays.
 * @param {string} systemState  e.g. 'Idle', 'Driving'
 * @param {number} speed        current speed value
 */
export function updateTelemetry(systemState, speed) {
  const stateEl = $('#systemStateValue');
  const speedEl = $('#currentSpeedValue');

  if (stateEl) stateEl.textContent = systemState;
  if (speedEl) speedEl.textContent = speed;
}

/* ------------------------------------------------------------------ */
/*  Velocity slider                                                    */
/* ------------------------------------------------------------------ */

/**
 * Update the velocity slider label and track fill.
 * @param {number} percent  0–100
 * @param {number} mapped   130–255
 */
export function updateVelocityLabel(percent, mapped) {
  // Update the text value (just the number since / 255 is static in HTML)
  const label = $('#velocityMapped');
  if (label) {
    label.textContent = mapped;
  }

  // Update visual fill of custom slider track
  const fill = $('#velocityTrackFill');
  if (fill) {
    fill.style.width = `${percent}%`;
  }
}

/* ------------------------------------------------------------------ */
/*  Mode cards                                                         */
/* ------------------------------------------------------------------ */

/**
 * Toggle .active class on mode cards and update text status.
 * @param {string|null} activeMode  e.g. 'line-track', 'obstacle-avoid', or null
 */
export function updateModeCard(activeMode) {
  const cards = $$('.mode-card');
  cards.forEach(card => {
    const mode = card.dataset.mode;
    const isActive = mode === activeMode;
    card.classList.toggle('active', isActive);

    const statusText = card.querySelector('.mode-status');
    if (statusText) {
      statusText.textContent = isActive ? 'ACTIVE' : 'INACTIVE';
    }
  });

  // Also update Mode in the telemetry bar
  const telemetryMode = $('#activeModeValue');
  if (telemetryMode) {
    if (activeMode === 'human-follow') {
      telemetryMode.textContent = 'Following';
    } else if (activeMode === 'obstacle-avoid') {
      telemetryMode.textContent = 'Avoidance';
    } else {
      telemetryMode.textContent = 'Manual';
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Headlights                                                         */
/* ------------------------------------------------------------------ */

/**
 * Update the headlight toggle visual state.
 * @param {boolean} on
 */
export function updateHeadlightUI(on) {
  const checkbox = $('#headlightCheckbox');
  if (checkbox) {
    checkbox.checked = on;
  }
}

/* ------------------------------------------------------------------ */
/*  RGB LED Control                                                   */
/* ------------------------------------------------------------------ */

/**
 * Update the RGB button active classes.
 * @param {'red'|'green'|'flicker'|'off'} activeMode
 */
export function updateRgbLEDUI(activeMode) {
  const buttons = $$('.rgb-btn');
  buttons.forEach(btn => {
    const val = btn.dataset.rgb;
    btn.classList.toggle('active', val === activeMode);
  });
}
