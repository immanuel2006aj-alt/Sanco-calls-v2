import { stopLocalMedia, stopGhostStream } from './media.js';

export function cleanupCall(call, peer, remoteVideo, localVideo) {
  stopGhostStream();
  stopLocalMedia();

  if (call) {
    try { call.close(); } catch (e) {}
  }
  if (peer) {
    try { peer.destroy(); } catch (e) {}
  }

  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
}
