const {
  BrowserWindow,
  Dialog,
  Menu,
  app,
  shell,
  session
} = require('electron')
const path = require('path')
const fs = require('fs')
const store = require('./store')
const { templateMenu } = require('./config')

let mainWindow
let subWindow
let isQuitting = false

const createWindow = () => {
  const lastWindowState = store.get('lastWindowState')
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    icon: process.platform === 'linux' && path.join(__dirname, 'static', 'Icon.png'),
    minWidth: 400,
    minHeight: 200,
    skipTaskbar: true,
    titleBarStyle: "hidden",
    webPreferences: {
      nodeIntegration: false,
      partition: 'persist:one',
      preload: path.join(__dirname, 'browser.js'),
      plugins: true
    },
  })

  if (process.platform === 'darwin') {
    win.setSheetOffset(40)
  }

  win.loadURL('https://trello.com/')

  win.on('close', e => {
    if (isQuitting) {
      if (!mainWindow.isFullScreen()) {
        store.set('lastWindowState', mainWindow.getBounds())
      }
    } else {
      e.preventDefault()

      if (process.platform === 'darwin') {
        app.hide()
      } else {
        app.quit()
      }
    }
  })

  return win
}

const createSubWindow = () => {
  const lastWindowState = store.get('lastWindowState')
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    icon: process.platform === 'linux' && path.join(__dirname, 'static', 'Icon.png'),
    minWidth: 400,
    minHeight: 200,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    parent: 'top',
    webPreferences: {
      nodeIntegration: false,
      partition: 'persist:two',
      preload: path.join(__dirname, 'browser.js'),
      plugins: true
    },
  })

  if (process.platform === 'darwin') {
    win.setSheetOffset(40)
  }

  win.loadURL('https://trello.com/', {"extraHeaders" : "pragma: no-cache\n"})

  win.on('close', e => {
    if (isQuitting) {
      if (!mainWindow.isFullScreen()) {
        store.set('lastWindowState', mainWindow.getBounds())
      }
    } else {
      e.preventDefault()

      if (process.platform === 'darwin') {
        app.hide()
      } else {
        app.quit()
      }
    }
  })

  return win
}

app.on('ready', () => {
  mainWindow = createWindow()
  subWindow = createSubWindow()
  const page = mainWindow.webContents
  const subpage = subWindow.webContents

  page.on('dom-ready', () => {
    page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'))
    mainWindow.show()
  })

  // page.openDevTools()
  // console.log('main', mainWindow)

  // subpage.on('dom-ready', () => {
  //   page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'))
  //   subWindow.show()
  // })

  page.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })

  mainWindow.webContents.session.on('will-download', (event, item) => {
    const totalBytes = item.getTotalBytes()

    item.on('updated', () => {
      mainWindow.setProgressBar(item.getReceivedBytes() / totalBytes)
    })

    item.on('done', (e, state) => {
      mainWindow.setProgressBar(-1)

      if (state === 'interrupted') {
        Dialog.showErrorBox('Download error', 'The download was interrupted')
      }
    })
  })

  const templateMenu = [
    {
      label: 'Application',
      submenu: [
        {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
        {label: 'Change', selector: '', click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
            subWindow.show()
          } else {
            subWindow.hide()
            mainWindow.show()
          }
        }},
        {type: 'separator'},
        {
          label: 'Quit', accelerator: 'Command+Q', click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
        {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
        {type: 'separator'},
        {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
        {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
        {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
        {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
      ]
    },
    {
      label: 'Change', selector: '', click: () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
        subWindow.show()
      } else {
        subWindow.hide()
        mainWindow.show()
      }
    }},
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(templateMenu))
})

app.on('window-all-closed', () => app.quit())

app.on('activate', () => mainWindow.show())

app.on('before-quit', () => isQuitting = true)
