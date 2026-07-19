const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let serverUrl = '';

// Setup data directory for the backend
const userDataPath = path.join(app.getPath('userData'), 'YTPlayer-Data');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
process.env.DATA_DIR = userDataPath;

const { startServer } = require('../backend/server.js');

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'YTPlayer',
    autoHideMenuBar: true
  });

  // Start backend on random port
  try {
    const { port } = await startServer(0);
    serverUrl = `http://localhost:${port}`;
    console.log('Backend running at:', serverUrl);
  } catch (err) {
    console.error('Failed to start backend server:', err);
  }

  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-server-url', () => serverUrl);
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
