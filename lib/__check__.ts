import { parseVerseReference } from '@/lib/verseRef';

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const salmos = parseVerseReference('Salmos 23:1');
check(salmos?.bookId === 19 && salmos.chapter === 23 && salmos.verse === 1, 'Salmos 23:1');

const juan = parseVerseReference('Juan 3:16');
check(juan?.bookId === 43 && juan.chapter === 3 && juan.verse === 16, 'Juan 3:16');

const cap = parseVerseReference('Romanos 8');
check(cap?.bookId === 45 && cap.chapter === 8 && cap.verse === undefined, 'Romanos 8');

check(parseVerseReference('Texto inválido') === null, 'invalid ref');
