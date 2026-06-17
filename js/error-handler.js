/**
 * error-handler.js — Toast notifications & haptic feedback
 */

let toastTimeout = null;
let toastElement = null;
let bannerElement = null;

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'error'|'success'} [type='error']
 * @param {number} [duration=3000]  auto-dismiss ms
 */
export function showToast(message, type = 'error', duration = 3000) {
  hideToast(); // clear any existing toast first

  toastElement = document.createElement('div');
  toastElement.className = `toast toast-${type}`;
  toastElement.setAttribute('role', 'alert');
  toastElement.textContent = message;

  const container = document.getElementById('toastContainer') || document.body;
  container.appendChild(toastElement);

  toastTimeout = setTimeout(() => hideToast(), duration);
}

/**
 * Remove the active toast immediately.
 */
export function hideToast() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  if (toastElement && toastElement.parentNode) {
    toastElement.classList.add('dismissing');
    const el = toastElement;
    // Let CSS transition finish, then remove from DOM
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
    toastElement = null;
  }
}

/**
 * Shorthand: red error toast.
 * @param {string} message
 */
export function showError(message) {
  showToast(message, 'error');
}

/**
 * Shorthand: green success toast.
 * @param {string} message
 */
export function showSuccess(message) {
  showToast(message, 'success');
}

/* ------------------------------------------------------------------ */
/*  Connection banner                                                  */
/* ------------------------------------------------------------------ */

/**
 * Show a persistent red connection-error banner below the header.
 * @param {string} [message='Connection lost — attempting to reconnect…']
 */
export function showConnectionError(message = 'Connection lost — attempting to reconnect…') {
  hideConnectionError();

  bannerElement = document.createElement('div');
  bannerElement.className = 'connection-banner connection-banner--error';
  bannerElement.setAttribute('role', 'alert');
  bannerElement.textContent = message;

  const header = document.querySelector('.app-header') || document.querySelector('header');
  if (header && header.nextSibling) {
    header.parentNode.insertBefore(bannerElement, header.nextSibling);
  } else {
    document.body.prepend(bannerElement);
  }

  void bannerElement.offsetWidth;
  bannerElement.classList.add('connection-banner--visible');
}

/**
 * Remove the connection error banner.
 */
export function hideConnectionError() {
  if (bannerElement && bannerElement.parentNode) {
    bannerElement.parentNode.removeChild(bannerElement);
    bannerElement = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Haptic                                                             */
/* ------------------------------------------------------------------ */

/**
 * Trigger device vibration if supported.
 * @param {number|number[]} [pattern=[100]]  vibration pattern in ms
 */
export function triggerHaptic(pattern = [100]) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      // silently ignore on unsupported platforms
    }
  }
}

/**
 * Clear any active error displays (toast + banner).
 */
export function clearError() {
  hideToast();
  hideConnectionError();
}
