/**
 * Rueda cromática: color libre fuera de la paleta de favoritos.
 *
 * Disco matiz/saturación dibujado en canvas más un deslizador de brillo (HSV).
 * Portada del editor anterior sin cambios de comportamiento; lo único distinto
 * es que al aplicar llama a `setColor` de Tiptap en vez de envolver a mano un
 * `<span>` con `execCommand`.
 */

type Rgb = [number, number, number]

function hsvToRgb(h: number, s: number, v: number): Rgb {
  const c = v * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) {
    r = c
    g = x
  } else if (hp < 2) {
    r = x
    g = c
  } else if (hp < 3) {
    g = c
    b = x
  } else if (hp < 4) {
    g = x
    b = c
  } else if (hp < 5) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const m = v - c
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return [h, max ? d / max : 0, max]
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (n: number) => n.toString(16).padStart(2, '0')
  return '#' + part(r) + part(g) + part(b)
}

const OVERLAY_HTML = `
  <div id="cw-panel">
    <p id="cw-title">Elige un color</p>
    <div id="cw-wheel-wrap">
      <canvas id="cw-canvas" width="440" height="440"></canvas>
      <div id="cw-marker"></div>
    </div>
    <input id="cw-light" type="range" min="0" max="100" value="100" aria-label="Brillo" />
    <div id="cw-preview-row">
      <div id="cw-preview"></div>
      <span id="cw-hex"></span>
    </div>
    <div id="cw-actions">
      <button type="button" class="cw-btn" id="cw-cancel">Cancelar</button>
      <button type="button" class="cw-btn primary" id="cw-apply">Aplicar</button>
    </div>
  </div>
`

export class ColorWheel {
  private overlay: HTMLElement
  private hue = 0
  private sat = 0
  private val = 1
  private onApply: (hex: string) => void
  private drawn = false

  constructor(onApply: (hex: string) => void) {
    this.onApply = onApply
    this.overlay = document.createElement('div')
    this.overlay.id = 'cw-overlay'
    this.overlay.innerHTML = OVERLAY_HTML
    document.body.appendChild(this.overlay)
    this.bind()
  }

  open(currentHex?: string) {
    const match = /^#([0-9a-f]{6})$/i.exec(currentHex ?? '')
    if (match) {
      const [h, s, v] = rgbToHsv(
        parseInt(match[1].slice(0, 2), 16),
        parseInt(match[1].slice(2, 4), 16),
        parseInt(match[1].slice(4, 6), 16),
      )
      this.hue = h
      this.sat = s
      this.val = v
    }
    if (!this.drawn) {
      this.drawWheel()
      this.drawn = true
    }
    this.light().value = String(Math.round(this.val * 100))
    // Abrir antes de posicionar el marcador: con display:none no hay layout.
    this.overlay.classList.add('open')
    this.update()
  }

  close() {
    this.overlay.classList.remove('open')
  }

  private canvas() {
    return this.overlay.querySelector('#cw-canvas') as HTMLCanvasElement
  }

  private light() {
    return this.overlay.querySelector('#cw-light') as HTMLInputElement
  }

  private hex(): string {
    const [r, g, b] = hsvToRgb(this.hue, this.sat, this.val)
    return rgbToHex(r, g, b)
  }

  private drawWheel() {
    const canvas = this.canvas()
    const context = canvas.getContext('2d')
    if (!context) return
    const size = canvas.width
    const radius = size / 2
    const image = context.createImageData(size, size)
    const data = image.data
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius
        const dy = y - radius
        const dist = Math.sqrt(dx * dx + dy * dy)
        const idx = (y * size + x) * 4
        if (dist > radius) {
          data[idx + 3] = 0
          continue
        }
        const [r, g, b] = hsvToRgb(
          ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
          Math.min(1, dist / radius),
          1,
        )
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        // Borde antialiasado del disco.
        data[idx + 3] = dist > radius - 2 ? Math.max(0, Math.round((255 * (radius - dist)) / 2)) : 255
      }
    }
    context.putImageData(image, 0, 0)
  }

  private update() {
    const wrap = this.overlay.querySelector('#cw-wheel-wrap') as HTMLElement
    const marker = this.overlay.querySelector('#cw-marker') as HTMLElement
    const radius = wrap.clientWidth / 2
    const rad = (this.hue * Math.PI) / 180
    marker.style.left = radius + Math.cos(rad) * this.sat * radius + 'px'
    marker.style.top = radius + Math.sin(rad) * this.sat * radius + 'px'
    const hex = this.hex()
    marker.style.backgroundColor = hex
    ;(this.overlay.querySelector('#cw-preview') as HTMLElement).style.backgroundColor = hex
    ;(this.overlay.querySelector('#cw-hex') as HTMLElement).textContent = hex.toUpperCase()
    const [r, g, b] = hsvToRgb(this.hue, this.sat, 1)
    this.light().style.background = 'linear-gradient(to right, #000000, ' + rgbToHex(r, g, b) + ')'
  }

  private pointFrom(event: TouchEvent | MouseEvent) {
    const rect = this.canvas().getBoundingClientRect()
    const point = 'touches' in event ? event.touches[0] : event
    const radius = rect.width / 2
    const dx = point.clientX - rect.left - radius
    const dy = point.clientY - rect.top - radius
    this.hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    this.sat = Math.min(1, Math.sqrt(dx * dx + dy * dy) / radius)
    this.update()
  }

  private bind() {
    const canvas = this.canvas()
    let dragging = false

    canvas.addEventListener(
      'touchstart',
      (event) => {
        event.preventDefault()
        dragging = true
        this.pointFrom(event)
      },
      { passive: false },
    )
    canvas.addEventListener(
      'touchmove',
      (event) => {
        if (!dragging) return
        event.preventDefault()
        this.pointFrom(event)
      },
      { passive: false },
    )
    canvas.addEventListener('touchend', () => {
      dragging = false
    })
    canvas.addEventListener('mousedown', (event) => {
      event.preventDefault()
      dragging = true
      this.pointFrom(event)
    })
    document.addEventListener('mousemove', (event) => {
      if (dragging) this.pointFrom(event)
    })
    document.addEventListener('mouseup', () => {
      dragging = false
    })

    this.light().addEventListener('input', (event) => {
      this.val = Number((event.target as HTMLInputElement).value) / 100
      this.update()
    })
    this.overlay.querySelector('#cw-cancel')?.addEventListener('click', (event) => {
      event.preventDefault()
      this.close()
    })
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close()
    })
    this.overlay.querySelector('#cw-apply')?.addEventListener('click', (event) => {
      event.preventDefault()
      this.onApply(this.hex())
      this.close()
    })
  }
}
