let socket=null,room="",name="",pc=null,localStream=null,screenTrack=null,micTrack=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function add(n,t){const x=document.createElement("div");x.className="msg";x.innerHTML="<b>"+esc(n)+"</b><br>"+esc(t);$("messages").appendChild(x);$("messages").scrollTop=$("messages").scrollHeight}
function makeCode(){return Math.random().toString(36).substring(2,8).toUpperCase()}
function enter(){name=$("name").value.trim()||"Guest";room=$("room").value.trim().toUpperCase();$("error").textContent="";if(!room){$("error").textContent="یک کد اتاق وارد کن یا «ساخت کد» را بزن.";return}openRoom()}
function openRoom(){
 $("roomTitle").textContent=room;$("lobby").classList.add("hidden");$("workspace").classList.remove("hidden");
 if(typeof io==="function"){socket=io();socket.on("connect",()=>{ $("connection").textContent="● آنلاین";socket.emit("join",{room,name})});socket.on("connect_error",()=>{$("connection").textContent="● محلی / بدون سرور";});setupSocket()}else{$("connection").textContent="● حالت محلی"}
}
function setupSocket(){
 socket.on("room_joined",d=>add("سیستم","وارد اتاق "+d.room+" شدی."));
 socket.on("peer_joined",async d=>{ $("peerState").textContent="🟢 متصل";add("سیستم",d.name+" وارد اتاق شد.");await peer();const offer=await pc.createOffer();await pc.setLocalDescription(offer);socket.emit("signal",{room,payload:{type:"offer",sdp:offer}})});
 socket.on("peer_left",()=>{$("peerState").textContent="منتظر رفیقت...";$("remote").srcObject=null;$("remoteEmpty").style.display="block";add("سیستم","رفیقت از اتاق خارج شد.")});
 socket.on("chat",d=>add(d.name,d.message));
 socket.on("signal",async({payload})=>{await peer();if(payload.type==="offer"){await pc.setRemoteDescription(payload.sdp);const a=await pc.createAnswer();await pc.setLocalDescription(a);socket.emit("signal",{room,payload:{type:"answer",sdp:a}})}else if(payload.type==="answer")await pc.setRemoteDescription(payload.sdp);else if(payload.type==="candidate")try{await pc.addIceCandidate(payload.candidate)}catch(e){}});
}
async function peer(){if(pc)return;pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun.cloudflare.com:3478"}]});pc.onicecandidate=e=>{if(e.candidate&&socket)socket.emit("signal",{room,payload:{type:"candidate",candidate:e.candidate}})};pc.ontrack=e=>{$("remote").srcObject=e.streams[0];$("remoteEmpty").style.display="none"};if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream))}
$("random").onclick=()=>{$("room").value=makeCode();$("error").textContent="کد آماده شد؛ حالا «ساخت اتاق» را بزن."};
$("create").onclick=()=>{$("room").value=$("room").value.trim().toUpperCase()||makeCode();enter()};
$("join").onclick=enter;
$("screen").onclick=async()=>{try{const s=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});screenTrack=s.getVideoTracks()[0];$("local").srcObject=s;$("localEmpty").style.display="none";await peer();const sender=pc.getSenders().find(x=>x.track&&x.track.kind==="video");if(sender)await sender.replaceTrack(screenTrack);else pc.addTrack(screenTrack,s);screenTrack.onended=()=>{$("local").srcObject=null;$("localEmpty").style.display="block"}}catch(e){}};
$("mic").onclick=async()=>{try{if(!localStream)localStream=await navigator.mediaDevices.getUserMedia({audio:true});micTrack=localStream.getAudioTracks()[0];micTrack.enabled=!micTrack.enabled;$("mic").textContent=micTrack.enabled?"🎙️ میکروفون":"🔇 میکروفون خاموش";await peer();const sender=pc.getSenders().find(x=>x.track&&x.track.kind==="audio");if(sender)await sender.replaceTrack(micTrack);else pc.addTrack(micTrack,localStream)}catch(e){alert("اجازه میکروفون داده نشد.")}};
$("chatForm").onsubmit=e=>{e.preventDefault();const m=$("message").value.trim();if(!m)return;if(socket&&socket.connected)socket.emit("chat",{room,name,message:m});else add(name,m);$("message").value=""};
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(room);$("copy").textContent="✓ کپی شد";setTimeout(()=>$("copy").textContent="📋 کپی کد",1500)}catch(e){prompt("کد اتاق را کپی کن:",room)}};
$("leave").onclick=()=>{if(socket)socket.emit("leave",{room});if(pc)pc.close();if(localStream)localStream.getTracks().forEach(t=>t.stop());location.reload()};
