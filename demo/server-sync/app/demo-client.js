// GRS server-sync demo: the page-side part.
//
// build-demo.mjs puts this file, as an inline module script, in front of the GRS script of
// dist/index.html. It runs before GRS boots, and GRS is not changed at all:
//
// - GRS reads window.showOpenFilePicker / showSaveFilePicker once at boot
//   (single-html-shell.ts, fileSystemAccessEnvironment). This file wraps both, so the only
//   thing that changes is the window where a file is chosen. Opening, saving, the overwrite
//   question and Ctrl+S stay GRS's own.
// - Open (IC-1, Ctrl+O) first asks "Open from: This PC / Dummy Server" (JDG-2593).
// - The Save As window (IC-2) gets a red sixth choice "Dummy Server" (JDG-2594). It carries
//   data-format="IO-2", so GRS takes a press on it as GRS JSON; the press also marks the
//   next save chooser as the server's.
// - A file chosen on the server is a handle whose getFile() is GET /api/files/<name> and
//   whose createWritable() ends in PUT, so Ctrl+S after it writes the server (JDG-2589).
// - The logo reads "Demo" in red, in a seat wide enough for it (JDG-2580, JDG-2590).
//
// Words added by the demo are English only and stay out of the GRS dictionary (JDG-2596).

const API_FILES = '/api/files'
const DEMO_RED = '#d32f2f'
const DEMO_RED_DARK = '#b71c1c'
const SERVER_SAVE_MARK = 'data-grs-demo-server-save'
const GRS_JSON_FORMAT_ROW = 'IO-2'
const BRANDING_ROLE = 'Branding'
const BRANDING_TEXT = 'Demo'
const OPENED_FILE_NAME_ROLE = 'Opened File Name'

const realOpenFilePicker =
  typeof window.showOpenFilePicker === 'function' ? window.showOpenFilePicker.bind(window) : null
const realSaveFilePicker =
  typeof window.showSaveFilePicker === 'function' ? window.showSaveFilePicker.bind(window) : null

// ---------------------------------------------------------------- names ----

// JDG-2595: any name Windows accepts, Japanese included; one file, no folders, ends in .json.
const RESERVED_STEM = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\..*)?$/i

function whyNameIsRefused(name) {
  if (name.length < 6 || name.length > 200) return 'Use 1 to 195 characters before .json.'
  if (!name.toLowerCase().endsWith('.json')) return 'The name must end with .json.'
  if (name.startsWith('.') || name.startsWith(' ') || name.endsWith(' ')) {
    return 'The name cannot start with a dot or a space.'
  }
  for (const ch of name) {
    if (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch)) {
      return 'These characters cannot be used: \\ / : * ? " < > |'
    }
  }
  const stem = name.slice(0, -5).replace(/[ .]+$/, '')
  if (stem === '' || RESERVED_STEM.test(stem)) return 'Windows does not allow this name.'
  return null
}

function withJsonExtension(typed) {
  const name = typed.trim()
  if (name === '') return name
  return name.toLowerCase().endsWith('.json') ? name : `${name}.json`
}

function fileUrlOf(name) {
  return `${API_FILES}/${encodeURIComponent(name)}`
}

// ---------------------------------------------------------- server file ----

async function textOfFailedResponse(response) {
  try {
    const text = (await response.text()).trim()
    return text === '' ? `HTTP ${response.status}` : text
  } catch {
    return `HTTP ${response.status}`
  }
}

// The FileHandle shape GRS uses (file-system-access-file-store.ts), backed by the server.
class ServerFileHandle {
  constructor(name) {
    this.kind = 'file'
    this.name = name
  }

  // A name that is not on the server yet reads as an empty file, as a new file from a save chooser does.
  async getFile() {
    const response = await fetch(fileUrlOf(this.name), { cache: 'no-store' })
    if (response.status === 404) return new File([], this.name, { type: 'application/json' })
    if (!response.ok) throw new Error(`Dummy Server: ${await textOfFailedResponse(response)}`)
    const bytes = await response.arrayBuffer()
    return new File([bytes], this.name, { type: 'application/json' })
  }

