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
    const [pinDetails, setPinDetails] = useState(null);
    const [pins, setPins] = useState([]);

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

    // Load existing pins
    const loadPins = useCallback(() => {
        axios.get('http://localhost:5173/api/pins')
            .then(response => {
                // Store the pins from the response
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
                    
                    // Extract coordinates (ensuring correct order)
                    const lng = pin.location.coordinates[0]; // Longitude is first value in GeoJSON
                    const lat = pin.location.coordinates[1]; // Latitude is second value in GeoJSON
                    
                    // Create and add marker
                    const marker = L.marker([lat, lng], {
                        icon: createCustomIcon()
                    }).addTo(mapInstance.current).bindPopup(`Song: ${pin.song}`);
                    
                    // Store reference to marker
                    markersRef.current[pin.pin_id] = marker;
                });
            })
            .catch(error => {
                console.error('Error loading pins:', error);
            });
    }, []);

    // Initialize the map and load existing pins
    useEffect(() => {
        // Initialize the map only once
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
            
            // Attach the click event handler
            mapInstance.current.on('click', handleMapClick);
            
            // Load existing pins after map is initialized
            loadPins();
        }
        
        // Cleanup function
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []); // Empty dependency array - we handle loadPins inside

    // Memoize handleMapClick to avoid re-creating it on every render
    const handleMapClick = useCallback((event) => {
        console.log('Map clicked', event);

        if (event.latlng) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;

            // Sample pin data
            const pinData = {
                song: song || "Shape of You",
                user_id: "12345",
                location: { 
                    type: "Point", 
                    coordinates: [lng, lat] // Store as [longitude, latitude]
                },
                pin_image: '/assets/pin_image.png'
            }

            axios.post('http://localhost:5173/api/pins/create', pinData)
                .then(response => {
                    setPinDetails(response.data.pin);
                    const marker = L.marker([lat, lng], {
                        icon: createCustomIcon()
                    }).addTo(mapInstance.current).bindPopup(`Song: ${song || pinData.song}`).openPopup();
                    
                    if (response.data.pin && response.data.pin.pin_id) {
                        markersRef.current[response.data.pin.pin_id] = marker;
                        setPins(prevPins => [...prevPins, response.data.pin]);
                    }
                })
                .catch(error => {
                    console.error('Error creating pin:', error);
                });
        } else {
            console.error('event.latlng is undefined');
        }
    }, [song]);

    // Handle song input
    const handleSongChange = (event) => {
        setSong(event.target.value);
    };

    // Handle pin deletion
    const handleDeletePin = (pin_id) => {
        // Use the route from pinRoutes.js which is '/:id'
        axios.delete(`http://localhost:5173/api/pins/${pin_id}`)
            .then(() => {
                // Remove the marker from the map
                if (markersRef.current[pin_id]) {
                    mapInstance.current.removeLayer(markersRef.current[pin_id]);
                    delete markersRef.current[pin_id];
                }
                // Update the pins state
                setPins(prevPins => prevPins.filter(pin => pin.pin_id !== pin_id));
            })
            .catch(error => {
                console.error('Error deleting pin:', error);
            });
    };

    return (
        <div>
            <div style={{ height: '100vh' }} ref={mapRef}></div>

            {/* Song Input */}
            <div>
                <input
                    type="text"
                    value={song}
                    onChange={handleSongChange}
                    placeholder="Enter song name"
                />
            </div>

            {/* Pin Details Confirmation */}
            {pinDetails && (
                <div>
                    <h3>Pin Created</h3>
                    <p>Pin ID: {pinDetails.pin_id}</p>
                    <p>Song: {pinDetails.song}</p>
                    <p>Location: {pinDetails.location.coordinates[0]}, {pinDetails.location.coordinates[1]}</p>
                </div>
            )}

            {/* List of Pins */}
            <div>
                <h3>Existing Pins</h3>
                <ul>
                    {pins.map(pin => (
                        <li key={pin.pin_id}>
                            {pin.song} - {pin.location.coordinates[0]}, {pin.location.coordinates[1]}
                            <button onClick={() => handleDeletePin(pin.pin_id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Map;
