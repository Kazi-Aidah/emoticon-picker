// To build, run: "npm run build" or "node build.js"

const fs = require('fs');
const path = require('path');
const root = __dirname;
const srcMain = path.join(root, 'src', 'main.js');
const srcJson = path.join(root, 'src', 'emoticons.json');
const outFile = path.join(root, 'main.js');
const mainCode = fs.readFileSync(srcMain, 'utf8');
const jsonText = fs.readFileSync(srcJson, 'utf8');
let data;
try { data = JSON.parse(jsonText); } catch (e) { throw new Error('Invalid emoticons.json'); }
if (!Array.isArray(data)) throw new Error('emoticons.json must be an array');
const injected = 'const __EMOTICONS__ = ' + JSON.stringify(data) + ';\n';
const transformed = mainCode.replace(/require\(['"]\.\.?\/emoticons\.json['"]\)/g, '__EMOTICONS__');
fs.writeFileSync(outFile, injected + transformed, 'utf8');
console.log('Built', path.relative(root, outFile));
