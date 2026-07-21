import { app, shell, BrowserWindow, Tray, Menu, globalShortcut, screen, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let dashboardWindow: BrowserWindow | null = null
let aiMascotWindow: BrowserWindow | null = null
let userMascotWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAppQuitting = false

function createWindows(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const MASCOT_WIDTH = 100;
  const MASCOT_HEIGHT = 120;

  // 1. Mascot Overlay Window (Transparent, always-on-top, click-through)
  // 1. AI Mascot Overlay Window (Transparent, always-on-top, bottom-right)
  aiMascotWindow = new BrowserWindow({
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    x: width - MASCOT_WIDTH - 20,
    y: height - MASCOT_HEIGHT - 20,
    show: false,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      additionalArguments: ['--window-type=mascot']
    }
  })

  // 2. User Mascot Overlay Window (Transparent, always-on-top, bottom-left)
  userMascotWindow = new BrowserWindow({
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    x: 20,
    y: height - MASCOT_HEIGHT - 20,
    show: false,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      additionalArguments: ['--window-type=user-mascot']
    }
  })

  // 2. Main Calendar Dashboard Window
  dashboardWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    hasShadow: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      additionalArguments: ['--window-type=dashboard']
    }
  })

  dashboardWindow.on('ready-to-show', () => {
    dashboardWindow?.show()
    // dashboardWindow?.webContents.openDevTools({ mode: 'right' }) // Disabled by user request
  })

  // When dashboard is closed or minimized, show the AI Mascot instead
  dashboardWindow.on('close', (e) => {
    if (!isAppQuitting) {
      e.preventDefault()
      dashboardWindow?.hide()
      aiMascotWindow?.show()
    }
  })

  dashboardWindow.on('minimize', () => {
    dashboardWindow?.hide()
    aiMascotWindow?.show()
  })

  const handleOpenUrl = (details) => {
    shell.openExternal(details.url)
    return { action: 'deny' as const }
  }
  
  dashboardWindow.webContents.setWindowOpenHandler(handleOpenUrl)
  aiMascotWindow.webContents.setWindowOpenHandler(handleOpenUrl)
  userMascotWindow.webContents.setWindowOpenHandler(handleOpenUrl)

  // Load the respective URLs
  const loadContent = (win: BrowserWindow, hash: string) => {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/${hash}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
    }
  }

  loadContent(dashboardWindow, 'dashboard')
  loadContent(aiMascotWindow, 'mascot')
  loadContent(userMascotWindow, 'user-mascot')
}

function createTray() {
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => {
      aiMascotWindow?.hide()
      dashboardWindow?.show()
      dashboardWindow?.focus()
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isAppQuitting = true
      app.exit(0)
    }}
  ])
  tray.setToolTip('Voice Calendar Assistant')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    aiMascotWindow?.hide()
    dashboardWindow?.show()
    dashboardWindow?.focus()
  })
}

function setupShortcutsAndListeners() {
  // Global Shortcut: CommandOrControl + `
  // Due to regional keyboards, 'Ctrl+`' is often standard.
  globalShortcut.register('CommandOrControl+`', () => {
    if (dashboardWindow?.isVisible()) {
      dashboardWindow.hide()
      aiMascotWindow?.show()
    } else {
      aiMascotWindow?.hide()
      dashboardWindow?.show()
      dashboardWindow?.focus()
    }
  })

  // Clean Electron Native Hold-to-Talk using globalShortcut and timeout hack
  let voiceTimeout: NodeJS.Timeout | null = null;
  let isVoiceHeld = false;

  globalShortcut.register('CommandOrControl+Space', () => {
    // Determine which window is currently active/visible to avoid duplicate voice recording
    const isDashboardActive = dashboardWindow?.isVisible();
    const activeWindow = isDashboardActive ? dashboardWindow : aiMascotWindow;

    // On KeyDown (or auto-repeat)
    if (!isVoiceHeld) {
      isVoiceHeld = true;
      activeWindow?.webContents.send('STT_START');
      userMascotWindow?.webContents.send('STT_START');
      userMascotWindow?.show(); // Show user mascot when talking
    }

    // Reset the timeout on every auto-repeat tick
    if (voiceTimeout) clearTimeout(voiceTimeout);

    // If no tick is received for 800ms (covers max OS keyboard delay), assume KeyUp
    voiceTimeout = setTimeout(() => {
      isVoiceHeld = false;
      activeWindow?.webContents.send('STT_STOP');
      userMascotWindow?.webContents.send('STT_STOP');
      userMascotWindow?.hide(); // Hide user mascot when stopped
    }, 800);
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.voicecalendar')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('window-minimize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.minimize()
  })
  
  ipcMain.on('window-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window-close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    // For dashboard, we hide it instead of closing to keep the app alive
    if (win === dashboardWindow) {
      win?.hide()
      aiMascotWindow?.show()
    } else {
      win?.close()
    }
  })

  createWindows()
  createTray()
  setupShortcutsAndListeners()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindows()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
