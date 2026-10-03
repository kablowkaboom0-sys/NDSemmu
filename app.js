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

  if (!file) {
    setStatus("No file was selected. Choose an .nds, .dsi, or .srl file.");
    return;
  }

  const lower = (file.name || "").toLowerCase();
  if (!/\.(nds|srl|dsi)$/.test(lower)) {
    setStatus("Selected file is not a DS ROM: " + (file.name || "unknown file"));
    input.value = "";
    return;
  }

  const sizeMB = Math.round((file.size / 1024 / 1024) * 10) / 10;
  setStatus("Selected: " + file.name + " (" + sizeMB + " MB). Starting emulator…");

  if (romUrl) {
    URL.revokeObjectURL(romUrl);
    romUrl = null;
  }

  romUrl = URL.createObjectURL(file);
  running = false;

  try {
    if (!player || typeof player.loadURL !== "function") {
      throw new Error("The DS emulator runtime is not ready.");
    }

    // Desmond accepts a browser object URL for locally selected ROM files.
    player.loadURL(romUrl, () => {
      clearLoadTimer();
      running = true;
      setStatus(
        file.name +
        " is running. Arrow keys = D-pad • X = A • Z = B • A = L • S = R • Enter = Start • Shift = Select"
      );
    });

    // Keep the selected filename visible even if the emulator takes time to start.
    setStatus("Selected: " + file.name + " — DS emulator is loading locally…");

    loadTimer = setTimeout(() => {
      if (!running) {
        setStatus(
          "Selected: " + file.name +
          " — still loading after 30 seconds. The emulator runtime may not be supported by this browser."
        );
      }
    }, 30000);
  } catch (err) {
    clearLoadTimer();
    console.error(err);
    running = false;
    setStatus("Emulator error: " + (err?.message || err));
    if (romUrl) {
      URL.revokeObjectURL(romUrl);
      romUrl = null;
    }
  }
}

// Listen to both events. Some mobile file browsers dispatch "input"
// while others dispatch "change".
input.addEventListener("change", () => {
  const file = input.files && input.files.length ? input.files[0] : null;
  loadRom(file);
});

input.addEventListener("input", () => {
  const file = input.files && input.files.length ? input.files[0] : null;
  if (file) loadRom(file);
});

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
    setStatus("DS emulator runtime is missing. Check desmond.min.js and desmond.wasm.");
  }
});
