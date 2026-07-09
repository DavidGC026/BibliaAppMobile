export interface RainbowPayload {
  /** Etiqueta por capítulo, p. ej. "Génesis 1" */
  labels: string[];
  /** Índice de libro (0-based) por capítulo */
  bookIdx: number[];
  /** Nombre de cada libro, indexado por bookIdx */
  bookNames: string[];
  /** Número de capítulo dentro de su libro */
  chap: number[];
  /** Triples aplanadas [idxA, idxB, conexiones, ...] */
  arcs: number[];
}

export interface RainbowTheme {
  dark: boolean;
  background: string;
  text: string;
  textMuted: string;
  border: string;
}

/**
 * Genera el HTML del mapa arcoíris. El canvas se renderiza UNA sola vez en
 * alta resolución; el zoom y el desplazamiento se hacen con transformaciones
 * CSS (GPU), por lo que el pellizco es fluido y nunca vuelve a dibujar arcos.
 */
export function getRainbowHtml(theme: RainbowTheme, payload: RainbowPayload): string {
  const data = JSON.stringify(payload);
  const th = JSON.stringify(theme);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { height: 100%; }
  body {
    margin: 0; overflow: hidden;
    background: ${theme.background}; color: ${theme.text};
    font-family: -apple-system, Roboto, sans-serif;
    display: flex; flex-direction: column;
    -webkit-user-select: none; user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  #bar { flex: 0 0 auto; padding: 6px 8px; border-bottom: 1px solid ${theme.border}; }
  .row { display: flex; align-items: center; gap: 6px; }
  .row + .row { margin-top: 5px; }
  select {
    flex: 1; min-width: 0; height: 34px;
    background: ${theme.background}; color: ${theme.text};
    border: 1px solid ${theme.border}; border-radius: 8px;
    font-size: 13px; padding: 0 4px;
  }
  .zbtn {
    width: 38px; height: 34px; flex: 0 0 auto;
    background: ${theme.background}; color: ${theme.text};
    border: 1px solid ${theme.border}; border-radius: 8px;
    font-size: 18px; line-height: 1; padding: 0;
  }
  #zoomLbl { flex: 0 0 auto; min-width: 34px; text-align: center; font-size: 12px; color: ${theme.textMuted}; }
  #infoText { flex: 1; min-width: 0; font-size: 12px; color: ${theme.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #legend { flex: 0 0 auto; display: flex; align-items: center; gap: 4px; font-size: 10px; color: ${theme.textMuted}; }
  #legend .grad {
    width: 54px; height: 6px; border-radius: 3px;
    background: linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,45%), hsl(180,80%,50%), hsl(240,80%,60%), hsl(300,80%,60%));
  }
  #viewport { flex: 1 1 auto; position: relative; overflow: hidden; touch-action: none; }
  #world { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
  #world canvas { position: absolute; top: 0; left: 0; }
  #progress {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 60%; max-width: 260px; text-align: center; font-size: 12px; color: ${theme.textMuted};
  }
  #progress .track { height: 4px; border-radius: 2px; background: ${theme.border}; margin-top: 6px; overflow: hidden; }
  #progress .fill { height: 100%; width: 0%; background: hsl(210,80%,55%); }
</style>
</head>
<body>
<div id="bar">
  <div class="row">
    <select id="selBook"></select>
    <select id="selChap"></select>
    <button class="zbtn" id="zout">−</button>
    <span id="zoomLbl">1×</span>
    <button class="zbtn" id="zin">+</button>
  </div>
  <div class="row">
    <span id="infoText">Pellizca para hacer zoom · toca un capítulo</span>
    <span id="legend"><span>cerca</span><span class="grad"></span><span>lejos</span></span>
  </div>
</div>
<div id="viewport">
  <div id="world">
    <canvas id="base"></canvas>
    <canvas id="hi"></canvas>
  </div>
  <div id="progress"><span id="progTxt">Dibujando 344.800 conexiones…</span><div class="track"><div class="fill" id="progFill"></div></div></div>
