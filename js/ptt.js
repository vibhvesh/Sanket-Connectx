window.SanketPTT = {
  start() { return window.SanketRelay.claim(); },
  stop() { return window.SanketRelay.release(); }
};