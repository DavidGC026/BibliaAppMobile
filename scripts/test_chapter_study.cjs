// Ejecuta el almacenamiento real contra SQLite temporal; solo sustituye el
// puente nativo de Expo y el transporte HTTP. No toca el servidor ni el móvil.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const esbuild = require('esbuild');

async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'biblia-study-'));
  const sqlitePath = path.join(temporary, 'sqlite.cjs');
  const apiPath = path.join(temporary, 'api.cjs');
  const bridgePath = path.join(temporary, 'sqlite.py');
  fs.writeFileSync(bridgePath, `
import json, sqlite3, sys
request = json.load(sys.stdin)
db = sqlite3.connect(sys.argv[1])
db.row_factory = sqlite3.Row
if request['method'] == 'exec':
    db.executescript(request['sql'])
    result = None
else:
    cursor = db.execute(request['sql'], request['params'])
    if request['method'] == 'all': result = [dict(row) for row in cursor.fetchall()]
    elif request['method'] == 'first':
        row = cursor.fetchone()
        result = dict(row) if row else None
    else: result = {'changes': cursor.rowcount, 'lastInsertRowId': cursor.lastrowid}
db.commit()
db.close()
print(json.dumps(result))
  `);
  fs.writeFileSync(sqlitePath, `
    const { execFileSync } = require('node:child_process');
    function query(method, sql, params = []) {
      return JSON.parse(execFileSync('python3', [${JSON.stringify(bridgePath)}, ${JSON.stringify(path.join(temporary, 'study.db'))}],
        { input: JSON.stringify({ method, sql, params }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
    }
    let failWrite = false;
    exports.failNextWrite = () => { failWrite = true; };
    exports.openDatabaseAsync = async () => ({
      execAsync: async sql => query('exec', sql),
      runAsync: async (sql, params) => {
        if (failWrite && sql.includes('INSERT OR REPLACE INTO study_chapters')) {
          failWrite = false; throw new Error('Disco lleno');
        }
        return query('run', sql, params);
      },
      getFirstAsync: async (sql, params) => query('first', sql, params),
      getAllAsync: async (sql, params) => query('all', sql, params),
    });
  `);
  fs.writeFileSync(apiPath, `
    exports.getInterlinear = async () => {
      if (global.studyError) throw global.studyError;
      return { words: global.studyResponse };
    };
    exports.getCommentaries = async () => ({ commentaries: global.studyResponse });
  `);
  try {
    const outfile = path.join(temporary, 'study.cjs');
    await esbuild.build({
      stdin: {
        contents: `export * from './lib/studyRepository'; export * from './lib/study';
          export * from './lib/offline/chapterStudyStore'; export * from './lib/network';`,
        resolveDir: path.resolve(__dirname, '..'), loader: 'ts',
      },
      outfile, bundle: true, platform: 'node', format: 'cjs',
      plugins: [{ name: 'native-test-ports', setup(build) {
        build.onResolve({ filter: /^expo-sqlite$/ }, () => ({ path: sqlitePath, external: true }));
        build.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: apiPath, external: true }));
      } }],
    });
    const study = require(outfile);
    const passage = { bibleId: 149, bookId: 19, chapter: 23 };
    const title = { bookId: 19, chapter: 23, verse: 0, position: 1,
      original: 'מִזְמ֥וֹר', language: 'heb', strongCode: 'H4210', definition: 'Salmo.',
      transliteration: 'miz.mor', morph: 'HNcmsa', lemma: 'מִזְמוֹר', glossEs: null, glossEn: 'psalm' };
    global.studyResponse = [title];
    const first = await study.repoGetStudyChapter('interlinear', passage);
    assert.equal(first.source, 'remote');
    assert.equal(first.offlineAvailable, true);
    study.setIsOnline(false);
    const offline = await study.repoGetStudyChapter('interlinear', { ...passage, bibleId: 200 });
    assert.equal(offline.content[0].definition, 'Salmo.');
    assert.equal(study.groupInterlinearWords(offline.content).get(0)[0].verse, 0);
    await assert.rejects(study.repoGetStudyChapter('interlinear', { ...passage, chapter: 24 }), /sin descargar/);

    const commentary = { id: 1, bibleId: 149, bookId: 19, chapter: 23,
      verseStart: 1, verseEnd: 6, author: 'Charles Spurgeon', languageCode: 'es', contentMd: 'El Pastor.' };
    await study.saveStudyChapter('commentaries', passage, [commentary]);
    assert.equal((await study.repoGetStudyChapter('commentaries', passage)).content.length, 1);
    await assert.rejects(study.repoGetStudyChapter('commentaries', { ...passage, bibleId: 200 }), /sin descargar/);
    assert.equal(study.commentariesForVerse([commentary], 6).length, 1);
    assert.equal(study.commentariesForVerse([commentary], 7).length, 0);

    require(sqlitePath).failNextWrite();
    await assert.rejects(study.saveStudyChapter('interlinear', passage, []), /Disco lleno/);
    assert.equal((await study.readStudyChapter('interlinear', passage)).content.length, 1);
    await assert.rejects(study.saveStudyChapter('interlinear', passage, [{ ...title, chapter: 24 }]), /no corresponde/);
    assert.equal((await study.readStudyChapter('interlinear', passage)).content.length, 1);

    study.setIsOnline(true);
    global.studyError = new Error('Sin red');
    assert.equal((await study.repoGetStudyChapter('interlinear', passage, true)).source, 'local');
    global.studyError = Object.assign(new Error('Acceso denegado'), { status: 403 });
    await assert.rejects(study.repoGetStudyChapter('interlinear', passage, true), /Acceso denegado/);
    delete global.studyError;

    const unpublished = { ...passage, chapter: 119 };
    global.studyResponse = [];
    assert.equal((await study.repoGetStudyChapter('commentaries', unpublished)).content.length, 0);
    global.studyResponse = [{ ...commentary, chapter: 119, verseEnd: 176 }];
    assert.equal((await study.repoGetStudyChapter('commentaries', unpublished)).content.length, 1,
      'una respuesta vacía no oculta contenido publicado después');
    require(sqlitePath).failNextWrite();
    assert.equal((await study.repoGetStudyChapter('commentaries', unpublished, true)).offlineAvailable, false);

    assert.equal(study.interlinearApplies('heb', 19), true);
    assert.equal(study.interlinearApplies('grc', 19), false);
    assert.equal(study.interlinearApplies('auto', 43), true);
    await study.deleteStudyBook('interlinear', 200, 19);
    assert.equal(await study.readStudyChapter('interlinear', passage), null);
    assert.equal((await study.listStudyBookCaches()).length, 1, 'borrar interlineal conserva comentarios');
    console.log('ok estudio: SQLite, offline, títulos, versiones, rangos, fallos de escritura y refresco');
  } finally {
    delete global.studyResponse;
    delete global.studyError;
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
