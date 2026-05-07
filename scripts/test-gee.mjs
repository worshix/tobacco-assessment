// Full end-to-end GEE REST API test
// Verified function names: ImageCollection.load, GeometryConstructors.{Point,Polygon},
//   Filter.greaterThanOrEquals, Filter.lessThan, Collection.filter, ImageCollection.reduce,
//   Image.normalizedDifference, Image.reduceRegion, Dictionary.get, Reducer.mean
// Primary argument is 'input' for ImageCollection.reduce, Image.*, not 'collection'/'image'
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

async function compute(token, label, expression) {
  const r = await fetch(`https://earthengine.googleapis.com/v1/projects/${PROJECT}/value:compute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression }),
    signal: AbortSignal.timeout(55000),
  });
  const text = await r.text();
  console.log(`\n[${label}] HTTP ${r.status}: ${text.slice(0, 400)}`);
  return r.ok;
}

const START_MS = new Date('2025-11-01').getTime();
const END_MS = new Date('2026-02-01').getTime();
const LNG = 31.05, LAT = -17.83;
const POLY_COORDS = [[[31.0, -17.9], [31.1, -17.9], [31.1, -17.8], [31.0, -17.8], [31.0, -17.9]]];

function makeBase() {
  return {
    s2: { functionInvocationValue: { functionName: 'ImageCollection.load', arguments: { id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' } } } },
    date_start: { functionInvocationValue: { functionName: 'Filter.greaterThanOrEquals', arguments: { leftField: { constantValue: 'system:time_start' }, rightValue: { constantValue: START_MS } } } },
    date_end: { functionInvocationValue: { functionName: 'Filter.lessThan', arguments: { leftField: { constantValue: 'system:time_start' }, rightValue: { constantValue: END_MS } } } },
    by_start: { functionInvocationValue: { functionName: 'Collection.filter', arguments: { collection: { valueReference: 's2' }, filter: { valueReference: 'date_start' } } } },
    by_date: { functionInvocationValue: { functionName: 'Collection.filter', arguments: { collection: { valueReference: 'by_start' }, filter: { valueReference: 'date_end' } } } },
    cloud_filter: { functionInvocationValue: { functionName: 'Filter.lessThan', arguments: { leftField: { constantValue: 'CLOUDY_PIXEL_PERCENTAGE' }, rightValue: { constantValue: 30 } } } },
    filtered: { functionInvocationValue: { functionName: 'Collection.filter', arguments: { collection: { valueReference: 'by_date' }, filter: { valueReference: 'cloud_filter' } } } },
    col_reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
    reduced: { functionInvocationValue: { functionName: 'ImageCollection.reduce', arguments: { collection: { valueReference: 'filtered' }, reducer: { valueReference: 'col_reducer' } } } },
    ndvi_img: { functionInvocationValue: { functionName: 'Image.normalizedDifference', arguments: { input: { valueReference: 'reduced' }, bandNames: { constantValue: ['B8_mean', 'B4_mean'] } } } },
    rgn_reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
  };
}

(async () => {
  const token = await getToken();
  console.log('Token OK');

  // TEST 1: Full NDVI over a polygon (satellite.ts path)
  await compute(token, 'Polygon NDVI (satellite.ts path)', {
    result: 'ndvi_value',
    values: {
      ...makeBase(),
      region: { functionInvocationValue: { functionName: 'GeometryConstructors.Polygon', arguments: { coordinates: { constantValue: POLY_COORDS } } } },
      dict: { functionInvocationValue: { functionName: 'Image.reduceRegion', arguments: { image: { valueReference: 'ndvi_img' }, geometry: { valueReference: 'region' }, reducer: { valueReference: 'rgn_reducer' }, scale: { constantValue: 10 }, maxPixels: { constantValue: 1e9 }, bestEffort: { constantValue: true } } } },
      ndvi_value: { functionInvocationValue: { functionName: 'Dictionary.get', arguments: { dictionary: { valueReference: 'dict' }, key: { constantValue: 'nd' } } } },
    }
  });

  // TEST 2: Full NDVI at a point (heatmap.ts path)
  await compute(token, 'Point NDVI (heatmap.ts path)', {
    result: 'ndvi_value',
    values: {
      ...makeBase(),
      pt: { functionInvocationValue: { functionName: 'GeometryConstructors.Point', arguments: { coordinates: { constantValue: [LNG, LAT] } } } },
      dict: { functionInvocationValue: { functionName: 'Image.reduceRegion', arguments: { image: { valueReference: 'ndvi_img' }, geometry: { valueReference: 'pt' }, reducer: { valueReference: 'rgn_reducer' }, scale: { constantValue: 30 }, bestEffort: { constantValue: true } } } },
      ndvi_value: { functionInvocationValue: { functionName: 'Dictionary.get', arguments: { dictionary: { valueReference: 'dict' }, key: { constantValue: 'nd' } } } },
    }
  });
})();
