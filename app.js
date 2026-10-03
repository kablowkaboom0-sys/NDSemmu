const input = document.getElementById("rom");
const player = document.getElementById("player");
const status = document.getElementById("status");
const fullscreen = document.getElementById("fullscreen");

let romUrl = null;
let running = false;

function setStatus(message) {
  status.textContent = message;
}

function loadRom(file) {
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
  setStatus("Loading " + file.name + " locally…");

  try {
    if (!player || typeof player.loadURL !== "function") {
      throw new Error("The local DS emulator runtime is not loaded. Make sure desmond.min.js and desmond.wasm are present in this repository.");
    }

    player.loadURL(romUrl, () => {
      running = true;
      setStatus(file.name + " is running. Keyboard controls: D-pad = Arrow keys, A = X, B = Z, L = A, R = S, Start = Enter, Select = Shift.");
    });
  } catch (err) {
    console.error(err);
    running = false;
    setStatus("Could not start the emulator: " + (err?.message || err));
    URL.revokeObjectURL(romUrl);
    romUrl = null;
  }
}

input.addEventListener("change", () => loadRom(input.files && input.files[0]));

// Keep the emulator from losing keyboard focus when the page itself is focused.
// Desmond handles keyboard input at the document level; these controls are the
// conventional keys used by the web build.
document.addEventListener("keydown", (event) => {
  if (!running) return;

  const keyMap = {
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    x: "x",
    z: "z",
    a: "a",
    s: "s",
    Enter: "Enter",
    Shift: "Shift"
  };

  if (keyMap[event.key] || ["x", "z", "a", "s"].includes(event.key.toLowerCase())) {
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
  if (romUrl) URL.revokeObjectURL(romUrl);
});

// Give a useful diagnostic instead of silently failing when the local runtime
// files have not yet been vendored by the GitHub Action.
window.addEventListener("load", () => {
  if (!customElements.get("desmond-player")) {
    setStatus("DS emulator runtime is missing. Wait for the GitHub Action to add desmond.min.js/desmond.wasm, then reload.");
  }
});
