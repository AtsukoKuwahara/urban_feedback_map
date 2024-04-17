// Setup the map
var map = L.map("map").setView([51.505, -0.09], 13);

// Add tile layer to the map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Feature group to store drawn items
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize draw control and add it to the map
var drawControl = new L.Control.Draw({
  edit: { featureGroup: drawnItems },
  draw: {
    polygon: { allowIntersection: false, showArea: true },
    polyline: true,
    rect: true,
    circle: true,
    marker: true,
  },
});
map.addControl(drawControl);

// Event listeners for draw operations
map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  layer.feature = { properties: {} }; // Initialize properties right away
  drawnItems.addLayer(layer);
  openTextForm(layer); // Immediately open the form for entering description
});

map.on(L.Draw.Event.EDITED, handleEdit);
map.on(L.Draw.Event.DELETED, handleDelete);

// When Editing Existing Features, show the text input form
// Event when the edit mode starts
map.on("draw:editstart", function (e) {
  drawnItems.eachLayer(function (layer) {
    layer.on("click", openTextForm);
  });
});

// Event when the edit mode stops
map.on("draw:editstop", function (e) {
  drawnItems.eachLayer(function (layer) {
    layer.off("click", openTextForm); // Disable the text form popup
  });
});

// Save feature text and properties
function saveFeatureText() {
  var textInput = document.getElementById("featureText").value.trim();
  if (selectedFeature && textInput) {
    selectedFeature.bindPopup(textInput).openPopup(); // Bind popup with new text
    // Set or update feature properties
    if (!selectedFeature.feature) selectedFeature.feature = { properties: {} };
    selectedFeature.feature.properties.description = textInput; // Save description
    document.getElementById("textForm").style.display = "none";
    document.getElementById("featureText").value = "";
  } else {
    alert("No feature selected or no text entered!");
  }
}

// Hide the form
function closeTextForm() {
  document.getElementById("textForm").style.display = "none";
}

// Open text form for editing descriptions
function openTextForm(e) {
  var layer = e.target || e; // Adapt based on whether the event or direct layer is passed
  var existingText = layer.getPopup() ? layer.getPopup().getContent() : "";
  document.getElementById("featureText").value = existingText;
  document.getElementById("textForm").style.display = "block";
  selectedFeature = layer; // Ensure this is globally accessible if needed
  document.getElementById("featureText").focus();
}

// GeoJSON data handling
document.getElementById("save").addEventListener("click", function () {
  var data = drawnItems.toGeoJSON();
  localStorage.setItem("mapData", JSON.stringify(data));
  alert("Data saved locally!");
});

document.addEventListener("DOMContentLoaded", loadMapData);

function loadMapData() {
  var savedData = localStorage.getItem("mapData");
  if (savedData) {
    var geojson = JSON.parse(savedData);
    L.geoJSON(geojson, {
      onEachFeature: function (feature, layer) {
        layer.feature = feature; // Ensure each layer knows its feature data
        drawnItems.addLayer(layer);
        if (feature.properties && feature.properties.description) {
          layer.bindPopup(feature.properties.description);
        }
      },
    }).addTo(map);
    setupFeatureEdit(); // Setup edit handlers after loading
  }
}

// Search feature by description
function searchFeatures() {
  var searchText = document.getElementById("search").value.toLowerCase();
  var found = false;
  drawnItems.eachLayer(function (layer) {
    if (
      layer.feature &&
      layer.feature.properties &&
      layer.feature.properties.description.toLowerCase().includes(searchText)
    ) {
      map.setView(layer.getLatLng(), 14);
      layer.openPopup();
      found = true;
      return;
    }
  });
  if (!found) alert("No feature found with that description.");
}

// Add event listener for search
document.getElementById("searchBtn").addEventListener("click", searchFeatures);

// Handle feature edits
function handleEdit(event) {
  event.layers.eachLayer(function (layer) {
    if (
      layer.feature &&
      layer.feature.properties &&
      layer.feature.properties.description
    ) {
      layer.bindPopup(layer.feature.properties.description);
    }
  });
}

// Setup feature editing on load
function setupFeatureEdit() {
  drawnItems.eachLayer(function (layer) {
    layer.on("click", function (e) {
      openTextForm(layer);
    });
  });
}

// Handle feature deletions
function handleDelete(event) {
  event.layers.eachLayer(function (layer) {
    if (confirm("Are you sure you want to delete this feature?")) {
      drawnItems.removeLayer(layer);
    } else {
      drawnItems.addLayer(layer);
    }
  });
}

// Display clicked location coordinates
map.on("click", function (e) {
  var coordsArea = document.getElementById("coords");
  coordsArea.innerHTML =
    "You clicked the map at " +
    e.latlng.lat.toFixed(4) +
    ", " +
    e.latlng.lng.toFixed(4);
});

// Geocoding from location input
document
  .getElementById("location-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    var locationInput = document.getElementById("location-input").value;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationInput
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          var firstResult = data[0];
          map.setView([firstResult.lat, firstResult.lon], 13);
          L.marker([firstResult.lat, firstResult.lon])
            .addTo(map)
            .bindPopup("Searched location")
            .openPopup();
        } else {
          alert("Location not found!");
        }
      })
      .catch((error) => console.error("Error during geocoding:", error));
  });
