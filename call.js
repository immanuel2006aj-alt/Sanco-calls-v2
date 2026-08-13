import Peer from 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
import { CONFIG } from './config.js';
import { getLocalStream, setLocalStream, stopLocalMedia } from './media.js';
import { monitorConnection } from './network.js';
import { cleanupCall } from './cleanup.js';
import { showToast, updateConnectionStatus } from './ui.js';

let currentCall = null;
let currentPeer = null;

export function createCall(callId, onConnected) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(callId, { config: CONFIG.peerjs });
    currentPeer = peer;
    peer.on('open', () => {
      resolve(peer);
    });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        showToast('Call ID not available.');
        reject(new Error('Peer unavailable'));
      } else {
        reject(err);
      }
    });
    peer.on('call', (incoming) => {
      const stream = getLocalStream();
      if (stream) {
        incoming.answer(stream);
        setupCall(incoming, onConnected);
      } else {
        incoming.close();
      }
    });
  });
}

export function joinCall(callId, onConnected) {
  return new Promise((resolve, reject) => {
    const peer = new Peer({ config: CONFIG.peerjs });
    currentPeer = peer;
    peer.on('open', () => {
      const stream = getLocalStream();
      if (!stream) {
        reject(new Error('No local stream'));
        return;
      }
      const call = peer.call(callId, stream);
      setupCall(call, onConnected);
      resolve(peer);
    });
    peer.on('error', reject);
  });
}

function setupCall(call, onConnected) {
  currentCall = call;
  call.on('stream', (remoteStream) => {
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;
    updateConnectionStatus('Connected');
    if (onConnected) onConnected();
  });
  call.on('close', () => {
    showToast('Call ended');
    endCall();
  });
  call.on('error', (err) => {
    showToast('Call error: ' + err.message);
    endCall();
  });
  monitorConnection(call.peerConnection, () => {
    showToast('Connection restored');
  }, () => {
    showToast('Connection lost');
    endCall();
  });
}

export function endCall() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (currentPeer) {
    currentPeer.destroy();
    currentPeer = null;
  }
  stopLocalMedia();
  const remoteVideo = document.getElementById('remoteVideo');
  const localVideo = document.getElementById('localVideo');
  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
  updateConnectionStatus('Call ended');
}

export function getCurrentCall() { return currentCall; }
export function getCurrentPeer() { return currentPeer; }
