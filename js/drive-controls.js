/**
 * drive-controls.js — Dashboard control handlers
 * Sets up pointer events for driving, velocity slider, mode cards, and hardware controls.
 */

import stateManager from './state-manager.js';
import {
  sendDriveCommand,
  sendStop,
  sendVelocity,
  sendModeCommand,
  sendToggleHeadlights,
  sendChime,
  sendLedCommand,
  mapVelocity,
  COMMANDS
} from './command-service.js';
import { updateVelocityLabel, updateModeCard, updateHeadlightUI, updateRgbLEDUI } from './ui-controller.js';
import { showError } from './error-handler.js';

/* ------------------------------------------------------------------ */
/*  Guard: require connection before acting                            */
/* ------------------------------------------------------------------ */

function requireConnection() {
  if (!stateManager.getState('isConnected')) {
    showError('Not connected — press CONNECT first');
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Drive buttons (hex directional pad)                                */
/* ------------------------------------------------------------------ */

/**
 * Attach pointer events to hex drive buttons.
 * Each `.hex-btn[data-command]` sends a drive command on press
 * and STOP on release.
 */
export function initDriveControls() {
  const buttons = document.querySelectorAll('.hex-btn[data-command]');

  if (buttons.length === 0) {
    console.warn('[DriveControls] no .hex-btn[data-command] elements found');
    return;
  }

  buttons.forEach(btn => {
    const commandCode = parseInt(btn.dataset.command, 10);

    if (Number.isNaN(commandCode)) {
      console.warn(`[DriveControls] invalid command code on button`, btn);
      return;
    }

    // ── Press → send command ────────────────────────────────────────
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!requireConnection()) return;
      sendDriveCommand(commandCode);
      btn.classList.add('active');
    });

    // ── Release → send STOP ─────────────────────────────────────────
    const release = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (stateManager.getState('isConnected')) {
        sendStop();
      }
    };

    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);

    // Prevent context menu on long-press (mobile)
    btn.addEventListener('contextmenu', (e) => e.preventDefault());

    // Prevent ghost clicks / double-tap zoom
    btn.style.touchAction = 'none';
  });
}

/* ------------------------------------------------------------------ */
/*  Velocity slider                                                    */
/* ------------------------------------------------------------------ */

/**
 * Initialize the velocity slider control.
 * - `input` event  → live display update
 * - `change` event → actually send to car
 */
export function initVelocitySlider() {
  const slider = document.getElementById('velocity-slider') ||
                 document.querySelector('.velocity-slider');

  if (!slider) {
    console.warn('[DriveControls] velocity slider not found');
    return;
  }

  // Set initial position to 50%
  slider.value = 50;
  const initMapped = mapVelocity(50);
  updateVelocityLabel(50, initMapped);
  stateManager.setState('currentSpeed', initMapped);

  // Live preview as user drags
  slider.addEventListener('input', () => {
    const percent = parseInt(slider.value, 10);
    const mapped  = mapVelocity(percent);
    updateVelocityLabel(percent, mapped);
    stateManager.setState('currentSpeed', mapped);
  });

  // Send on release
  slider.addEventListener('change', () => {
    if (!requireConnection()) return;
    const percent = parseInt(slider.value, 10);
    sendVelocity(percent);
  });
}

/* ------------------------------------------------------------------ */
/*  Mode cards (Line Track, Obstacle Avoid, Cancel)                    */
/* ------------------------------------------------------------------ */

/**
 * Initialize autonomous-mode card click handlers.
 * `.mode-card[data-mode]` toggles the mode on/off.
 */
export function initModeControls() {
  const cards = document.querySelectorAll('.mode-card[data-mode]');

  if (cards.length === 0) {
    console.warn('[DriveControls] no .mode-card[data-mode] elements found');
    return;
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (!requireConnection()) return;

      const mode = card.dataset.mode;
      const current = stateManager.getState('activeMode');

      if (mode === 'cancel') {
        // Cancel always deactivates
        sendModeCommand('cancel');
        updateModeCard(null);
      } else if (current === mode) {
        // Clicking active mode deactivates it
        sendModeCommand('cancel');
        updateModeCard(null);
      } else {
        // Activate the chosen mode
        sendModeCommand(mode);
        updateModeCard(mode);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Hardware controls (headlights + chimes)                            */
/* ------------------------------------------------------------------ */

/**
 * Initialize headlight toggle and chime buttons.
 */
export function initHardwareControls() {
  // ── Headlight toggle ──────────────────────────────────────────────
  const headlightToggle = document.getElementById('headlightCheckbox');

  if (headlightToggle) {
    headlightToggle.addEventListener('change', () => {
      if (!requireConnection()) {
        // Revert the toggle if not connected
        headlightToggle.checked = stateManager.getState('headlightsOn');
        return;
      }
      const on = headlightToggle.checked;
      sendToggleHeadlights(on);
      updateHeadlightUI(on);
    });
  } else {
    console.warn('[DriveControls] headlight toggle checkbox not found');
  }

  // ── Chime buttons ─────────────────────────────────────────────────
  const chimeButtons = document.querySelectorAll('.chime-btn[data-chime]');

  chimeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!requireConnection()) return;

      const type = btn.dataset.chime; // 'alpha' or 'beta'
      sendChime(type);

      // Visual ripple feedback
      btn.classList.add('ripple');
      btn.addEventListener('animationend', () => {
        btn.classList.remove('ripple');
      }, { once: true });
    });

    // Prevent context menu
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

/* ------------------------------------------------------------------ */
/*  RGB LED Control                                                   */
/* ------------------------------------------------------------------ */

/**
 * Initialize RGB LED buttons click handlers.
 */
export function initRgbControls() {
  const buttons = document.querySelectorAll('.rgb-btn[data-rgb]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!requireConnection()) return;
      const mode = btn.dataset.rgb;
      sendLedCommand(mode);
      updateRgbLEDUI(mode);
    });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

/* ------------------------------------------------------------------ */
/*  Convenience: init all dashboard controls at once                   */
/* ------------------------------------------------------------------ */

/**
 * Initialize every dashboard control group.
 */
export function initAllDashboardControls() {
  initDriveControls();
  initVelocitySlider();
  initModeControls();
  initHardwareControls();
  initRgbControls();
}
