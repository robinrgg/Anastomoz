// Audit de sécurité des dépendances de production (npm audit), avec exceptions
// documentées dans audit-exceptions.json. Échoue si une faille élevée ou critique
// n'est pas couverte par une exception valide (justifiée et non expirée).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const NIVEAUX_BLOQUANTS = new Set(['high', 'critical']);

let rapport;
try {
  rapport = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
} catch (err) {
  // npm audit renvoie un code d'erreur dès qu'une faille existe : on lit sa sortie quand même.
  rapport = err.stdout;
}
const { vulnerabilities = {} } = JSON.parse(rapport);
const { exceptions } = JSON.parse(readFileSync('audit-exceptions.json', 'utf8'));
const aujourdhui = new Date().toISOString().slice(0, 10);

const valides = new Map();
for (const e of exceptions) {
  if (e.revoirAvant < aujourdhui) console.error(`Exception expirée (${e.revoirAvant}) : ${e.avis}, à réexaminer.`);
  else valides.set(e.avis, e);
}

// Failles « à la source » (et non les paquets qui en dépendent par ricochet).
const bloquantes = [];
for (const [paquet, v] of Object.entries(vulnerabilities)) {
  for (const source of v.via) {
    if (typeof source !== 'object' || !NIVEAUX_BLOQUANTS.has(source.severity)) continue;
    const avis = source.url?.split('/').pop();
    if (valides.has(avis)) console.log(`Acceptée (voir audit-exceptions.json) : ${avis} dans ${paquet}`);
    else bloquantes.push(`${paquet} : ${source.title} (${source.url})`);
  }
}

if (bloquantes.length > 0) {
  console.error('Failles de sécurité bloquantes :');
  for (const b of bloquantes) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('Audit de sécurité : aucune faille bloquante.');
