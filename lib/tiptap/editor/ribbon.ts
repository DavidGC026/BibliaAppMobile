import type { RibbonContext, RibbonGroup, RibbonItem, RibbonTab } from './ribbonTypes'

/**
 * Cinta de opciones estilo Word dentro del WebView.
 *
 * Dibuja la fila de pestañas y los grupos de la activa. Depende del registro de
 * pestañas que se le pasa, no de ninguna pestaña concreta: añadir una es
 * añadirla al registro.
 *
 * En el móvil la cinta va **abajo**, no arriba como en el escritorio: es donde
 * estaba la barra de herramientas, queda al alcance del pulgar y no se la come
 * el teclado, que es lo que empuja `setKeyboardInset`.
 *
 * Regla de activación, igual que en Word: si una pestaña contextual coincide
 * con la selección se activa sola; al dejar de coincidir se vuelve a la que el
 * usuario tuviera elegida a mano.
 */
export class Ribbon {
  private root: HTMLElement
  private tabsRow: HTMLElement
  private groupsRow: HTMLElement
  private toggle: HTMLButtonElement
  private tabs: RibbonTab[]
  private ctx: RibbonContext
  /** Pestaña elegida a mano; a la que se vuelve al cerrarse una contextual. */
  private manualTabId: string
  private activeTabId: string
  private collapsed = false

  constructor(root: HTMLElement, tabs: RibbonTab[], ctx: RibbonContext) {
    this.root = root
    this.tabs = tabs
    this.ctx = ctx
    this.manualTabId = tabs[0].id
    this.activeTabId = tabs[0].id

    this.tabsRow = document.createElement('div')
    this.tabsRow.className = 'ribbon-tabs'
    this.groupsRow = document.createElement('div')
    this.groupsRow.className = 'ribbon-groups'

    this.toggle = document.createElement('button')
    this.toggle.type = 'button'
    this.toggle.className = 'ribbon-toggle'
    this.toggle.setAttribute('aria-label', 'Contraer la cinta')
    this.toggle.textContent = '⌄'
    bindRibbonButton(this.toggle, () => this.setCollapsed(!this.collapsed))

    this.root.appendChild(this.tabsRow)
    this.root.appendChild(this.groupsRow)
    enableHorizontalScroll(this.groupsRow)
    enableHorizontalScroll(this.tabsRow)
  }

  /** Vuelve a dibujar según la selección actual. */
  render() {
    const visible = this.tabs.filter((tab) => !tab.contextual || this.matches(tab))
    const contextual = visible.find((tab) => tab.contextual)

    // Una pestaña contextual manda mientras exista; al desaparecer se vuelve a
    // la última que el usuario eligiera.
    if (contextual) this.activeTabId = contextual.id
    else if (!visible.some((tab) => tab.id === this.activeTabId)) this.activeTabId = this.manualTabId

    this.renderTabs(visible)
    const active = visible.find((tab) => tab.id === this.activeTabId) ?? visible[0]
    this.renderGroups(active.groups(this.ctx))
  }

  private matches(tab: RibbonTab) {
    try {
      return !!tab.matches?.(this.ctx)
    } catch {
      return false
    }
  }

