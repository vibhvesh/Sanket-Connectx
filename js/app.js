(() => {
  const $ = (id) => document.getElementById(id);
  let session = null;
  let preview = false;
  let micEnabled = true;
  let selectedSink = "default";

  function showRadio(isPreview) {
    preview = isPreview;
    $("login-view").classList.add("hidden");
    $("radio-view").classList.remove("hidden");
    $("preview-notice").classList.toggle("hidden", !isPreview);
    $("account-name").textContent = session?.username || "apple";
  }
  function showLogin() {
    $("radio-view").classList.add("hidden");
    $("login-view").classList.remove("hidden");
  }
  async function loadAudioOutputs() {
    const select = $("audio-output");
    if (!navigator.mediaDevices?.enumerateDevices) {
      $("audio-output-note").textContent = "Audio device selection is not supported by this browser.";
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      select.replaceChildren(new Option("System default", "default"));
      outputs.forEach((device, index) => {
        const label = device.label || `Audio output ${index + 1}`;
        select.add(new Option(label, device.deviceId));
      });
      select.value = selectedSink;
      if (!outputs.length) $("audio-output-note").textContent = "No audio output devices were listed. System default will be used.";
    } catch (_) {
      $("audio-output-note").textContent = "Could not list audio output devices. System default will be used.";
    }
  }
  $("preview-button").addEventListener("click", () => showRadio(true));
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("login-error").textContent = "Relay authentication is not connected yet. Use Preview to inspect the interface.";
    // No credentials are stored or sent until the relay's real authentication API is verified.
  });
  $("leave-button").addEventListener("click", async () => {
    if (!preview && session) {
      try { await window.SanketAuth.signOut(session); } catch (_) {}
    }
    session = null;
    if (window.SanketAudio) window.SanketAudio.clear();
    showLogin();
  });
  $("ptt-button").addEventListener("click", () => {
    $("ptt-message").textContent = "Preview only · PTT transport is not connected";
  });
  $("mic-toggle").addEventListener("click", () => {
    micEnabled = !micEnabled;
    $("mic-label").textContent = micEnabled ? "On" : "Off";
    $("mic-toggle").classList.toggle("on", micEnabled);
    $("ptt-message").textContent = micEnabled ? "Standby · Relay audio connection not configured" : "Microphone off";
  });
  $("settings-button").addEventListener("click", async () => {
    $("settings-panel").classList.remove("hidden");
    await loadAudioOutputs();
  });
  $("close-settings").addEventListener("click", () => $("settings-panel").classList.add("hidden"));
  $("audio-output").addEventListener("change", async (event) => {
    selectedSink = event.target.value;
    $("audio-output-note").textContent = selectedSink === "default"
      ? "System default audio output selected."
      : "Output selected. It will be applied to relay playback when audio transport is connected.";
  });
})();