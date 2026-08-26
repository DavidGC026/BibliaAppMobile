/**
 * Utilidad compartida por los nodos que renderizan HTML ya compuesto.
 *
 * ProseMirror acepta un nodo del DOM como DOMOutputSpec, que es la unica via
 * para devolver HTML interno crudo sin que se escape.
 *
 * ponytail: espejo de desktop/src/lib/tiptap/rawElement.ts
 */
export function rawElement(
  tag: string,
  attrs: Record<string, string>,
  html: string,
): HTMLElement {
  const dom = document.createElement(tag)
  Object.entries(attrs).forEach(([key, value]) => dom.setAttribute(key, value))
  dom.innerHTML = html
  return dom
}
