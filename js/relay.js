// Relay adapter. Endpoint paths and message formats must be confirmed from the existing relay before enabling network calls.
window.SanketRelay = {
  baseUrl: window.SANKET_CONFIG.relayBaseUrl,
  async login(_username, _password) {
    throw new Error("Relay login endpoint is not configured yet. We need to confirm the existing relay API first.");
  },
  async listChannels(_session) {
    throw new Error("Channel-list endpoint is not configured yet.");
  },
  async logout(_session) { return; }
};