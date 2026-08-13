import { CONFIG } from './config.js';
import { updateConnectionStatus } from './ui.js';

let reconnectAttempts = 0;
let reconnectTimer = null;

export function monitorConnection(pc, onRecover, onFail) {
  if (!pc) return;
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === 'connected') {
      updateConnectionStatus('Connected');
      reconnectAttempts = 0;
    } else if (state === 'disconnected' || state === 'failed') {
      updateConnectionStatus('Reconnecting...');
      attemptRecovery(pc, onRecover, onFail);
    }
  };
}

function attemptRecovery(pc, onRecover, onFail) {
  if (reconnectAttempts >= CONFIG.reconnectAttempts) {
    updateConnectionStatus('Connection lost');
    if (onFail) onFail();
    return;
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = CONFIG.reconnectBackoff[reconnectAttempts] || 5000;
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    try {
      pc.createOffer({ iceRestart: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (onRecover) onRecover();
        })
        .catch(() => {
          attemptRecovery(pc, onRecover, onFail);
        });
    } catch (e) {
      attemptRecovery(pc, onRecover, onFail);
    }
  }, delay);
}