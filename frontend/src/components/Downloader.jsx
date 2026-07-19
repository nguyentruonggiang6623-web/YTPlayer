import React, { useState } from 'react';
import { FiDownloadCloud } from 'react-icons/fi';

const Downloader = ({ onDownloaded }) => {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('audio');
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Progress states
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatus('Initializing...');

    try {
      const res = await fetch(`${window.API_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, type, quality })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start download');
      }

      const jobId = data.jobId;
      
      // Connect to SSE for progress updates
      const evtSource = new EventSource(`${window.API_URL}/api/progress/${jobId}`);

      evtSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        
        if (parsed.status === 'fetching_info') {
          setStatus('Fetching video info...');
        } else if (parsed.status === 'downloading') {
          setStatus(`Downloading... ${parsed.title ? parsed.title : ''}`);
          if (parsed.progress) setProgress(parsed.progress);
        } else if (parsed.status === 'completed') {
          setSuccess(`Successfully downloaded!`);
          setUrl('');
          setLoading(false);
          setProgress(100);
          setStatus('Done');
          evtSource.close();
          onDownloaded(); // Refresh list
        } else if (parsed.status === 'error') {
          setError(parsed.message || 'Error occurred during download');
          setLoading(false);
          setStatus('');
          evtSource.close();
        }
      };

      evtSource.onerror = () => {
        setError("Connection to server lost.");
        setLoading(false);
        evtSource.close();
      };

    } catch (err) {
      setError(err.message);
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="flex-col items-center justify-center" style={{ padding: '60px 24px', maxWidth: '600px', margin: '0 auto', gap: '32px' }}>
      <div className="flex-col items-center gap-4 text-center">
        <FiDownloadCloud size={48} />
        <h2 className="text-xl">Download from YouTube</h2>
        <p className="text-secondary">Paste a YouTube link below to download as audio or video.</p>
      </div>

      <form onSubmit={handleDownload} className="flex-col gap-4" style={{ width: '100%' }}>
        <input 
          type="text" 
          placeholder="https://www.youtube.com/watch?v=..." 
          className="input-field"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        
        <div className="flex gap-4 justify-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="type" 
              value="audio" 
              checked={type === 'audio'} 
              onChange={() => setType('audio')} 
              disabled={loading}
            />
            <span>Audio (MP3)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="type" 
              value="video" 
              checked={type === 'video'} 
              onChange={() => setType('video')} 
              disabled={loading}
            />
            <span>Video (MP4)</span>
          </label>
        </div>

        {type === 'video' && (
          <div className="flex gap-4 justify-center items-center">
             <span className="text-secondary text-sm">Quality:</span>
             <select 
               className="input-field" 
               style={{ width: 'auto', paddingRight: '32px', appearance: 'auto', padding: '8px 16px' }}
               value={quality}
               onChange={(e) => setQuality(e.target.value)}
               disabled={loading}
             >
               <option value="best">Best Available</option>
               <option value="1080p">1080p</option>
               <option value="720p">720p</option>
               <option value="480p">480p</option>
               <option value="360p">360p</option>
             </select>
          </div>
        )}

        {/* Progress Bar UI */}
        {loading && (
          <div style={{ marginTop: '16px', background: '#121212', padding: '16px', borderRadius: '8px', border: '1px solid #282828' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-sm text-secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                {status}
              </span>
              <span className="text-sm font-bold">{progress.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progress}%`, 
                background: 'white', 
                transition: 'width 0.3s ease' 
              }}></div>
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Downloading...' : 'Download'}
        </button>
      </form>

      {error && <div style={{ color: '#ff5252', padding: '16px', background: '#2a1010', borderRadius: '8px', width: '100%', textAlign: 'center' }}>{error}</div>}
      {success && <div style={{ color: '#4caf50', padding: '16px', background: '#0e2410', borderRadius: '8px', width: '100%', textAlign: 'center' }}>{success}</div>}
    </div>
  );
};

export default Downloader;
