// Initialize map
const map = L.map('map', {
    zoomControl: true,
    maxBoundsViscosity: 1.0
});

// Load Boundary
fetch('data/boundary.geojson')
    .then(res => res.json())
    .then(data => {
        const boundaryLayer = L.geoJSON(data, {
            style: {
                color: 'red',
                weight: 3,
                fillOpacity: 0,
                interactive: false // Prevents boundary from blocking clicks on buildings
            }
        }).addTo(map);

        const bounds = boundaryLayer.getBounds();
        
        // ✅ FIX 1: Set the view and restrictions
        map.fitBounds(bounds);
        map.setMaxBounds(bounds);

        // ✅ FIX 2: Prevent zooming out further than the initial fit
        // We wait a frame for fitBounds to calculate the zoom level
        map.setMinZoom(map.getBoundsZoom(bounds));
    });

let buildingLayer;

fetch('data/buildings.geojson')
    .then(res => res.json())
    .then(data => {
        buildingLayer = L.geoJSON(data, {
            style: {
                color: '#000000',
                weight: 1,
                fillColor: '#15c8ce',
                fillOpacity: 0.5
            },
            onEachFeature: function (feature, layer) {
    if (feature.properties && feature.properties.name) {
        const cleanText = `<span class="label-text">${feature.properties.name}</span>`;
        
        layer.bindTooltip(cleanText, {
            sticky: true,          // ✅ THIS IS THE KEY: Text follows the cursor
            direction: 'auto',     // Automatically picks the best side
            offset: [10, 10],      // Slight offset so it's not right under the cursor
            className: 'clean-label',
            opacity: 0             // Still controlled by your zoom logic
        });
    }
}
                   }).addTo(map);

        // Run once on load
        updateLabelVisibility();
    });

// ✅ Control visibility based on zoom level
function updateLabelVisibility() {
    const currentZoom = map.getZoom();
    const showZoom = 20; // Change this to 17 if you want them to show sooner

    if (buildingLayer) {
        buildingLayer.eachLayer(function (layer) {
            const tooltip = layer.getTooltip();
            if (tooltip) {
                // If zoomed in deep enough, show text, otherwise hide
                tooltip.setOpacity(currentZoom >= showZoom ? 1 : 0);
            }
        });
    }
}

// ✅ Listen for zoom changes
map.on('zoomend', updateLabelVisibility);


// Load Roads
fetch('data/roads.geojson')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: 'black',
                weight: 2
            }
        }).addTo(map);
    });


//YAARI
// 1. Define the custom vehicle icon
const vehicleIcon = L.icon({
    iconUrl: 'icons/yaari.png', // Example vehicle URL
    iconSize: [32, 32], // Size of the icon
    iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -32] // Point from which the popup should open relative to the iconAnchor
});

// 2. Coordinates for your 5 campus vehicles
const vehicleStartPositions = [
    { id: 1, name: "Yaari 1", coords: [17.988146085490865, 79.53070295189664] },
    { id: 2, name: "Yaari 2", coords: [17.9856902641259, 79.5307339502453] },
    { id: 3, name: "Yaari 3", coords: [17.981242060382183, 79.53010483313797] },
    { id: 4, name: "Yaari 4", coords: [17.984181958195908, 79.53337300135857] },
    { id: 5, name: "Yaari 5", coords: [17.982321833073634, 79.53216869555975] }
];

// 3. Add them to the map
const vehicleMarkers = [];

vehicleStartPositions.forEach(veh => {
    const marker = L.marker(veh.coords, { icon: vehicleIcon })
        .bindPopup(`<b>${veh.name}</b>`)
        .addTo(map);
    
    vehicleMarkers.push(marker);
}); 

  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDZ5MPA_k7J3mCVGDNtZtsebkfESI2NMck",
    authDomain: "cam-veh-track1.firebaseapp.com",
    projectId: "cam-veh-track1",
    storageBucket: "cam-veh-track1.firebasestorage.app",
    messagingSenderId: "516485459990",
    appId: "1:516485459990:web:8f8ef529d0c25f53164537"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

// Reference to your collection where driver locations are stored
const vehicleCol = collection(db, "vehicle_locations");

// This listener triggers every time ANY document in the collection changes
onSnapshot(vehicleCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const vehicleId = change.doc.id; // Assuming document ID is the vehicle name/ID

        if (change.type === "added" || change.type === "modified") {
            // Call your existing function to move the icon and update the label
            updateVehicleLocation(vehicleId, data.lat, data.lng);
        }
    });
});







// vehicle moving

// A storage object to keep track of markers by an ID (like a vehicle ID)
function updateVehicleLocation(vehicleId, lat, lng) {
    const coords = [lat, lng];
    const timestamp = new Date().toLocaleTimeString(); // Get local time of the update

    if (activeVehicles[vehicleId]) {
        // Move the existing marker
        activeVehicles[vehicleId].setLatLng(coords);
        
        // Update the label/popup with the timestamp
        activeVehicles[vehicleId].setPopupContent(
            `<b>Vehicle: ${vehicleId}</b><br>
             Status: On Road<br>
             Last Update: ${timestamp}`
        );
    } else {
        // Create marker if it's the first time this vehicle appears
        const marker = L.marker(coords, { icon: vehicleIcon })
            .bindPopup(`<b>Vehicle: ${vehicleId}</b><br>Last Update: ${timestamp}`)
            .addTo(map);
        
        activeVehicles[vehicleId] = marker;
    }
}

setInterval(() => {
    // Fetch data from your backend
    fetch('/api/get-vehicle-locations')
        .then(response => response.json())
        .then(data => {
            data.forEach(v => {
                updateVehicleLocation(v.id, v.lat, v.lng);
            });
        });
}, 5000); // Updates every 5 seconds