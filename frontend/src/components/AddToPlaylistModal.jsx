import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiList } from 'react-icons/fi';

const AddToPlaylistModal = ({ media, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${window.API_URL}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (media) fetchPlaylists();
  }, [media]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch(`${window.API_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName })
      });
      const data = await res.json();
      if (data.success) {
        setNewPlaylistName('');
        await fetchPlaylists();
        // optionally auto add to it
        addToPlaylist(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      const res = await fetch(`${window.API_URL}/api/playlists/${playlistId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: media.id })
      });
      const data = await res.json();
      if (data.success) {
        onClose(); // Close modal on success
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!media) return null;

  return (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiList color="#a78bfa" /> Add to Playlist
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer' }}>
            <FiX size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: '#282828', padding: '12px', borderRadius: '8px' }}>
          <img src={media.thumbnail} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</div>
            <div style={{ fontSize: '12px', color: '#aaaaaa' }}>{media.artist}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', marginBottom: '24px' }}>
          {loading ? (
            <div className="text-secondary">Loading...</div>
          ) : playlists.length === 0 ? (
            <div className="text-secondary text-sm text-center py-4">No playlists yet. Create one below!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playlists.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToPlaylist(p.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', background: '#282828', border: 'none', borderRadius: '8px',
                    color: 'white', cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#383838'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#282828'}
                >
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: '#aaaaaa' }}>{p.trackCount} tracks</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="New playlist name..."
            className="input-field"
            style={{ flex: 1, background: '#282828', border: '1px solid #383838' }}
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 16px', borderRadius: '8px' }}>
            <FiPlus size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
