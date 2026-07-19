import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#1a1a1a', width: '400px', borderRadius: '16px',
        padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', color: 'white'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: '0 0 24px 0', color: '#aaaaaa', fontSize: '15px', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="btn-primary" 
            style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: 600, background: '#ef4444', color: 'white', border: 'none' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
