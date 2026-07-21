import { app, shell, BrowserWindow, Tray, Menu, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let dashboardWindow: BrowserWindow | null = null
let mascotWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAppQuitting = false

function createWindows(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const MASCOT_WIDTH = 120;
  const MASCOT_HEIGHT = 160;

  // 1. Mascot Overlay Window (Transparent, always-on-top, click-through)
  mascotWindow = new BrowserWindow({
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

  // 2. Main Calendar Dashboard Window
  dashboardWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      additionalArguments: ['--window-type=dashboard']
    }
  })

  dashboardWindow.on('ready-to-show', () => {
    dashboardWindow?.show()
    dashboardWindow?.webContents.openDevTools({ mode: 'right' })
  })

  // When dashboard is closed or minimized, show the Mascot instead
  dashboardWindow.on('close', (e) => {
    if (!isAppQuitting) {
      e.preventDefault()
      dashboardWindow?.hide()
      mascotWindow?.show()
    }
  })

  dashboardWindow.on('minimize', () => {
    dashboardWindow?.hide()
    mascotWindow?.show()
  })

  const handleOpenUrl = (details) => {
    shell.openExternal(details.url)
    return { action: 'deny' as const }
  }
  
  dashboardWindow.webContents.setWindowOpenHandler(handleOpenUrl)
  mascotWindow.webContents.setWindowOpenHandler(handleOpenUrl)

  // Load the respective URLs
  const loadContent = (win: BrowserWindow, hash: string) => {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/${hash}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
    }
  }

  loadContent(dashboardWindow, 'dashboard')
  loadContent(mascotWindow, 'mascot')
}

function createTray() {
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => {
      mascotWindow?.hide()
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
    mascotWindow?.hide()
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
      mascotWindow?.show()
    } else {
      mascotWindow?.hide()
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
    const activeWindow = isDashboardActive ? dashboardWindow : mascotWindow;

    // On KeyDown (or auto-repeat)
    if (!isVoiceHeld) {
      isVoiceHeld = true;
      activeWindow?.webContents.send('STT_START');
    }

    // Reset the timeout on every auto-repeat tick
    if (voiceTimeout) clearTimeout(voiceTimeout);

    // If no tick is received for 800ms (covers max OS keyboard delay), assume KeyUp
    voiceTimeout = setTimeout(() => {
      isVoiceHeld = false;
      activeWindow?.webContents.send('STT_STOP');
    }, 800);
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.voicecalendar')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
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
