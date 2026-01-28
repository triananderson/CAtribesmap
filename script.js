// ===============================
// CONFIG
// ===============================

const TRIBE_NAME_FIELD = "mapname";
const MAX_STRIKES = 1;

// ===============================
// STATE
// ===============================

let map;
let territoriesLayer;
let outlineLayer;

let territories = [];
let currentTarget = null;
let score = 0;
let strikes = 0;
let gameOver = false;

// ===============================
// HELPERS
// ===============================

function hasValidMapName(feature) {
  const name = feature.properties?.[TRIBE_NAME_FIELD];
  return name && String(name).trim().length > 0;
}

// ===============================
// UI HELPERS
// ===============================

function setHUD() {
  document.getElementById("prompt").textContent = currentTarget ? currentTarget.name : "—";
  document.getElementById("score").textContent = String(score);
  document.getElementById("strikes").textContent = String(strikes);
}

function showOverlay(title, msg) {
  document.getElementById("overlay-title").textContent = title;
  document.getElementById("overlay-msg").textContent = msg;
  document.getElementById("overlay").classList.remove("hidden");
}

function hideOverlay() {
  document.getElementById("overlay").classList.add("hidden");
}

// ===============================
// MAP STYLES
// ===============================

function resetStyles() {
  territories.forEach(t => {
    t.layer.setStyle({
      color: "#ffffff",
      weight: 0.7,
      opacity: 0.6,
      fillColor: "#ffffff",
      fillOpacity: 0.03,
      lineJoin: "miter",
      lineCap: "butt"
    });
  });
}

function highlight(layer, type) {
  const base = {
    weight: 2,
    opacity: 0.9,
    fillOpacity: 0.15,
    lineJoin: "miter",
    lineCap: "butt"
  };

  if (type === "correct") {
    layer.setStyle({ ...base, color: "#3fb950" });
  } else {
    layer.setStyle({ ...base, color: "#ff6b6b" });
  }
}

// ===============================
// GAME LOGIC
// ===============================

function chooseNextTarget() {
  if (territories.length === 0) {
    currentTarget = null;
    setHUD();
    showOverlay("No playable territories", `No features had a non-empty "${TRIBE_NAME_FIELD}".`);
    return;
  }
  const idx = Math.floor(Math.random() * territories.length);
  currentTarget = territories[idx];
  setHUD();
}

function endGame(reason) {
  gameOver = true;
  showOverlay("Game Over", `${reason} Final score: ${score}.`);
}

function onTerritoryClick(clicked) {
  if (gameOver || !currentTarget) return;

  resetStyles();

  if (clicked === currentTarget) {
    score += 1;
    highlight(clicked.layer, "correct");
    chooseNextTarget();
  } else {
    strikes += 1;
    highlight(clicked.layer, "wrong");
    highlight(currentTarget.layer, "correct");

    if (strikes >= MAX_STRIKES) {
      endGame(
        `Wrong selection. You clicked "${clicked.name}", but the correct territory was "${currentTarget.name}".`
      );
    }
  }

  setHUD();
}

// ===============================
// DATA LOADING
// ===============================

async function loadGeoJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (status ${res.status})`);
  return res.json();
}

// ===============================
// MAP INITIALIZATION
// ===============================

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  });

  const el = document.getElementById("map");
  if (el) el.style.background = "#0b0f14";

  // Fallback view on CA
  map.setView([37.25, -119.5], 6);

  // DEBUG DOT (San Francisco)
  L.circleMarker([37.7749, -122.4194], {
    radius: 6,
    color: "#ff00ff",
    weight: 2,
    fillOpacity: 1
  }).addTo(map);
}

function addOutline(geojson) {
  outlineLayer = L.geoJSON(geojson, {
    style: {
      color: "#ffffff",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0,
      lineJoin: "miter",
      lineCap: "butt"
    }
  }).addTo(map);

  map.fitBounds(outlineLayer.getBounds(), { padding: [20, 20] });
}

function addTerritories(geojson) {
  territories = [];

  territoriesLayer = L.geoJSON(geojson, {
    style: feature => {
      if (!hasValidMapName(feature)) {
        return { stroke: false, fillOpacity: 0 };
      }
      return {
        color: "#ffffff",
        weight: 0.7,
        opacity: 0.6,
        fillColor: "#ffffff",
        fillOpacity: 0.03,
        lineJoin: "miter",
        lineCap: "butt"
      };
    },
    onEachFeature: (feature, layer) => {
      if (!hasValidMapName(feature)) return;

      const name = String(feature.properties[TRIBE_NAME_FIELD]).trim();
      const entry = { feature, layer, name };

      layer.on("click", () => onTerritoryClick(entry));
      territories.push(entry);
    }
  }).addTo(map);
}

// ===============================
// UI WIRING
// ===============================

function wireUI() {
  document.getElementById("restart").onclick = startGame;
  document.getElementById("play-again").onclick = startGame;
}

// ===============================
// GAME START
// ===============================

function startGame() {
  hideOverlay();
  gameOver = false;
  score = 0;
  strikes = 0;

  resetStyles();
  chooseNextTarget();
  setHUD();
}

// ===============================
// MAIN
// ===============================

async function main() {
  initMap();
  wireUI();

  try {
    const [outline, tribes] = await Promise.all([
      loadGeoJSON("./data/ca_outline.geojson?v=20"),
      loadGeoJSON("./data/ca_tribes.geojson?v=20")
    ]);

    addOutline(outline);
    addTerritories(tribes);
    startGame();
  } catch (err) {
    console.error(err);
    showOverlay("Error loading data", err.message || String(err));
  }
}

main();
