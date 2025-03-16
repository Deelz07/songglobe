import React, { useState, useEffect } from 'react';

const clientId = '9ec5bd1f45eb4fc588422f85f735743f'; // Replace with your Client ID
const redirectUri = 'http://localhost:3000'; // Adjust based on your dev server
const clientSecret = '8724fcb012bd45b2bb25b5a9b28982e1'; // Replace with your Client Secret

const SpotifyPlayer = ({ onSongSelect }) => {
  const [accessToken, setAccessToken] = useState('');
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [songs, setSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load Spotify SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (accessToken) {
        initializePlayer();
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [accessToken]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code && !accessToken) {
        try {
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
            },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
          });
          const data = await response.json();
          if (data.access_token) {
            setAccessToken(data.access_token);
            window.history.pushState({}, document.title, redirectUri);
          }
        } catch (error) {
          console.error('Token error:', error);
        }
      }
    };
    handleCallback();
  }, []);

  // Initialize Spotify Player
  const initializePlayer = () => {
    const spotifyPlayer = new window.Spotify.Player({
      name: 'Map Spotify Player',
      getOAuthToken: cb => cb(accessToken),
      volume: 0.5,
    });

    spotifyPlayer.addListener('ready', ({ device_id }) => {
      setDeviceId(device_id);
      searchSongs('pop'); // Load initial songs
    });

    spotifyPlayer.addListener('player_state_changed', state => {
      if (state) {
        setPosition(state.position / 1000);
        setDuration(state.duration / 1000);
        setIsPlaying(!state.paused);
      }
    });

    spotifyPlayer.connect();
    setPlayer(spotifyPlayer);
  };

  // Handle Spotify login
  const handleLogin = () => {
    const scope = 'streaming user-read-email user-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location = authUrl;
  };

  // Search songs
  const searchSongs = async (query) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      const songList = data.tracks.items.map(track => ({
        title: track.name,
        artist: track.artists[0].name,
        uri: track.uri,
      }));
      setSongs(songList);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Play song
  const playSong = async (index) => {
    setCurrentSongIndex(index);
    const song = songs[index];
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [song.uri] }),
      });
      onSongSelect(song.title); // Pass selected song to Map component
    } catch (error) {
      console.error('Play error:', error);
    }
  };

  // Playback controls
  const handlePlay = () => player?.resume();
  const handlePause = () => player?.pause();
  const handleNext = () => {
    const nextIndex = (currentSongIndex + 1) % songs.length;
    playSong(nextIndex);
  };
  const handleSeek = (e) => {
    const seekTime = e.target.value * 1000;
    player?.seek(seekTime);
  };

  // Format time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {!accessToken ? (
        <button onClick={handleLogin}>Login to Spotify</button>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) searchSongs(e.target.value);
            }}
            style={{ width: '100%' }}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {songs.map((song, index) => (
              <div
                key={index}
                onClick={() => playSong(index)}
                style={{
                  padding: '5px',
                  cursor: 'pointer',
                  backgroundColor: index === currentSongIndex ? '#ddd' : 'transparent',
                }}
              >
                {song.title} - {song.artist}
              </div>
            ))}
          </div>
          <div>
            <button onClick={handlePlay} disabled={!songs.length || isPlaying}>Play</button>
            <button onClick={handlePause} disabled={!songs.length || !isPlaying}>Pause</button>
            <button onClick={handleNext} disabled={!songs.length}>Next</button>
          </div>
          <div>
            <input
              type="range"
              min="0"
              max={duration}
              value={position}
              onChange={handleSeek}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;
