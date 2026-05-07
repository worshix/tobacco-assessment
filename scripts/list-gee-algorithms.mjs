// Fetch all GEE algorithm names and search for relevant ones
import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}
const EMAIL = process.env.GEE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GEE_PRIVATE_KEY.replace(/\\n/g, '\n');
const PROJECT = process.env.GEE_PROJECT_ID;

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iss: EMAIL, scope: 'https://www.googleapis.com/auth/earthengine', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url');
  const s = createSign('RSA-SHA256'); s.update(`${h}.${p}`);
  const jwt = `${h}.${p}.${s.sign(PRIVATE_KEY, 'base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const d = await r.json(); if (!r.ok) throw new Error(JSON.stringify(d));
  return d.access_token;
}

(async () => {
  const token = await getToken();
  console.log('Token OK\n');

  const r = await fetch(`https://earthengine.googleapis.com/v1/projects/${PROJECT}/algorithms`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  const data = await r.json();
  if (!r.ok) { console.error(data); return; }

  const names = Object.keys(data.algorithms || {}).sort();
  console.log(`Total algorithms: ${names.length}\n`);

  // Print all filter/collection/date/geometry related
  const keywords = ['filter', 'date', 'collection', 'geometry', 'image', 'reduce'];
  for (const kw of keywords) {
    const matches = names.filter(n => n.toLowerCase().includes(kw));
    console.log(`\n=== ${kw.toUpperCase()} (${matches.length}) ===`);
    matches.forEach(n => console.log(' ', n));
  }
})();
