import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlay, FiTrash2, FiList, FiMusic, FiVideo, FiArrowLeft, FiX, FiShuffle } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import { toast } from 'react-hot-toast';

const Playlists = ({ onPlay }) => {
  const location = useLocation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistMedia, setPlaylistMedia] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalPlaylistName, setModalPlaylistName] = useState('');
  
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [allMedia, setAllMedia] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmRemoveTrackId, setConfirmRemoveTrackId] = useState(null);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${window.API_URL}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists().then(data => {
      if (data && location.state?.openPlaylistId) {
        const p = data.find(item => item.id === location.state.openPlaylistId);
        if (p) openPlaylist(p);
      }
    });

    const handleReset = () => setSelectedPlaylist(null);
    window.addEventListener('resetPlaylists', handleReset);
    return () => window.removeEventListener('resetPlaylists', handleReset);
  }, [location.state]);

  const openPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist);
    window.dispatchEvent(new Event('shrinkVideo'));
    try {
      const res = await fetch(`${window.API_URL}/api/playlists/${playlist.id}/media`);
      const data = await res.json();
      setPlaylistMedia(data.media || []);
    } catch (err) {
      console.error(err);
    }
  };

  const promptDeletePlaylist = (e, id) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const deletePlaylist = async () => {
    if (!confirmDeleteId) return;
    try {
      await fetch(`${window.API_URL}/api/playlists/${confirmDeleteId}`, { method: 'DELETE' });
      fetchPlaylists();
      if (selectedPlaylist?.id === confirmDeleteId) setSelectedPlaylist(null);
      toast.success('Playlist deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete playlist');
    }
    setConfirmDeleteId(null);
  };

  const promptRemoveTrack = (e, id) => {
    e.stopPropagation();
    setConfirmRemoveTrackId(id);
  };

  const removeFromPlaylist = async () => {
    if (!confirmRemoveTrackId) return;
    try {
      await fetch(`${window.API_URL}/api/playlists/${selectedPlaylist.id}/media/${confirmRemoveTrackId}`, { method: 'DELETE' });
      setPlaylistMedia(prev => prev.filter(m => m.id !== confirmRemoveTrackId));
      fetchPlaylists(); // update counts
      toast.success('Track removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove track');
    }
    setConfirmRemoveTrackId(null);
  };

  const playEntirePlaylist = () => {
    if (playlistMedia.length > 0) {
      onPlay(playlistMedia[0], playlistMedia); 
    }
  };

  const playShufflePlaylist = () => {
    if (playlistMedia.length > 0) {
      const shuffled = [...playlistMedia].sort(() => Math.random() - 0.5);
      onPlay(shuffled[0], shuffled);
    }
  };

  const handleCreatePlaylist = async (e) => {
    if (e) e.preventDefault();
    let finalName = newPlaylistName.trim();
    if (!finalName) {
      setShowCreateModal(true);
      return;
    }
    await submitCreate(finalName);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalPlaylistName.trim()) return;
    await submitCreate(modalPlaylistName.trim());
    setShowCreateModal(false);
    setModalPlaylistName('');
  };

  const submitCreate = async (name) => {
    try {
      const res = await fetch(`${window.API_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setNewPlaylistName('');
        fetchPlaylists();
        toast.success('Playlist created');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddTracksModal = async () => {
    setShowAddTracksModal(true);
    try {
      const res = await fetch(`${window.API_URL}/api/media`);
      const data = await res.json();
      setAllMedia(data);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load library!');
    }
  };

  const addTrackToPlaylist = async (media) => {
    try {
      const res = await fetch(`${window.API_URL}/api/playlists/${selectedPlaylist.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: media.id })
      });
      const data = await res.json();
      if (data.success) {
        setPlaylistMedia(prev => [media, ...prev]);
        fetchPlaylists(); // update track counts
        toast.success('Track added to playlist');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-secondary">Loading playlists...</div>;
  }

  if (selectedPlaylist) {
    return (
      <div className="p-8 pb-24" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button 
          onClick={() => setSelectedPlaylist(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', marginBottom: '24px', fontSize: '16px', fontWeight: 600 }}
        >
          <FiArrowLeft /> Back to Playlists
        </button>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '40px' }}>
          <div style={{ width: '160px', height: '160px', background: 'linear-gradient(135deg, #4f46e5, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <FiList size={64} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '48px', margin: '0 0 8px 0', fontWeight: 800 }}>{selectedPlaylist.name}</h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '16px' }}>{playlistMedia.length} tracks</p>
          </div>
        </div>

        <div style={{ marginBottom: '32px', display: 'flex', gap: '16px' }}>
          <button 
            onClick={playEntirePlaylist}
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', borderRadius: '32px', fontSize: '16px' }}
            disabled={playlistMedia.length === 0}
          >
            <FiPlay fill="currentColor" /> Play
          </button>
          <button 
            onClick={playShufflePlaylist}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', borderRadius: '32px', fontSize: '16px', border: 'none', cursor: 'pointer' }}
            disabled={playlistMedia.length === 0}
          >
            <FiShuffle /> Shuffle
          </button>
          <button 
            onClick={openAddTracksModal}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '32px', fontSize: '16px', border: 'none', cursor: 'pointer' }}
          >
            + Add Tracks
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {playlistMedia.map((media, index) => (
            <div 
              key={media.id} 
              onClick={() => onPlay(media, playlistMedia)}
              className="glass-card"
              style={{ 
                display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                cursor: 'pointer', position: 'relative'
              }}
            >
              <span style={{ fontSize: '16px', color: '#aaaaaa', width: '24px', textAlign: 'right' }}>{index + 1}</span>
              <img src={media.thumbnail} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#aaaaaa', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
              </div>
              <button 
                onClick={(e) => promptRemoveTrack(e, media.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                title="Remove from playlist"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          ))}
          {playlistMedia.length === 0 && (
            <div className="text-secondary text-center py-8">This playlist is empty. Go to your Library to add some tracks!</div>
          )}
        </div>
        {/* Custom Create Playlist Modal */}
        {showCreateModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#1a1a1a', width: '400px', borderRadius: '16px',
              padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', color: 'white'
            }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>Create New Playlist</h2>
              <form onSubmit={handleModalSubmit}>
                <input
                  type="text"
                  placeholder="Enter playlist name..."
                  className="input-field"
                  style={{ width: '100%', background: '#282828', border: '1px solid #383854', marginBottom: '24px' }}
                  value={modalPlaylistName}
                  onChange={e => setModalPlaylistName(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
                    style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 24px', borderRadius: '8px' }} disabled={!modalPlaylistName.trim()}>
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Tracks Modal */}
        {showAddTracksModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#1a1a1a', width: '500px', maxHeight: '80vh', borderRadius: '16px',
              padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Add Tracks to {selectedPlaylist.name}</h2>
                <button onClick={() => setShowAddTracksModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer' }}>
                  <FiX size={24} />
                </button>
              </div>
              
              <input 
                type="text" 
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%', marginBottom: '16px', background: '#282828', border: '1px solid #383854' }}
              />

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allMedia
                  .filter(m => String(m.title || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) || String(m.artist || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()))
                  .map(media => {
                    const isAdded = playlistMedia.some(pm => pm.id === media.id);
                    return (
                      <div 
                        key={media.id} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                          background: '#282828', borderRadius: '8px' 
                        }}
                      >
                        <img src={media.thumbnail} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} alt="" />
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#aaaaaa', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
                        </div>
                        <button 
                          onClick={() => addTrackToPlaylist(media)}
                          disabled={isAdded}
                          style={{ 
                            padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                            background: isAdded ? 'transparent' : 'rgba(255,255,255,0.1)',
                            border: isAdded ? '1px solid #555' : 'none',
                            color: isAdded ? '#555' : 'white', cursor: isAdded ? 'default' : 'pointer'
                          }}
                        >
                          {isAdded ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                })}
                {allMedia.length === 0 && <div className="text-secondary text-center py-4">Your library is empty.</div>}
              </div>
            </div>
          </div>
        )}

        <ConfirmModal 
          isOpen={!!confirmDeleteId}
          title="Delete Playlist"
          message="Are you sure you want to delete this playlist? This action cannot be undone."
          onConfirm={deletePlaylist}
          onCancel={() => setConfirmDeleteId(null)}
        />
        
        <ConfirmModal 
          isOpen={!!confirmRemoveTrackId}
          title="Remove Track"
          message="Are you sure you want to remove this track from the playlist?"
          onConfirm={removeFromPlaylist}
          onCancel={() => setConfirmRemoveTrackId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 pb-24" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="text-4xl font-bold" style={{ margin: 0 }}>Your Playlists</h1>
        
        <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="New playlist name..."
            className="input-field"
            style={{ width: '250px', background: '#1a1a2e', border: '1px solid #383854' }}
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 20px', borderRadius: '8px', fontWeight: 600 }}>
            Create
          </button>
        </form>
      </div>
      
      {playlists.length === 0 ? (
        <div className="text-secondary text-center py-8">
          <FiList size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>You haven't created any playlists yet.</p>
          <p className="text-sm mt-2">Use the input above to create your first playlist!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
          {playlists.map((p) => (
            <div 
              key={p.id}
              onClick={() => openPlaylist(p)}
              className="glass-card"
              style={{ padding: '16px', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ width: '100%', aspectRatio: '1/1', background: 'linear-gradient(135deg, #4f46e5, #ec4899)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <FiList size={48} color="white" />
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#aaaaaa' }}>{p.trackCount || 0} tracks</p>
              
              <button 
                onClick={(e) => promptDeletePlaylist(e, p.id)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}
                title="Delete Playlist"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Create Playlist Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1a1a1a', width: '400px', borderRadius: '16px',
            padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', color: 'white'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>Create New Playlist</h2>
            <form onSubmit={handleModalSubmit}>
              <input
                type="text"
                placeholder="Enter playlist name..."
                className="input-field"
                style={{ width: '100%', background: '#282828', border: '1px solid #383854', marginBottom: '24px' }}
                value={modalPlaylistName}
                onChange={e => setModalPlaylistName(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 24px', borderRadius: '8px' }} disabled={!modalPlaylistName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tracks Modal */}
      {showAddTracksModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1a1a1a', width: '500px', maxHeight: '80vh', borderRadius: '16px',
            padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Add Tracks to {selectedPlaylist.name}</h2>
              <button onClick={() => setShowAddTracksModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer' }}>
                <FiX size={24} />
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', marginBottom: '16px', background: '#282828', border: '1px solid #383854' }}
            />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allMedia
                .filter(m => (m.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || (m.artist || '').toLowerCase().includes((searchQuery || '').toLowerCase()))
                .map(media => {
                  const isAdded = playlistMedia.some(pm => pm.id === media.id);
                  return (
                    <div 
                      key={media.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                        background: '#282828', borderRadius: '8px' 
                      }}
                    >
                      <img src={media.thumbnail} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} alt="" />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#aaaaaa', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
                      </div>
                      <button 
                        onClick={() => addTrackToPlaylist(media)}
                        disabled={isAdded}
                        style={{ 
                          padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: isAdded ? 'transparent' : 'rgba(255,255,255,0.1)',
                          border: isAdded ? '1px solid #555' : 'none',
                          color: isAdded ? '#555' : 'white', cursor: isAdded ? 'default' : 'pointer'
                        }}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
              })}
              {allMedia.length === 0 && <div className="text-secondary text-center py-4">Your library is empty.</div>}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="Delete Playlist"
        message="Are you sure you want to delete this playlist? This action cannot be undone."
        onConfirm={deletePlaylist}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Playlists;
