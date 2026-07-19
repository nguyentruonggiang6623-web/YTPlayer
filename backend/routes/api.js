const express = require('express');
const router = express.Router();
const youtubedlBase = require('youtube-dl-exec');
const db = require('../database');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStaticBase = require('ffmpeg-static');

function getUnpackedPath(originalPath) {
  if (originalPath && originalPath.includes('app.asar') && !originalPath.includes('app.asar.unpacked')) {
    return originalPath.replace('app.asar', 'app.asar.unpacked');
  }
  return originalPath;
}

const ffmpegStatic = getUnpackedPath(ffmpegStaticBase);
const ytdlExecIndex = require.resolve('youtube-dl-exec');
const ytdlpPath = getUnpackedPath(path.join(path.dirname(ytdlExecIndex), '..', 'bin', 'yt-dlp.exe'));
const youtubedl = youtubedlBase.create(ytdlpPath);
const crypto = require('crypto');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');

ffmpeg.setFfmpegPath(ffmpegStatic);

const downloadsDir = path.join(dataDir, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const activeJobs = {};

const sendSse = (jobId, data) => {
  if (activeJobs[jobId] && activeJobs[jobId].res) {
    activeJobs[jobId].res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

// SSE Endpoint for progress
router.get('/progress/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  if (!activeJobs[jobId]) {
    activeJobs[jobId] = {};
  }
  activeJobs[jobId].res = res;

  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  req.on('close', () => {
    delete activeJobs[jobId];
  });
});

// Get all downloaded media
router.get('/media', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM media ORDER BY addedAt DESC');
    const media = stmt.all();
    res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Download new media
router.post('/download', async (req, res) => {
  const { url, type, quality } = req.body; // type: 'audio' or 'video'

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = crypto.randomUUID();
  res.json({ success: true, jobId }); // Respond immediately

  // Process in background
  try {
    sendSse(jobId, { status: 'fetching_info', progress: 0 });

    // 1. Get info
    const info = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true
    });

    const id = info.id;
    const title = info.title;
    const artist = info.uploader || info.artist || 'Unknown Artist';
    const duration = info.duration || 0;
    const thumbnail = info.thumbnail;

    // Check if already downloaded
    const existing = db.prepare('SELECT * FROM media WHERE originalUrl = ? OR filePath LIKE ?').get(id, `%${id}%`);
    if (existing) {
      sendSse(jobId, { status: 'error', message: 'Media already downloaded' });
      return;
    }

    // 2. Download and process
    let fileName = `${id}.${type === 'audio' ? 'mp3' : 'mp4'}`;
    let filePath = path.join(downloadsDir, fileName);

    sendSse(jobId, { status: 'downloading', progress: 0, title: title });

    let options = {};
    if (type === 'audio') {
      options = {
        extractAudio: true,
        audioFormat: 'mp3',
        output: filePath,
        ffmpegLocation: ffmpegStatic,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        youtubeSkipDashManifest: true
      };
    } else {
      const requestedQuality = quality || 'best';
      let formatStr = 'bestvideo+bestaudio/best';
      if (requestedQuality !== 'best') {
         const height = requestedQuality.replace('p', '');
         formatStr = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
      }
      options = {
        format: formatStr,
        mergeOutputFormat: 'mp4',
        ffmpegLocation: ffmpegStatic,
        output: filePath,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        youtubeSkipDashManifest: true
      };
    }

    const subprocess = youtubedl.exec(url, options);

    subprocess.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/\[download\]\s+([\d\.]+)%/);
      if (match) {
        sendSse(jobId, { status: 'downloading', progress: parseFloat(match[1]) });
      }
    });

    subprocess.on('close', (code) => {
      if (code === 0) {
        // 3. Save to database
        const stmt = db.prepare(`
          INSERT INTO media (id, title, artist, duration, thumbnail, filePath, type, originalUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, title, artist, duration, thumbnail, fileName, type, id);

        sendSse(jobId, { status: 'completed' });
      } else {
        sendSse(jobId, { status: 'error', message: 'Download process failed' });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    sendSse(jobId, { status: 'error', message: 'Download failed: ' + error.message });
  }
});

// Stream media
router.get('/stream/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(downloadsDir, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': fileName.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': fileName.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Xóa media
router.delete('/media/:id', (req, res) => {
  const { id } = req.params;
  try {
    const row = db.prepare(`SELECT filePath FROM media WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    
    // Delete file
    const file = path.join(dataDir, 'downloads', row.filePath);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    
    // Xóa khỏi DB (cascade xoá lịch sử play)
    db.prepare(`DELETE FROM play_history WHERE media_id = ?`).run(id);
    db.prepare(`DELETE FROM media WHERE id = ?`).run(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ghi nhận lượt nghe
router.post('/media/:id/play', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare(`INSERT INTO play_history (media_id) VALUES (?)`).run(id);
    
    // Tự động dọn dẹp các lịch sử nghe cũ hơn 30 ngày để database không bị đầy
    db.prepare(`DELETE FROM play_history WHERE played_at < datetime('now', '-30 days')`).run();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bật/tắt yêu thích
router.post('/media/:id/favorite', (req, res) => {
  const { id } = req.params;
  try {
    const row = db.prepare('SELECT is_favorite FROM media WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    
    const newValue = row.is_favorite ? 0 : 1;
    db.prepare('UPDATE media SET is_favorite = ? WHERE id = ?').run(newValue, id);
    res.json({ success: true, is_favorite: newValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lấy thống kê
router.get('/stats', (req, res) => {
  try {
    const weekTop = db.prepare(`
      SELECT m.*, COUNT(p.id) as play_count 
      FROM media m 
      JOIN play_history p ON m.id = p.media_id 
      WHERE p.played_at >= datetime('now', '-7 days')
      GROUP BY m.id 
      ORDER BY play_count DESC 
      LIMIT 5
    `).all();

    const monthTop = db.prepare(`
      SELECT m.*, COUNT(p.id) as play_count 
      FROM media m 
      JOIN play_history p ON m.id = p.media_id 
      WHERE p.played_at >= datetime('now', '-30 days')
      GROUP BY m.id 
      ORDER BY play_count DESC 
      LIMIT 5
    `).all();

    const totals = db.prepare(`
      SELECT type, COUNT(*) as count FROM media GROUP BY type
    `).all();

    const playlistTotal = db.prepare(`
      SELECT COUNT(*) as count FROM playlists
    `).get();

    const playlists = db.prepare(`
      SELECT p.*, COUNT(pm.media_id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_media pm ON p.id = pm.playlist_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `).all();

    const recentPlays = db.prepare(`
      SELECT m.*, MAX(p.played_at) as last_played
      FROM media m
      JOIN play_history p ON m.id = p.media_id
      GROUP BY m.id
      ORDER BY last_played DESC
      LIMIT 10
    `).all();

    const recentAdds = db.prepare(`
      SELECT * FROM media
      ORDER BY addedAt DESC
      LIMIT 10
    `).all();

    const favorites = db.prepare(`
      SELECT * FROM media
      WHERE is_favorite = 1
      ORDER BY addedAt DESC
    `).all();
    
    let audioCount = 0;
    let videoCount = 0;
    totals.forEach(t => {
      if (t.type === 'audio') audioCount = t.count;
      if (t.type === 'video') videoCount = t.count;
    });

    res.json({ 
      weekTop, 
      monthTop, 
      totals: { audio: audioCount, video: videoCount, playlists: playlistTotal.count },
      recentPlays,
      recentAdds,
      favorites,
      playlists
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PLAYLIST APIs ---

// 1. Get all playlists (with track count)
router.get('/playlists', (req, res) => {
  try {
    const playlists = db.prepare(`
      SELECT p.*, COUNT(pm.media_id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_media pm ON p.id = pm.playlist_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new playlist
router.post('/playlists', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const info = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name);
    res.json({ success: true, id: info.lastInsertRowid, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete a playlist
router.delete('/playlists/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get media in a playlist
router.get('/playlists/:id/media', (req, res) => {
  const { id } = req.params;
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const media = db.prepare(`
      SELECT m.* 
      FROM media m
      JOIN playlist_media pm ON m.id = pm.media_id
      WHERE pm.playlist_id = ?
      ORDER BY pm.added_at DESC
    `).all(id);

    res.json({ playlist, media });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Add media to playlist
router.post('/playlists/:id/media', (req, res) => {
  const { id } = req.params;
  const { mediaId } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO playlist_media (playlist_id, media_id) VALUES (?, ?)').run(id, mediaId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Remove media from playlist
router.delete('/playlists/:id/media/:mediaId', (req, res) => {
  const { id, mediaId } = req.params;
  try {
    db.prepare('DELETE FROM playlist_media WHERE playlist_id = ? AND media_id = ?').run(id, mediaId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Backup data (zip database and downloads)
router.get('/backup', (req, res) => {
  const archiver = require('archiver');
  res.attachment('ytplayer_backup.zip');
  const archive = new archiver.ZipArchive({
    zlib: { level: 5 } // Sets the compression level.
  });

  archive.on('error', function(err) {
    console.error('Backup error:', err);
    res.status(500).send({error: err.message});
  });

  // Pipe archive data to the file
  archive.pipe(res);

  // Append the database file
  const dbPath = path.join(dataDir, 'ytplayer.db');
  if (fs.existsSync(dbPath)) {
    archive.file(dbPath, { name: 'ytplayer.db' });
  }
  
  // Append the downloads folder
  const dlPath = path.join(dataDir, 'downloads');
  if (fs.existsSync(dlPath)) {
    archive.directory(dlPath, 'downloads');
  }

  archive.finalize();
});

// --- STORAGE & RESTORE APIs ---

// 8. Get storage stats
router.get('/storage', (req, res) => {
  try {
    let size = 0;
    const dlPath = path.join(dataDir, 'downloads');
    if (fs.existsSync(dlPath)) {
      const files = fs.readdirSync(dlPath);
      for (const file of files) {
        const filePath = path.join(dlPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) size += stats.size;
      }
    }
    res.json({ sizeBytes: size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Clear history
router.post('/storage/clear-history', (req, res) => {
  try {
    db.prepare('DELETE FROM play_history').run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Clear all data
router.post('/storage/clear-all', (req, res) => {
  try {
    db.prepare('DELETE FROM play_history').run();
    db.prepare('DELETE FROM playlist_media').run();
    db.prepare('DELETE FROM playlists').run();
    db.prepare('DELETE FROM media').run();
    
    // Clear files
    const dlPath = path.join(dataDir, 'downloads');
    if (fs.existsSync(dlPath)) {
      const files = fs.readdirSync(dlPath);
      for (const file of files) {
        fs.unlinkSync(path.join(dlPath, file));
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Restore backup
const multer = require('multer');
const extract = require('extract-zip');
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

router.post('/restore', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const zipPath = req.file.path;
    const targetDir = dataDir;

    // Close the DB connection so it can be overwritten safely
    db.close();

    // Extract
    await extract(zipPath, { dir: targetDir });

    // Clean up temp file
    fs.unlinkSync(zipPath);

    res.json({ success: true, message: 'Restore completed. Restarting...' });
    
    // Restart node process so better-sqlite3 re-initializes
    setTimeout(() => {
      // process.exit(0); // Handled by Electron
    }, 500);
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 12. Upload custom background
router.post('/settings/background', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const ext = path.extname(req.file.originalname) || '.jpg';
    const bgName = 'custom_bg' + ext;
    const destPath = path.join(dataDir, 'downloads', bgName);
    
    // Copy from temp to downloads
    fs.copyFileSync(req.file.path, destPath);
    fs.unlinkSync(req.file.path);

    res.json({ success: true, url: `/downloads/${bgName}?t=${Date.now()}` });
  } catch (error) {
    console.error('Upload background error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
