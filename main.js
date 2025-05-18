import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';

let mainWindow;
let serverProcess;
let serverRetryCount = 0;
const maxRetries = 3;

const isDev = !app.isPackaged;

function handleError(title, error, userFriendlyMessage = null, showDialog = true) {
  console.error(`${title}:`, error);
  const message = userFriendlyMessage || 'An unexpected error occurred. Please try restarting the application or contact support.';
  let finalTitle = title;
  let finalMessage = message;

  if (error.code === 'MODULE_NOT_FOUND') {
    finalTitle = 'Missing Component';
    const moduleName = error.message.match(/'([^']+)'/)?.[1] || 'unknown module';
    finalMessage = `A required component (${moduleName}) is missing. Please ensure the application is installed correctly or contact support.`;
  } else if (error.message.includes('index.html')) {
    finalTitle = 'Application Load Error';
    finalMessage = 'The main application interface could not be loaded. Please check your installation or contact support.';
  } else if (error.message.includes('tailwind.css')) {
    finalTitle = 'Styling Error';
    finalMessage = 'The application styles could not be loaded. The app may look incorrect. Please try reinstalling or contact support.';
  } else if (error.message.includes('server.mjs')) {
    finalTitle = 'Server Error';
    finalMessage = 'The automation server could not start. Please ensure all dependencies are installed or contact support.';
  }

  if (!isDev && app.isReady() && showDialog) {
    dialog.showErrorBox(finalTitle, finalMessage);
  }
}

process.on('uncaughtException', (error) => {
  handleError('Unexpected Error', error, 'The application encountered an unexpected error. Please try restarting or contact support.');
});

if (!isDev) {
  try {
    const logPath = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    const logFile = path.join(logPath, 'app.log');
    // Test write permissions
    fs.accessSync(logPath, fs.constants.W_OK);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    console.log(`Successfully created log file at: ${logFile}`);
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    const timestamp = () => new Date().toISOString();
    console.log = (...args) => {
      const message = `[${timestamp()}] [LOG] ${args.join(' ')}\n`;
      logStream.write(message);
      if (isDev) originalConsole.log(...args);
    };
    console.error = (...args) => {
      const message = `[${timestamp()}] [ERROR] ${args.join(' ')}\n`;
      logStream.write(message);
      if (isDev) originalConsole.error(...args);
    };
    console.warn = (...args) => {
      const message = `[${timestamp()}] [WARN] ${args.join(' ')}\n`;
      logStream.write(message);
      if (isDev) originalConsole.warn(...args);
    };
    console.info = (...args) => {
      const message = `[${timestamp()}] [INFO] ${args.join(' ')}\n`;
      logStream.write(message);
      if (isDev) originalConsole.info(...args);
    };
    console.log(`Log file created at: ${logFile}`);
  } catch (err) {
    console.error(`Failed to set up logging: ${err.message}`);
  }
}

console.log(`------- GRMS AUTOMATION STARTUP -------`);
console.log(`App version: ${app.getVersion()}`);
console.log(`Electron version: ${process.versions.electron}`);
console.log(`Chrome version: ${process.versions.chrome}`);
console.log(`Node version: ${process.versions.node}`);
console.log(`Starting app in ${isDev ? 'development' : 'production'} mode`);
console.log(`App path: ${app.getAppPath()}`);
console.log(`User data path: ${app.getPath('userData')}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`__dirname: ${__dirname}`);
console.log(`process.resourcesPath: ${process.resourcesPath || 'not available'}`);

function listFilesInDirectory(directoryPath) {
  try {
    console.log(`Listing files in: ${directoryPath}`);
    if (fs.existsSync(directoryPath)) {
      const files = fs.readdirSync(directoryPath);
      files.forEach(file => {
        const fullPath = path.join(directoryPath, file);
        const stats = fs.statSync(fullPath);
        console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
      });
    } else {
      console.error(`Directory does not exist: ${directoryPath}`);
    }
  } catch (err) {
    console.error(`Error listing files in ${directoryPath}:`, err);
  }
}

if (!isDev) {
  console.log(`\n--- DIRECTORY CONTENTS ---`);
  listFilesInDirectory(process.resourcesPath);
  listFilesInDirectory(path.join(process.resourcesPath, 'app.asar'));
  try {
    listFilesInDirectory(path.join(process.resourcesPath, 'app.asar', 'dist'));
  } catch (err) {
    console.error(`Cannot access dist directory:`, err);
  }
}

function createWindow() {
  console.log('Creating main application window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.maximize();
  // mainWindow.webContents.openDevTools(); // Uncomment for debugging

  let indexPath;
  
  if (isDev) {
    indexPath = path.join(__dirname, 'public', 'index.html');
    console.log(`Dev mode: Loading ${indexPath}`);
  } else {
    const possiblePaths = [
      path.join(process.resourcesPath, 'app.asar', 'public', 'index.html'),
      path.join(app.getAppPath(), 'public', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'public', 'index.html')
    ];
    
    indexPath = possiblePaths.find(p => {
      const exists = fs.existsSync(p);
      console.log(`Checking path: ${p} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      return exists;
    });
    
    if (!indexPath) {
      const error = new Error('Could not find public/index.html in any location');
      handleError('Missing HTML File', error);
      indexPath = path.join(app.getAppPath(), 'public', 'index.html');
    }
  }

  console.log(`Final HTML path: ${indexPath}`);
  
  mainWindow.loadFile(indexPath).then(() => {
    console.log('HTML loaded successfully');
    const cssPath = path.join(path.dirname(indexPath), 'css', 'tailwind.css');
    if (fs.existsSync(cssPath)) {
      console.log(`CSS file found at: ${cssPath}`);
    } else {
      console.error(`CSS file not found at: ${cssPath}`);
      handleError('Missing CSS File', new Error(`CSS file not found at ${cssPath}`));
    }
    mainWindow.show();
  }).catch(err => {
    console.error('Failed to load HTML:', err);
    handleError('Failed to Load UI', err, 'The application interface could not be loaded. Please try reinstalling or contact support.');
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head><title>GRMS Automation Error</title></head>
        <body style="font-family: sans-serif; padding: 20px; background: #000; color: #fff;">
          <h2>Error Loading Application</h2>
          <p>The application encountered an error. Please try restarting or contact support.</p>
          <p>Check the log file at: ${path.join(app.getPath('userData'), 'logs', 'app.log')} for details.</p>
        </body>
      </html>
    `);
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorDescription} (${errorCode})`);
    handleError('Load Failure', new Error(errorDescription), 'The application failed to load. Please try restarting or contact support.');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window content finished loading');
  });

  mainWindow.on('closed', () => {
    console.log('Main window closed');
    mainWindow = null;
    if (serverProcess) {
      console.log('Terminating server process');
      serverProcess.kill();
    }
  });
}

