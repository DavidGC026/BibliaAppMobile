const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const entry = path.resolve(__dirname, '../lib/games/__check__.cts');
const result = buildSync({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs' });
const compiled = new Module(entry, module);
compiled.filename = entry;
compiled.paths = Module._nodeModulePaths(path.dirname(entry));
compiled._compile(result.outputFiles[0].text, entry);
