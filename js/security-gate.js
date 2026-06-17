/**
 * security-gate.js — PIN authentication logic
 * Handles digit input, validation, lockout, and unlock transition.
 */

import stateManager    from './state-manager.js';
import { sendPinSuccess } from './command-service.js';
import { triggerHaptic }  from './error-handler.js';
import {
  updatePinDots,
  showPinError,
  showPinSuccess,
  clearPinStatus,
  hideSecurityGate
} from './ui-controller.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CORRECT_PIN    = '1234';
const MAX_ATTEMPTS   = 5;
const PIN_MAX_LENGTH = 4;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function _getBuffer() {
  return stateManager.getState('pinBuffer');
}

function _setBuffer(val) {
  stateManager.setState('pinBuffer', val);
  updatePinDots(val.length);
}

function _isLockedOut() {
  return stateManager.getState('pinAttempts') >= MAX_ATTEMPTS;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Append a digit to the PIN buffer.
 * @param {string} digit  single character '0'-'9'
 */
export function handleDigitPress(digit) {
  if (_isLockedOut()) return;

  const buf = _getBuffer();
  if (buf.length >= PIN_MAX_LENGTH) return;

  // Clear any previous error message when user starts typing again
  if (stateManager.getState('pinError')) {
    stateManager.setState('pinError', false);
    clearPinStatus();
  }

  _setBuffer(buf + digit);
}

/**
 * Remove the last digit from the PIN buffer.
 */
export function handleBackspace() {
  if (_isLockedOut()) return;

  const buf = _getBuffer();
  if (buf.length === 0) return;

  _setBuffer(buf.slice(0, -1));
}

/**
 * Validate the entered PIN.
 */
export function handleSubmit() {
  if (_isLockedOut()) return;

  const buf = _getBuffer();

  if (buf === CORRECT_PIN) {
    _onSuccess();
  } else {
    _onFailure();
  }
}

/**
 * Reset the PIN buffer and error state.
 */
export function resetPin() {
  _setBuffer('');
  stateManager.setState('pinError', false);
  clearPinStatus();
}

/* ------------------------------------------------------------------ */
/*  Success / Failure flows                                            */
/* ------------------------------------------------------------------ */

function _onSuccess() {
  showPinSuccess('ACCESS GRANTED');
  triggerHaptic([50, 50, 50]);

  // Send the PIN to the car for HTTP authorization
  const buf = _getBuffer();
  sendPinSuccess(buf);

  // Wait a beat, then unlock
  setTimeout(() => {
    hideSecurityGate();
    stateManager.setState('isLocked', false);
    stateManager.setState('pinBuffer', '');
  }, 1000);
}

function _onFailure() {
  const attempts = stateManager.getState('pinAttempts') + 1;
  stateManager.setState('pinAttempts', attempts);
  stateManager.setState('pinError', true);

  triggerHaptic([200, 100, 200]);

  if (attempts >= MAX_ATTEMPTS) {
    showPinError('SYSTEM LOCKED — Too many attempts');
    _disableKeypad();
  } else {
    const remaining = MAX_ATTEMPTS - attempts;
    showPinError(`ACCESS DENIED — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
  }

  // Clear the buffer after a short delay so the user sees all dots filled briefly
  setTimeout(() => {
    _setBuffer('');
  }, 400);
}

/**
 * Visually disable the keypad after max attempts.
 */
function _disableKeypad() {
  const keypad = document.querySelector('.pin-keypad');
  if (keypad) keypad.classList.add('locked-out');

  document.querySelectorAll('.pin-key').forEach(key => {
    key.setAttribute('disabled', 'true');
    key.style.pointerEvents = 'none';
  });
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

/**
 * Attach click handlers to the PIN keypad buttons.
 * Expects buttons with class `.pin-key` and `data-key` attribute:
 *   data-key="0"-"9"  → digit
 *   data-key="back"   → backspace
 *   data-key="enter"  → submit
 */
export function initSecurityGate() {
  const keys = document.querySelectorAll('.pin-key');

  if (keys.length === 0) {
    console.warn('[SecurityGate] no .pin-key elements found');
    return;
  }

  keys.forEach(key => {
    key.addEventListener('click', (e) => {
      e.preventDefault();
      const val = key.dataset.key;

      if (val === 'backspace' || val === 'back') {
        handleBackspace();
      } else if (val === 'submit' || val === 'enter') {
        handleSubmit();
      } else if (/^[0-9]$/.test(val)) {
        handleDigitPress(val);
      }
    });

    // Prevent long-press context menu on mobile
    key.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // Initialize dot display
  updatePinDots(0);
}
