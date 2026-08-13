export const CONFIG = {
  peerjs: {
    version: '1.5.2',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  },
  media: {
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  },
  callIdLength: 8,
  reconnectAttempts: 3,
  reconnectBackoff: [1000, 3000, 8000]
};