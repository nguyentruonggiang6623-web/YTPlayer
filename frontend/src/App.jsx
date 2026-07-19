import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiHome, FiMusic, FiDownload, FiList, FiSettings } from 'react-icons/fi';
import MediaList from './components/MediaList';
import Downloader from './components/Downloader';
import PlayerBar from './components/PlayerBar';
import Home from './components/Home';
import Playlists from './components/Playlists';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import Settings from './components/Settings';

function App() {
  const location = useLocation();
  const [mediaList, setMediaList] = useState([]);
  const [playingQueue, setPlayingQueue] = useState([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(-1);
  const [mediaToAdd, setMediaToAdd] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  const currentMedia = playingQueue[currentMediaIndex];

  const fetchMedia = async () => {
    try {
      const res = await fetch(`${window.API_URL}/api/media`);
      const data = await res.json();
      if(Array.isArray(data)) {
        setMediaList(data);
        if (playingQueue.length === 0) setPlayingQueue(data);
      }
    } catch (err) {
      console.error('Failed to fetch media', err);
    }
  };

  useEffect(() => {
    fetchMedia();

    // Theme initialization
    const savedTheme = localStorage.getItem('ytplayer_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
    }

    // Check custom background
    const customBg = localStorage.getItem('ytplayer_background');
    if (customBg) {
      // For backward compatibility: if it starts with http, it might be the old hardcoded port
      // We will replace it with the new dynamic API URL, or just prepend API_URL if it's a relative path
      let bgUrl = customBg;
      if (customBg.startsWith('http://localhost:5000')) {
        bgUrl = customBg.replace('http://localhost:5000', window.API_URL);
      } else if (customBg.startsWith('/downloads/')) {
        bgUrl = `${window.API_URL}${customBg}`;
      }
      
      document.body.style.backgroundImage = `url(${bgUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    }

    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setIsIdle(false);
      return;
    }

    let timeout;
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    };

    document.addEventListener('mousemove', resetIdle, true);
    document.addEventListener('mousedown', resetIdle, true);
    document.addEventListener('keydown', resetIdle, true);
    
    resetIdle();

    return () => {
      document.removeEventListener('mousemove', resetIdle, true);
      document.removeEventListener('mousedown', resetIdle, true);
      document.removeEventListener('keydown', resetIdle, true);
      clearTimeout(timeout);
    };
  }, [isFullscreen]);

  const handlePlay = (media, queue = null) => {
    let currentQueue = queue || playingQueue;
    if (queue) {
      setPlayingQueue(queue);
    } else if (playingQueue.length === 0) {
      currentQueue = mediaList;
      setPlayingQueue(mediaList);
    }

    const index = currentQueue.findIndex(m => m.id === media.id);
    if (index !== -1) {
      setCurrentMediaIndex(index);
    } else {
      // Fallback if media not in queue
      setPlayingQueue([media]);
      setCurrentMediaIndex(0);
    }
    
    fetch(`${window.API_URL}/api/media/${media.id}/play`, { method: 'POST' })
      .catch(e => console.error('Failed to log play:', e));
  };

  const handleNext = () => {
    if (playingQueue.length === 0) return;
    setCurrentMediaIndex((prev) => (prev + 1) % playingQueue.length);
  };

  const handlePrev = () => {
    if (playingQueue.length === 0) return;
    setCurrentMediaIndex((prev) => (prev - 1 + playingQueue.length) % playingQueue.length);
  };

  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''} ${isFullscreen && isIdle ? 'idle' : ''}`}>
      
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { background: '#282828', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } }
        }} 
      />
      <nav className="sidebar glass-panel">
        <div className="text-xl px-4 py-2 mb-4" style={{ letterSpacing: '-1px' }}>
          YTPlayer
        </div>
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <FiHome size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/library" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <FiMusic size={20} />
          <span>Your Library</span>
        </NavLink>
        <NavLink 
          to="/playlists" 
          onClick={() => window.dispatchEvent(new Event('resetPlaylists'))}
          className={({isActive}) => isActive ? "nav-item active" : "nav-item"}
        >
          <FiList size={20} />
          <span>Playlists</span>
        </NavLink>
        <div style={{ flex: 1 }}></div>
        <NavLink to="/download" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <FiDownload size={20} />
          <span>Download</span>
        </NavLink>
        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <FiSettings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <main className="main-content glass-panel">
        <Routes>
          <Route path="/" element={<Home onPlay={handlePlay} />} />
          <Route path="/library" element={<MediaList media={mediaList} onPlay={handlePlay} onDelete={fetchMedia} onAddToPlaylist={setMediaToAdd} />} />
          <Route path="/download" element={<Downloader onDownloaded={fetchMedia} />} />
          <Route path="/playlists" element={<Playlists onPlay={handlePlay} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        
        <AddToPlaylistModal media={mediaToAdd} onClose={() => setMediaToAdd(null)} />
      </main>

      <div className="player-bar glass-panel">
        <PlayerBar 
          currentMedia={currentMedia} 
          mediaList={playingQueue}
          onNext={handleNext} 
          onPrev={handlePrev} 
          onPlay={handlePlay}
          onClose={() => setCurrentMediaIndex(-1)}
          onAddToPlaylist={setMediaToAdd}
        />
      </div>
    </div>
  );
}

export default App;
