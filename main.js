const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(app.getAppPath(), 'client', 'dist', 'index.html'));
        win.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {
    try {
        const { initDB, db } = require('./server/db/index');
        await initDB();
        console.log('db type:', typeof db);
        console.log('db.execute type:', typeof db?.execute);
        require('./server/index.js');
        createWindow();
    } catch (err) {
        console.error('DB init failed:', err);
        createWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});