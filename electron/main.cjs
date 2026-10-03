const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const defaultUrl = "https://babis-keymaster.lovable.app";
const appUrl = process.env.KEYMASTER_DESKTOP_URL || defaultUrl;
const parsedAppUrl = new URL(appUrl);
app.setName("Babis Hub");
Menu.setApplicationMenu(null);

if (
  (parsedAppUrl.protocol !== "https:" &&
    !(parsedAppUrl.protocol === "http:" && parsedAppUrl.hostname === "localhost")) ||
  parsedAppUrl.username ||
  parsedAppUrl.password
) {
  throw new Error("KEYMASTER_DESKTOP_URL must use HTTPS (localhost is allowed for development).");
}

function createWindow() {
  const window = new BrowserWindow({
    title: "Babis Hub",
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "assets", "app-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle("Babis Hub");
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== parsedAppUrl.origin) {
      event.preventDefault();
      if (url.startsWith("https://")) void shell.openExternal(url);
    }
  });

  void window.loadURL(appUrl);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
