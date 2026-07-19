import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMusic, FiVideo, FiPlayCircle, FiBarChart2, FiClock, FiHeart, FiPlus, FiShuffle, FiDownload, FiCheckCircle, FiList } from 'react-icons/fi';

const MediaCarousel = ({ title, icon, mediaList, onPlay }) => {
  if (!mediaList || mediaList.length === 0) return null;
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {icon}
        <h2 className="text-2xl font-bold" style={{ margin: 0 }}>{title}</h2>
      </div>
      <div style={{ 
        display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px',
        scrollbarWidth: 'thin', scrollbarColor: '#333 transparent'
      }}>
        {mediaList.map((media) => (
          <div 
            key={media.id} 
            onClick={() => onPlay(media)}
            className="glass-card"
            style={{ 
              minWidth: '200px', maxWidth: '200px',
              cursor: 'pointer', padding: '12px', flexShrink: 0
            }}
          >
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '12px' }}>
              <img src={media.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} alt="" />
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' }}>
                {media.type === 'video' ? <FiVideo size={10}/> : <FiMusic size={10}/>}
              </div>
            </div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = ({ onPlay }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ weekTop: [], monthTop: [], totals: { audio: 0, video: 0, playlists: 0 }, recentPlays: [], recentAdds: [], favorites: [], playlists: [] });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${window.API_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);





  if (loading) {
    return <div className="p-8 text-secondary">Loading your dashboard...</div>;
  }

  return (
    <div className="p-8 pb-24" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header section with Quick DL and Shuffle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '24px' }}>
        <h1 className="text-4xl font-bold" style={{ letterSpacing: '-1px', margin: 0 }}>Welcome Back</h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
              <FiMusic size={24} color="#a78bfa" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Total Audio</h3>
          </div>
          <p style={{ fontSize: '36px', fontWeight: 700, margin: 0 }}>{stats.totals.audio}</p>
        </div>
        
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
              <FiVideo size={24} color="#f87171" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Total Videos</h3>
          </div>
          <p style={{ fontSize: '36px', fontWeight: 700, margin: 0 }}>{stats.totals.video}</p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
              <FiList size={24} color="#34d399" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Playlists</h3>
          </div>
          <p style={{ fontSize: '36px', fontWeight: 700, margin: 0 }}>{stats.totals.playlists || 0}</p>
        </div>
      </div>

      {/* Top Lists Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '40px', marginBottom: '40px' }}>
        {/* Weekly Top */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FiBarChart2 size={24} color="#34d399" />
            <h2 className="text-2xl font-bold" style={{ margin: 0 }}>Top This Week</h2>
          </div>
          {stats.weekTop.length === 0 ? (
            <p className="text-secondary">No activity this week yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.weekTop.map((media, index) => (
                <div 
                  key={media.id} 
                  onClick={() => onPlay(media)}
                  className="glass-card"
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                    cursor: 'pointer', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#444', width: '32px', textAlign: 'center' }}>{index + 1}</span>
                  <img src={media.thumbnail} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>{media.play_count} plays</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Top */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FiPlayCircle size={24} color="#60a5fa" />
            <h2 className="text-2xl font-bold" style={{ margin: 0 }}>Top This Month</h2>
          </div>
          {stats.monthTop.length === 0 ? (
            <p className="text-secondary">No activity this month yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.monthTop.map((media, index) => (
                <div 
                  key={media.id} 
                  onClick={() => onPlay(media)}
                  className="glass-card"
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                    cursor: 'pointer', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#444', width: '32px', textAlign: 'center' }}>{index + 1}</span>
                  <img src={media.thumbnail} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.artist}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>{media.play_count} plays</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Playlists Row */}
      {stats.playlists && stats.playlists.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FiList size={24} color="#a78bfa" />
            <h2 className="text-2xl font-bold" style={{ margin: 0 }}>Your Playlists</h2>
          </div>
          <div style={{ 
            display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px',
            scrollbarWidth: 'thin', scrollbarColor: '#333 transparent'
          }}>
            {stats.playlists.map(p => (
              <div 
                key={p.id}
                onClick={() => navigate('/playlists', { state: { openPlaylistId: p.id } })}
                className="glass-card"
                style={{ 
                  minWidth: '200px', maxWidth: '200px',
                  padding: '16px', cursor: 'pointer', position: 'relative', flexShrink: 0
                }}
              >
                <div style={{ width: '100%', aspectRatio: '1/1', background: 'linear-gradient(135deg, #4f46e5, #ec4899)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <FiList size={48} color="white" />
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{p.trackCount || 0} tracks</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carousels */}
      <MediaCarousel title="Recently Played" icon={<FiClock size={24} color="#60a5fa" />} mediaList={stats.recentPlays} onPlay={onPlay} />
      <MediaCarousel title="Recently Added" icon={<FiPlus size={24} color="#34d399" />} mediaList={stats.recentAdds} onPlay={onPlay} />
      <MediaCarousel title="Your Favorites" icon={<FiHeart size={24} color="#ef4444" fill="#ef4444" />} mediaList={stats.favorites} onPlay={onPlay} />


    </div>
  );
};

export default Home;
