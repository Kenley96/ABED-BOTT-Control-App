/**
 * socket-service.js — HTTP Client for ESP32 Smart Car
 * Manages communication over HTTP fetch requests, connection polling, and error retries.
 */

import stateManager from './state-manager.js';

const CAR_IP = '192.168.4.1';
const BASE_URL = `//${CAR_IP}`;

class SocketService {
  constructor() {
    this._pollInterval = 3000; // Poll status every 3s
    this._pollTimer = null;
    this._wasConnected = false;

    // Retry connection probe when user hits CONNECT but ESP32 isn't reachable yet
    this._connectRetryIntervalMs = 1000; // ~1s
    this._connectRetryTimer = null;
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                       */
  /* ---------------------------------------------------------------- */

  /** @returns {boolean} */
  get isConnected() {
    return stateManager.getState('isConnected');
  }

  /**
   * Connect to the ESP32.
   * Sends a lightweight probe check.
   */
  async connect() {
    stateManager.patch({
      isConnecting: true,
      connectionError: null
    });

    // Keep behavior working even if the browser is “offline” (navigator.onLine=false).
    // We still attempt direct LAN requests to 192.168.4.1.
    // Service worker also won’t intercept cross-origin requests.

    // Clear any previous retry loop (e.g. user clicked CONNECT multiple times)
    this._stopConnectRetry();

    // Start retrying probe until the ESP32 responds.
    // (First attempt happens immediately below.)
    this._connectRetryTimer = setInterval(() => {
      if (stateManager.getState('isConnected')) return;
      this._probeConnection();
    }, this._connectRetryIntervalMs);

    // Immediate first probe
    try {
      await this._probeConnection();
    } catch (err) {
      // If probe fails, _probeConnection will trigger _onError and/or keep retrying.
      console.error('[SocketService] probe connection failed:', err);
    }
  }

  /**
   * User-initiated disconnect.
   */
  disconnect() {
    this._stopPolling();
    this._stopConnectRetry();
    this._wasConnected = false;

    stateManager.patch({
      isConnected: false,
      isConnecting: false,
      connectionError: null
    });
  }

  /**
   * Send a command to the ESP32.
   * @param {string} commandType  'move' or 'pin'
   * @param {string} value        value of parameter
   */
  async send(commandType, value) {
    if (!this.isConnected && commandType !== 'pin') {
      console.warn('[SocketService] send() called while disconnected, cmd:', commandType, value);
      return;
    }

    const url = `${BASE_URL}/cmd?${commandType}=${encodeURIComponent(value)}`;
    console.log('[SocketService] Sending request:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Command failed with status ${response.status}`);
      }
      return true;
    } catch (err) {
      console.error('[SocketService] failed to send command:', err);
      // If a command fails, perform a connection health check
      this._checkConnectionHealth();
      return false;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                         */
  /* ---------------------------------------------------------------- */

  _onOpen() {
    console.log('[SocketService] connected');
    this._wasConnected = true;

    stateManager.patch({
      isConnected: true,
      isConnecting: false,
      connectionError: null
    });

    // Stop connect retry loop on success
    this._stopConnectRetry();

    this._startPolling();
  }

  _onError() {
    this._stopPolling();
    stateManager.patch({
      isConnected: false,
      isConnecting: false,
      connectionError: 'Smart Car not found. Make sure you are connected to the "SMARTCAR" Wi-Fi AP.'
    });
  }

  async _probeConnection() {
    // Send a test probe request (with a short timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${BASE_URL}/cmd`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Even if response is forbidden (403), it means the ESP32 is online!
      if (response.ok || response.status === 403) {
        this._onOpen();
      } else {
        throw new Error(`Server returned status: ${response.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[SocketService] probe connection failed:', err);
      this._onError();
      // Do not throw: retry loop (connect()) will handle further attempts.
    }
  }

  _stopConnectRetry() {
    if (this._connectRetryTimer) {
      clearInterval(this._connectRetryTimer);
      this._connectRetryTimer = null;
    }
  }

  _startPolling() {
    this._stopPolling();
    this._pollTimer = setInterval(() => this._checkConnectionHealth(), this._pollInterval);
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  async _checkConnectionHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${BASE_URL}/cmd`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 403) {
        throw new Error('Connection lost');
      }
    } catch (err) {
      console.warn('[SocketService] connection health check failed');
      this.disconnect();
      stateManager.setState('connectionError', 'Connection lost. Retrying...');
      // Reconnect automatically if previously active
      if (this._wasConnected) {
        this.connect();
      }
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────
const socketService = new SocketService();
export default socketService;