</div>
<script>
(function () {
  var P = ${data};
  var T = ${th};
  var N = P.labels.length;
  var arcs = P.arcs;
  var TRIPLES = arcs.length / 3;

  var viewport = document.getElementById('viewport');
  var world = document.getElementById('world');
  var base = document.getElementById('base');
  var hi = document.getElementById('hi');
  var infoText = document.getElementById('infoText');
  var selBook = document.getElementById('selBook');
  var selChap = document.getElementById('selChap');
  var zoomLbl = document.getElementById('zoomLbl');
  var progress = document.getElementById('progress');
  var progFill = document.getElementById('progFill');

  // ---- Datos derivados (una sola vez) ----
  var counts = new Float64Array(N);
  for (var t = 0; t < TRIPLES; t++) {
    var k3 = t * 3;
    counts[arcs[k3]] += arcs[k3 + 2];
    counts[arcs[k3 + 1]] += arcs[k3 + 2];
  }
  // Orden de dibujo: arcos largos primero para que los cortos queden encima
  var order = new Uint32Array(TRIPLES);
  for (t = 0; t < TRIPLES; t++) order[t] = t;
  order = Array.prototype.slice.call(order);
  order.sort(function (x, y) {
    return Math.abs(arcs[y * 3 + 1] - arcs[y * 3]) - Math.abs(arcs[x * 3 + 1] - arcs[x * 3]);
  });

  var nBooks = P.bookNames.length;
  var bookStart = new Array(nBooks);
  var bookEnd = new Array(nBooks);
  for (var i = 0; i < N; i++) {
    var b = P.bookIdx[i];
    if (bookStart[b] === undefined) bookStart[b] = i;
    bookEnd[b] = i;
  }

  // ---- Geometría / lienzo ----
  var M = 14, STRIP_H = 12, LABEL_H = 20;
  var CSS_W = 0, CSS_H = 0, VW = 0, VH = 0, BASE_Y = 0, MAXH = 0, STEP = 1;
  var RES = 1, RES2 = 1;
  var MAXS = 8;
  var s = 1, tx = 0, ty = 0;
  var selected = -1;

  function xOf(i) { return M + i * STEP; }

  function layout() {
    VW = viewport.clientWidth;
    VH = viewport.clientHeight;
    // En pantallas anchas (escritorio) el mapa completo cabe a 1x; en
    // pantallas estrechas se dibuja mas ancho para que tenga detalle.
    CSS_W = VW >= 900 ? VW : Math.max(VW * 2.5, 1600);
    CSS_H = VH;
    STEP = (CSS_W - 2 * M) / (N - 1);
    BASE_Y = CSS_H - STRIP_H - LABEL_H - 6;
    MAXH = BASE_Y - 24;
    var dpr = window.devicePixelRatio || 1;
    // Resolución física alta para que el zoom CSS no se vea borroso,
    // con topes de ancho (8192 px) y de área total (~9.4 Mpx) por memoria.
    RES = Math.min(dpr * 2, 8192 / CSS_W, Math.sqrt(9400000 / (CSS_W * CSS_H)));
    if (RES < 0.5) RES = 0.5;
    RES2 = Math.min(RES, Math.max(1, dpr));
    world.style.width = CSS_W + 'px';
    world.style.height = CSS_H + 'px';
    base.style.width = hi.style.width = CSS_W + 'px';
    base.style.height = hi.style.height = CSS_H + 'px';
    base.width = Math.round(CSS_W * RES);
    base.height = Math.round(CSS_H * RES);
    hi.width = Math.round(CSS_W * RES2);
    hi.height = Math.round(CSS_H * RES2);
  }

  // ---- Transformación (zoom/pan sin re-render) ----
  var raf = 0;
  function apply() {
    raf = 0;
    world.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
    var z = s >= 9.95 ? Math.round(s) : Math.round(s * 10) / 10;
    zoomLbl.textContent = z + '\\u00d7';
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(apply); }
  function clampPan() {
    var minX = Math.min(0, VW - CSS_W * s);
    if (tx < minX) tx = minX; if (tx > 0) tx = 0;
    var minY = Math.min(0, VH - CSS_H * s);
    if (ty < minY) ty = minY; if (ty > 0) ty = 0;
  }
  function setScale(ns, cx, cy) {
    if (ns < 1) ns = 1; if (ns > MAXS) ns = MAXS;
    tx = cx - (cx - tx) * (ns / s);
    ty = cy - (cy - ty) * (ns / s);
    s = ns;
    clampPan();
    schedule();
  }

  // ---- Color ----
  var HUES = 30, ALPHAS = 8;
  var AMAX = T.dark ? 0.5 : 0.4;
  var SAT = T.dark ? '90%' : '75%';
  var LIG = T.dark ? '60%' : '42%';
  function hueOfBucket(hb) { return Math.round(300 * hb / (HUES - 1)); }
  function styleOf(hb, ab) {
    var a = AMAX * (ab + 1) / ALPHAS;
    return 'hsla(' + hueOfBucket(hb) + ',' + SAT + ',' + LIG + ',' + a.toFixed(3) + ')';
  }
  function fullStyle(dist, alpha) {
    var h = Math.round(300 * dist / (N - 1));
    return 'hsla(' + h + ',' + SAT + ',' + LIG + ',' + alpha + ')';
  }

  function arcPath(path, ia, ib) {
    var xa = xOf(Math.min(ia, ib)), xb = xOf(Math.max(ia, ib));
    var rx = (xb - xa) / 2;
    if (rx < 0.25) rx = 0.25;
    var ry = MAXH * Math.pow(rx / ((CSS_W - 2 * M) / 2), 0.8);
    if (ry < 0.6) ry = 0.6;
    path.moveTo(xa, BASE_Y);
    path.ellipse(xa + rx, BASE_Y, rx, ry, 0, Math.PI, Math.PI * 2);
  }

  function drawStrip(ctx) {
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var y = BASE_Y + 5;
    for (var b = 0; b < nBooks; b++) {
      var x0 = xOf(bookStart[b]) - STEP / 2;
      var x1 = xOf(bookEnd[b]) + STEP / 2;
      ctx.fillStyle = b % 2
        ? (T.dark ? '#3a3a3f' : '#c9c9cf')
        : (T.dark ? '#26262a' : '#e2e2e8');
      ctx.fillRect(x0, y, x1 - x0, STRIP_H);
      var name = P.bookNames[b];
      var w = x1 - x0;
      ctx.fillStyle = T.textMuted;
      if (ctx.measureText(name).width <= w - 4) {
        ctx.fillText(name, (x0 + x1) / 2, y + STRIP_H + LABEL_H / 2);
      } else {
        var abbr = name.slice(0, 3);
        if (ctx.measureText(abbr).width <= w - 2) {
          ctx.fillText(abbr, (x0 + x1) / 2, y + STRIP_H + LABEL_H / 2);
        }
      }
    }
  }

  // ---- Render base (una vez por layout, en trozos con progreso) ----
  var gen = 0;
  function render() {
    var g = ++gen;
    var ctx = base.getContext('2d');
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = T.background;
    ctx.fillRect(0, 0, CSS_W, CSS_H);
    ctx.lineWidth = 0.7;
    progress.style.display = 'block';
    var i = 0, CHUNK = 15000;
    function step() {
      if (g !== gen) return;
      var paths = {};
      var end = Math.min(i + CHUNK, TRIPLES);
      for (; i < end; i++) {
        var k = order[i] * 3;
        var a = arcs[k], bb = arcs[k + 1], n = arcs[k + 2];
        var dist = Math.abs(bb - a);
        var hb = Math.min(HUES - 1, Math.floor(dist / (N - 1) * HUES));
        var aRaw = Math.min(1, 0.12 + n * 0.05);
        var ab = Math.min(ALPHAS - 1, Math.floor(aRaw * ALPHAS));
        var key = hb * ALPHAS + ab;
        var p = paths[key];
        if (!p) p = paths[key] = new Path2D();
        arcPath(p, a, bb);
      }
      for (var key2 in paths) {
        var ki = +key2;
        ctx.strokeStyle = styleOf(Math.floor(ki / ALPHAS), ki % ALPHAS);
        ctx.stroke(paths[key2]);
      }
      progFill.style.width = (i / TRIPLES * 100).toFixed(1) + '%';
      if (i < TRIPLES) {
        setTimeout(step, 0);
      } else {
        drawStrip(ctx);
        progress.style.display = 'none';
        applyHighlight();
      }
    }
    step();
  }

  // ---- Resaltado (capa aparte; nunca toca el canvas base) ----
  function applyHighlight() {
    var ctx = hi.getContext('2d');
    ctx.setTransform(RES2, 0, 0, RES2, 0, 0);
    ctx.clearRect(0, 0, CSS_W, CSS_H);
    if (selected < 0) return;
    ctx.fillStyle = T.background;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(0, 0, CSS_W, CSS_H);
    ctx.globalAlpha = 1;
    drawStrip(ctx);
    ctx.lineWidth = 1.2;
    for (var t = 0; t < TRIPLES; t++) {
      var k = t * 3;
      var a = arcs[k], bb = arcs[k + 1];
      if (a !== selected && bb !== selected) continue;
      var p = new Path2D();
      arcPath(p, a, bb);
      ctx.strokeStyle = fullStyle(Math.abs(bb - a), 0.9);
      ctx.stroke(p);
    }
    var x = xOf(selected);
    ctx.strokeStyle = T.dark ? '#ffffff' : '#111111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, BASE_Y + 4);
    ctx.lineTo(x, BASE_Y + 5 + STRIP_H);
    ctx.stroke();
  }

  // ---- Selección / selects ----
  function fillChapters(b) {
    selChap.innerHTML = '';
    for (var i = bookStart[b]; i <= bookEnd[b]; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = 'Cap. ' + P.chap[i];
      selChap.appendChild(o);
    }
  }

  function centerOn(i) {
    var ns = Math.max(s, 2.5);
    var x = xOf(i);
    tx = VW / 2 - x * ns;
    // Ancla la vista abajo, donde están la franja de libros y el marcador
    ty = VH - CSS_H * ns;
    s = ns;
    clampPan();
    schedule();
  }

  function setSelected(i, fromSelect) {
    selected = i;
    if (i < 0) {
      infoText.textContent = 'Pellizca para hacer zoom · toca un cap\\u00edtulo';
    } else {
      var b = P.bookIdx[i];
      if (+selBook.value !== b) { selBook.value = b; fillChapters(b); }
      selChap.value = i;
      infoText.innerHTML = '<b>' + P.labels[i] + '</b> \\u00b7 ' + Math.round(counts[i]) + ' conexiones';
      if (fromSelect) centerOn(i);
    }
    applyHighlight();
  }

  for (var b2 = 0; b2 < nBooks; b2++) {
    var ob = document.createElement('option');
    ob.value = b2;
    ob.textContent = P.bookNames[b2];
    selBook.appendChild(ob);
  }
  fillChapters(0);
  selBook.addEventListener('change', function () {
    var b = +selBook.value;
    fillChapters(b);
    setSelected(bookStart[b], true);
  });
  selChap.addEventListener('change', function () {
    setSelected(+selChap.value, true);
  });

  // Los botones anclan el zoom al borde inferior para no perder la línea base
  document.getElementById('zin').addEventListener('click', function () { setScale(s * 1.6, VW / 2, VH); });
  document.getElementById('zout').addEventListener('click', function () { setScale(s / 1.6, VW / 2, VH); });

  // ---- Gestos: 1 dedo desplaza, 2 dedos pellizcan, toque selecciona ----
  var pan0 = null, pinch0 = null, tap = null, lastTap = null;

  function local(touch) {
    var r = viewport.getBoundingClientRect();
    return { x: touch.clientX - r.left, y: touch.clientY - r.top };
  }
  function dist2(a, b) {
    var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTap(cx, cy) {
    var now = Date.now();
    if (lastTap && now - lastTap.t < 300 && Math.abs(cx - lastTap.x) < 30 && Math.abs(cy - lastTap.y) < 30) {
      // Doble toque: alterna entre 1x y 3x en ese punto
      lastTap = null;
      setScale(s > 1.05 ? 1 : 3, cx, cy);
      return;
    }
    lastTap = { x: cx, y: cy, t: now };
    var wx = (cx - tx) / s;
    var idx = Math.round((wx - M) / STEP);
    if (idx < 0) idx = 0; if (idx > N - 1) idx = N - 1;
    setSelected(idx === selected ? -1 : idx, false);
  }

  viewport.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      var p = local(e.touches[0]);
      pan0 = { x: p.x, y: p.y, tx: tx, ty: ty };
      tap = { x: p.x, y: p.y, t: Date.now() };
      pinch0 = null;
    } else if (e.touches.length >= 2) {
      var p0 = local(e.touches[0]), p1 = local(e.touches[1]);
      pinch0 = {
        d: dist2(e.touches[0], e.touches[1]),
        s: s, tx: tx, ty: ty,
        mx: (p0.x + p1.x) / 2, my: (p0.y + p1.y) / 2,
      };
      pan0 = null;
      tap = null;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (pinch0 && e.touches.length >= 2) {
      var p0 = local(e.touches[0]), p1 = local(e.touches[1]);
      var nd = dist2(e.touches[0], e.touches[1]);
      var ns = pinch0.s * nd / Math.max(1, pinch0.d);
      if (ns < 1) ns = 1; if (ns > MAXS) ns = MAXS;
      var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
      var f = ns / pinch0.s;
      tx = mx - (pinch0.mx - pinch0.tx) * f;
      ty = my - (pinch0.my - pinch0.ty) * f;
      s = ns;
      clampPan();
      schedule();
    } else if (pan0 && e.touches.length === 1) {
      var p = local(e.touches[0]);
      tx = pan0.tx + (p.x - pan0.x);
      ty = pan0.ty + (p.y - pan0.y);
      clampPan();
      schedule();
      if (tap && (Math.abs(p.x - tap.x) > 8 || Math.abs(p.y - tap.y) > 8)) tap = null;
    }
  }, { passive: false });

  viewport.addEventListener('touchend', function (e) {
    e.preventDefault();
    if (e.touches.length === 0) {
      if (tap && Date.now() - tap.t < 350) handleTap(tap.x, tap.y);
      pan0 = null; pinch0 = null; tap = null;
    } else if (e.touches.length === 1) {
      var p = local(e.touches[0]);
      pan0 = { x: p.x, y: p.y, tx: tx, ty: ty };
      pinch0 = null;
    }
  }, { passive: false });

  // Ratón (pruebas en escritorio): arrastrar desplaza, clic selecciona, rueda hace zoom
  var mouse0 = null;
  viewport.addEventListener('mousedown', function (e) {
    mouse0 = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false };
  });
  window.addEventListener('mousemove', function (e) {
    if (!mouse0) return;
    var dx = e.clientX - mouse0.x, dy = e.clientY - mouse0.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) mouse0.moved = true;
    tx = mouse0.tx + dx; ty = mouse0.ty + dy;
    clampPan();
    schedule();
  });
  window.addEventListener('mouseup', function (e) {
    if (mouse0 && !mouse0.moved) {
      var r = viewport.getBoundingClientRect();
      handleTap(e.clientX - r.left, e.clientY - r.top);
    }
    mouse0 = null;
  });
  viewport.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = viewport.getBoundingClientRect();
    setScale(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // ---- Rotación / cambio de tamaño: un único re-render, conservando selección ----
  var rto = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rto);
    rto = setTimeout(function () {
      var keep = selected;
      layout();
      s = 1; tx = 0; ty = 0;
      apply();
      render();
      if (keep >= 0) setSelected(keep, true);
    }, 250);
  });

  layout();
  apply();
  render();
})();
</script>
</body>
</html>`;
}
