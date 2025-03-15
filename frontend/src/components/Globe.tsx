// src/components/Globe.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';



// Type definitions
interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
  country: string;
  timezone?: string;
}

interface RegionDetails {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string;
  details?: string;
}

const GlobeComponent = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(15);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Add location state variables
  const [selectedLocation, setSelectedLocation] = useState<RegionDetails | null>(null);
  const [showCoordinatesPanel, setShowCoordinatesPanel] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [inputCoordinates, setInputCoordinates] = useState({ lat: 0, lng: 0 });
  const [searchInput, setSearchInput] = useState('');
  
  // Add reference to the globe mesh
  const globeRef = useRef<THREE.Mesh | null>(null);
  
  // Add reference to markers group
  const markersRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const containerWidth = mountRef.current.clientWidth;
    const containerHeight = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, containerWidth / containerHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.z = 15;
    setZoomLevel(15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setClearColor(0x000000, 1); // Solid black background as limiter
    mountRef.current.appendChild(renderer.domElement);

    // Starry background
    const starGeometry = new THREE.SphereGeometry(100, 32, 32);
    const starTexture = new THREE.TextureLoader().load('/stars-background.jpg');
    const starMaterial = new THREE.MeshBasicMaterial({
      map: starTexture,
      side: THREE.BackSide,
    });
    const starField = new THREE.Mesh(starGeometry, starMaterial);
    starField.scale.set(1, 2, 1); // Stretch vertically
    scene.add(starField);

    // Globe setup with Earth texture
    const textureLoader = new THREE.TextureLoader();
    const globeGeometry = new THREE.SphereGeometry(5, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load('/earth-8k.jpg'),
      // specularMap: textureLoader.load('/earth-specular-8k.jpg'),
      // bumpMap: textureLoader.load('/earth-bump-8k.jpg'),
      // bumpScale: 0.05,
      // shininess: 25,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.rotation.x = (23.5 * Math.PI) / 180; // Earth's axial tilt
    scene.add(globe);
    globeRef.current = globe;
    
    // Create a group for markers
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersRef.current = markersGroup;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Interaction variables
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const minZoom = 5.5;
    const maxZoom = 18;

    // Auto-rotation
    let lastInteractionTime = Date.now();
    const autoRotationDelay = 1000;
    const autoRotationSpeed = 0.0001;
    let isAutoRotating = true;
    let userRotationY = 0;

    // Raycaster for detecting clicks on the globe
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Function to convert lat/lng to 3D coordinates
    const latLngToVector3 = (lat: number, lng: number, radius: number = 5): THREE.Vector3 => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      
      return new THREE.Vector3(x, y, z);
    };
    
    // Function to convert 3D coordinates to lat/lng
    const vector3ToLatLng = (position: THREE.Vector3): { lat: number, lng: number } => {
      const radius = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      
      // Calculate latitude
      const phi = Math.acos(position.y / radius);
      const lat = 90 - (phi * (180 / Math.PI));
      
      // Calculate longitude
      const theta = Math.atan2(position.z, -position.x);
      const lng = (theta * (180 / Math.PI)) - 180;
      
      return { lat, lng };
    };

    const BASE_SIZE = 0.1
    const MIN_SCALE = 0.03;  // Minimum scale factor
    const MAX_SCALE = 2.0;  // Maximum scale factor

    // Create a pin at a specific lat/lng
    const createMarker = (lat: number, lng: number, color: number = 0xff4136): THREE.Mesh => {
      const markerGeometry = new THREE.SphereGeometry(BASE_SIZE, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      
      // Position the marker at the correct lat/lng
      const position = latLngToVector3(lat, lng, 5.05); // Slightly above the globe surface
      marker.position.copy(position);
      
      // Store lat/lng data with the marker
      marker.userData = { lat, lng };
      
      //initial scale
      marker.scale.set(1, 1, 1);

      // Add to markers group
      markersGroup.add(marker);
      
      return marker;
    };
    
    //scale marker size with CAMERA 
    const scaleMarkerSize = () => {
      if (!markersRef.current || !cameraRef.current) return;
  
      // Get the current zoom level (camera distance)
      const zoom = cameraRef.current.position.z;
      
      // Calculate scale factor based on zoom level
      // When zoom is at minZoom (5.5), scale should be MAX_SCALE
      // When zoom is at maxZoom (18), scale should be MIN_SCALE
      const scaleFactor = THREE.MathUtils.lerp(
        MIN_SCALE,
        MAX_SCALE,
        (zoom - minZoom) / (maxZoom - minZoom)
      );
      
      // Apply scale to all markers
      markersRef.current.children.forEach((marker) => {
        marker.scale.set(scaleFactor, scaleFactor, scaleFactor);
      });
    }

    // Function to get country/region from lat/lng
    // In a real implementation, you'd use a GeoJSON dataset or API
    const getLocationInfo = async (lat: number, lng: number): Promise<RegionDetails | null> => {
      // This is a simplified mockup - in real usage you'd query a geographical database or API
      // Sample locations for demo
      const locations: GeoLocation[] = [
        { lat: 40.7128, lng: -74.006, name: "New York City", country: "United States" },
        { lat: 51.5074, lng: -0.1278, name: "London", country: "United Kingdom" },
        { lat: 35.6762, lng: 139.6503, name: "Tokyo", country: "Japan" },
        { lat: -33.8688, lng: 151.2093, name: "Sydney", country: "Australia" },
        { lat: 48.8566, lng: 2.3522, name: "Paris", country: "France" },
        { lat: 55.7558, lng: 37.6173, name: "Moscow", country: "Russia" }
      ];
      
      // Find the closest location (very simplified approach)
      let closestLocation: GeoLocation | null = null;
      let closestDistance = Number.MAX_VALUE;
      
      for (const location of locations) {
        const distance = Math.sqrt(
          Math.pow(location.lat - lat, 2) + 
          Math.pow(location.lng - lng, 2)
        );
        
        if (distance < closestDistance && distance < 10) { // Arbitrary threshold
          closestDistance = distance;
          closestLocation = location;
        }
      }
      
      // If we found a close location, return it
      if (closestLocation) {
        return {
          name: closestLocation.name,
          country: closestLocation.country,
          lat: closestLocation.lat,
          lng: closestLocation.lng,
          timezone: "UTC" // Mocked timezone
        };
      }
      
      // Otherwise, return a generic location based on coordinates
      return {
        name: "Unknown Location",
        country: "Unknown",
        lat,
        lng,
        timezone: "Unknown"
      };
    };
    
    // Handle click on globe to place marker
    const handleGlobeClick = async (event: MouseEvent) => {
      if (!mountRef.current || !globeRef.current) return;
      
      // Calculate mouse position
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycast to find intersection with globe
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(globeRef.current);
      
      if (intersects.length > 0) {
        // Get the intersection point
        const intersectionPoint = intersects[0].point;
        
        // Calculate lat/lng from the intersection point
        // Need to transform from world space to globe's local space
        const localPosition = intersectionPoint.clone().sub(globeRef.current.position);
        const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(globeRef.current.rotation);
        localPosition.applyMatrix4(rotationMatrix.invert());
        
        const { lat, lng } = vector3ToLatLng(localPosition);
        
        // Clear any existing markers
        if (markersRef.current) {
          while (markersRef.current.children.length > 0) {
            markersRef.current.remove(markersRef.current.children[0]);
          }
        }
        
        // Create a new marker
        createMarker(lat, lng, 0xff4136);
        
        // Update input coordinates
        setInputCoordinates({ lat, lng });
        setShowCoordinatesPanel(true);
        
        // Get location information
        const locationInfo = await getLocationInfo(lat, lng);
        if (locationInfo) {
          setSelectedLocation(locationInfo);
          setShowDetailsPanel(true);
        }
      }
    };

    const animate = () => {
      requestAnimationFrame(animate);

      const timeSinceInteraction = Date.now() - lastInteractionTime;

      if (!isDragging && timeSinceInteraction > autoRotationDelay) {
        isAutoRotating = true;
        if (timeSinceInteraction < autoRotationDelay + 2000) {
          const transitionProgress = (timeSinceInteraction - autoRotationDelay) / 2000;
          userRotationY += autoRotationSpeed * transitionProgress;
        } else {
          userRotationY += autoRotationSpeed;
        }
        globe.rotation.y = userRotationY;
        // Rotate markers with the globe
        if (markersRef.current) {
          markersRef.current.rotation.y = globe.rotation.y;
        }
      } else {
        isAutoRotating = false;
        userRotationY = globe.rotation.y;
      }

      scaleMarkerSize();

      renderer.render(scene, camera);
    };

    // Mouse events for rotation
    const onMouseDown = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) return;

      isDragging = true;
      lastInteractionTime = Date.now();
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        lastInteractionTime = Date.now();
        const deltaMove = {
          x: event.clientX - previousMousePosition.x,
          y: event.clientY - previousMousePosition.y,
        };
        const newRotationY = globe.rotation.y + deltaMove.x * 0.005;
        const newRotationX = globe.rotation.x + deltaMove.y * 0.005;
        globe.rotation.y = newRotationY;
        globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, newRotationX));
        
        // Rotate markers with the globe
        if (markersRef.current) {
          markersRef.current.rotation.y = globe.rotation.y;
          markersRef.current.rotation.x = globe.rotation.x;
        }
        
        previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      isDragging = false;
      
      // Only trigger a click event if it wasn't a drag
      if (Math.abs(event.clientX - previousMousePosition.x) < 5 && 
          Math.abs(event.clientY - previousMousePosition.y) < 5) {
        handleGlobeClick(event);
      }
    };

    // Touch events
    const onTouchStart = (event: TouchEvent) => {
      if (!mountRef.current || event.touches.length === 0) return;
      const touch = event.touches[0];
      const rect = mountRef.current.getBoundingClientRect();
      if (
        touch.clientX < rect.left ||
        touch.clientX > rect.right ||
        touch.clientY < rect.top ||
        touch.clientY > rect.bottom
      ) return;

      isDragging = true;
      lastInteractionTime = Date.now();
      previousMousePosition = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isDragging || event.touches.length === 0) return;
      const touch = event.touches[0];
      lastInteractionTime = Date.now();
      const deltaMove = {
        x: touch.clientX - previousMousePosition.x,
        y: touch.clientY - previousMousePosition.y,
      };
      const newRotationY = globe.rotation.y + deltaMove.x * 0.005;
      const newRotationX = globe.rotation.x + deltaMove.y * 0.005;
      globe.rotation.y = newRotationY;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, newRotationX));
      
      // Rotate markers with the globe
      if (markersRef.current) {
        markersRef.current.rotation.y = globe.rotation.y;
        markersRef.current.rotation.x = globe.rotation.x;
      }
      
      previousMousePosition = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isDragging) return;
      
      // Handle tap (simplified)
      if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        handleGlobeClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
      }
      
      isDragging = false;
    };

    // Zoom event handler
    const onWheel = (event: WheelEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) return;

      event.preventDefault();
      lastInteractionTime = Date.now();
      const zoomSpeed = 0.05;
      const newZ = camera.position.z + event.deltaY * zoomSpeed;
      const constrainedZ = Math.max(minZoom, Math.min(maxZoom, newZ));
      camera.position.z = constrainedZ;
      setZoomLevel(constrainedZ);
      scaleMarkerSize();
    };

    // Add example marker
    createMarker(40.7128, -74.006, 0xff4136); // New York

    // Zoom function for buttons
    window.zoomGlobe = (direction: 'in' | 'out') => {
      lastInteractionTime = Date.now();
      const zoomStep = 1;
      const currentZ = camera.position.z;
      let newZ = currentZ;
      if (direction === 'in') newZ = currentZ - zoomStep;
      else if (direction === 'out') newZ = currentZ + zoomStep;
      const constrainedZ = Math.max(minZoom, Math.min(maxZoom, newZ));
      camera.position.z = constrainedZ;
      setZoomLevel(constrainedZ);
      scaleMarkerSize();
    };

    // Window resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const containerWidth = mountRef.current.clientWidth;
      const containerHeight = mountRef.current.clientHeight;
      renderer.setSize(containerWidth, containerHeight);
      camera.aspect = containerWidth / containerHeight;
      camera.updateProjectionMatrix();
    };

    // Add event listeners
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      delete window.zoomGlobe;
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleZoom = (direction: 'in' | 'out') => {
    if (window.zoomGlobe) {
      window.zoomGlobe(direction);
    }
  };
  
  const handleCoordinateChange = (type: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setInputCoordinates(prev => ({
        ...prev,
        [type]: numValue
      }));
    }
  };
  
  const handleCoordinateSubmit = () => {
    // You would add logic here to update the pin position
    console.log('Moving pin to:', inputCoordinates);
    // This would call some function to reposition the pin
  };
  
  const formatCoordinate = (value: number, type: 'lat' | 'lng'): string => {
    const direction = type === 'lat' 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutes = Math.floor((absValue - degrees) * 60);
    const seconds = ((absValue - degrees) * 60 - minutes) * 60;
    
    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
  };

  return (
    <div
      style={{
        width: '100%',
        height: '80vh',
        maxHeight: '800px',
        overflow: 'hidden',
        margin: '0 auto',
        position: 'relative',
        backgroundColor: '#000', // Matches renderer background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
      
      {/* Search Bar */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        width: '300px',
        zIndex: 10,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '5px',
          padding: '8px',
          backdropFilter: 'blur(5px)',
        }}>
          <input
            type="text"
            placeholder="Enter place name to search"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              width: '100%',
              padding: '8px',
              outline: 'none',
            }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            🔍
          </button>
        </div>
      </div>
      
      {/* Coordinates Panel */}
      {showCoordinatesPanel && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '5px',
          padding: '15px',
          width: '300px',
          backdropFilter: 'blur(5px)',
          zIndex: 10,
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Input Coordinates</span>
            <button
              onClick={() => setShowCoordinatesPanel(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              ▲
            </button>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label>Latitude:</label>
              <input
                type="number"
                step="0.00001"
                min="-90"
                max="90"
                value={inputCoordinates.lat}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                style={{ width: '140px', padding: '5px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label>Longitude:</label>
              <input
                type="number"
                step="0.00001"
                min="-180"
                max="180"
                value={inputCoordinates.lng}
                onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                style={{ width: '140px', padding: '5px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', borderRadius: '3px' }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', marginBottom: '5px' }}>FORMAT</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '12px', textAlign: 'left' }}>
                  <th style={{ padding: '5px 0' }}>FORMAT</th>
                  <th style={{ padding: '5px 0' }}>LATITUDE</th>
                  <th style={{ padding: '5px 0' }}>LONGITUDE</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontSize: '12px' }}>
                  <td style={{ padding: '5px 0' }}>DD</td>
                  <td style={{ padding: '5px 0' }}>{inputCoordinates.lat.toFixed(6)}</td>
                  <td style={{ padding: '5px 0' }}>{inputCoordinates.lng.toFixed(6)}</td>
                </tr>
                <tr style={{ fontSize: '12px' }}>
                  <td style={{ padding: '5px 0' }}>DMS</td>
                  <td style={{ padding: '5px 0' }}>{formatCoordinate(inputCoordinates.lat, 'lat')}</td>
                  <td style={{ padding: '5px 0' }}>{formatCoordinate(inputCoordinates.lng, 'lng')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Location Details Panel */}
      {showDetailsPanel && selectedLocation && (
        <div style={{
          position: 'absolute',
          top: showCoordinatesPanel ? '280px' : '60px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '5px',
          padding: '15px',
          width: '300px',
          backdropFilter: 'blur(5px)',
          zIndex: 10,
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Place Details - {selectedLocation.name}</span>
            <button
              onClick={() => setShowDetailsPanel(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              ▲
            </button>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Country:</strong> {selectedLocation.country}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Coordinates:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </div>
            {selectedLocation.timezone && (
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Timezone:</strong> {selectedLocation.timezone}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10,
      }}>
        <button
          onClick={() => handleZoom('in')}
          disabled={zoomLevel <= 7}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            fontSize: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(5px)',
            opacity: zoomLevel <= 7 ? 0.5 : 1,
            transition: 'all 0.3s ease',
          }}
        >
          +
        </button>
        <button
          onClick={() => handleZoom('out')}
          disabled={zoomLevel >= 18}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            fontSize: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(5px)',
            opacity: zoomLevel >= 18 ? 0.5 : 1,
            transition: 'all 0.3s ease',
          }}
        >
          -
        </button>
      </div>
    </div>
  );
};

// Add the window.zoomGlobe type definition for TypeScript
declare global {
  interface Window {
    zoomGlobe?: (direction: 'in' | 'out') => void;
  }
}

export default GlobeComponent;