  async createWritable() {
    const name = this.name
    let parts = []
    return {
      async write(data) {
        parts.push(data instanceof Blob ? data : new Blob([data]))
      },
      async close() {
        const body = new Blob(parts, { type: 'application/json' })
        parts = []
        let response
        try {
          response = await fetch(fileUrlOf(name), { method: 'PUT', body })
        } catch {
          throw new Error('Dummy Server: the server cannot be reached. Is the server window still open?')
        }
        if (!response.ok) throw new Error(`Dummy Server: ${await textOfFailedResponse(response)}`)
      },
      async abort() {
        parts = []
      },
    }
  }

  async queryPermission() {
    return 'granted'
  }

  async requestPermission() {
    return 'granted'
  }
}

async function readServerFileList() {
  let response
  try {
    response = await fetch(API_FILES, { cache: 'no-store' })
  } catch {
    throw new Error('The server cannot be reached. Is the server window still open?')
  }
  if (!response.ok) throw new Error(await textOfFailedResponse(response))
  return await response.json()
}

// ------------------------------------------------------------- overlays ----

function aborted() {
  return new DOMException('The user aborted a request.', 'AbortError')
}

function element(tag, style, text) {
  const made = document.createElement(tag)
  if (style) made.setAttribute('style', style)
  if (text !== undefined) made.textContent = text
  return made
}

const BUTTON_STYLE =
  'font:inherit;padding:6px 16px;border-radius:4px;border:1px solid #8a8f98;background:#fff;color:#1f2328;cursor:pointer;'
const RED_BUTTON_STYLE =
  `font:inherit;padding:6px 16px;border-radius:4px;border:1px solid ${DEMO_RED_DARK};background:${DEMO_RED};color:#fff;cursor:pointer;font-weight:600;`

// One modal panel over GRS. Pointer, wheel and key events stop at the backdrop, so GRS
// (which listens on window) never sees a press or a key meant for this panel.
function openPanel(title, onDismiss) {
  const backdrop = element(
    'div',
    'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.35);display:flex;' +
      'align-items:center;justify-content:center;font:16px/1.5 system-ui,"Segoe UI",sans-serif;color:#1f2328;',
  )
  backdrop.setAttribute('data-grs-demo', 'panel')
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'keyup']) {
    backdrop.addEventListener(type, (event) => event.stopPropagation())
  }
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') onDismiss()
  })
  const panel = element(
    'div',
    'background:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);min-width:360px;' +
      'max-width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;',
  )
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', title)
  const head = element('div', `padding:12px 16px;font-weight:600;border-bottom:1px solid #d0d7de;`, title)
  const body = element('div', 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow:auto;')
  panel.append(head, body)
  backdrop.append(panel)
  document.body.append(backdrop)
  return {
    body,
    close() {
      backdrop.remove()
    },
  }
}

function buttonRow() {
  return element('div', 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;')
}

// "Open from: This PC / Dummy Server" (JDG-2593). This PC calls the browser's own chooser
// inside the click, so the click's user activation reaches it.
function chooseOpenPlace(options) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (run) => {
      if (settled) return
      settled = true
      panel.close()
      run()
    }
    const panel = openPanel('Open from', () => settle(() => reject(aborted())))
    panel.body.append(element('div', '', 'Where is the file you want to open?'))
    const row = buttonRow()
    const thisPc = element('button', BUTTON_STYLE, 'This PC')
    const server = element('button', RED_BUTTON_STYLE, 'Dummy Server')
    const cancel = element('button', BUTTON_STYLE, 'Cancel')
    for (const one of [thisPc, server, cancel]) one.setAttribute('type', 'button')
    thisPc.addEventListener('click', () => {
      settle(() => {
        if (realOpenFilePicker === null) {
          reject(new Error('This browser has no file chooser. Use Edge or Chrome, or drop the file on the page.'))
          return
        }
        realOpenFilePicker(withoutServerStart(options)).then(resolve, reject)
      })
    })
    server.addEventListener('click', () => {
      settle(() => chooseServerFile('open', '').then((handle) => resolve([handle]), reject))
    })
    cancel.addEventListener('click', () => settle(() => reject(aborted())))
    row.append(thisPc, server, cancel)
    panel.body.append(row)
    server.focus()
  })
}

function spelledSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function spelledTime(iso) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const two = (n) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`
}

// The server's file window, made to look like a file chooser. 'open' resolves with the chosen
// file; 'save' resolves with the name in the File name box, which starts as suggestedName:
// left as it is, the save updates that file; changed, it saves under the new name.
function chooseServerFile(mode, suggestedName) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (run) => {
      if (settled) return
      settled = true
      panel.close()
      run()
    }
    const title = `Dummy Server  -  ${location.origin}/schedule-data/`
    const panel = openPanel(title, () => settle(() => reject(aborted())))
    const list = element(
      'div',
      'border:1px solid #d0d7de;border-radius:4px;min-height:160px;max-height:50vh;overflow:auto;',
    )
    list.setAttribute('data-grs-demo', 'server-files')
    const message = element('div', 'color:#57606a;padding:8px 12px;', 'Reading the file list...')
    list.append(message)
    panel.body.append(list)

    let nameBox = null
    if (mode === 'save') {
      const nameRow = element('label', 'display:flex;gap:8px;align-items:center;')
      nameRow.append(element('span', 'white-space:nowrap;', 'File name:'))
      nameBox = element('input', 'flex:1;font:inherit;padding:4px 8px;border:1px solid #8a8f98;border-radius:4px;min-width:0;')
      nameBox.setAttribute('type', 'text')
      nameBox.setAttribute('data-grs-demo', 'file-name')
      nameBox.value = withJsonExtension(suggestedName === '' ? 'Untitled.json' : suggestedName)
      nameRow.append(nameBox)
      panel.body.append(nameRow)
    }
    const problem = element('div', `color:${DEMO_RED_DARK};min-height:1.5em;`)
    problem.setAttribute('data-grs-demo', 'problem')
    panel.body.append(problem)

    const row = buttonRow()
    const confirm = element('button', RED_BUTTON_STYLE, mode === 'save' ? 'Save' : 'Open')
    const cancel = element('button', BUTTON_STYLE, 'Cancel')
    confirm.setAttribute('type', 'button')
    confirm.setAttribute('data-grs-demo', 'confirm')
    cancel.setAttribute('type', 'button')
    row.append(confirm, cancel)
    panel.body.append(row)

    let chosenName = null
    const rows = []
    const markChosen = (name) => {
      chosenName = name
      for (const one of rows) {
        const isChosen = one.getAttribute('data-name') === name
        one.style.background = isChosen ? '#dbeafe' : ''
      }
      if (nameBox !== null) nameBox.value = name
    }

    const finish = () => {
      const name = nameBox !== null ? withJsonExtension(nameBox.value) : chosenName
      if (name === null || name === '') {
        problem.textContent = mode === 'save' ? 'Type a file name.' : 'Choose a file.'
        return
      }
      const why = whyNameIsRefused(name)
      if (why !== null) {
        problem.textContent = why
        return
      }
      settle(() => resolve(new ServerFileHandle(name)))
    }
    confirm.addEventListener('click', finish)
    cancel.addEventListener('click', () => settle(() => reject(aborted())))
    panel.body.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') finish()
    })

    readServerFileList().then(
      (files) => {
        list.replaceChildren()
        const grid = 'display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;padding:6px 12px;'
        const header = element('div', `${grid}font-weight:600;border-bottom:1px solid #d0d7de;position:sticky;top:0;background:#f6f8fa;`)
        header.append(element('span', '', 'Name'), element('span', '', 'Modified'), element('span', 'text-align:right;', 'Size'))
        list.append(header)
        if (files.length === 0) list.append(element('div', 'color:#57606a;padding:8px 12px;', 'No files yet.'))
        for (const file of files) {
          const line = element('div', `${grid}cursor:pointer;`)
          line.setAttribute('data-name', file.name)
          line.setAttribute('data-grs-demo', 'server-file')
          line.append(
            element('span', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', file.name),
            element('span', 'color:#57606a;white-space:nowrap;', spelledTime(file.modified)),
            element('span', 'color:#57606a;text-align:right;white-space:nowrap;', spelledSize(file.size)),
          )
          line.addEventListener('click', () => markChosen(file.name))
          line.addEventListener('dblclick', () => {
            markChosen(file.name)
            finish()
          })
          rows.push(line)
          list.append(line)
        }
        if (nameBox !== null) {
          nameBox.focus()
          nameBox.select()
        } else {
          confirm.focus()
        }
      },
      (failure) => {
        list.replaceChildren(element('div', `color:${DEMO_RED_DARK};padding:8px 12px;`, failure.message))
        confirm.disabled = true
      },
    )
    if (nameBox !== null) nameBox.focus()
  })
}

