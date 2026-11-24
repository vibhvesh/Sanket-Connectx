window.SanketAuth = {
  async signIn(username, password) {
    return window.SanketRelay.login(username, password);
  },
  async signOut(session) {
    await window.SanketRelay.logout(session);
  }
};