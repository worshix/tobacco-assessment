import { getGEEToken } from './auth';
import { extractCoordinates, getPolygonCentroid } from '@/lib/geo/utils';

export interface SatelliteData {
  mean_ndvi: number;
  ndvi_trend: number;
  ndvi_variance: number;
  avg_temperature_c: number;
  total_rainfall_mm: number;
  data_source: string;
  region_type: string;
  observation_date: string;
  historical_ndvi: { date: string; value: number }[];
}

const GEE_BASE = `https://earthengine.googleapis.com/v1/projects/${process.env.GEE_PROJECT_ID}`;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Builds a GEE REST API expression that computes mean NDVI over a polygon for a date range.
// Returns a Number result (the mean NDVI value).
function buildNDVIExpression(coordinates: number[][], startDate: string, endDate: string) {
  return {
    result: 'ndvi_value',
    values: {
      s2: {
        functionInvocationValue: {
          functionName: 'ImageCollection',
          arguments: { id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' } },
        },
      },
      region: {
        functionInvocationValue: {
          functionName: 'Geometry.Polygon',
          arguments: { coordinates: { constantValue: [coordinates] } },
        },
      },
      by_bounds: {
        functionInvocationValue: {
          functionName: 'Collection.filterBounds',
          arguments: {
            collection: { valueReference: 's2' },
            geometry: { valueReference: 'region' },
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
            rightValue: { constantValue: 30 },
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
            geometry: { valueReference: 'region' },
            reducer: { valueReference: 'reducer' },
            scale: { constantValue: 10 },
            maxPixels: { constantValue: 1000000000 },
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

function parseNumberResult(result: any): number | null {
  if (result === null || result === undefined) return null;
  if (typeof result === 'number') return result;
  if (result.numberValue !== undefined) return Number(result.numberValue);
  if (result.floatValue !== undefined) return Number(result.floatValue);
  if (result.integerValue !== undefined) return Number(result.integerValue);
  return null;
}

async function computeGEEValue(expression: object, token: string): Promise<any> {
  const resp = await fetch(`${GEE_BASE}/value:compute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expression }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    throw new Error(`GEE compute error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.result;
}

async function fetchNDVI(
  coordinates: number[][],
  startDate: string,
  endDate: string,
  token: string
): Promise<number | null> {
  try {
    const expr = buildNDVIExpression(coordinates, startDate, endDate);
    const result = await computeGEEValue(expr, token);
    const value = parseNumberResult(result);
    if (value === null) return null;
    return Math.max(0, Math.min(1, value));
  } catch {
    return null;
  }
}

async function fetchWeatherData(lat: number, lng: number): Promise<{ avgTemp: number; totalRain: number }> {
  try {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_mean,precipitation_sum&past_days=30&forecast_days=0`
    );
    if (!resp.ok) throw new Error('Weather API failed');

    const data = await resp.json();
    const temps: number[] = data.daily?.temperature_2m_mean ?? [];
    const precip: number[] = data.daily?.precipitation_sum ?? [];

    const avgTemp = temps.length > 0
      ? temps.reduce((a, b) => a + (b ?? 0), 0) / temps.length
      : 25;
    const totalRain = precip.reduce((a, b) => a + (b ?? 0), 0);

    return { avgTemp, totalRain };
  } catch {
    return { avgTemp: 25, totalRain: 15 };
  }
}

// Fallback when GEE is unavailable — estimates based on lat/lng region
function buildFallback(centroid: { lat: number; lng: number }): Omit<SatelliteData, 'avg_temperature_c' | 'total_rainfall_mm'> {
  const isTropical = Math.abs(centroid.lat) < 23.5;
  const base = isTropical ? 0.55 : 0.4;
  const ndvi = base + (Math.random() - 0.5) * 0.1;
  const historical_ndvi = [
    { date: '4mo ago', value: +(ndvi - 0.04).toFixed(3) },
    { date: '3mo ago', value: +(ndvi - 0.02).toFixed(3) },
    { date: '2mo ago', value: +(ndvi + 0.01).toFixed(3) },
    { date: '1mo ago', value: +(ndvi - 0.01).toFixed(3) },
    { date: 'Recent', value: +ndvi.toFixed(3) },
  ];
  return {
    mean_ndvi: +ndvi.toFixed(3),
    ndvi_trend: +(ndvi - (ndvi - 0.01)).toFixed(3),
    ndvi_variance: 0.03,
    data_source: 'Estimated (GEE unavailable)',
    region_type: isTropical ? 'tropical' : 'temperate',
    observation_date: new Date().toISOString().split('T')[0],
    historical_ndvi,
  };
}

export async function getSatelliteData(polygon: any): Promise<SatelliteData> {
  const coordinates = extractCoordinates(polygon);
  if (!coordinates) throw new Error('Invalid polygon format');

  const centroid = getPolygonCentroid(coordinates);

  // Five 30-day periods: oldest → newest
  const periods = [
    { start: daysAgo(150), end: daysAgo(120), label: '5mo ago' },
    { start: daysAgo(120), end: daysAgo(90),  label: '4mo ago' },
    { start: daysAgo(90),  end: daysAgo(60),  label: '3mo ago' },
    { start: daysAgo(60),  end: daysAgo(30),  label: '1mo ago' },
    { start: daysAgo(30),  end: daysAgo(0),   label: 'Recent'  },
  ];

  let ndviValues: (number | null)[] = Array(5).fill(null);
  let token: string | null = null;

  try {
    token = await getGEEToken();
  } catch (err) {
    console.error('GEE auth failed, using estimated data:', err);
  }

  if (token) {
    try {
      const [ndviResults, weatherData] = await Promise.all([
        Promise.all(periods.map(p => fetchNDVI(coordinates, p.start, p.end, token!))),
        fetchWeatherData(centroid.lat, centroid.lng),
      ]);

      ndviValues = ndviResults;
      const validValues = ndviValues.filter((v): v is number => v !== null);

      if (validValues.length === 0) {
        // All periods returned null — GEE had no imagery; fall back
        throw new Error('No GEE imagery available');
      }

      // Fill any null periods with nearest neighbour
      const filled = ndviValues.map((v, i) => {
        if (v !== null) return v;
        const candidates = ndviValues.filter((x): x is number => x !== null);
        return candidates.length > 0 ? candidates[Math.floor(candidates.length / 2)] : 0.45;
      });

      const currentNDVI = filled[4];
      const prevNDVI    = filled[3];
      const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
      const variance = validValues.reduce((a, b) => a + (b - mean) ** 2, 0) / validValues.length;

      return {
        mean_ndvi:       +currentNDVI.toFixed(3),
        ndvi_trend:      +(currentNDVI - prevNDVI).toFixed(3),
        ndvi_variance:   +Math.sqrt(variance).toFixed(3),
        avg_temperature_c: +weatherData.avgTemp.toFixed(1),
        total_rainfall_mm: +weatherData.totalRain.toFixed(1),
        data_source:     'Sentinel-2 (Google Earth Engine) + Open-Meteo',
        region_type:     'satellite',
        observation_date: new Date().toISOString().split('T')[0],
        historical_ndvi: periods.map((p, i) => ({
          date:  p.label,
          value: +filled[i].toFixed(3),
        })),
      };
    } catch (err) {
      console.error('GEE data fetch failed, using estimated data:', err);
    }
  }

  // Fallback path
  const fallback = buildFallback(centroid);
  const weather = await fetchWeatherData(centroid.lat, centroid.lng);
  return {
    ...fallback,
    avg_temperature_c: +weather.avgTemp.toFixed(1),
    total_rainfall_mm: +weather.totalRain.toFixed(1),
  };
}
