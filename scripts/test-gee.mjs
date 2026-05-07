// Quick GEE integration diagnostic — run with: node scripts/test-gee.mjs
import { createSign } from 'crypto';
import { readFileSync } from 'fs';

// Load .env manually
const env = readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}

const EMAIL = process.env.GEE_SERVICE_ACCOUNT_EMAIL;
const RAW_KEY = process.env.GEE_PRIVATE_KEY;
const PROJECT = process.env.GEE_PROJECT_ID;
const PRIVATE_KEY = RAW_KEY.replace(/\\n/g, '\n');

console.log('Email:', EMAIL);
console.log('Project:', PROJECT);
console.log('Key starts with:', PRIVATE_KEY.slice(0, 40));

// ---- Step 1: Get token ----
async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: EMAIL,
    scope: 'https://www.googleapis.com/auth/earthengine',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign(PRIVATE_KEY, 'base64url');
  const jwt = `${signingInput}.${sig}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const text = await resp.text();
  console.log('\n--- Token response (' + resp.status + ') ---');
  console.log(text.slice(0, 300));
  if (!resp.ok) throw new Error('Token failed');
  return JSON.parse(text).access_token;
}

// ---- Step 2: Compute a simple expression (1 + 1) ----
async function testSimpleExpr(token) {
  const resp = await fetch(`https://earthengine.googleapis.com/v1/projects/${PROJECT}/value:compute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expression: {
        result: '0',
        values: {
          '0': { functionInvocationValue: { functionName: 'Number.add', arguments: { left: { constantValue: 1 }, right: { constantValue: 2 } } } }
        }
      }
    }),
  });
  const text = await resp.text();
  console.log('\n--- Simple compute (1+2) response (' + resp.status + ') ---');
  console.log(text.slice(0, 300));
}

// ---- Step 3: Compute NDVI at a known Zimbabwe point ----
async function testNDVI(token) {
  // Harare, Zimbabwe: approx lat=-17.83, lng=31.05 (center of known tobacco region)
  const lng = 31.05, lat = -17.83;
  const endDate = new Date().toISOString().split('T')[0];
  const start = new Date(); start.setDate(start.getDate() - 180);
  const startDate = start.toISOString().split('T')[0];

  console.log(`\nTesting NDVI at [${lng}, ${lat}] from ${startDate} to ${endDate}`);

  const expr = {
    result: 'ndvi_value',
    values: {
      s2: { functionInvocationValue: { functionName: 'ImageCollection', arguments: { id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' } } } },
      pt: { functionInvocationValue: { functionName: 'Geometry.Point', arguments: { coordinates: { constantValue: [lng, lat] } } } },
      by_bounds: { functionInvocationValue: { functionName: 'Collection.filterBounds', arguments: { collection: { valueReference: 's2' }, geometry: { valueReference: 'pt' } } } },
      by_date: { functionInvocationValue: { functionName: 'Collection.filterDate', arguments: { collection: { valueReference: 'by_bounds' }, start: { constantValue: startDate }, end: { constantValue: endDate } } } },
      median: { functionInvocationValue: { functionName: 'ImageCollection.median', arguments: { imageCollection: { valueReference: 'by_date' } } } },
      ndvi_img: { functionInvocationValue: { functionName: 'Image.normalizedDifference', arguments: { image: { valueReference: 'median' }, bandNames: { constantValue: ['B8', 'B4'] } } } },
      reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
      dict: { functionInvocationValue: { functionName: 'Image.reduceRegion', arguments: { image: { valueReference: 'ndvi_img' }, geometry: { valueReference: 'pt' }, reducer: { valueReference: 'reducer' }, scale: { constantValue: 30 }, bestEffort: { constantValue: true } } } },
      ndvi_value: { functionInvocationValue: { functionName: 'Dictionary.get', arguments: { dictionary: { valueReference: 'dict' }, key: { constantValue: 'nd' } } } },
    }
  };

  const resp = await fetch(`https://earthengine.googleapis.com/v1/projects/${PROJECT}/value:compute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: expr }),
  });
  const text = await resp.text();
  console.log('\n--- NDVI point response (' + resp.status + ') ---');
  console.log(text.slice(0, 500));
}

(async () => {
  try {
    const token = await getToken();
    await testSimpleExpr(token);
    await testNDVI(token);
  } catch (e) {
    console.error('\nFATAL:', e.message);
  }
})();
