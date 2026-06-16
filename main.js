const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPacakaged;

ipcMain.handle("app:getDataPath", () => app.getPath("userData"));

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

        // Dev-only: serve auto-generated API docs at http://localhost:5180/docs
        // (uses the correctly-spelled app.isPackaged so it never ships in production builds).
        if (!app.isPackaged) {
            require('./server/docs/server')
                .startDocsServer({ port: 5180 })
                .then(() => console.log('API docs: http://localhost:5180/docs'))
                .catch((e) => console.error('Docs server failed to start:', e));
        }

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