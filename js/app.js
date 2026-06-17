/**
 * app.js — Main entry point / orchestrator
 * Imports all modules, wires state subscriptions to UI, and bootstraps the app.
 */

import stateManager  from './state-manager.js';
import socketService from './socket-service.js';
import { initSecurityGate } from './security-gate.js';
import { initAllDashboardControls } from './drive-controls.js';
import {
  updateConnectionUI,
  showSecurityGate,
  hideSecurityGate,
  updateTelemetry,
  updateHeadlightUI,
  updateModeCard,
  updateRgbLEDUI
} from './ui-controller.js';
import {
  showError,
  showSuccess,
  hideConnectionError,
  showConnectionError
} from './error-handler.js';

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] ABED BOTT initializing…');

  // ── 1. Connect button ────────────────────────────────────────────
  const connectBtn = document.querySelector('.connect-btn') ||
                     document.getElementById('connect-btn');

  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      if (socketService.isConnected) {
        socketService.disconnect();
      } else {
        socketService.connect();
      }
    });
  } else {
    console.warn('[App] connect button not found');
  }

  // ── 2. State subscriptions ───────────────────────────────────────

  // Connection status → update header UI
  stateManager.subscribe('isConnected', (connected) => {
    const connecting = stateManager.getState('isConnecting');
    updateConnectionUI(connected, connecting);

    if (connected) {
      showSuccess('Connected to PRO-ROBOT-CAR');
      hideConnectionError();

      // Show PIN gate if the app is still locked
      if (stateManager.getState('isLocked')) {
        showSecurityGate();
      }
    } else {
      updateConnectionUI(false, false);
    }
  });

  stateManager.subscribe('isConnecting', (connecting) => {
    const connected = stateManager.getState('isConnected');
    updateConnectionUI(connected, connecting);
  });

  // Unlock → hide security gate and enable dashboard
  stateManager.subscribe('isLocked', (locked) => {
    if (!locked) {
      console.log('[App] unlocked — initializing dashboard controls');
      initAllDashboardControls();
    }
  });

  // System state telemetry
  stateManager.subscribe('systemState', (state) => {
    const speed = stateManager.getState('currentSpeed');
    updateTelemetry(state, speed);
  });

  // Speed telemetry
  stateManager.subscribe('currentSpeed', (speed) => {
    const state = stateManager.getState('systemState');
    updateTelemetry(state, speed);
  });

  // Connection error
  stateManager.subscribe('connectionError', (error) => {
    if (error) {
      showConnectionError(error);
    } else {
      hideConnectionError();
    }
  });

  // Headlight state (in case changed externally)
  stateManager.subscribe('headlightsOn', (on) => {
    updateHeadlightUI(on);
  });

  // Active mode (in case changed externally)
  stateManager.subscribe('activeMode', (mode) => {
    updateModeCard(mode);
  });

  // RGB LED state (in case changed externally)
  stateManager.subscribe('rgbState', (mode) => {
    updateRgbLEDUI(mode);
  });

  // ── 3. Initialize security gate keypad ───────────────────────────
  initSecurityGate();

  // ── 4. Set initial UI state ──────────────────────────────────────
  updateConnectionUI(false, false);
  updateTelemetry('Idle', 0);

  // ── 5. Visibility change handling ────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // If we think we're connected, verify the socket is still alive
      if (stateManager.getState('isConnected') && !socketService.isConnected) {
        console.log('[App] tab became visible, socket stale — updating state');
        stateManager.patch({
          isConnected: false,
          isConnecting: false
        });
      }
    }
  });

  console.log('[App] ABED BOTT ready');
});
