const input = document.getElementById("rom");
const player = document.getElementById("player");
const status = document.getElementById("status");
const fullscreen = document.getElementById("fullscreen");

let romUrl = null;
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
  if (!/\.(nds|srl|dsi)$/.test(lower)) {
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

  if (romUrl) URL.revokeObjectURL(romUrl);
  romUrl = URL.createObjectURL(file);
  running = false;

  try {
    setStatus("FILE SELECTED: " + file.name + " — checking emulator…");
    await waitForEmulator();

    if (token !== loadToken) return;

    // Verify that the browser can read the locally-created object URL.
    const probe = await fetch(romUrl);
    if (!probe.ok) throw new Error("Browser could not read the selected ROM file.");
    const probeBytes = await probe.arrayBuffer();
    if (probeBytes.byteLength !== file.size) {
      throw new Error("ROM file could not be read completely (" + probeBytes.byteLength + "/" + file.size + " bytes).");
    }

    setStatus("ROM READ OK: " + file.name + " — starting DS emulator…");

    player.loadURL(romUrl, () => {
      if (token !== loadToken) return;
      clearLoadTimer();
      running = true;
      setStatus(file.name + " is running. Arrow keys = D-pad • X = A • Z = B • A = L • S = R • Enter = Start • Shift = Select");
    });

    clearLoadTimer();
    loadTimer = setTimeout(() => {
      if (!running && token === loadToken) {
        setStatus("ERROR: Desmond accepted the ROM but did not finish loading within 30 seconds.");
      }
    }, 30000);
  } catch (err) {
    clearLoadTimer();
    running = false;
    console.error("NDSemmu:", err);
    setStatus("ERROR: " + (err?.message || String(err)));

    if (romUrl) {
      URL.revokeObjectURL(romUrl);
      romUrl = null;
    }
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
  if (romUrl) URL.revokeObjectURL(romUrl);
});

window.addEventListener("load", () => {
  if (!customElements.get("desmond-player")) {
    setStatus("ERROR: Desmond custom element was not created.");
  } else if (!emulatorReady()) {
    setStatus("DS emulator is initializing… Choose your ROM when it is ready.");
  }
});
