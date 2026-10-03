const input = document.getElementById("rom");
const player = document.getElementById("player");
const status = document.getElementById("status");
const fullscreen = document.getElementById("fullscreen");

let romUrl = null;
let loadTimer = null;
let running = false;

function setStatus(message) {
  status.textContent = message;
}

function clearLoadTimer() {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
}

function loadRom(file) {
  clearLoadTimer();

  if (!file) return;

  const lower = file.name.toLowerCase();
  if (!/\.(nds|srl|dsi)$/.test(lower)) {
    setStatus("Please choose an .nds, .dsi, or .srl file.");
    input.value = "";
    return;
  }

  if (romUrl) URL.revokeObjectURL(romUrl);
  romUrl = URL.createObjectURL(file);
  running = false;

  setStatus("Loading " + file.name + " (" + Math.round(file.size / 1024 / 1024 * 10) / 10 + " MB)…");

  try {
    if (!player || typeof player.loadURL !== "function") {
      throw new Error("The local DS emulator runtime is not loaded.");
    }

    // Desmond's own demo uses the same object-URL method for local ROM files.
    player.loadURL(romUrl, () => {
      clearLoadTimer();
      running = true;
      setStatus(file.name + " is running. Arrow keys = D-pad • X = A • Z = B • A = L • S = R • Enter = Start • Shift = Select");
    });

    // The emulator can take a while to initialize its WebAssembly runtime.
    // Keep the page informative instead of appearing to do nothing.
    setStatus("Starting " + file.name + "… The DS emulator is initializing locally.");
    loadTimer = setTimeout(() => {
      if (!running) {
        setStatus("Still loading… If the screen stays blank after 30 seconds, this browser may not support this DS emulator build.");
      }
    }, 30000);
  } catch (err) {
    clearLoadTimer();
    console.error(err);
    running = false;
    setStatus("Could not start the emulator: " + (err?.message || err));
    URL.revokeObjectURL(romUrl);
    romUrl = null;
  }
}

input.addEventListener("change", () => loadRom(input.files && input.files[0]));

document.addEventListener("keydown", (event) => {
  if (!running) return;

  const key = event.key.toLowerCase();
  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright", "x", "z", "a", "s", "enter", "shift"].includes(key)
  ) {
    event.preventDefault();
  }
}, { passive: false });

fullscreen.addEventListener("click", async () => {
  const target = document.getElementById("player-wrap");
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await target.requestFullscreen();
    }
  } catch (err) {
    setStatus("Fullscreen is not available in this browser.");
  }
});

window.addEventListener("beforeunload", () => {
  clearLoadTimer();
  if (romUrl) URL.revokeObjectURL(romUrl);
});

window.addEventListener("load", () => {
  if (!customElements.get("desmond-player")) {
    setStatus("DS emulator runtime is missing. Check that desmond.min.js and desmond.wasm are present locally.");
  }
});
