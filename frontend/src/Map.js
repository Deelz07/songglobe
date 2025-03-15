import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const Map = () => {
    const mapRef = useRef(null); // This will hold the map DOM element
    const mapInstance = useRef(null); // This will hold the map instance, ensuring it is created only once

    const [song, setSong] = useState(''); // Track song input
    const [pinDetails, setPinDetails] = useState(null);

    // Initialize the map (only once)
    useEffect(() => {
        if (!mapInstance.current) {
            // Initialize the map only once
            mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13); // Default center coordinates

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

            // Attach the click event handler after map initialization
            mapInstance.current.on('click', handleMapClick);
        }
    }, []); // Empty dependency array ensures this effect runs only once

    // Memoize handleMapClick to avoid re-creating it on every render
    const handleMapClick = useCallback((event) => {
        console.log('Map clicked', event); // Debugging: Log when the map is clicked

        if (event.latlng) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;

            // sample pin data
            const pinData = {
                song: "Shape vvvvvvvv You",
                user_id: "12345",
                location: { type: "Point", coordinates: [event.latlng.lat,lng] }
            }

            axios.post('http://localhost:5173/api/pins/create', pinData)
                .then(response => {
                    setPinDetails(response.data.pin);  // Save response to show confirmation
                    L.marker([lat, lng]).addTo(mapInstance.current).bindPopup(`Song: ${song}`).openPopup();
                })
                .catch(error => {
                    console.error('Error creating pin:', error);
                });
        } else {
            console.error('event.latlng is undefined');
        }
    }, [song]); // Memoize this function with `song` as a dependency

    // Handle song input
    const handleSongChange = (event) => {
        setSong(event.target.value);
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
        </div>
    );
};

export default Map;
