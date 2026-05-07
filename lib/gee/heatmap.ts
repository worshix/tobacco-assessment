import { getGEEToken } from './auth';
import { extractCoordinates } from '@/lib/geo/utils';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  ndvi: number;
}

const GEE_BASE = `https://earthengine.googleapis.com/v1/projects/${process.env.GEE_PROJECT_ID}`;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Ray-casting point-in-polygon test (GeoJSON uses [lng, lat] order)
function isInsidePolygon(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Generate a regular grid of [lng, lat] points inside the polygon
function buildGrid(coordinates: number[][], size: number): [number, number][] {
  const lngs = coordinates.map(c => c[0]);
  const lats = coordinates.map(c => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);

  const points: [number, number][] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const lng = minLng + (maxLng - minLng) * (i + 0.5) / size;
      const lat = minLat + (maxLat - minLat) * (j + 0.5) / size;
      if (isInsidePolygon(lng, lat, coordinates)) {
        points.push([lng, lat]);
      }
    }
  }
  return points;
}

function buildPointNDVIExpression(lng: number, lat: number, startDate: string, endDate: string) {
  return {
    result: 'ndvi_value',
    values: {
      s2: {
        functionInvocationValue: {
          functionName: 'ImageCollection',
          arguments: { id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' } },
        },
      },
      pt: {
        functionInvocationValue: {
          functionName: 'Geometry.Point',
          arguments: { coordinates: { constantValue: [lng, lat] } },
        },
      },
      by_bounds: {
        functionInvocationValue: {
          functionName: 'Collection.filterBounds',
          arguments: {
            collection: { valueReference: 's2' },
            geometry: { valueReference: 'pt' },
          },
        },
      },
      by_date: {
        functionInvocationValue: {
          functionName: 'Collection.filterDate',
          arguments: {
            collection: { valueReference: 'by_bounds' },
            start: { constantValue: startDate },
            end: { constantValue: endDate },
          },
        },
      },
      cloud_filter: {
        functionInvocationValue: {
          functionName: 'Filter.lessThan',
          arguments: {
            leftField: { constantValue: 'CLOUDY_PIXEL_PERCENTAGE' },
            rightValue: { constantValue: 40 },
          },
        },
      },
      filtered: {
        functionInvocationValue: {
          functionName: 'Collection.filter',
          arguments: {
            collection: { valueReference: 'by_date' },
            filter: { valueReference: 'cloud_filter' },
          },
        },
      },
      median: {
        functionInvocationValue: {
          functionName: 'ImageCollection.median',
          arguments: { imageCollection: { valueReference: 'filtered' } },
        },
      },
      ndvi_img: {
        functionInvocationValue: {
          functionName: 'Image.normalizedDifference',
          arguments: {
            image: { valueReference: 'median' },
            bandNames: { constantValue: ['B8', 'B4'] },
          },
        },
      },
      reducer: {
        functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} },
      },
      dict: {
        functionInvocationValue: {
          functionName: 'Image.reduceRegion',
          arguments: {
            image: { valueReference: 'ndvi_img' },
            geometry: { valueReference: 'pt' },
            reducer: { valueReference: 'reducer' },
            scale: { constantValue: 30 },
            bestEffort: { constantValue: true },
          },
        },
      },
      ndvi_value: {
        functionInvocationValue: {
          functionName: 'Dictionary.get',
          arguments: {
            dictionary: { valueReference: 'dict' },
            key: { constantValue: 'nd' },
          },
        },
      },
    },
  };
}

function parseNumber(result: any): number | null {
  if (result === null || result === undefined) return null;
  if (typeof result === 'number') return result;
  if (result.numberValue !== undefined) return Number(result.numberValue);
  if (result.floatValue !== undefined) return Number(result.floatValue);
  return null;
}

async function computePointNDVI(
  lng: number,
  lat: number,
  startDate: string,
  endDate: string,
  token: string
): Promise<number | null> {
  try {
    const expr = buildPointNDVIExpression(lng, lat, startDate, endDate);
    const resp = await fetch(`${GEE_BASE}/value:compute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expression: expr }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const value = parseNumber(data.result);
    if (value === null) return null;
    return Math.max(0, Math.min(1, value));
  } catch {
    return null;
  }
}

export async function getSatelliteHeatmap(polygon: any): Promise<HeatmapPoint[]> {
  const coordinates = extractCoordinates(polygon);
  if (!coordinates || coordinates.length < 3) return [];

  let token: string;
  try {
    token = await getGEEToken();
  } catch (err) {
    console.error('GEE auth failed for heatmap:', err);
    return [];
  }

  const grid = buildGrid(coordinates, 5); // 5×5 = up to 25 points inside polygon
  if (grid.length === 0) return [];

  const startDate = daysAgo(90);
  const endDate = daysAgo(0);

  const results = await Promise.all(
    grid.map(async ([lng, lat]) => {
      const ndvi = await computePointNDVI(lng, lat, startDate, endDate, token);
      return ndvi !== null ? { lat, lng, ndvi } : null;
    })
  );

  return results.filter((r): r is HeatmapPoint => r !== null);
}
