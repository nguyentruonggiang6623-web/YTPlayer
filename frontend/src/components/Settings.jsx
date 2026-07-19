import React, { useState, useEffect, useRef } from 'react';
import { FiMoon, FiSun, FiDownloadCloud, FiCheck, FiHardDrive, FiTrash2, FiUploadCloud, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Settings = () => {
  const [theme, setTheme] = useState(localStorage.getItem('ytplayer_theme') || 'dark');
  const [isExporting, setIsExporting] = useState(false);
  const [storageSize, setStorageSize] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('ytplayer_theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const fetchStorageStats = async () => {
    try {
      const res = await fetch(`${window.API_URL}/api/storage`);
      const data = await res.json();
      setStorageSize(data.sizeBytes || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleExport = () => {
    setIsExporting(true);
    window.location.href = `${window.API_URL}/api/backup`;
    setTimeout(() => {
      setIsExporting(false);
    }, 5000);
  };

  const handleClearHistory = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nghe nhạc không? (Bài hát tải về vẫn được giữ lại)')) {
      try {
        await fetch(`${window.API_URL}/api/storage/clear-history`, { method: 'POST' });
        toast.success('Đã xóa lịch sử nghe nhạc');
      } catch (e) {
        toast.error('Lỗi khi xóa lịch sử');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa sạch toàn bộ nhạc, video và playlists của bạn vĩnh viễn! Bạn có chắc chắn không?')) {
      try {
        await fetch(`${window.API_URL}/api/storage/clear-all`, { method: 'POST' });
        toast.success('Đã xóa toàn bộ dữ liệu');
        setStorageSize(0);
        setTimeout(() => window.location.reload(), 1000);
      } catch (e) {
        toast.error('Lỗi khi xóa dữ liệu');
      }
    }
  };

  const handleBgChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ!');
      return;
    }

    setBgUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${window.API_URL}/api/settings/background`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem('ytplayer_background', result.url);
        const fullUrl = `${window.API_URL}${result.url}`;
        document.body.style.backgroundImage = `url(${fullUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        toast.success('Đã cập nhật hình nền!');
      } else {
        toast.error(result.error || 'Lỗi upload hình nền');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi tải ảnh');
    } finally {
      setBgUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleResetBg = () => {
    localStorage.removeItem('ytplayer_background');
    document.body.style.backgroundImage = '';
    toast.success('Đã khôi phục nền mặc định');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Vui lòng chọn file .zip hợp lệ!');
      return;
    }

    if (window.confirm('Hệ thống sẽ khôi phục lại dữ liệu từ file backup và tự động khởi động lại. CẢNH BÁO: Toàn bộ dữ liệu hiện tại sẽ bị ghi đè. Tiếp tục?')) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${window.API_URL}/api/restore`, {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        
        if (response.ok) {
          toast.success('Đang khôi phục dữ liệu! Hệ thống sẽ khởi động lại...');
          setTimeout(() => {
            window.location.reload();
          }, 3000); // Wait for node to restart
        } else {
          toast.error(result.error || 'Lỗi khôi phục');
          setIsUploading(false);
        }
      } catch (err) {
        toast.error('Lỗi khi tải file lên');
        setIsUploading(false);
      } finally {
        e.target.value = null; // reset input
      }
    } else {
      e.target.value = null;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="text-4xl font-bold" style={{ letterSpacing: '-1px', marginBottom: '32px' }}>Settings</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Theme Settings */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-xl" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'light' ? <FiSun /> : <FiMoon />} Giao diện
          </h2>
          <p className="text-secondary" style={{ marginBottom: '24px', flex: 1 }}>
            Chọn chế độ Sáng hoặc Tối cho phù hợp với môi trường của bạn.
          </p>
          <button 
            onClick={toggleTheme}
            className="btn-primary"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', 
              background: theme === 'light' ? '#1a1a1a' : 'white', 
              color: theme === 'light' ? 'white' : 'black', 
              fontWeight: 600, border: 'none', cursor: 'pointer' 
            }}
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />} 
            {theme === 'light' ? 'Chuyển sang Dark Mode' : 'Chuyển sang Light Mode'}
          </button>
        </div>

        {/* Background Settings */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-xl" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiImage /> Hình nền tùy chỉnh
          </h2>
          <p className="text-secondary" style={{ marginBottom: '24px', flex: 1 }}>
            Tải lên hình ảnh từ máy tính để cá nhân hóa hình nền ứng dụng.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => bgInputRef.current.click()}
              disabled={bgUploading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: '24px', background: '#a78bfa', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: bgUploading ? 0.7 : 1 }}
            >
              {bgUploading ? 'Đang xử lý...' : 'Chọn ảnh mới'}
            </button>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={bgInputRef} onChange={handleBgChange} />
            <button 
              onClick={handleResetBg}
              style={{ padding: '10px 16px', borderRadius: '24px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer' }}
            >
              Nền mặc định
            </button>
          </div>
        </div>

        {/* Storage Settings */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="text-xl" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiHardDrive /> Quản lý Dung lượng
          </h2>
          <p className="text-secondary" style={{ marginBottom: '24px', flex: 1 }}>
            Dung lượng nhạc và video đang sử dụng: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(storageSize)}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleClearHistory}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '24px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer' }}
            >
               Xóa Lịch sử Nghe
            </button>
            <button 
              onClick={handleClearAll}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
            >
              <FiTrash2 /> Xóa Toàn bộ Dữ liệu
            </button>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
          <h2 className="text-xl" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiDownloadCloud /> Sao lưu & Khôi phục
          </h2>
          <p className="text-secondary" style={{ marginBottom: '24px' }}>
            Đóng gói toàn bộ cơ sở dữ liệu và các bài hát đã tải về thành một file zip để lưu trữ trên Google Drive. 
            Bạn cũng có thể tải ngược file zip đó lên đây để khôi phục dữ liệu nhanh chóng.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExport}
              disabled={isExporting || isUploading}
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', background: '#34d399', color: 'black', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (isExporting || isUploading) ? 0.7 : 1 }}
            >
              {isExporting ? <><FiCheck /> Đang tạo file nén...</> : <><FiDownloadCloud /> Xuất file dữ liệu (.zip)</>}
            </button>
            
            <button 
              onClick={() => fileInputRef.current.click()}
              disabled={isExporting || isUploading}
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', background: '#60a5fa', color: 'black', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (isExporting || isUploading) ? 0.7 : 1 }}
            >
              {isUploading ? <><FiCheck /> Đang khôi phục...</> : <><FiUploadCloud /> Tải lên File Khôi phục (.zip)</>}
            </button>
            <input 
              type="file" 
              accept=".zip" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
