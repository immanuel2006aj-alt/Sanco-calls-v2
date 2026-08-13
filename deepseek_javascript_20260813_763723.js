import { CONFIG } from './config.js';
import { generateCallId, validateCallId, normalizeCallId } from './utils.js';
import { 
  getLocalMedia, getLocalStream, toggleAudio, toggleVideo, 
  replaceVideoTrack, createGhostStream, stopGhostStream 
} from './media.js';
import { enumerateDevices, switchCamera, getVideoDevices } from './devices.js';
import { createCall, joinCall, endCall } from './call.js';
import { cleanupCall } from './cleanup.js';
import { showToast, updateConnectionStatus, updateTimer } from './ui.js';

let callTimer = null;
let callSeconds = 0;
let isGhostMode = false;
let ghostStream = null;

export async function initCall() {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  const role = urlParams.get('role');

  if (!room || !role || !validateCallId(room)) {
    alert('Invalid room. Redirecting...');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('displayRoom').textContent = room;

  const stream = await getLocalMedia();
  if (!stream) {
    window.location.href = 'index.html';
    return;
  }
  const localVideo = document.getElementById('localVideo');
  localVideo.srcObject = stream;

  const devices = await enumerateDevices();
  if (devices.length > 1) {
    document.getElementById('switchCameraBtn').style.display = 'flex';
  }

  setupControls(room, role);

  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    document.getElementById('screenShareBtn').style.display = 'flex';
  }

  setupMoreMenu();

  if (role === 'caller') {
    updateConnectionStatus('Waiting for participant...');
    try {
      await createCall(room, () => startCallTimer());
    } catch (err) {
      showToast('Call creation failed: ' + err.message);
      window.location.href = 'index.html';
    }
  } else if (role === 'receiver') {
    updateConnectionStatus('Connecting...');
    try {
      await joinCall(room, () => startCallTimer());
    } catch (err) {
      showToast('Could not join call: ' + err.message);
      window.location.href = 'index.html';
    }
  }

  window.addEventListener('beforeunload', () => {
    endCall();
    stopGhostStream();
    if (callTimer) clearInterval(callTimer);
  });
  window.addEventListener('pagehide', () => {
    endCall();
    stopGhostStream();
    if (callTimer) clearInterval(callTimer);
  });
}

function setupControls(room, role) {
  const muteBtn = document.getElementById('muteBtn');
  const videoBtn = document.getElementById('videoBtn');
  const switchCamBtn = document.getElementById('switchCameraBtn');
  const screenShareBtn = document.getElementById('screenShareBtn');
  const endBtn = document.getElementById('endBtn');
  const ghostBtn = document.getElementById('ghostBtn');
  const localWrapper = document.getElementById('localWrapper');

  let isMuted = false;
  let isVideoOff = false;
  let isScreenSharing = false;

  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    toggleAudio(!isMuted);
    muteBtn.style.opacity = isMuted ? '0.4' : '1';
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted');
  });

  videoBtn.addEventListener('click', () => {
    isVideoOff = !isVideoOff;
    toggleVideo(!isVideoOff);
    videoBtn.style.opacity = isVideoOff ? '0.4' : '1';
    showToast(isVideoOff ? 'Camera off' : 'Camera on');
  });

  switchCamBtn.addEventListener('click', async () => {
    const devices = getVideoDevices();
    if (devices.length < 2) {
      showToast('Only one camera available.');
      return;
    }
    const stream = getLocalStream();
    if (!stream) return;
    const currentTrack = stream.getVideoTracks()[0];
    const currentId = currentTrack?.getSettings().deviceId;
    await switchCamera(stream, currentId);
    showToast('Camera switched');
  });

  screenShareBtn.addEventListener('click', async () => {
    if (isScreenSharing) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = displayStream.getVideoTracks()[0];
      const localStream = getLocalStream();
      if (!localStream) return;
      const oldVideo = localStream.getVideoTracks()[0];
      if (oldVideo) {
        localStream.removeTrack(oldVideo);
        oldVideo.stop();
      }
      localStream.addTrack(track);
      document.getElementById('localVideo').srcObject = localStream;
      isScreenSharing = true;
      screenShareBtn.style.opacity = '0.6';
      showToast('Screen sharing started');
      track.onended = () => {
        restoreCamera();
        isScreenSharing = false;
        screenShareBtn.style.opacity = '1';
        showToast('Screen sharing stopped');
      };
    } catch (err) {
      showToast('Screen share cancelled or failed');
    }
  });

  async function restoreCamera() {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: CONFIG.media.video, audio: false });
      const track = newStream.getVideoTracks()[0];
      const localStream = getLocalStream();
      if (!localStream) return;
      const old = localStream.getVideoTracks()[0];
      if (old) {
        localStream.removeTrack(old);
        old.stop();
      }
      localStream.addTrack(track);
      document.getElementById('localVideo').srcObject = localStream;
    } catch (e) {
      showToast('Could not restore camera.');
    }
  }

  localWrapper.addEventListener('click', () => {
    const remoteVideo = document.getElementById('remoteVideo');
    const localVideo = document.getElementById('localVideo');
    const remoteWrapper = document.getElementById('remoteWrapper');
    const temp = remoteVideo.srcObject;
    remoteVideo.srcObject = localVideo.srcObject;
    localVideo.srcObject = temp;
    const remoteLabel = document.querySelector('.remote .label');
    const localLabel = document.querySelector('.local .label');
    const tempLabel = remoteLabel.textContent;
    remoteLabel.textContent = localLabel.textContent;
    localLabel.textContent = tempLabel;
    remoteWrapper.classList.toggle('local');
    remoteWrapper.classList.toggle('remote');
    localWrapper.classList.toggle('local');
    localWrapper.classList.toggle('remote');
  });

  endBtn.addEventListener('click', () => {
    endCall();
    stopGhostStream();
    if (callTimer) clearInterval(callTimer);
    window.location.href = 'index.html';
  });

  ghostBtn.addEventListener('click', toggleGhostMode);
}

