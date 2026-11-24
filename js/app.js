(() => {
  const $ = (id) => document.getElementById(id);
  let session = null;
  let selectedChannel = null;

  function showConsole() {
    $("login-view").classList.add("hidden");
    $("console-view").classList.remove("hidden");
    $("connection-state").classList.add("connected");
    $("connection-state").innerHTML = "<i></i> SESSION ACTIVE";
  }
  function showLogin() {
    $("console-view").classList.add("hidden");
    $("login-view").classList.remove("hidden");
    $("connection-state").classList.remove("connected");
    $("connection-state").innerHTML = "<i></i> NOT CONNECTED";
  }
  function renderChannels(channels) {
    const list = $("channel-list");
    list.replaceChildren();
    if (!Array.isArray(channels) || channels.length === 0) {
      list.innerHTML = '<p class="muted">No channels were returned for this account.</p>';
      return;
    }
    channels.forEach((channel) => {
      const name = typeof channel === "string" ? channel : channel.name;
      const kind = typeof channel === "string" ? "AVAILABLE" : (channel.type || (channel.public ? "PUBLIC" : "AUTHORIZED")).toUpperCase();
      const button = document.createElement("button");
      button.className = "channel-item";
      button.innerHTML = '<span></span><span class="channel-tag"></span>';
      button.children[0].textContent = name;
      button.children[1].textContent = kind;
      button.addEventListener("click", () => {
        selectedChannel = channel;
        $("selected-channel").textContent = name;
        $("ptt-hint").textContent = "Channel selected. Audio transport will be enabled after relay protocol verification.";
        $("ptt-button").disabled = true;
        document.querySelectorAll(".channel-item").forEach((el) => el.classList.remove("selected"));
        button.classList.add("selected");
      });
      list.append(button);
    });
  }
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("login-error").textContent = "";
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Connecting…";
    try {
      session = await window.SanketAuth.signIn($("username").value.trim(), $("password").value);
      showConsole();
      renderChannels(await window.SanketChannels.load(session));
    } catch (error) {
      $("login-error").textContent = error.message || "Unable to connect to relay.";
      session = null;
      showLogin();
    } finally {
      button.disabled = false;
      button.textContent = "Connect to relay";
    }
  });
  $("refresh-channels").addEventListener("click", async () => {
    try { renderChannels(await window.SanketChannels.load(session)); }
    catch (error) { $("login-error").textContent = error.message; }
  });
  $("logout-button").addEventListener("click", async () => {
    try { await window.SanketAuth.signOut(session); } catch (_) {}
    session = null;
    selectedChannel = null;
    window.SanketAudio.clear();
    $("audio-history").innerHTML = '<p class="muted">No transmissions in this session.</p>';
    $("selected-channel").textContent = "No channel selected";
    $("ptt-button").disabled = true;
    $("login-form").reset();
    showLogin();
  });
})();