// Sanket-Connectx adapter for the proven SanketPTT /ptt2 relay protocol.
(() => {
  const ORIGIN = "https://relay.canberravision.com";
  const TOKEN_KEY = "sanket.connectx.token";
  let token = "";
  let socket = null;
  let peerAudio = null;
  let roomId = "";
  let userId = "";
  let username = "";
  let floorToken = "";
  let talking = false;
  let closed = false;
  const audioElements = new Map();
  const ICE = [{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}];

  async function api(path, options = {}) {
    const response = await fetch(ORIGIN + path, {
      method: options.method || "GET",
      headers: {"Content-Type":"application/json", ...(options.token ? {Authorization:"Bearer "+options.token} : {})},
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = response.status === 401 ? "Sign-in failed. Check your email and password."
        : (data?.error?.message || "Relay request failed (" + response.status + ").");
      const error = new Error(msg); error.status = response.status; throw error;
    }
    return data;
  }

  class PeerAudio {
    constructor(onStream) { this.onStream=onStream; this.local=null; this.out=new Map(); this.in=new Map(); this.early=new Map(); }
    async openMic() {
      this.closeMic();
      this.local = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    }
    closeMic() { if(this.local) this.local.getTracks().forEach(t=>t.stop()); this.local=null; }
    async transmit(peers) {
      await this.openMic();
      for(const p of peers||[]) if(p?.userId) await this.offer(p.userId);
    }
    async offer(id) {
      if(!this.local || this.out.has(id)) return;
      const pc=new RTCPeerConnection({iceServers:ICE}), entry={pc,ice:[]}; this.out.set(id,entry);
      this.local.getTracks().forEach(t=>pc.addTrack(t,this.local));
      pc.onicecandidate=e=>{if(e.candidate) signal(id,"ice",e.candidate)};
      await pc.setLocalDescription(await pc.createOffer());
      signal(id,"offer",pc.localDescription);
    }
    async handle(id,kind,data) {
      if(kind==="offer") {
        this.closeEntry(this.in,id);
        const entry={pc:new RTCPeerConnection({iceServers:ICE}),ice:this.early.get(id)||[]}; this.early.delete(id); this.in.set(id,entry);
        const pc=entry.pc;
        pc.onicecandidate=e=>{if(e.candidate) signal(id,"ice",e.candidate)};
        pc.ontrack=e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);this.onStream(id,stream)};
        await pc.setRemoteDescription(data); await this.flush(entry);
        await pc.setLocalDescription(await pc.createAnswer()); signal(id,"answer",pc.localDescription);
      } else if(kind==="answer") {
        const e=this.out.get(id); if(e){await e.pc.setRemoteDescription(data);await this.flush(e);}
      } else if(kind==="ice") {
        const e=this.in.get(id)||this.out.get(id);
        if(!e||!e.pc.remoteDescription){if(e)e.ice.push(data);else{const a=this.early.get(id)||[];a.push(data);this.early.set(id,a);}return;}
        try{await e.pc.addIceCandidate(data)}catch(_){}
      }
    }
    async flush(e){while(e.ice.length){try{await e.pc.addIceCandidate(e.ice.shift())}catch(_){}}}
    closeEntry(map,id){const e=map.get(id);if(e){e.pc.close();map.delete(id)}}
    closeInbound(id){this.closeEntry(this.in,id);this.onStream(id,null)}
    stopTx(){for(const id of [...this.out.keys()])this.closeEntry(this.out,id);this.closeMic()}
    stopAll(){this.stopTx();for(const id of [...this.in.keys()])this.closeInbound(id);this.early.clear()}
  }
  function signal(to,kind,data){if(socket?.connected)socket.emit("webrtc:signal",{roomId,to,kind,data});}
  function emit(type,data){window.dispatchEvent(new CustomEvent("sanket:"+type,{detail:data}));}
  function onRemoteStream(id,stream){
    if(!stream){const old=audioElements.get(id);if(old){old.pause();old.srcObject=null;old.remove();audioElements.delete(id);}return;}
    let el=audioElements.get(id);
    if(!el){el=document.createElement("audio");el.autoplay=true;el.playsInline=true;el.style.display="none";document.body.appendChild(el);audioElements.set(id,el);}
    el.srcObject=stream;
    const sink=window.SanketApp?.selectedSink?.();
    if(sink && sink!=="default" && el.setSinkId) el.setSinkId(sink).catch(()=>{});
    el.play().catch(()=>emit("notice","Tap the page once to enable incoming audio."));
  }

  async function connect(email,password) {
    closed=false;
    const login=await api("/api/auth/login",{method:"POST",body:{email:String(email||"").trim(),password:String(password||"")}});
    if(!login.token) throw new Error("Relay did not return an access token.");
    token=login.token;
    try{sessionStorage.setItem(TOKEN_KEY,token)}catch(_){}
    const me=await api("/api/auth/me",{token});
    const list=await api("/api/rooms",{token});
    const rooms=(list.rooms||[]).filter(r=>r.memberRole&&r.roomId);
    if(!rooms.length) throw new Error("This account has no assigned channels.");
    const chosen=rooms.find(r=>r.roomId==="RM-FG7S")||rooms[0];
    roomId=chosen.roomId; username=me.user?.username||email; userId=me.user?.userId||"";
    const roomData=await api("/api/rooms/"+encodeURIComponent(roomId),{token});
    const room=roomData.room||{};
    if(room.roomStatus && room.roomStatus!=="active") throw new Error("This channel is disabled.");
    if(!room.memberRole) await api("/api/rooms/"+encodeURIComponent(roomId)+"/join",{method:"POST",token,body:room.hasPassword?{password:"radio123"}:{}});
    const mod=await import(ORIGIN+"/vendor/socket.mjs");
    socket=mod.io(ORIGIN,{auth:{token},reconnection:true,transports:["websocket","polling"]});
    peerAudio=new PeerAudio(onRemoteStream);
    socket.on("connect",async()=>{
      try{
        const ack=await socket.timeout(5000).emitWithAck("room:join",{roomId});
        if(!ack?.ok) throw new Error(ack?.message||"Could not join channel.");
        emit("connected",{username,roomId,roomName:room.roomName||room.name||chosen.roomName||roomId,participants:ack.participants||[]});
        emit("participants",ack.participants||[]);
        emit("speaker",ack.speaker||null);
      }catch(e){emit("error",e.message);}
    });
    socket.on("connect_error",e=>emit("error",e?.message||"Socket connection failed."));
    socket.on("disconnect",()=>{if(!closed)emit("status","Reconnecting…");});
    socket.on("room:participants",p=>emit("participants",p?.participants||[]));
    socket.on("speaker:changed",p=>emit("speaker",p?.speaker||null));
    socket.on("ptt:add-listener",({userId:id}={})=>{if(talking&&id)peerAudio.offer(id).catch(()=>{});});
    socket.on("webrtc:signal",({fromUserId,kind,data}={})=>{if(fromUserId)peerAudio.handle(fromUserId,kind,data).catch(e=>emit("error",e.message));});
    socket.on("webrtc:stop",({fromUserId}={})=>{if(fromUserId)peerAudio.closeInbound(fromUserId);});
    socket.on("ptt:revoked",()=>release());
    return {username,roomId};
  }
  async function claim() {
    if(!socket?.connected) throw new Error("Relay is not connected.");
    const result=await socket.timeout(5000).emitWithAck("ptt:request",{roomId});
    if(!result?.ok) throw new Error(result?.message||"Channel is busy. Try again.");
    floorToken=result.token||""; talking=true;
    try{await peerAudio.transmit(result.peers||[]);emit("transmitting",true);}
    catch(e){talking=false;await release();throw e;}
  }
  async function release(){
    talking=false; if(peerAudio)peerAudio.stopTx(); emit("transmitting",false);
    const t=floorToken;floorToken="";
    if(socket?.connected&&t)socket.emit("ptt:release",{roomId,token:t});
  }
  async function disconnect(){
    closed=true;await release();
    if(peerAudio)peerAudio.stopAll();peerAudio=null;
    for(const id of [...audioElements.keys()])onRemoteStream(id,null);
    if(socket){const s=socket;socket=null;s.emit("room:leave",{roomId});s.disconnect();}
    token="";try{sessionStorage.removeItem(TOKEN_KEY)}catch(_){}
  }
  window.SanketRelay={connect,claim,release,disconnect,get connected(){return !!socket?.connected;},get roomId(){return roomId;}};
})();