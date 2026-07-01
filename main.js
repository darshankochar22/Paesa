const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged && !process.env.E2E_PROD;

ipcMain.handle("app:getDataPath", () => app.getPath("userData"));
ipcMain.handle("export:htmlToPdf", async (event, { html, defaultFileName } = {}) => {
    if (!html || typeof html !== "string") {
        return { success: false, error: "No HTML provided." };
    }
    let pdfWin = null;
    let tmpPath = null;
    try {
        pdfWin = new BrowserWindow({
            show: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false },
        });
        // Write to a temp file and loadFile — robust for large HTML/CSS (data: URLs have size limits).
        tmpPath = path.join(app.getPath("temp"), `vch-export-${Date.now()}.html`);
        fs.writeFileSync(tmpPath, html, "utf8");
        await pdfWin.loadFile(tmpPath);
        // Let layout/fonts settle before snapshotting.
        await new Promise((r) => setTimeout(r, 200));
        const pdfBuffer = await pdfWin.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: { marginType: "custom", top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        });

        const parent = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
        const { canceled, filePath } = await dialog.showSaveDialog(parent, {
            title: "Save PDF",
            defaultPath: defaultFileName || "voucher.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (canceled || !filePath) return { success: false, canceled: true };

        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, filePath };
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (pdfWin) pdfWin.destroy();
        if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (e) { /* best-effort temp cleanup */ } }
    }
});

// Same render as export:htmlToPdf but returns the PDF as base64 (no save dialog) —
// used to attach the voucher PDF to a WhatsApp message.
ipcMain.handle("export:htmlToPdfBase64", async (_event, { html } = {}) => {
    if (!html || typeof html !== "string") {
        return { success: false, error: "No HTML provided." };
    }
    let pdfWin = null;
    let tmpPath = null;
    try {
        pdfWin = new BrowserWindow({
            show: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false },
        });
        tmpPath = path.join(app.getPath("temp"), `vch-export-${Date.now()}.html`);
        fs.writeFileSync(tmpPath, html, "utf8");
        await pdfWin.loadFile(tmpPath);
        await new Promise((r) => setTimeout(r, 200));
        const pdfBuffer = await pdfWin.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: { marginType: "custom", top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        });
        return { success: true, base64: pdfBuffer.toString("base64") };
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (pdfWin) pdfWin.destroy();
        if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (e) { /* best-effort temp cleanup */ } }
    }
});

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
    }
}

app.whenReady().then(async () => {
    try {
        const { initDB } = require('./server/db/index');
        await initDB();
        require('./server/index.js');

        if (!app.isPackaged && !process.env.E2E_PROD) {
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