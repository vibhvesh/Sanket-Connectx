window.SanketAuth = {
  signIn(email, password) { return window.SanketRelay.connect(email, password); },
  signOut() { return window.SanketRelay.disconnect(); }
};