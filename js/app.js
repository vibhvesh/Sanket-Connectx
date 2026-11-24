(() => {
  const $ = id => document.getElementById(id);
  let session=null, micEnabled=true, selectedSink="default", holding=false;
  const setMessage = value => $("ptt-message").textContent=value;
  function showRadio(){ $("login-view").classList.add("hidden"); $("radio-view").classList.remove("hidden"); $("preview-notice").classList.add("hidden"); }
  function showLogin(){ $("radio-view").classList.add("hidden"); $("login-view").classList.remove("hidden"); }
  async function loadAudioOutputs(){
    const select=$("audio-output");
    try{
      const devices=await navigator.mediaDevices.enumerateDevices();
      const outputs=devices.filter(d=>d.kind==="audiooutput");
      select.replaceChildren(new Option("System default","default"));
      outputs.forEach((d,i)=>select.add(new Option(d.label||"Audio output "+(i+1),d.deviceId)));
      select.value=selectedSink;
    }catch(_){$("audio-output-note").textContent="Could not list audio output devices. System default will be used.";}
  }
  window.SanketApp={selectedSink:()=>selectedSink};
  $("preview-button").addEventListener("click",()=>{showRadio();$("preview-notice").classList.remove("hidden");$("account-name").textContent="Preview";setMessage("Preview only · Not connected");});
  $("login-form").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;$("login-error").textContent="Connecting to Relay…";
    try{
      const email=$("username").value.trim(),password=$("password").value;
      session=await window.SanketAuth.signIn(email,password);
      showRadio();$("account-name").textContent=session.username;
      $("top-channel-name").textContent=session.roomName||session.roomId;
      $("channel-name").textContent=session.roomName||session.roomId;
      $("top-channel-id").textContent=session.roomId;
      $("online-count").textContent="Connecting…";
      setMessage("Joining channel…");
    }catch(err){$("login-error").textContent=err.message||"Unable to connect to Relay.";}
    finally{button.disabled=false;}
  });
  window.addEventListener("sanket:connected",e=>{
    const d=e.detail;$("top-channel-name").textContent=d.roomName;$("channel-name").textContent=d.roomName;
    $("top-channel-id").textContent=d.roomId;$("online-count").textContent=(d.participants?.length||1)+" Online";
    $("ptt-message").textContent="Standby · Connected to "+d.roomName;
    $("preview-notice").classList.add("hidden");
    $("top-channel-name").parentElement.nextElementSibling?.classList.add("connected");
  });
  window.addEventListener("sanket:participants",e=>$("online-count").textContent=(e.detail?.length||0)+" Online");
  window.addEventListener("sanket:speaker",e=>{
    const speaker=e.detail;
    if(speaker?.userId){$("ptt-message").textContent=speaker.userId===session?.userId?"Transmitting":"Receiving · Channel busy";}
    else if(!holding)$("ptt-message").textContent="Standby · Ready";
  });
  window.addEventListener("sanket:transmitting",e=>{setMessage(e.detail?"TX · Transmitting":"Standby · Ready");$("ptt-button").classList.toggle("active",!!e.detail);});
  window.addEventListener("sanket:status",e=>setMessage(e.detail));
  window.addEventListener("sanket:error",e=>setMessage("Relay: "+e.detail));
  window.addEventListener("sanket:notice",e=>setMessage(e.detail));
  $("leave-button").addEventListener("click",async()=>{
    holding=false;try{await window.SanketAuth.signOut();}catch(_){}
    session=null;showLogin();$("login-error").textContent="You have left the channel.";
  });
  const ptt=$("ptt-button");
  async function down(e){e?.preventDefault();if(!session||holding||!micEnabled)return;holding=true;ptt.classList.add("active");setMessage("Requesting transmit…");try{await window.SanketPTT.start();}catch(err){holding=false;ptt.classList.remove("active");setMessage(err.message||"Unable to transmit.");}}
  async function up(e){e?.preventDefault();if(!holding)return;holding=false;ptt.classList.remove("active");await window.SanketPTT.stop();}
  ptt.addEventListener("pointerdown",down);["pointerup","pointercancel","lostpointercapture"].forEach(t=>ptt.addEventListener(t,up));
  ptt.addEventListener("contextmenu",e=>e.preventDefault());
  $("mic-toggle").addEventListener("click",()=>{micEnabled=!micEnabled;$("mic-label").textContent=micEnabled?"On":"Off";$("mic-toggle").classList.toggle("on",micEnabled);if(!micEnabled&&holding)up();setMessage(micEnabled?"Standby · Microphone enabled":"Microphone off");});
  $("settings-button").addEventListener("click",async()=>{$("settings-panel").classList.remove("hidden");await loadAudioOutputs();});
  $("close-settings").addEventListener("click",()=>$("settings-panel").classList.add("hidden"));
  $("audio-output").addEventListener("change",e=>{
    selectedSink=e.target.value;
    document.querySelectorAll("audio").forEach(el=>{if(el.setSinkId)el.setSinkId(selectedSink==="default"?"":selectedSink).catch(()=>{});});
    $("audio-output-note").textContent="Audio output selection updated.";
  });
  window.addEventListener("pagehide",()=>{window.SanketRelay.disconnect();});
})();