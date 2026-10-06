const romInput=document.getElementById("rom");
const bios7Input=document.getElementById("bios7");
const bios9Input=document.getElementById("bios9");
const firmwareInput=document.getElementById("firmware");
const status=document.getElementById("status");
const fullscreen=document.getElementById("fullscreen");
const topCanvas=document.getElementById("screen-top");
const bottomCanvas=document.getElementById("screen-bottom");
const topCtx=topCanvas.getContext("2d",{alpha:false});
const bottomCtx=bottomCanvas.getContext("2d",{alpha:false});
let mem=null,frontPtr=0,frames=null,frameTimer=null,ready=false;
const DB_NAME="melonDS-local",STORE="files";
function setStatus(m){status.textContent=m;}
function reportError(m){console.error("melonDS:",m);setStatus("ERROR: "+m);}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function saveFile(key,bytes){const db=await openDB();await new Promise((res,rej)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(bytes,key);t.oncomplete=res;t.onerror=()=>rej(t.error);});db.close();}
async function loadFile(key){const db=await openDB();const v=await new Promise((res,rej)=>{const t=db.transaction(STORE);const q=t.objectStore(STORE).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});db.close();return v?new Uint8Array(v):null;}
function setupFramebuffers(){mem=Module.HEAPU8;frontPtr=Module._getSymbol(5);const fb=Module._getSymbol(4);frames=[[null,null],[null,null]];for(let i=0;i<4;i++)frames[i>>1][i%2]=new ImageData(new Uint8ClampedArray(mem.buffer,fb+i*256*192*4,256*192*4),256,192);}
function drawFrame(){if(!ready)return;Module._runFrame();const n=mem[frontPtr]&1;topCtx.putImageData(frames[n][0],0,0);bottomCtx.putImageData(frames[n][1],0,0);}
async function wasmReady(){try{setupFramebuffers();ready=true;const [b7,b9,fw,rom]=await Promise.all([loadFile("bios7"),loadFile("bios9"),loadFile("firmware"),loadFile("rom")]);if(b7&&b9&&fw&&rom){await boot(b7,b9,fw,rom);return;}setStatus("melonDS core ready. Load your own DS BIOS/firmware, then choose a ROM.");}catch(e){reportError(e.message||String(e));}}
async function boot(b7,b9,fw,rom){if(!ready)throw new Error("WASM core is not ready.");if(b7.length!==16384||b9.length!==4096||fw.length!==262144)throw new Error("BIOS/firmware size is invalid.");Module._reset();mem.set(b7,Module._getSymbol(0));mem.set(b9,Module._getSymbol(1));mem.set(fw,Module._getSymbol(2));mem.set(rom,Module._getSymbol(3));Module._loadROM(rom.length);if(frameTimer)clearInterval(frameTimer);frameTimer=setInterval(drawFrame,1000/60);drawFrame();setStatus("Running "+(window.currentRomName||"DS ROM")+" · 60 FPS target");}
async function handleFile(input,key,label,expected){const f=input.files?.[0];if(!f)return;try{const b=new Uint8Array(await f.arrayBuffer());if(expected&&!expected.includes(b.length))throw new Error(label+" has an unexpected size.");await saveFile(key,b);if(key==="rom")window.currentRomName=f.name;setStatus(label+" loaded: "+f.name);const [b7,b9,fw,rom]=await Promise.all([loadFile("bios7"),loadFile("bios9"),loadFile("firmware"),loadFile("rom")]);if(b7&&b9&&fw&&rom)await boot(b7,b9,fw,rom);}catch(e){reportError(e.message||String(e));}}
romInput.addEventListener("change",()=>handleFile(romInput,"rom","ROM",null));
bios7Input.addEventListener("change",()=>handleFile(bios7Input,"bios7","BIOS7",[16384]));
bios9Input.addEventListener("change",()=>handleFile(bios9Input,"bios9","BIOS9",[4096]));
firmwareInput.addEventListener("change",()=>handleFile(firmwareInput,"firmware","Firmware",[262144]));
fullscreen.addEventListener("click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{reportError("Fullscreen is not available in this browser.");}});
window.Module=window.Module||{};
window.Module.locateFile=(path)=>path;
window.wasmReady=wasmReady;
