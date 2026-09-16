/**
 * Raiz de composicion del editor de notas del movil.
 *
 * Es el unico punto que conoce la lista completa de extensiones. Anadir un
 * bloque nuevo es anadir su modulo a este array: ni el editor ni los nodos ya
 * existentes se tocan (abierto a extension, cerrado a modificacion).
 *
 * La cinta depende de este array, no de cada nodo concreto, de modo que la
 * vista no sabe que existe un "versiculo" ni un "diccionario".
 *
 * ponytail: espejo de desktop/src/lib/tiptap/extensions.ts
 */

import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle, FontSize, FontFamily, Color } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'

import { VerseBlock } from './nodes/verseBlock'
import { DictBlock } from './nodes/dictBlock'
import { ImageBlock } from './nodes/imageBlock'
import { StripBlockHandle } from './nodes/blockHandle'

/** Extensiones propias de BibliaAPP, sin las genericas de texto. */
export const bibliaNodes: Extensions = [VerseBlock, DictBlock, ImageBlock, StripBlockHandle]

/** Conjunto completo que usa el editor de notas. */
export function buildNoteExtensions(): Extensions {
  return [
    StarterKit.configure({ underline: false }),
    Underline,
    // TextStyle es el soporte de <span style>; FontSize, FontFamily y Color se
    // apoyan en el y aportan sus comandos.
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'biblia-note-table' },
    }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: 'Escribe tu nota…' }),
    // TrailingNode (el parrafo garantizado al final, sin el cual una nota que
    // termina en tabla o imagen deja al usuario sin sitio donde escribir) ya
    // viene dentro de StarterKit 3: anadirlo otra vez solo duplica el nombre.
    ...bibliaNodes,
  ]
}
