import { replaceVideoTrack } from './media.js';
import { showToast } from './ui.js';
import { CONFIG } from './config.js';

let videoDevices = [];

export async function enumerateDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    videoDevices = all.filter(d => d.kind === 'videoinput');
    return videoDevices;
  } catch (e) {
    return [];
  }
}

export function getVideoDevices() { return videoDevices; }

export async function switchCamera(stream, currentDeviceId) {
  const devices = await enumerateDevices();
  if (devices.length < 2) {
    showToast('Only one camera detected.');
    return null;
  }
  let idx = devices.findIndex(d => d.deviceId === currentDeviceId);
  idx = (idx + 1) % devices.length;
  const next = devices[idx];
  if (!next) return null;
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: next.deviceId }, ...CONFIG.media.video },
      audio: false
    });
    const track = newStream.getVideoTracks()[0];
    replaceVideoTrack(track);
    return next.deviceId;
  } catch (e) {
    showToast('Unable to switch camera.');
    return null;
  }
}
