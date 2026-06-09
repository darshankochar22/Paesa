const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'gstClassification');
const ddlFile = path.join(base, 'gstClassification.js');
const serviceFile = path.join(base, 'gstClassificationService.js');

function extractCreateColumns(content) {
  const m = content.match(/CREATE TABLE IF NOT EXISTS gst_classifications \(([^]+?)\)\s*`/m);
  if (!m) return [];
  const body = m[1];
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('--'))
    .map((l) => l.replace(/,$/, ''))
    .map((l) => l.split(/\s+/)[0]);
}

function extractInsertColumns(content) {
  const inserts = [];
  const re = /INSERT INTO gst_classifications \(([^)]+)\) VALUES/gi;
  let m;
  while ((m = re.exec(content))) {
    inserts.push(...m[1].split(',').map(s => s.trim()));
  }
  return [...new Set(inserts)];
}

function extractUpdateColumns(content) {
  const sets = [];
  const re = /UPDATE gst_classifications SET([\s\S]*?)WHERE gc_id =/gi;
  let m = re.exec(content);
  if (!m) return [];
  const body = m[1];
  body.split(/,\n/).forEach(line => {
    const left = line.split('=')[0];
    if (left) sets.push(left.replace(/\s+/g, '').replace(/^,/, ''));
  });
  return sets.map(s => s.trim());
}

const ddl = fs.readFileSync(ddlFile, 'utf8');
const svc = fs.readFileSync(serviceFile, 'utf8');

const createCols = extractCreateColumns(ddl);
const insertCols = extractInsertColumns(svc);
const updateCols = extractUpdateColumns(svc);

console.log('CREATE TABLE columns:', createCols.join(', '));
console.log('INSERT columns:', insertCols.join(', '));
console.log('UPDATE columns:', updateCols.join(', '));

const allUsed = new Set([...insertCols, ...updateCols].filter(Boolean));
const missing = [...allUsed].filter(c => !createCols.includes(c));

if (missing.length === 0) {
  console.log('\nNo missing columns detected.');
  process.exit(0);
} else {
  console.error('\nMissing columns detected:', missing.join(', '));
  process.exit(2);
}
