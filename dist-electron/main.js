import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import Store from "electron-store";
import fsExtra from "fs-extra";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-cache");
const store = new Store({
  name: "eazypaste-config",
  defaults: {
    lastFolderPath: "",
    hiddenList: [".git", "node_modules", ".env"],
    introRules: "Your default intro/rules text here...",
    selectedFiles: [],
    userTask: ""
  }
});
let mainWindow = null;
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  {
    mainWindow.loadURL("http://localhost:5173");
  }
}
app.whenReady().then(async () => {
  await createWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", function() {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
    store.set("lastFolderPath", result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});
ipcMain.handle("get-store-data", async () => {
  return {
    lastFolderPath: store.get("lastFolderPath"),
    hiddenList: store.get("hiddenList"),
    introRules: store.get("introRules"),
    selectedFiles: store.get("selectedFiles"),
    userTask: store.get("userTask")
  };
});
ipcMain.handle("set-store-data", async (_, data) => {
  Object.entries(data).forEach(([key, value]) => {
    store.set(key, value);
  });
});
ipcMain.handle("get-folder-tree", async (_, folderPath, hiddenList) => {
  if (!folderPath) return [];
  try {
    const items = await fsExtra.readdir(folderPath, { withFileTypes: true });
    const treeData = [];
    for (const item of items) {
      if (hiddenList.some((hidden) => item.name.includes(hidden))) continue;
      const itemPath = path.join(folderPath, item.name);
      treeData.push({
        n: item.name,
        p: itemPath,
        d: item.isDirectory(),
        r: path.relative(folderPath, path.dirname(itemPath))
      });
    }
    console.log("Sending tree data:", treeData);
    return treeData;
  } catch (error) {
    console.error("Error reading folder structure:", error);
    return [];
  }
});
ipcMain.handle("get-folder-contents", async (_, folderPath, hiddenList) => {
  if (!folderPath) return [];
  try {
    const items = await fsExtra.readdir(folderPath, { withFileTypes: true });
    const contents = [];
    for (const item of items) {
      if (hiddenList.some((hidden) => item.name.includes(hidden))) continue;
      const itemPath = path.join(folderPath, item.name);
      contents.push({
        name: String(item.name),
        path: String(itemPath),
        isDirectory: Boolean(item.isDirectory()),
        type: item.isDirectory() ? "directory" : "file"
      });
    }
    console.log("Sending folder contents:", JSON.stringify(contents));
    return contents;
  } catch (error) {
    console.error("Error reading folder contents:", error);
    return [];
  }
});
ipcMain.handle("read-file", async (_, filePath) => {
  try {
    const content = await fsExtra.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error("Error reading file", filePath, error);
    return "";
  }
});
ipcMain.handle("get-relative-path", async (_, filePath, rootPath) => {
  return path.relative(rootPath, filePath);
});
ipcMain.handle("get-basename", async (_, filePath) => {
  return path.basename(filePath);
});
//# sourceMappingURL=main.js.map
