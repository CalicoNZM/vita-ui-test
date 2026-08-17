const { app, BrowserWindow, shell } = require('electron');
const { startServer } = require('./server');

const PORT = process.env.PORT || 8765;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#0a0d12',
    autoHideMenuBar: true,
    title: 'VITA UI TEST',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL('http://localhost:' + PORT + '/');
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startServer(PORT, err => {
    if (err) {
      console.error('Failed to start local server:', err.message);
      app.quit();
      return;
    }
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (win === null && BrowserWindow.getAllWindows().length === 0) createWindow();
});