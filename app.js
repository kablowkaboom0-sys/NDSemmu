const input=document.getElementById("rom");
const player=document.getElementById("player");
const status=document.getElementById("status");
const fullscreen=document.getElementById("fullscreen");

input.addEventListener("change",()=>{
  const file=input.files && input.files[0];
  if(!file)return;
  const lower=file.name.toLowerCase();
  if(!/\.(nds|srl|dsi)$/.test(lower)){
    status.textContent="Please choose an .nds, .dsi, or .srl file.";
    input.value="";
    return;
  }
  status.textContent="Loading "+file.name+" locally…";
  const url=URL.createObjectURL(file);
  try{
    player.loadURL(url,()=>{
      status.textContent=file.name+" is running.";
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    });
  }catch(err){
    console.error(err);
    status.textContent="Could not start the emulator: "+(err?.message||err);
    URL.revokeObjectURL(url);
  }
});

fullscreen.addEventListener("click",async()=>{
  const target=document.getElementById("player-wrap");
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
    else await target.requestFullscreen();
  }catch(err){
    status.textContent="Fullscreen is not available in this browser.";
  }
});
