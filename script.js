// ===============================
// CONFIG
// ===============================

const TRIBE_NAME_FIELD = "mapname"; // 
const MAX_STRIKES = 1; // game ends on first wrong click

// ===============================
// STATE
// ===============================

let map;
let territoriesLayer;
let outlineLayer;

let territories = []; // { feature, name, layer }
let currentTarget = null;
let score = 0;
let strikes = 0;
let gameOver = false;

// ===============================
// UI HELPERS
// ===============================

function setHUD() {
  document.getElementById("prompt").textContent = currentTarget
    ? currentTarget.name
    : "—";
  document.getElementById("score").textContent = score;
  document.getElementById("strikes").textContent = strikes;
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
      weight: 1,
      opacity: 0.6,
      fillColor: "#ffffff",
      fillOpacity: 0.03
    });
  });
}

function highlight(layer, type) {
  if (type === "correct") {
    layer.setStyle({
      color: "#3fb950",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.15
    });
  } else {
    layer.setStyle({
      color: "#ff6b6b",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.15
    });
  }
}

// ===============================
// GAME LOGIC
// ===============================

function chooseNextTarget() {
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

    setHUD();

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
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

// ===============================
// MAP INITIALIZATION
// ===============================

function initMap() {
  map = L.map("map");

//  L.tileLayer(
//    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
//    { attribution: "&copy; OpenStreetMap &copy; CARTO" }
//  ).addTo(map);
//}

function addOutline(geojson) {
  outlineLayer = L.geoJSON(geojson, {
    style: {
      color: "#ffffff",
      weight: 2,
      fillOpacity: 0
    }
  }).addTo(map);

  map.fitBounds(outlineLayer.getBounds(), { padding: [20, 20] });
}

function addTerritories(geojson) {
  territories = [];

  function addTerritories(geojson) {
  territories = [];

  territoriesLayer = L.geoJSON(geojson, {
    style: feature => {
      if (!hasValidMapName(feature)) {
        // shared / liminal territory
        return {
          stroke: false,
          fillOpacity: 0   // invisible
        };
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
      if (!hasValidMapName(feature)) {
        // optional: tooltip for learn mode later
        return;
      }

      const name = feature.properties.mapname.trim();
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
      loadGeoJSON("./data/ca_outline.geojson"),
      loadGeoJSON("./data/ca_tribes.geojson")
    ]);

    addOutline(outline);
    console.log("Outline bounds:", outlineLayer.getBounds());
    addTerritories(tribes);
    startGame();
  } catch (err) {
    console.error(err);
    showOverlay("Error loading data", err.message);
  }
}

main();
