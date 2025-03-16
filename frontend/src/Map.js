import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import pinImageIcon from './assets/pin_image.png'; // Import the pin image
import logo from './assets/logo.png'; // Import the logo
import SpotifyPlayer from './SpotifyPlayer'; // Import the Spotify player component
import './Map.css'; // Import CSS file for styling

const Map = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const spotifyPlayerRef = useRef(null);

  const [song, setSong] = useState('');
  const [pinDetails, setPinDetails] = useState(null);
  const [pins, setPins] = useState([]);
  const [newPinData, setNewPinData] = useState({
    song: '',
    latitude: null,
    longitude: null,
    spotifyMetadata: null,
  });

  const createCustomIcon = () => {
    return L.icon({
      iconUrl: pinImageIcon,
      iconSize: [25, 35],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  };

  const loadPins = useCallback(() => {
    axios
      .get('http://localhost:5173/api/pins')
      .then((response) => {
        const loadedPins = Array.isArray(response.data) ? response.data : [];
        setPins(loadedPins);
        Object.values(markersRef.current).forEach((marker) => {
          if (mapInstance.current) mapInstance.current.removeLayer(marker);
        });
        markersRef.current = {};
        loadedPins.forEach((pin) => {
          if (!pin.location || !pin.location.coordinates || pin.location.coordinates.length !== 2) {
            console.error('Invalid pin coordinates:', pin);
            return;
          }
          const lng = pin.location.coordinates[0];
          const lat = pin.location.coordinates[1];
          const marker = L.marker([lat, lng], { icon: createCustomIcon() })
            .addTo(mapInstance.current)
            .bindPopup(`Song: ${pin.song}`);
          marker.on('click', () => {
            setPinDetails(pin);
            mapInstance.current.setView([lat, lng], 13);
            if (pin.spotifyMetadata?.uri) {
              handlePinSongPlay(pin.spotifyMetadata.uri);
            }
          });
          markersRef.current[pin.pin_id] = marker;
        });
      })
      .catch((error) => console.error('Error loading pins:', error));
  }, []);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
      mapInstance.current.on('click', handleMapClick);
      loadPins();
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loadPins]);

  const handleMapClick = useCallback(
    (event) => {
      if (event.latlng) {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        setNewPinData({ ...newPinData, latitude: lat, longitude: lng });
        setPinDetails(null);
      }
    },
    [newPinData]
  );

  const handleSongChange = (event) => {
    setSong(event.target.value);
    setNewPinData({ ...newPinData, song: event.target.value });
  };

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

  const handleDeletePin = (pin_id) => {
    axios
      .delete(`http://localhost:5173/api/pins/${pin_id}`)
      .then(() => {
        if (markersRef.current[pin_id]) {
          mapInstance.current.removeLayer(markersRef.current[pin_id]);
          delete markersRef.current[pin_id];
        }
        setPins((prevPins) => prevPins.filter((pin) => pin.pin_id !== pin_id));
        setPinDetails(null);
      })
      .catch((error) => console.error('Error deleting pin:', error));
  };

  const handleSongSelect = (songTitle, spotifyMetadata) => {
    setSong(songTitle);
    setNewPinData({ ...newPinData, song: songTitle, spotifyMetadata });
  };

  const handlePinSongPlay = (songUri) => {
    if (spotifyPlayerRef.current) {
      spotifyPlayerRef.current.playSongByUri(songUri);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Map */}
      <div className="map-container" ref={mapRef}></div>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo at the top of the sidebar */}
        <img src={logo} alt="Logo" className="sidebar-logo" />

        {/* Pin Details or Create Pin Section */}
        <div className="pin-section">
          {pinDetails ? (
            <div>
              <h2>Pin Details</h2>
              <p><strong>Song:</strong> {pinDetails.song}</p>
              <p>
                <strong>Location:</strong> {pinDetails.location.coordinates[1]},{' '}
                {pinDetails.location.coordinates[0]}
              </p>
              {pinDetails.spotifyMetadata && (
                <p>
                  <strong>Artist:</strong> {pinDetails.spotifyMetadata.artist}
                </p>
              )}
              <button onClick={() => handleDeletePin(pinDetails.pin_id)} className="sidebar-button">
                Delete Pin
              </button>
            </div>
          ) : (
            <div>
              <h2>Create a New Pin</h2>
              <input
                type="text"
                placeholder="Song Name"
                value={newPinData.song}
                onChange={handleSongChange}
                className="sidebar-input"
              />
              <input
                type="number"
                placeholder="Latitude"
                value={newPinData.latitude || ''}
                onChange={(e) =>
                  setNewPinData({ ...newPinData, latitude: parseFloat(e.target.value) })
                }
                className="sidebar-input"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={newPinData.longitude || ''}
                onChange={(e) =>
                  setNewPinData({ ...newPinData, longitude: parseFloat(e.target.value) })
                }
                className="sidebar-input"
              />
              <button onClick={handleCreatePin} className="sidebar-button">
                Create Pin
              </button>
            </div>
          )}
        </div>

        {/* Spotify Player Section */}
        <div className="spotify-player-container">
          <SpotifyPlayer ref={spotifyPlayerRef} onSongSelect={handleSongSelect} />
        </div>
      </div>
    </div>
  );
};

export default Map;