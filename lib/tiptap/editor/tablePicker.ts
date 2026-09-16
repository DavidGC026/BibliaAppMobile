import type { Editor } from '@tiptap/core'

/**
 * Selector de tabla: mismas dimensiones y límites que el del editor anterior
 * (1-10 columnas, 1-20 filas y encabezado opcional), con vista previa antes de
 * insertar. Al aceptar se inserta con el comando de Tiptap, así que la tabla
 * nace como nodo del esquema y no como HTML pegado.
 */

const MAX_COLS = 10
const MAX_ROWS = 20

let overlay: HTMLElement | null = null
let state = { cols: 3, rows: 3, header: true }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function stepper(label: string, key: 'cols' | 'rows', max: number, onChange: () => void) {
  const row = document.createElement('div')
  row.className = 'tp-row'
  const name = document.createElement('span')
  name.className = 'tp-label'
  name.textContent = label
  const minus = document.createElement('button')
  minus.type = 'button'
  minus.className = 'tp-step'
  minus.textContent = '−'
  minus.setAttribute('aria-label', 'Menos ' + label.toLowerCase())
  const value = document.createElement('span')
  value.className = 'tp-value'
  const plus = document.createElement('button')
  plus.type = 'button'
  plus.className = 'tp-step'
  plus.textContent = '+'
  plus.setAttribute('aria-label', 'Más ' + label.toLowerCase())

  const paint = () => {
    value.textContent = String(state[key])
  }
  minus.addEventListener('click', (event) => {
    event.preventDefault()
    state[key] = clamp(state[key] - 1, 1, max)
    paint()
    onChange()
  })
  plus.addEventListener('click', (event) => {
    event.preventDefault()
    state[key] = clamp(state[key] + 1, 1, max)
    paint()
    onChange()
  })
  paint()

  row.appendChild(name)
  row.appendChild(minus)
  row.appendChild(value)
  row.appendChild(plus)
  return row
}

function buildPreview(): HTMLElement {
  const preview = document.createElement('div')
  preview.className = 'tp-preview'
  const table = document.createElement('table')
  table.className = 'biblia-note-table'
  for (let r = 0; r < Math.min(state.rows, 4); r++) {
    const tr = document.createElement('tr')
    for (let c = 0; c < state.cols; c++) {
      const cell = document.createElement(state.header && r === 0 ? 'th' : 'td')
      cell.innerHTML = '&nbsp;'
      tr.appendChild(cell)
    }
    table.appendChild(tr)
  }
  preview.appendChild(table)
  if (state.rows > 4) {
    const more = document.createElement('span')
    more.className = 'tp-more'
    more.textContent = '… ' + state.rows + ' filas'
    preview.appendChild(more)
  }
  return preview
}

export function openTablePicker(editor: Editor) {
  if (overlay) overlay.remove()

  overlay = document.createElement('div')
  overlay.className = 'tp-overlay open'

  const panel = document.createElement('div')
  panel.className = 'tp-panel'

  const title = document.createElement('p')
  title.className = 'tp-title'
  title.textContent = 'Nueva tabla'

  const previewHost = document.createElement('div')
  const repaint = () => {
    previewHost.textContent = ''
    previewHost.appendChild(buildPreview())
  }

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'tp-toggle'
  const paintHeader = () => {
    header.classList.toggle('is-on', state.header)
    header.textContent = state.header ? 'Con encabezado' : 'Sin encabezado'
    header.setAttribute('aria-pressed', state.header ? 'true' : 'false')
  }
  header.addEventListener('click', (event) => {
    event.preventDefault()
    state.header = !state.header
    paintHeader()
    repaint()
  })
  paintHeader()

  const actions = document.createElement('div')
  actions.className = 'tp-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'tp-btn'
  cancel.textContent = 'Cancelar'
  cancel.addEventListener('click', (event) => {
    event.preventDefault()
    close()
  })
  const insert = document.createElement('button')
  insert.type = 'button'
  insert.className = 'tp-btn primary'
  insert.textContent = 'Insertar'
  insert.addEventListener('click', (event) => {
    event.preventDefault()
    editor
      .chain()
      .focus()
      .insertTable({ rows: state.rows, cols: state.cols, withHeaderRow: state.header })
      .run()
    close()
  })
  actions.appendChild(cancel)
  actions.appendChild(insert)

  panel.appendChild(title)
  panel.appendChild(stepper('Columnas', 'cols', MAX_COLS, repaint))
  panel.appendChild(stepper('Filas', 'rows', MAX_ROWS, repaint))
  panel.appendChild(header)
  panel.appendChild(previewHost)
  panel.appendChild(actions)
  overlay.appendChild(panel)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close()
  })
  document.body.appendChild(overlay)
  repaint()
}

function close() {
  overlay?.remove()
  overlay = null
}
