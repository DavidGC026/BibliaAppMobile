import type { RibbonTab } from '../ribbonTypes'
import { homeTab } from './homeTab'
import { insertTab } from './insertTab'
import { dictTab, verseTab } from './verseTab'
import { tableTab } from './tableTab'
import { imageTab } from './imageTab'

/**
 * Registro de pestañas: el único punto que conoce el conjunto completo.
 *
 * La cinta depende de este array, no de cada pestaña, así que añadir una es
 * añadir una línea aquí. Las fijas van primero y en su orden; las contextuales
 * aparecen solas cuando su `matches` coincide con la selección.
 */
export const ribbonTabs: RibbonTab[] = [homeTab, insertTab, verseTab, dictTab, tableTab, imageTab]
