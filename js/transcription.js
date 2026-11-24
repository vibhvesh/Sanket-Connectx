window.SanketTranscription = {
  enabled: Boolean(window.SANKET_CONFIG.transcriptionEnabled),
  // Future integration point for the approved Sanket transcription API.
  async transcribe(_audioBlob) {
    if (!this.enabled) throw new Error("Transcription is disabled.");
    throw new Error("Transcription API endpoint is not configured.");
  }
};