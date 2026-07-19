import React, { useState } from 'react';
import { FiFilm, FiMusic, FiTrash2, FiSearch, FiPlus, FiPlay, FiShuffle } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import { toast } from 'react-hot-toast';

const MediaList = ({ media, onPlay, onDelete, onAddToPlaylist }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const promptDeleteMedia = (e, id) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      const res = await fetch(`${window.API_URL}/api/media/${confirmDeleteId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onDelete) onDelete(); // Refresh the list
        toast.success("Media deleted successfully");
      } else {
        toast.error("Failed to delete media");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting media");
    }
    setConfirmDeleteId(null);
  };

  // 1. Filter
  let filteredMedia = media.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.artist?.toLowerCase().includes(q);
  });

  // 2. Sort
  filteredMedia = filteredMedia.sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.addedAt) - new Date(a.addedAt);
    } else if (sortBy === 'date-asc') {
      return new Date(a.addedAt) - new Date(b.addedAt);
    } else if (sortBy === 'name-asc') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'name-desc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  const handlePlayAll = () => {
    if (filteredMedia.length > 0) {
      onPlay(filteredMedia[0], filteredMedia);
    }
  };

  const handleShufflePlay = () => {
    if (filteredMedia.length > 0) {
      const shuffled = [...filteredMedia].sort(() => Math.random() - 0.5);
      onPlay(shuffled[0], shuffled);
    }
  };

  return (
    <div>
      <div className="glass-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <h1 className="text-xl" style={{ margin: 0 }}>Your Library</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handlePlayAll} 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 600 }}
              disabled={filteredMedia.length === 0}
            >
              <FiPlay fill="currentColor" /> Play All
            </button>
            <button 
              onClick={handleShufflePlay} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', borderRadius: '24px', fontSize: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              disabled={filteredMedia.length === 0}
            >
              <FiShuffle /> Shuffle
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '250px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#b3b3b3' }} />
            <input 
              type="text" 
              placeholder="Search in your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Sort Dropdown */}
          <select 
            className="input-field" 
            style={{ width: 'auto', paddingRight: '32px', appearance: 'auto' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">Newest Added</option>
            <option value="date-asc">Oldest Added</option>
            <option value="name-asc">Title (A-Z)</option>
            <option value="name-desc">Title (Z-A)</option>
          </select>
        </div>
      </div>
      
      <div style={{ padding: '24px' }}>
        {filteredMedia.length === 0 ? (
          <div className="text-secondary text-center mt-4">
            {media.length === 0 ? "No media found. Go to Download to add some." : "No results match your search."}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '24px'
          }}>
            {filteredMedia.map((item) => (
              <div 
                key={item.id} 
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => onPlay(item, filteredMedia)}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '16px' }}>
                  <img 
                    src={item.thumbnail} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {item.type === 'video' ? <FiFilm size={12}/> : <FiMusic size={12}/>}
                  </div>
                </div>
                <div style={{ paddingRight: '76px', display: 'flex', flexDirection: 'column' }}>
                  <h3 className="text-base" style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    marginBottom: '4px'
                  }} title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-secondary text-sm" style={{
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    margin: 0
                  }}>
                    {item.artist}
                  </p>
                </div>

                {/* Buttons Container */}
                <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToPlaylist(item); }}
                    style={{
                      color: 'white',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.9)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                    title="Add to Playlist"
                  >
                    <FiPlus size={18} />
                  </button>
                  <button
                    onClick={(e) => promptDeleteMedia(e, item.id)}
                    style={{
                      color: 'white',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ff5252'; e.currentTarget.style.background = 'rgba(0,0,0,0.9)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                    title="Delete"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="Delete Media"
        message="Are you sure you want to delete this media? It will be removed from your library and all playlists."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default MediaList;