async function toggleGhostMode() {
  const localStream = getLocalStream();
  if (!localStream) {
    showToast('No media stream available.');
    return;
  }

  const ghostBtn = document.getElementById('ghostBtn');

  if (isGhostMode) {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: CONFIG.media.video,
        audio: false
      });
      const newTrack = newStream.getVideoTracks()[0];
      replaceVideoTrack(newTrack);
      document.getElementById('localVideo').srcObject = localStream;
    } catch (e) {
      showToast('Could not restore camera.');
    }
    toggleAudio(true);
    isGhostMode = false;
    ghostBtn.dataset.active = 'false';
    ghostBtn.style.opacity = '1';
    showToast('👻 Ghost Mode OFF');
    stopGhostStream();
  } else {
    toggleAudio(false);
    if (ghostStream) {
      ghostStream.getTracks().forEach(t => t.stop());
      ghostStream = null;
    }
    ghostStream = createGhostStream();
    const ghostTrack = ghostStream.getVideoTracks()[0];
    replaceVideoTrack(ghostTrack);
    document.getElementById('localVideo').srcObject = localStream;
    isGhostMode = true;
    ghostBtn.dataset.active = 'true';
    ghostBtn.style.opacity = '0.6';
    showToast('👻 Ghost Mode ON — Invisible');
  }
}

function setupMoreMenu() {
  const moreBtn = document.getElementById('moreBtn');
  const menu = document.getElementById('moreMenu');
  const closeMore = document.getElementById('closeMoreBtn');

  moreBtn.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  closeMore.addEventListener('click', () => { menu.style.display = 'none'; });

  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    const el = document.getElementById('roomContainer');
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => showToast('Fullscreen not supported'));
    } else {
      document.exitFullscreen();
    }
    menu.style.display = 'none';
  });

  const pipBtn = document.getElementById('pipBtn');
  if (HTMLVideoElement.prototype.requestPictureInPicture) {
    pipBtn.style.display = 'block';
    pipBtn.addEventListener('click', () => {
      const video = document.getElementById('remoteVideo');
      if (video && !document.pictureInPictureElement) {
        video.requestPictureInPicture().catch(() => showToast('PIP not available'));
      } else if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      }
      menu.style.display = 'none';
    });
  }

  document.getElementById('deviceSettingsBtn').addEventListener('click', () => {
    menu.style.display = 'none';
    alert('Device settings: Camera and microphone selection will be added in a future update.');
  });
}

function startCallTimer() {
  if (callTimer) clearInterval(callTimer);
  callSeconds = 0;
  callTimer = setInterval(() => {
    callSeconds++;
    updateTimer(callSeconds);
  }, 1000);
}