// Initialize the map with a center point and zoom level
var map = L.map("map").setView([51.505, -0.09], 13);

// Global flag to check if editing is active
var isEditing = false;

// Variable to hold the currently selected feature
var selectedFeature = null;

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
  layer.feature = { properties: {} }; // Initialize properties for storing metadata
  drawnItems.addLayer(layer);
  selectedFeature = layer; // Set selectedFeature to the newly created layer
  layer.on("click", function () {
    if (isEditing) {
      selectedFeature = layer; // Update selectedFeature on click
      openFeatureForm(layer);
    }
  });
  openFeatureForm(layer); // Open the feature form immediately after creation
});

// Set isEditing flag on edit start and stop
map.on("draw:editstart", function () {
  isEditing = true;
});

map.on("draw:editstop", function () {
  isEditing = false;
});

// Event listeners for editing and deleting features
map.on(L.Draw.Event.EDITED, handleEdit);
map.on(L.Draw.Event.DELETED, handleDelete);

// Handle editing of features to update their properties
function handleEdit(event) {
  event.layers.eachLayer(function (layer) {
    selectedFeature = layer; // Update selectedFeature when editing is completed
    saveFeatureDetails(); // Now just call saveFeatureDetails without passing layer
  });
}

// Handle feature deletions with confirmation
function handleDelete(event) {
  // Array to hold layers that might be restored if the user cancels the deletion
  var layersToRemove = [];

  event.layers.eachLayer(function (layer) {
    layersToRemove.push(layer);
  });

  // Ask for confirmation
  if (confirm("Are you sure you want to delete the selected features?")) {
    // If confirmed, remove each layer stored in the array
    layersToRemove.forEach((layer) => drawnItems.removeLayer(layer));
  } else {
    // If not confirmed, re-add each layer (this step may be handled automatically by Leaflet Draw, check your library version and configuration)
    layersToRemove.forEach((layer) => drawnItems.addLayer(layer));
  }
}

// Function to open the feature form with existing data
function openFeatureForm(layer) {
  document.getElementById("feature-form").style.display = "block";
  selectedFeature = layer;
  if (layer.feature && layer.feature.properties) {
    document.getElementById("feature-name").value =
      layer.feature.properties.name || "";
    document.getElementById("feature-type").value =
      layer.feature.properties.type || "";
    document.getElementById("feature-description").value =
      layer.feature.properties.description || "";
  } else {
    document.getElementById("feature-name").value = "";
    document.getElementById("feature-type").value = "";
    document.getElementById("feature-description").value = "";
  }
}

// Save or update feature details
function saveFeatureDetails() {
  if (selectedFeature) {
    var name = document.getElementById("feature-name").value;
    var type = document.getElementById("feature-type").value;
    var description = document.getElementById("feature-description").value;

    // Ensure properties object exists, then update properties
    selectedFeature.feature.properties = {
      name: name,
      type: type,
      description: description,
    };

    // Update the popup with the new name and immediately open it
    selectedFeature.bindPopup(name).openPopup();

    // If you have a changeMarkerColor function, update the color based on the type
    changeMarkerColor(selectedFeature, type);

    // Hide the form after saving
    document.getElementById("feature-form").style.display = "none";
  } else {
    alert("No feature selected!");
  }
}

// Function to change marker color based on type
function changeMarkerColor(layer, type) {
  var color;
  switch (type) {
    case "Park":
      color = "green";
      break;
    case "Playground":
      color = "red";
      break;
    case "Public Garden":
      color = "yellow";
      break;
    default:
      color = "blue";
  }
  if (layer.setStyle) {
    layer.setStyle({ color: color });
  }
}

// Close the feature form
function closeFeatureForm() {
  document.getElementById("feature-form").style.display = "none";
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

// Save the current state of the map to local storage
document.getElementById("save").addEventListener("click", function () {
  var data = drawnItems.toGeoJSON();
  localStorage.setItem("mapData", JSON.stringify(data));
  alert("Data saved locally!");
});

// Search functionality to find features
function searchFeatures() {
  var searchText = document.getElementById("search").value.toLowerCase();
  var searchType = document.querySelector(
    'input[name="searchType"]:checked'
  ).value;
  var found = false;
  var resultsContainer = document.getElementById("search-results");
  resultsContainer.innerHTML = ""; // Clear previous results

  drawnItems.eachLayer(function (layer) {
    var name = layer.feature?.properties?.name?.toLowerCase();
    var description = layer.feature?.properties?.description?.toLowerCase();

    if (
      (searchType === "name" && name && name.includes(searchText)) ||
      (searchType === "description" &&
        description &&
        description.includes(searchText))
    ) {
      found = true;

      // If searching by name, zoom and open popup
      if (searchType === "name") {
        // Check if layer is a marker
        if (layer instanceof L.Marker) {
          map.setView(layer.getLatLng(), 14); // Zoom to feature
          layer.openPopup(); // Open popup
        } else {
          // Handle non-marker layers differently, maybe center on bounds
          map.fitBounds(layer.getBounds());
        }
      } else {
        // searchType === 'description'
        // Create list item for each matching feature
        var listItem = document.createElement("li");
        listItem.textContent =
          layer.feature?.properties?.name + " - " + description;
        listItem.onclick = function () {
          if (layer instanceof L.Marker) {
            map.setView(layer.getLatLng(), 14); // Zoom to feature
            layer.openPopup(); // Open popup
          } else {
            // For non-markers, zoom to bounds
            map.fitBounds(layer.getBounds());
          }
          openFeatureForm(layer); // Open form with feature details
        };
        resultsContainer.appendChild(listItem);
      }
    }
  });
  if (!found) alert("No feature found with that " + searchType + ".");
}

// Add event listener to the search button
document.getElementById("searchBtn").addEventListener("click", searchFeatures);

document.getElementById("clearBtn").addEventListener("click", function () {
  document.getElementById("search").value = ""; // Clear the search input
  var resultsContainer = document.getElementById("search-results");
  if (resultsContainer) {
    resultsContainer.innerHTML = ""; // Optionally clear search results
  }
});

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
  var coordsInput = document.getElementById("feature-coordinates");

  var lat = e.latlng.lat.toFixed(4);
  var lng = e.latlng.lng.toFixed(4);

  coordsArea.innerHTML = "You clicked the map at " + lat + ", " + lng;
  if (coordsInput) {
    coordsInput.value = lat + ", " + lng; // Update the read-only input with coordinates
  }
});
