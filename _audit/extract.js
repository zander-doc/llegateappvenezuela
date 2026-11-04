const fs = require('fs');
const s = fs.readFileSync('app.js', 'utf8');

const strings = new Set();
const re = /"([^"\\\n]{4,140})"|'([^'\\\n]{4,140})'|`([^`\\\n]{4,140})`/g;
let m;
while ((m = re.exec(s))) {
  const t = (m[1] || m[2] || m[3] || '').trim();
  if (!t) continue;
  if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) || /\b(de|para|con|los|las|servicio|viaje|ruta|conductor|pasajero|encomienda|nosotros|contacto)\b/i.test(t)) {
    strings.add(t);
  }
}
console.log('=== SPANISH STRINGS ===');
console.log([...strings].sort().join('\n'));

const paths = new Set();
const re2 = /["'](\/[a-z0-9\-/:]{1,60})["']/g;
while ((m = re2.exec(s))) paths.add(m[1]);
console.log('\n=== PATH-LIKE STRINGS ===');
console.log([...paths].sort().join('\n'));
