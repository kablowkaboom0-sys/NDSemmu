const input = document.getElementById("rom");
const player = document.getElementById("player");
const status = document.getElementById("status");
const fullscreen = document.getElementById("fullscreen");

let loadTimer = null;
let running = false;
let loadToken = 0;

function setStatus(message) {
  status.textContent = message;
}

function clearLoadTimer() {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
}

function emulatorReady() {
  return !!(
    player &&
    typeof player.loadURL === "function" &&
    typeof window.Module !== "undefined" &&
    typeof Module._prepareRomBuffer === "function" &&
    typeof Module._loadROM === "function"
  );
}

async function waitForEmulator(timeoutMs = 20000) {
  const started = Date.now();
  while (!emulatorReady()) {
    if (Date.now() - started >= timeoutMs) {
      throw new Error("DS emulator WebAssembly runtime did not finish initializing.");
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

async function loadRom(file) {
  const token = ++loadToken;
  clearLoadTimer();

  if (!file) {
    setStatus("No file was selected.");
    return;
  }

  const lower = (file.name || "").toLowerCase();
  if (!/\\.(nds|srl|dsi)$/.test(lower)) {
    setStatus("Not a supported DS file: " + (file.name || "unknown"));
    input.value = "";
    return;
  }

  const sizeMB = Math.round((file.size / 1024 / 1024) * 10) / 10;
  setStatus("FILE SELECTED: " + file.name + " (" + sizeMB + " MB)");

  if (file.size < 1024) {
    setStatus("ERROR: The selected file is too small to be a DS ROM.");
    return;
  }

  running = false;

  try {
    setStatus("FILE SELECTED: " + file.name + " — waiting for DS core…");
    await waitForEmulator();

    if (token !== loadToken) return;

    if (typeof window.tryLoadROM !== "function") {
      throw new Error("Desmond ROM loader is not available.");
    }

    // Use Desmond's actual asynchronous ROM loader directly. Its public loadURL()
    // wrapper calls its callback before the async ROM read/boot has finished.
    setStatus("READING ROM: " + file.name + "…");
    await window.tryLoadROM(file);

    if (token !== loadToken) return;

    if (!window.emuIsGameLoaded) {
      throw new Error("The DS core rejected the ROM. Desmond did not report a loaded game.");
    }

    running = true;
    clearLoadTimer();
    setStatus(file.name + " is running. Arrow keys = D-pad • Z = A • X = B • A = Y • S = X • Q = L • W = R • Enter = Start • Shift = Select");
  } catch (err) {
    clearLoadTimer();
    running = false;
    console.error("NDSemmu ROM load failed:", err);
    setStatus("ERROR: " + (err?.message || String(err)));
  }
}
function selectedFile() {
  return input.files && input.files.length ? input.files[0] : null;
}

input.addEventListener("change", () => loadRom(selectedFile()));
input.addEventListener("input", () => {
  const file = selectedFile();
  if (file) loadRom(file);
});

document.addEventListener("keydown", event => {
  if (!running) return;
  if (["arrowup","arrowdown","arrowleft","arrowright","x","z","a","s","enter","shift"].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
}, { passive: false });

fullscreen.addEventListener("click", async () => {
  try {
    const target = document.getElementById("player-wrap");
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.requestFullscreen();
  } catch {
    setStatus("Fullscreen is not available in this browser.");
  }
});

window.addEventListener("beforeunload", () => {
  clearLoadTimer();
});

window.addEventListener("load", () => {
  if (!customElements.get("desmond-player")) {
    setStatus("ERROR: Desmond custom element was not created.");
  } else if (!emulatorReady()) {
    setStatus("DS emulator is initializing… Choose your ROM when it is ready.");
  }
});
