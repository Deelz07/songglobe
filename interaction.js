const globe = Globe()
.globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
.pointOfView({ lat: 0, lng: 0, altitude: 2 });


globe.onClick(async (event) => {
    const { lat, lng } = globe.getCoords(event);
    const pinData = {
        pin_id: Date.now().toString(),
        song: "Song Title",
        user_id: "User123",
        latitude: lat,
        longitude: lng 
    };

    await add_pin(pinData);
});