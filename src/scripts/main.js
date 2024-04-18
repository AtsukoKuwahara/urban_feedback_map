// Initialize the map with a center point and zoom level
var map = L.map("map").setView([51.505, -0.09], 13);

// Add OpenStreetMap tiles to the map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Create a feature group to store all drawn items
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize the Leaflet Draw control and add it to the map
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

// Event listener for creating new map features
map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  layer.feature = { properties: {} }; // Initialize properties for storing metadata like descriptions
  drawnItems.addLayer(layer);
  openTextForm(layer); // Open the text form to enter descriptions immediately after creation
});

// Listen for the start of edit mode to bind click events for editing feature descriptions
map.on("draw:editstart", function () {
  drawnItems.eachLayer(function (layer) {
    layer.on("click", openTextForm);
  });
});

// Cleanup after editing is completed
map.on("draw:editstop", function () {
  drawnItems.eachLayer(function (layer) {
    layer.off("click", openTextForm);
  });
});

// Function to open the text input form for descriptions
function openTextForm(e) {
  var layer = e.target || e;
  var existingText = layer.getPopup() ? layer.getPopup().getContent() : "";
  document.getElementById("featureText").value = existingText;
  document.getElementById("textForm").style.display = "block";
  selectedFeature = layer;
  document.getElementById("featureText").focus();
}

// Save the entered description to the feature and update the popup
function saveFeatureText() {
  var textInput = document.getElementById("featureText").value.trim();
  if (selectedFeature && textInput) {
    selectedFeature.bindPopup(textInput).openPopup();
    selectedFeature.feature.properties.description = textInput;
    document.getElementById("textForm").style.display = "none";
    document.getElementById("featureText").value = "";
  } else {
    alert("No feature selected or no text entered!");
  }
}

// Close the text form without saving
function closeTextForm() {
  document.getElementById("textForm").style.display = "none";
}

// Load saved map data from local storage on page load
document.addEventListener("DOMContentLoaded", function () {
  var savedData = localStorage.getItem("mapData");
  if (savedData) {
    var geojson = JSON.parse(savedData);
    L.geoJSON(geojson, {
      onEachFeature: function (feature, layer) {
        layer.feature = feature;
        drawnItems.addLayer(layer);
        if (feature.properties && feature.properties.description) {
          layer.bindPopup(feature.properties.description);
        }
      },
    }).addTo(map);
  }
});

// Event listeners for editing and deleting features
map.on(L.Draw.Event.EDITED, handleEdit);
map.on(L.Draw.Event.DELETED, handleDelete);

// Handle editing of features to update their popups
function handleEdit(event) {
  event.layers.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties) {
      layer.bindPopup(layer.feature.properties.description);
    }
  });
}

// Confirm before deleting any features
function handleDelete(event) {
  event.layers.eachLayer(function (layer) {
    if (confirm("Are you sure you want to delete this feature?")) {
      drawnItems.removeLayer(layer);
    } else {
      drawnItems.addLayer(layer);
    }
  });
}

// Save the current state of the map to local storage
document.getElementById("save").addEventListener("click", function () {
  var data = drawnItems.toGeoJSON();
  localStorage.setItem("mapData", JSON.stringify(data));
  alert("Data saved locally!");
});

// Search functionality to find features by description
function searchFeatures() {
  var searchText = document.getElementById("search").value.toLowerCase();
  var found = false;
  drawnItems.eachLayer(function (layer) {
    var desc = layer.feature?.properties?.description?.toLowerCase();
    if (desc && desc.includes(searchText)) {
      map.setView(layer.getLatLng(), 14);
      layer.openPopup();
      found = true;
      return;
    }
  });
  if (!found) alert("No feature found with that description.");
}

// Add event listener to the search button
document.getElementById("searchBtn").addEventListener("click", searchFeatures);

// Geocode locations entered in the location form and move the map to that location
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

// Display coordinates where the map is clicked
map.on("click", function (e) {
  var coordsArea = document.getElementById("coords");
  coordsArea.innerHTML =
    "You clicked the map at " +
    e.latlng.lat.toFixed(4) +
    ", " +
    e.latlng.lng.toFixed(4);
});
