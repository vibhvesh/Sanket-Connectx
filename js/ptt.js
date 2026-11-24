// PTT transport is intentionally inactive until the relay's supported browser audio protocol is confirmed.
window.SanketPTT = {
  start() { throw new Error("PTT transport is not configured for this relay yet."); },
  stop() {}
};