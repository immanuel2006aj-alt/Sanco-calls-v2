const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

export function showToast(message, duration = 2500) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, duration);
}

export function updateConnectionStatus(status, labelId = 'remoteLabel') {
  const el = document.getElementById(labelId);
  if (el) el.textContent = status;
}

export function updateTimer(seconds, elementId = 'callTimer') {
  let el = document.getElementById(elementId);
  if (!el) {
    el = document.createElement('span');
    el.id = elementId;
    const badge = document.querySelector('.room-code-badge');
    if (badge) badge.appendChild(document.createTextNode(' · '));
    if (badge) badge.appendChild(el);
  }
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  el.textContent = `${mins}:${secs}`;
}