async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3132/health');
    const data = await response.json();
    console.log(`[SERVER] Health check: ${JSON.stringify(data)}`);
    return true;
  } catch (err) {
    console.error('[SERVER] Health check failed:', err);
    return false;
  }
}

function startServer() {
  console.log(`Starting server process (Attempt ${serverRetryCount + 1}/${maxRetries})...`);
  
  let serverScript;
  
  if (isDev) {
    serverScript = ['--loader', 'ts-node/esm', 'src/server.ts'];
    console.log('Using ts-node for development server');
  } else {
    const possibleServerPaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'src', 'server.mjs'),
      path.join(app.getAppPath(), 'dist', 'src', 'server.mjs'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'src', 'server.mjs'),
      path.join(process.resourcesPath, 'dist', 'src', 'server.mjs')
    ];
    
    const finalPath = possibleServerPaths.find(p => {
      const exists = fs.existsSync(p);
      console.log(`Checking server path: ${p} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      return exists;
    });
    
    if (!finalPath) {
      const error = new Error(`Server script not found in any location: ${possibleServerPaths.join(', ')}`);
      handleError('Server Script Missing', error, null, false);
      return;
    }
    
    serverScript = [finalPath];
  }

  console.log(`Starting server with script: ${serverScript.join(' ')}`);
  
  try {
    console.log('Server environment:', {
      STAGEHAND_ENV: 'LOCAL',
      PORT: '3132'
    });
    
    serverProcess = spawn('node', serverScript, {
      stdio: 'pipe',
      env: { ...process.env, STAGEHAND_ENV: 'LOCAL', PORT: '3132' },
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      const errorMessage = data.toString().trim();
      console.error(`[SERVER ERROR] ${errorMessage}`);
      if (errorMessage.includes('EADDRINUSE') || errorMessage.includes('listen')) {
        handleError('Server Runtime Error', new Error(errorMessage), 'The automation server could not start due to a port conflict. Please close other applications using port 3132 or contact support.');
      } else if (errorMessage.includes('Node.js v') || errorMessage.includes('Warning') || errorMessage.includes('SyntaxError')) {
        console.warn(`[SERVER WARNING] Ignored warning: ${errorMessage}`);
      } else {
        console.warn(`[SERVER WARNING] Non-fatal server error: ${errorMessage}`);
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server process:', err);
      handleError('Server Process Error', err, null, false);
      if (serverRetryCount < maxRetries - 1) {
        serverRetryCount++;
        setTimeout(startServer, 1000);
      }
    });
    
    serverProcess.on('exit', (code, signal) => {
      console.log(`Server process exited with code ${code} and signal ${signal}`);
      if (code !== 0 && serverRetryCount < maxRetries - 1) {
        console.warn(`Server exited unexpectedly. Retrying (Attempt ${serverRetryCount + 2}/${maxRetries})...`);
        serverRetryCount++;
        setTimeout(startServer, 1000);
      } else if (code !== 0) {
        handleError('Server Exit', new Error(`Server exited with code ${code}`), null, false);
      }
    });
    
    console.log('Server process spawned with PID:', serverProcess.pid);
    
  } catch (error) {
    console.error('Exception when starting server:', error);
    handleError('Server Start Exception', error, null, false);
    if (serverRetryCount < maxRetries - 1) {
      serverRetryCount++;
      setTimeout(startServer, 1000);
    }
  }
}

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

app.on('ready', () => {
  console.log('Electron app ready event fired');
  
  try {
    startServer();
    console.log('Waiting for server to start...');
    setTimeout(async () => {
      const serverReady = await checkServerHealth();
      if (!serverReady && serverRetryCount >= maxRetries) {
        handleError('Server Unavailable', new Error('Server failed to start after retries'), 'The automation server could not start. Please try restarting or contact support.');
      }
      createWindow();
    }, 4000);
  } catch (err) {
    console.error('Error during app startup:', err);
    handleError('Startup Error', err, 'The application failed to start. Please try restarting or contact support.');
  }
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    console.log('Quitting application');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  console.log('App quitting');
  if (serverProcess) {
    console.log('Killing server process');
    serverProcess.kill();
  }
});

console.log('main.js loaded successfully');