// ------------------------------------------------------- picker wrappers ----

// GRS hands the last handle back as startIn; the browser's chooser refuses one of ours.
function withoutServerStart(options) {
  if (options && options.startIn instanceof ServerFileHandle) {
    const { startIn: _dropped, ...rest } = options
    return rest
  }
  return options
}

// Set by a press on the red Dummy Server choice, read once by the next save chooser.
let isServerSaveAsked = false

window.addEventListener(
  'pointerdown',
  (event) => {
    const target = event.target
    isServerSaveAsked = target instanceof Element && target.closest(`[${SERVER_SAVE_MARK}]`) !== null
  },
  { capture: true },
)
window.addEventListener(
  'keydown',
  () => {
    isServerSaveAsked = false
  },
  { capture: true },
)

window.showOpenFilePicker = function showOpenFilePicker(options) {
  return chooseOpenPlace(options)
}

// The File name box starts with the name of the file GRS shows as opened, so Save as it is
// updates that file (JDG-2594); GRS's own suggestion is used when no .json file is open.
function startingSaveName(options) {
  const opened = document.querySelector(`[data-role="${OPENED_FILE_NAME_ROLE}"]`)
  const shown = opened === null ? '' : (opened.textContent || '').trim()
  if (shown.toLowerCase().endsWith('.json')) return shown
  return (options && options.suggestedName) || ''
}

window.showSaveFilePicker = function showSaveFilePicker(options) {
  if (isServerSaveAsked) {
    isServerSaveAsked = false
    return chooseServerFile('save', startingSaveName(options))
  }
  if (realSaveFilePicker === null) {
    return Promise.reject(new Error('This browser has no save chooser. Use Edge or Chrome.'))
  }
  return realSaveFilePicker(withoutServerStart(options))
}

// ---------------------------------------------------- screen decoration ----

// The red sixth choice in the Save As window (JDG-2594), drawn again whenever GRS redraws the window.
function addServerSaveChoice() {
  const grsJson = document.querySelector(`[data-format="${GRS_JSON_FORMAT_ROW}"]:not([${SERVER_SAVE_MARK}])`)
  if (grsJson === null) return
  const choices = grsJson.parentElement
  if (choices === null || choices.querySelector(`[${SERVER_SAVE_MARK}]`) !== null) return
  const choice = grsJson.cloneNode(false)
  choice.setAttribute(SERVER_SAVE_MARK, '')
  choice.setAttribute('aria-label', 'Dummy Server (GRS JSON .json)')
  choice.textContent = 'Dummy Server (GRS JSON .json)'
  choice.style.color = '#fff'
  choice.style.background = DEMO_RED
  choice.style.borderColor = DEMO_RED_DARK
  choice.style.fontWeight = '600'
  choices.append(choice)
}

function markBranding() {
  const branding = document.querySelector(`[data-role="${BRANDING_ROLE}"]`)
  if (branding === null || branding.getAttribute('data-grs-demo') === 'branding') return
  branding.setAttribute('data-grs-demo', 'branding')
  branding.textContent = BRANDING_TEXT
  branding.style.color = DEMO_RED
  // JDG-2590: the seat was sized for "GRS"; let it take the width "Demo" needs.
  const seat = branding.parentElement
  if (seat !== null) seat.style.width = 'auto'
}

new MutationObserver(() => {
  addServerSaveChoice()
  markBranding()
}).observe(document.documentElement, { childList: true, subtree: true })
