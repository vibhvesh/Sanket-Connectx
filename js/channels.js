window.SanketChannels = {
  async load(session) {
    return window.SanketRelay.listChannels(session);
  }
};