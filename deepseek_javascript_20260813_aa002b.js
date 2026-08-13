import { CONFIG } from './config.js';
import { showToast } from './ui.js';

let localStream = null;

export async function getLocalMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: CONFIG.media.video,
      audio: CONFIG.media.audio
    });
    localStream = stream;
    return stream;
  } catch (err) {
    console.warn('Media error:', err);
    showToast('Camera or microphone access denied.');
    return null;
  }
}

export function getLocalStream() { return localStream; }
export function setLocalStream(stream) { localStream = stream; }

export function stopLocalMedia() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
}

export function toggleAudio(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(t => t.enabled = enabled);
}

export function toggleVideo(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach(t => t.enabled = enabled);
}

export function replaceVideoTrack(newTrack) {
  if (!localStream) return;
  const old = localStream.getVideoTracks()[0];
  if (old) {
    localStream.removeTrack(old);
    old.stop();
  }
  localStream.addTrack(newTrack);
}

let ghostAnimationId = null;

export function createGhostStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  
  let frame = 0;
  const drawGhost = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const glow = Math.sin(frame / 20) * 20 + 30;
    ctx.shadowColor = `rgba(0, 243, 255, ${glow / 100})`;
    ctx.shadowBlur = 60;
    ctx.font = '140px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 40;
    ctx.fillText('👻', canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0, 243, 255, ${Math.sin(frame / 30) * 0.3 + 0.5})`;
    ctx.beginPath();
    ctx.arc(canvas.width - 30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    
    frame++;
    ghostAnimationId = requestAnimationFrame(drawGhost);
  };
  drawGhost();
  
  const stream = canvas.captureStream(15);
  stream.addEventListener('inactive', () => {
    if (ghostAnimationId) cancelAnimationFrame(ghostAnimationId);
  });
  return stream;
}

export function stopGhostStream() {
  if (ghostAnimationId) {
    cancelAnimationFrame(ghostAnimationId);
    ghostAnimationId = null;
  }
}