import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import pinImageIcon from './assets/pin_image.png'; // Import the pin image

const Map = () => {
    const mapRef = useRef(null); // This will hold the map DOM element
    const mapInstance = useRef(null); // This will hold the map instance, ensuring it is created only once
    const markersRef = useRef({}); // Store markers with pin_id as key

    const [song, setSong] = useState(''); // Track song input
    const [pinDetails, setPinDetails] = useState(null); // Selected pin details for sidebar
    const [pins, setPins] = useState([]);
    const [newPinData, setNewPinData] = useState({
        song: '',
        latitude: null,
        longitude: null,
    });

    // Create a custom icon using the imported image
    const createCustomIcon = () => {
        return L.icon({
            iconUrl: pinImageIcon,
            iconSize: [25, 35],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    };

    // Load existing pins from the backend
    const loadPins = useCallback(() => {
        axios.get('http://localhost:5173/api/pins')
            .then(response => {
                const loadedPins = Array.isArray(response.data) ? response.data : [];
                setPins(loadedPins);
                // Clear existing markers
                Object.values(markersRef.current).forEach(marker => {
                    if (mapInstance.current) {
                        mapInstance.current.removeLayer(marker);
                    }
                });
                markersRef.current = {};

                // Add markers for each pin
                loadedPins.forEach(pin => {
                    if (!pin.location || !pin.location.coordinates || pin.location.coordinates.length !== 2) {
                        console.error('Invalid pin coordinates:', pin);
                        return;
                    }

                    const lng = pin.location.coordinates[0];
                    const lat = pin.location.coordinates[1];

                    // Create and add marker
                    const marker = L.marker([lat, lng], {
                        icon: createCustomIcon()
                    }).addTo(mapInstance.current).bindPopup(`Song: ${pin.song}`);

                    // Store reference to marker
                    marker.on('click', () => {
                        // Show the clicked pin's details in the sidebar
                        setPinDetails(pin);
                        mapInstance.current.setView([lat, lng], 13);
                    });

                    markersRef.current[pin.pin_id] = marker;
                });
            })
            .catch(error => {
                console.error('Error loading pins:', error);
            });
    }, []);

    // Initialize the map and load existing pins
    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
            mapInstance.current.on('click', handleMapClick);

            loadPins(); // Load existing pins after map is initialized
        }

        // Cleanup function to remove map instance
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [loadPins]);

    // Handle map click to create a new pin
    const handleMapClick = useCallback((event) => {
        if (event.latlng) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;

            // Set the new pin data for the sidebar form
            setNewPinData({
                ...newPinData,
                song: "what the fuck",
                latitude: lat,
                longitude: lng,
            });
            setPinDetails(null); // Close pin details when creating a new pin
        }
    }, [newPinData]);

    // Handle song input change
    const handleSongChange = (event) => {
        setSong(event.target.value);
    };

    // Handle pin creation through the sidebar form
    const handleCreatePin = () => {
        const { song, latitude, longitude } = newPinData;

        if (!song || !latitude || !longitude) {
            alert('Please provide song name and valid coordinates');
            return;
        }

        const pinData = {
            song,
            user_id: '12345', // Replace with actual user logic
            location: { type: 'Point', coordinates: [latitude, longitude] },
        };

        axios.post('http://localhost:5173/api/pins/create', pinData)
            .then(response => {
                setPins(prevPins => [...prevPins, response.data.pin]); // Add the new pin to the state
                setNewPinData({ song: '', latitude: null, longitude: null }); // Reset new pin data
                loadPins(); // Reload the pins to reflect the new pin
            })
            .catch(error => {
                console.error('Error creating pin:', error);
            });
    };

    // Handle pin deletion
    const handleDeletePin = (pin_id) => {
        axios.delete(`http://localhost:5173/api/pins/${pin_id}`)
            .then(() => {
                // Remove the marker from the map
                if (markersRef.current[pin_id]) {
                    mapInstance.current.removeLayer(markersRef.current[pin_id]);
                    delete markersRef.current[pin_id];
                }
                // Update the pins state
                setPins(prevPins => prevPins.filter(pin => pin.pin_id !== pin_id));
                setPinDetails(null); // Close sidebar after deletion
            })
            .catch(error => {
                console.error('Error deleting pin:', error);
            });
    };

    return (
        <div>
            <div style={{ height: '80vh' }} ref={mapRef}></div>

            {/* Sidebar for displaying pin details and creating a new pin */}
            <div className="sidebar">
                {pinDetails ? (
                    <div>
                        <h2>Pin Details</h2>
                        <p><strong>Song:</strong> {pinDetails.song}</p>
                        <p><strong>Location:</strong> {pinDetails.location.coordinates[1]}, {pinDetails.location.coordinates[0]}</p>
                        <button onClick={() => handleDeletePin(pinDetails.pin_id)}>Delete Pin</button>
                    </div>
                ) : (
                    <div>
                        <h2>Create a New Pin</h2>
                        <input
                            type="text"
                            placeholder="Song Name"
                            value={newPinData.song}
                            onChange={handleSongChange}
                        />
                        <input
                            type="number"
                            placeholder="Latitude"
                            value={newPinData.latitude || ''}
                            onChange={(e) => setNewPinData({ ...newPinData, latitude: parseFloat(e.target.value) })}
                        />
                        <input
                            type="number"
                            placeholder="Longitude"
                            value={newPinData.longitude || ''}
                            onChange={(e) => setNewPinData({ ...newPinData, longitude: parseFloat(e.target.value) })}
                        />
                        <button onClick={handleCreatePin}>Create Pin</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Map;
