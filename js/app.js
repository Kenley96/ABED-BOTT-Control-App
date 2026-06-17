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

  // ── 6. Splash Screen Animation Orchestrator ────────────────────────
  const initSplashScreen = () => {
    const splash = document.getElementById('splashScreen');
    const loaderFill = document.getElementById('splashLoaderFill');
    const terminal = document.getElementById('splashTerminal');
    if (!splash || !loaderFill || !terminal) return;

    const logs = [
      { progress: 25, text: '[BOOT] INTERFACING TCP/IP CLIENT WRAPPER...' },
      { progress: 60, text: '[BOOT] CONNECTING TO VEHICLE TELEMETRY...' },
      { progress: 100, text: '[BOOT] SYSTEM SECURED & ACTIVE.' }
    ];

    let currentLogIndex = 0;
    let progress = 0;

    const addLogLine = (text) => {
      const currentLines = terminal.querySelectorAll('.splash-term-line');
      if (currentLines.length > 0) {
        currentLines[currentLines.length - 1].className = 'splash-term-line splash-term-line--prev';
      }
      const line = document.createElement('div');
      line.className = 'splash-term-line splash-term-line--current';
      line.textContent = text;
      terminal.appendChild(line);

      const allLines = terminal.querySelectorAll('.splash-term-line');
      if (allLines.length > 2) {
        allLines[0].remove();
      }
    };

    const interval = setInterval(() => {
      // Increment progress by small random steps
      progress += Math.floor(Math.random() * 10) + 15; // 15‑25 % steps for ~20 % average
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }

      loaderFill.style.width = `${progress}%`;

      // Print scheduled log messages
      if (currentLogIndex < logs.length && progress >= logs[currentLogIndex].progress) {
        addLogLine(logs[currentLogIndex].text);
        currentLogIndex++;
      }

      // Finish sequence when 100%
      if (progress === 100) {
        setTimeout(() => {
          splash.classList.add('fade-out');
          setTimeout(() => {
            splash.style.display = 'none';
          }, 600); // Wait for transition to complete
        }, 150); // Reduced hold before fade-out
      }
    }, 20);
  };

  initSplashScreen();

  // ── 7. Service Worker Registration ───────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[Service Worker] Registered successfully:', reg.scope))
        .catch((err) => console.error('[Service Worker] Registration failed:', err));
    });
  }

  console.log('[App] ABED BOTT ready');
});
