// Set Up the Map
var map = L.map("map").setView([51.505, -0.09], 13);

// Add a tile layer
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Add a default marker
L.marker([51.5, -0.09]).addTo(map);

// Add a click event
var popup = L.popup();

function onMapClick(e) {
  var coordsArea = document.getElementById("coords");
  coordsArea.innerHTML =
    "You clicked the map at " +
    e.latlng.lat.toFixed(4) +
    ", " +
    e.latlng.lng.toFixed(4);
}

map.on("click", onMapClick);

// Leaflet Draw
// Add the draw control to the map
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    poly: {
      allowIntersection: false,
    },
  },
  draw: {
    polygon: {
      allowIntersection: false,
      showArea: true,
    },
    polyline: true,
    rect: true,
    circle: true,
    marker: true,
  },
});
map.addControl(drawControl);

// Function to initialize edit handlers for each layer
function setupFeatureEdit() {
  drawnItems.eachLayer(function (layer) {
    layer.on("contextmenu", function (e) {
      var existingText = layer.getPopup() ? layer.getPopup().getContent() : "";
      document.getElementById("featureText").value = existingText;
      document.getElementById("textForm").style.display = "block";
      selectedFeature = layer;
      document.getElementById("featureText").focus();
      L.DomEvent.stopPropagation(e);
    });
  });
}

// Event lister: Creates, Edits, and Deletes
map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  layer.feature = { properties: {} }; // Initialize properties right away
  drawnItems.addLayer(layer);
  openTextForm(layer); // Immediately open the form for entering description
});

// Handle edits
map.on(L.Draw.Event.EDITED, function (event) {
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    console.log("Edited layer ID:", L.stamp(layer));
    // Optionally save these changes to a server or local storage
  });
});

// Handle deletions with confirmation
map.on(L.Draw.Event.DELETED, function (event) {
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (confirm("Are you sure you want to delete this feature?")) {
      drawnItems.removeLayer(layer);
      console.log("Deleted layer ID:", L.stamp(layer));
    } else {
      // If they do not confirm, re-add the layer to the map
      drawnItems.addLayer(layer);
    }
  });
});

// When Creating new Features, show the text input form
// Modify the Event Listener for Creating Features
map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  drawnItems.addLayer(layer); // Add the new layer to a feature group
  selectedFeature = layer; // Set the newly created feature as selected
  console.log("Showing form");
  document.getElementById("textForm").style.display = "block"; // Show the text input form
  document.getElementById("featureText").focus(); // Optionally set focus to the textarea
});

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

// Function to open the text form
function openTextForm(e) {
  var layer = e.target;
  var existingText = layer.getPopup() ? layer.getPopup().getContent() : "";
  document.getElementById("featureText").value = existingText;
  document.getElementById("textForm").style.display = "block";
  selectedFeature = layer;
  document.getElementById("featureText").focus();
}

// Save changes made to the feature text
function saveFeatureText() {
  var textInput = document.getElementById("featureText").value.trim();
  if (selectedFeature && textInput !== "") {
    if (!selectedFeature.feature) {
      selectedFeature.feature = { properties: {} }; // Initialize properties if none
    }
    selectedFeature.feature.properties.description = textInput; // Save description
    selectedFeature.bindPopup(textInput).openPopup(); // Bind popup and show it
    document.getElementById("textForm").style.display = "none";
    document.getElementById("featureText").value = "";
  } else {
    alert("No feature selected or no text entered!");
  }
}

function closeTextForm() {
  document.getElementById("textForm").style.display = "none"; // Hide the form
}

// Function to search through the features
function searchFeatures() {
  var searchText = document.getElementById("search").value.toLowerCase();
  var found = false;
  drawnItems.eachLayer(function (layer) {
    var desc =
      layer.feature && layer.feature.properties
        ? layer.feature.properties.description
        : "";
    if (desc && desc.toLowerCase().includes(searchText)) {
      map.setView(layer.getLatLng(), 14); // Zoom to the feature
      layer.openPopup();
      found = true;
      return;
    }
  });
  if (!found) alert("No feature found with that description.");
}

// Adding a search button listener
document.getElementById("searchBtn").addEventListener("click", function () {
  searchFeatures();
});

// Save to GeoJSON
// Save data to Local Storage
document.getElementById("save").addEventListener("click", function () {
  var data = drawnItems.toGeoJSON();
  localStorage.setItem("mapData", JSON.stringify(data));
  alert("Data saved locally!");
});

// Load from GeoJSON
// Load data from Local Storage
document.addEventListener("DOMContentLoaded", function () {
  var savedData = localStorage.getItem("mapData");
  if (savedData) {
    var geojson = JSON.parse(savedData);
    L.geoJSON(geojson, {
      onEachFeature: function (feature, layer) {
        drawnItems.addLayer(layer);
        if (feature.properties && feature.properties.description) {
          layer.bindPopup(feature.properties.description);
        }
      },
    }).addTo(map);
    setupFeatureEdit();
  }
});

// Geocoding
document
  .getElementById("location-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    var locationInput = document.getElementById("location-input").value;

    // Use OpenStreetMap Nominatim API to geocode the address
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationInput
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          var firstResult = data[0];
          var lat = firstResult.lat;
          var lon = firstResult.lon;

          // Create a marker and center the map on the result location
          var marker = L.marker([lat, lon]).addTo(map).bindPopup("I am here.");
          map.setView([lat, lon], 13);
        } else {
          alert("Location not found!");
        }
      })
      .catch((error) => console.log("Error during geocoding:", error));
  });
