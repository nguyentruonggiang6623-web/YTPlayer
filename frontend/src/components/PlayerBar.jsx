import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize2, FiMaximize, FiMinimize, FiSkipForward, FiSkipBack, FiX, FiHeart, FiPlus, FiShuffle, FiRepeat } from 'react-icons/fi';

const PlayerBar = ({ currentMedia, mediaList = [], onNext, onPrev, onPlay, onClose, onAddToPlaylist }) => {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: None, 1: All, 2: One
  const location = useLocation();

  const handleNextClick = () => {
    if (isShuffle && mediaList && mediaList.length > 0) {
      const randomIndex = Math.floor(Math.random() * mediaList.length);
      if (onPlay) onPlay(mediaList[randomIndex]);
    } else {
      if (onNext) onNext();
    }
  };

  const handlePrevClick = () => {
    if (isShuffle && mediaList && mediaList.length > 0) {
      const randomIndex = Math.floor(Math.random() * mediaList.length);
      if (onPlay) onPlay(mediaList[randomIndex]);
    } else {
      if (onPrev) onPrev();
    }
  };

  const handleEnded = () => {
    if (repeatMode === 2) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = 0;
        mediaRef.current.play();
      }
    } else if (repeatMode === 0 && !isShuffle) {
      if (mediaList && currentMedia) {
        const index = mediaList.findIndex(m => m.id === currentMedia.id);
        if (index === mediaList.length - 1) {
          setIsPlaying(false);
          return;
        }
      }
      handleNextClick();
    } else {
      handleNextClick();
    }
  };

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.visibility = (isExpanded || isFullscreen) ? 'hidden' : 'visible';
    }
  }, [isExpanded, isFullscreen]);

  // Khôi phục visibility khi unmount
  useEffect(() => {
    return () => {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.style.visibility = 'visible';
    };
  }, []);

  const mediaRef = currentMedia?.type === 'video' ? videoRef : audioRef;

  useEffect(() => {
    if (currentMedia) {
      setIsPlaying(true);
      setIsFavorite(currentMedia.is_favorite === 1);
      
      // Pause both to prevent parallel playback
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();

      if (currentMedia.type === 'video') {
         setShowVideo(true);
         setIsExpanded(true);
      } else {
         setShowVideo(false);
         setIsExpanded(false);
      }
      if (mediaRef.current) {
        mediaRef.current.play().catch(e => console.error("Playback failed", e));
      }
    } else {
      setIsPlaying(false);
      setShowVideo(false);
      setIsExpanded(false);
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
    }
  }, [currentMedia]);

  useEffect(() => {
    // Tự động thu nhỏ video khi đổi trang (chuyển qua Home, Download, v.v.)
    setIsExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleShrink = () => setIsExpanded(false);
    window.addEventListener('shrinkVideo', handleShrink);
    return () => window.removeEventListener('shrinkVideo', handleShrink);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFavorite = async () => {
    if (!currentMedia) return;
    try {
      const res = await fetch(`${window.API_URL}/api/media/${currentMedia.id}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsFavorite(data.is_favorite === 1);
      }
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setProgress(mediaRef.current.currentTime);
      setDuration(mediaRef.current.duration);
    }
  };

  const handleProgressChange = (e) => {
    if (mediaRef.current) {
      const newTime = Number(e.target.value);
      mediaRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleProgressHover = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(percentage * duration);
    setHoverPosition(x);
  };

  const handleProgressLeave = () => {
    setHoverTime(null);
  };

  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
    if (videoRef.current) videoRef.current.volume = newVol;
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    if (videoRef.current) videoRef.current.muted = newMuted;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentMedia) {
    return <div className="text-secondary text-sm w-full text-center py-4">Select a track to play</div>;
  }

  const streamUrl = `${window.API_URL}/api/stream/${currentMedia.filePath}`;

  return (
    <>
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        src={currentMedia.type === 'audio' ? streamUrl : ''} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      
      {/* Hidden/Floating video element & Queue */}
      <div style={{ 
        position: 'fixed', 
        bottom: isFullscreen ? '0px' : (isExpanded ? '90px' : '114px'), 
        right: (isExpanded || isFullscreen) ? '0px' : '24px', 
        left: isFullscreen ? '0px' : (isExpanded ? '240px' : 'auto'),
        top: (isExpanded || isFullscreen) ? '0px' : 'auto',
        width: isFullscreen ? '100vw' : (isExpanded ? 'calc(100vw - 240px)' : '320px'), 
        aspectRatio: (isExpanded || isFullscreen) ? 'unset' : '16/9',
        background: 'transparent',
        borderRadius: (isExpanded || isFullscreen) ? '0px' : '8px',
        overflow: 'hidden',
        display: (currentMedia.type === 'video' && showVideo) ? 'flex' : 'none',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: (isExpanded || isFullscreen) ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',
        zIndex: 100,
        transition: 'all 0.3s ease'
      }}>
        {/* Left side: Video */}
        <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(!isExpanded && !isFullscreen) && (
            <button 
              onClick={() => { if (onClose) onClose(); }}
              style={{
                 position: 'absolute', top: '8px', right: '8px', 
                 zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', 
                 border: 'none', borderRadius: '50%', padding: '6px',
                 cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <FiX size={16} />
            </button>
          )}
          <video 
            ref={videoRef} 
            src={currentMedia.type === 'video' ? streamUrl : ''} 
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onClick={togglePlay}
          />
        </div>

        {/* Right side: Up Next Queue (Only show when expanded and NOT fullscreen) */}
        {(isExpanded && !isFullscreen) && (
          <div style={{ width: '360px', height: '100%', background: 'var(--panel-bg)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Up Next</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
              {mediaList.map((media) => {
                const isCurrent = currentMedia.id === media.id;
                return (
                  <div 
                    key={media.id} 
                    onClick={() => { if (onPlay) onPlay(media); }}
                    className="queue-item"
                    style={{ background: isCurrent ? 'var(--hover-bg)' : 'transparent', borderLeft: isCurrent ? '4px solid var(--text-primary)' : '4px solid transparent' }}
                  >
                    <div style={{ position: 'relative', width: '120px', height: '68px', flexShrink: 0 }}>
                      <img src={media.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      {media.type === 'audio' && (
                        <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' }}>Audio</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {media.title}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {media.artist}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bottom-controls" style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', height: '100%', position: 'relative', zIndex: 200 }}>
        {/* Track Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isFullscreen ? '20%' : '30%' }}>
          <img 
            src={currentMedia.thumbnail} 
            alt="thumbnail" 
            style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="text-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {currentMedia.title}
            </span>
            <span className="text-xs text-secondary">{currentMedia.artist}</span>
          </div>
          <button onClick={() => onAddToPlaylist && onAddToPlaylist(currentMedia)} style={{ color: '#b3b3b3', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '8px', padding: '4px' }} title="Add to Playlist">
            <FiPlus size={20} />
          </button>
          <button onClick={toggleFavorite} style={{ color: isFavorite ? '#ef4444' : '#b3b3b3', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px', padding: '4px' }} title="Favorite">
            <FiHeart size={20} fill={isFavorite ? '#ef4444' : 'transparent'} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isFullscreen ? '60%' : '40%', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={() => setIsShuffle(!isShuffle)} style={{ background: 'none', border: 'none', color: isShuffle ? ((isExpanded || isFullscreen) ? 'white' : 'var(--text-primary)') : ((isExpanded || isFullscreen) ? '#cccccc' : 'var(--text-secondary)'), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} title="Shuffle">
              <FiShuffle size={18} />
              {isShuffle && <div style={{ position: 'absolute', bottom: '-6px', width: '4px', height: '4px', borderRadius: '50%', background: (isExpanded || isFullscreen) ? 'white' : 'var(--text-primary)' }}></div>}
            </button>
            <button onClick={handlePrevClick} style={{ background: 'none', border: 'none', color: (isExpanded || isFullscreen) ? '#cccccc' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:text-white" title="Previous">
              <FiSkipBack size={20} fill="currentColor" />
            </button>
            <button 
              onClick={togglePlay}
              style={{
                width: '32px', height: '32px', 
                borderRadius: '50%', 
                backgroundColor: 'white', 
                color: 'black',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {isPlaying ? <FiPause fill="black" /> : <FiPlay fill="black" style={{ marginLeft: '2px' }} />}
            </button>
            <button onClick={handleNextClick} style={{ background: 'none', border: 'none', color: (isExpanded || isFullscreen) ? '#cccccc' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:text-white" title="Next">
              <FiSkipForward size={20} fill="currentColor" />
            </button>
            <button onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} style={{ background: 'none', border: 'none', color: repeatMode > 0 ? ((isExpanded || isFullscreen) ? 'white' : 'var(--text-primary)') : ((isExpanded || isFullscreen) ? '#cccccc' : 'var(--text-secondary)'), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} title={repeatMode === 0 ? "Repeat off" : (repeatMode === 1 ? "Repeat all" : "Repeat one")}>
              <FiRepeat size={18} />
              {repeatMode === 2 && <span style={{ position: 'absolute', fontSize: '9px', fontWeight: 'bold', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: (isExpanded || isFullscreen) ? 'rgba(255,255,255,0.2)' : 'var(--panel-bg)', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>}
              {repeatMode > 0 && <div style={{ position: 'absolute', bottom: '-6px', width: '4px', height: '4px', borderRadius: '50%', background: (isExpanded || isFullscreen) ? 'white' : 'var(--text-primary)' }}></div>}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', position: 'relative' }}>
            <span className="text-xs text-secondary">{formatTime(progress)}</span>
            <div 
              style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', height: '16px' }}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              {hoverTime !== null && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: `${hoverPosition}px`,
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  background: 'rgba(0,0,0,0.85)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  zIndex: 300
                }}>
                  {formatTime(hoverTime)}
                </div>
              )}
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                value={progress} 
                onChange={handleProgressChange}
                style={{ width: '100%', accentColor: 'white', height: '4px', cursor: 'pointer', margin: 0 }}
              />
            </div>
            <span className="text-xs text-secondary">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', width: isFullscreen ? '20%' : '30%' }}>
          {currentMedia.type === 'video' && (
            <>
              {!isFullscreen && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-secondary hover:text-white" title={isExpanded ? "Exit Theater Mode" : "Theater Mode"}>
                  <FiMaximize2 size={20} />
                </button>
              )}
              <button onClick={toggleFullscreen} className="text-secondary hover:text-white" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={20} />}
              </button>
            </>
          )}
          <button onClick={toggleMute} className="text-secondary hover:text-white">
            {isMuted || volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
          </button>
          <input 
            type="range" 
            min="0" max="1" step="0.01" 
            value={isMuted ? 0 : volume} 
            onChange={handleVolumeChange}
            style={{ width: '80px', accentColor: 'white', height: '4px' }}
          />
        </div>
      </div>
    </>
  );
};

export default PlayerBar;
