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

const lastWindowState = store.get('lastWindowState')

let mainWindow
let subWindow
let isQuitting = false

const createWindow = (windowName) => {
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    width: lastWindowState.width,
    height: lastWindowState.height,
    x: lastWindowState.x,
    y: lastWindowState.y,
    icon: process.platform === 'linux' && path.join(__dirname, 'static', 'Icon.png'),
    minWidth: 400,
    minHeight: 200,
    titleBarStyle: 'hidden-inset',
    webPreferences: {
      nodeIntegration: false,
      partition: `persist:${windowName}`,
      preload: path.join(__dirname, 'browser.js'),
      plugins: true
    },
  })

  if (process.platform === 'darwin') {
    win.setSheetOffset(40)
  }

  win.loadURL('https://trello.com/')

  win.on('close', e => {
    if (isQuitting && !mainWindow.isFullScreen()) {
        store.set('lastWindowState', mainWindow.getBounds())
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
  mainWindow = createWindow('one')
  subWindow = createWindow('two')
  const page = mainWindow.webContents
  const subpage = subWindow.webContents

  page.on('dom-ready', () => {
    page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'))
    mainWindow.show()
  })

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
      label: 'Personal', selector: '', click: () => {
        if (mainWindow.isVisible()) return
        const [width, height] = subWindow.getSize()
        mainWindow.setSize(width, height)
        const [x, y] = subWindow.getPosition()
        console.log('position work', subWindow.getPosition())
        mainWindow.setPosition(x, y - 37)
        console.log('position personal', mainWindow.getPosition())

        subWindow.hide()
        mainWindow.show()
      }
    },
    {
      label: 'Work', selector: '', click: () => {
        if (subWindow.isVisible()) return
        const [width, height] = mainWindow.getSize()
        subWindow.setSize(width, height)
        const [x, y] = mainWindow.getPosition()
        console.log('position personal', mainWindow.getPosition())
        subWindow.setPosition(x, y - 37)
        console.log('position work', subWindow.getPosition())

        mainWindow.hide()
        subWindow.show()
      }
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(templateMenu))
})

app.on('window-all-closed', () => app.quit())

app.on('activate', () => mainWindow.show())

app.on('before-quit', () => isQuitting = true)
