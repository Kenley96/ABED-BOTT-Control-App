/**
 * state-manager.js — Reactive State Store
 * Uses Proxy to intercept set operations and notify subscribers.
 * Singleton export.
 */

const initialState = {
  isLocked: true,
  isConnected: false,
  isConnecting: false,
  systemState: 'Idle',
  currentSpeed: 0,
  headlightsOn: false,
  activeMode: null,
  rgbState: 'off',
  pinBuffer: '',
  pinError: false,
  pinAttempts: 0,
  connectionError: null
};

class StateManager {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();

    // Deep-copy initial state so the template stays clean
    const raw = JSON.parse(JSON.stringify(initialState));

    /** @type {typeof initialState} */
    this._state = new Proxy(raw, {
      set: (target, property, value) => {
        const key = /** @type {string} */ (property);
        const prev = target[key];

        // Only notify when the value actually changes
        if (prev === value) return true;

        target[key] = value;
        this._notify(key, value, prev);
        return true;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Subscribe to changes on a specific state key.
   * @param {string} key   — state property name
   * @param {(value: any, prev: any) => void} callback
   * @returns {() => void} unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);

    // Return an unsubscribe handle
    return () => {
      const subs = this._subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this._subscribers.delete(key);
      }
    };
  }

  /**
   * Set a single state value.
   * @param {string} key
   * @param {any}    value
   */
  setState(key, value) {
    this._state[key] = value;
  }

  /**
   * Read a state value.
   * @param {string} key
   * @returns {any}
   */
  getState(key) {
    return this._state[key];
  }

  /**
   * Batch-set multiple keys without triggering intermediate renders.
   * Subscribers still fire for every changed key.
   * @param {Partial<typeof initialState>} patch
   */
  patch(patch) {
    for (const [key, value] of Object.entries(patch)) {
      this._state[key] = value;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Notify all subscribers for a given key.
   * @param {string} key
   * @param {any}    value
   * @param {any}    prev
   */
  _notify(key, value, prev) {
    const subs = this._subscribers.get(key);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(value, prev);
      } catch (err) {
        console.error(`[StateManager] subscriber error for "${key}":`, err);
      }
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────
const stateManager = new StateManager();
export default stateManager;
