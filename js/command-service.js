/**
 * command-service.js — HTTP Command translation layer
 * Translates client controls to HTTP command strings sent to ESP32 WebServer.
 */

import socketService from './socket-service.js';
import stateManager from './state-manager.js';

// Driving command byte-to-string mappings
const MOTOR_COMMANDS = {
  63: 'F',    // Forward
  65: 'B',    // Backward
  61: 'L',    // Left
  62: 'R',    // Right (Notice: firmware collision makes "R" trigger red LED instead of Turn Right)
  64: 'CCW',  // Rotate Counter-Clockwise
  66: 'CW',   // Rotate Clockwise
  60: 'STOP'  // Stop motors
};

/* ------------------------------------------------------------------ */
/*  Drive commands                                                     */
/* ------------------------------------------------------------------ */

/**
 * Send a drive command.
 * @param {number} code
 */
export function sendDriveCommand(code) {
  const cmd = MOTOR_COMMANDS[code];
  if (cmd) {
    socketService.send('move', cmd);
    stateManager.setState('systemState', 'Driving');
  }
}

/**
 * Send the STOP command.
 */
export function sendStop() {
  socketService.send('move', 'STOP');
  stateManager.patch({
    systemState: 'Idle',
    currentSpeed: 0
  });
}

/* ------------------------------------------------------------------ */
/*  Velocity                                                           */
/* ------------------------------------------------------------------ */

/**
 * Map slider percentage (0-100) to motor range (130-255) and send.
 * @param {number} percent
 */
export function sendVelocity(percent) {
  const speed = mapVelocity(percent);
  socketService.send('move', `SPD${speed}`);
  stateManager.setState('currentSpeed', speed);
}

/**
 * Map percentage to motor speed range 130-255.
 * @param {number} percent
 */
export function mapVelocity(percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round(130 + (clamped / 100) * (255 - 130));
}

/* ------------------------------------------------------------------ */
/*  PIN Validation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Send the authentication PIN to the ESP32.
 * @param {string} pin
 */
export function sendPinSuccess(pin) {
  return socketService.send('pin', pin);
}

/* ------------------------------------------------------------------ */
/*  Headlights (Mapped to Amber status LED: RG / LED_OFF)             */
/* ------------------------------------------------------------------ */

/**
 * Toggle headlight simulation.
 * @param {boolean} on
 */
export function sendToggleHeadlights(on) {
  const cmd = on ? 'RG' : 'LED_OFF';
  socketService.send('move', cmd);
  stateManager.setState('headlightsOn', on);
}

/* ------------------------------------------------------------------ */
/*  Chimes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Play a buzzer chime.
 * @param {'alpha'|'beta'} type
 */
export function sendChime(type) {
  const cmd = type === 'beta' ? 'BUZZER_B' : 'BUZZER_A';
  socketService.send('move', cmd);
}

/* ------------------------------------------------------------------ */
/*  Automation Modes                                                   */
/* ------------------------------------------------------------------ */

/**
 * Trigger Obstacle Avoidance, Human Follow, or Cancel.
 * @param {'human-follow'|'obstacle-avoid'|'cancel'|null} mode
 */
export function sendModeCommand(mode) {
  switch (mode) {
    case 'human-follow':
      socketService.send('move', 'FOLLOW');
      stateManager.patch({
        activeMode: 'human-follow',
        systemState: 'Human Following'
      });
      break;
    case 'obstacle-avoid':
      socketService.send('move', 'AVOID');
      stateManager.patch({
        activeMode: 'obstacle-avoid',
        systemState: 'Obstacle Avoidance'
      });
      break;
    case 'cancel':
    default:
      socketService.send('move', 'STOP');
      stateManager.patch({
        activeMode: null,
        systemState: 'Idle'
      });
      break;
  }
}

/* ------------------------------------------------------------------ */
/*  RGB LED Control                                                   */
/* ------------------------------------------------------------------ */

/**
 * Control the RGB status LEDs on the car.
 * @param {'red'|'green'|'flicker'|'off'} mode
 */
export function sendLedCommand(mode) {
  switch (mode) {
    case 'red':
      socketService.send('move', 'R');
      stateManager.setState('rgbState', 'red');
      break;
    case 'green':
      socketService.send('move', 'G');
      stateManager.setState('rgbState', 'green');
      break;
    case 'flicker':
      socketService.send('move', 'FLICK_1'); // Red flicker mode
      stateManager.setState('rgbState', 'flicker');
      break;
    case 'off':
    default:
      socketService.send('move', 'LED_OFF');
      stateManager.setState('rgbState', 'off');
      break;
  }
}
