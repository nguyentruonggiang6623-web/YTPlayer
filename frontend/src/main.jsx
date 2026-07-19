import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

async function init() {
  if (window.electronAPI) {
    window.API_URL = await window.electronAPI.getServerUrl();
  } else {
    window.API_URL = 'http://localhost:5000'; // Fallback
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}

init();