  private setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed
    this.root.classList.toggle('is-collapsed', collapsed)
    this.toggle.textContent = collapsed ? '⌃' : '⌄'
    this.toggle.setAttribute('aria-label', collapsed ? 'Desplegar la cinta' : 'Contraer la cinta')
    this.toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
  }

  private renderTabs(visible: RibbonTab[]) {
    this.tabsRow.textContent = ''
    visible.forEach((tab) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ribbon-tab'
      if (tab.contextual) button.classList.add('is-contextual')
      if (tab.id === this.activeTabId) button.classList.add('is-active')
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-selected', tab.id === this.activeTabId ? 'true' : 'false')
      button.textContent = tab.label
      bindRibbonButton(button, () => {
        // Pulsar una pestaña con la cinta contraída la despliega, como en Word.
        if (this.collapsed) this.setCollapsed(false)
        this.activeTabId = tab.id
        if (!tab.contextual) this.manualTabId = tab.id
        this.render()
      })
      this.tabsRow.appendChild(button)
    })
    this.tabsRow.appendChild(this.toggle)
  }

  private renderGroups(groups: RibbonGroup[]) {
    this.groupsRow.textContent = ''
    groups.forEach((group) => {
      const el = document.createElement('div')
      el.className = 'ribbon-group'
      const items = document.createElement('div')
      items.className = 'ribbon-group-items'
      group.items.forEach((item) => items.appendChild(this.renderItem(item)))
      const label = document.createElement('span')
      label.className = 'ribbon-group-label'
      label.textContent = group.label
      el.appendChild(items)
      el.appendChild(label)
      this.groupsRow.appendChild(el)
    })
    this.groupsRow.scrollLeft = 0
  }

  private renderItem(item: RibbonItem): HTMLElement {
    if ('kind' in item && item.kind === 'colors') return this.renderColors()
    if ('kind' in item && item.kind === 'select') return this.renderSelect(item)

    const spec = item as Extract<RibbonItem, { run: (ctx: RibbonContext) => void }>
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ribbon-btn'
    if (spec.wide) button.classList.add('is-wide')
    if (spec.danger) button.classList.add('is-danger')
    if (spec.active?.(this.ctx)) button.classList.add('is-active')
    if (spec.disabled?.(this.ctx)) button.disabled = true
    button.setAttribute('aria-label', spec.hint ?? spec.label)
    button.textContent = spec.label
    bindRibbonButton(button, () => {
      if (button.disabled) return
      spec.run(this.ctx)
      this.render()
    })
    return button
  }

  private renderSelect(spec: Extract<RibbonItem, { kind: 'select' }>): HTMLElement {
    const select = document.createElement('select')
    select.className = 'ribbon-select'
    select.setAttribute('aria-label', spec.hint)
    spec.options.forEach((option) => {
      const el = document.createElement('option')
      el.value = option.value
      el.textContent = option.label
      select.appendChild(el)
    })
    select.value = spec.value(this.ctx)
    select.addEventListener('change', () => {
      spec.run(this.ctx, select.value)
      this.render()
    })
    return select
  }

  private renderColors(): HTMLElement {
    const row = document.createElement('div')
    row.className = 'ribbon-colors'

    const auto = document.createElement('button')
    auto.type = 'button'
    auto.className = 'color-dot auto'
    auto.textContent = 'A'
    auto.setAttribute('aria-label', 'Color automático, el del tema')
    bindRibbonButton(auto, () => {
      this.ctx.editor.chain().focus().unsetColor().run()
    })
    row.appendChild(auto)

    this.ctx.colors.forEach((color) => {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'color-dot'
      dot.style.background = color
      dot.setAttribute('aria-label', 'Color ' + color)
      if (this.ctx.editor.isActive('textStyle', { color })) dot.classList.add('is-active')
      bindRibbonButton(dot, () => {
        this.ctx.editor.chain().focus().setColor(color).run()
      })
      row.appendChild(dot)
    })

    const wheel = document.createElement('button')
    wheel.type = 'button'
    wheel.className = 'color-dot wheel'
    wheel.setAttribute('aria-label', 'Elegir un color libre')
    bindRibbonButton(wheel, () => this.ctx.openColorWheel())
    row.appendChild(wheel)

    enableHorizontalScroll(row)
    return row
  }
}

/**
 * Enganche de un control de la cinta.
 *
 * `preventDefault` en `touchend` y `mousedown` es lo que impide que pulsar un
 * botón mueva el foco fuera del editor: sin él se pierde la selección sobre la
 * que se iba a aplicar el formato. El descarte por `lastTouch` evita que el
 * click sintético que Android manda después ejecute la acción dos veces.
 */
export function bindRibbonButton(el: HTMLElement, run: () => void) {
  let lastTouch = 0
  let startX = 0
  let startY = 0
  let isTap = false

  el.addEventListener(
    'touchstart',
    (event) => {
      isTap = true
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
    },
    { passive: true },
  )

  el.addEventListener(
    'touchmove',
    (event) => {
      const dx = Math.abs(event.touches[0].clientX - startX)
      const dy = Math.abs(event.touches[0].clientY - startY)
      if (dx > 8 || dy > 8) isTap = false
    },
    { passive: true },
  )

  el.addEventListener(
    'touchend',
    (event) => {
      if (!isTap) return
      event.preventDefault()
      lastTouch = Date.now()
      run()
    },
    { passive: false },
  )

  el.addEventListener('mousedown', (event) => event.preventDefault())

  el.addEventListener('click', (event) => {
    event.preventDefault()
    if (Date.now() - lastTouch < 400) return
    run()
  })
}

/** Arrastre horizontal de una fila; el WebView no lo hace solo con `touch`. */
export function enableHorizontalScroll(row: HTMLElement) {
  let startX = 0
  let startScroll = 0
  let dragging = false
  row.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1) return
      dragging = true
      startX = event.touches[0].clientX
      startScroll = row.scrollLeft
    },
    { passive: true },
  )
  row.addEventListener(
    'touchmove',
    (event) => {
      if (!dragging || event.touches.length !== 1) return
      row.scrollLeft = startScroll + (startX - event.touches[0].clientX)
    },
    { passive: true },
  )
  row.addEventListener('touchend', () => {
    dragging = false
  }, { passive: true })
}
