const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

let mainWindow;

// 创建主窗口
function createWindow() {
  // 根据操作系统选择合适的图标格式
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '../../assets/icons/icon.ico');
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, '../../assets/icons/icon.icns');
  } else {
    iconPath = path.join(__dirname, '../../assets/icons/icon.png');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
}

// 复制必要的资源文件
function copyResources() {
  const resourcesPath = path.join(__dirname, '../../public');
  
  // 确保目录存在
  if (!fs.existsSync(resourcesPath)) {
    fs.mkdirSync(resourcesPath, { recursive: true });
  }
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  copyResources();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 监听窗口控制事件
ipcMain.on('window-min', () => mainWindow.minimize());
ipcMain.on('window-max', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow.close());

// 处理文件选择对话框
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'm3u8'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
}); 