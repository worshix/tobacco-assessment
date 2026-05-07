"use client";

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  ndvi: number;
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

declare global {
  interface Window {
    L: typeof L;
  }
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    let heatLayer: any = null;
    let mounted = true;

    import('leaflet.heat').then(() => {
      if (!mounted) return;

      // Invert NDVI so intensity 1.0 = max stress (low NDVI = red hotspot)
      const heatData: [number, number, number][] = points.map(p => [
        p.lat,
        p.lng,
        Math.max(0, Math.min(1, 1 - p.ndvi)),
      ]);

      heatLayer = (L as any).heatLayer(heatData, {
        radius: 40,
        blur: 25,
        maxZoom: 22,
        max: 1.0,
        minOpacity: 0.4,
        gradient: {
          0.0: '#22c55e', // green  — healthy
          0.3: '#eab308', // yellow — moderate stress
          0.65: '#f97316', // orange — high stress
          1.0: '#ef4444',  // red    — severe stress
        },
      });

      heatLayer.addTo(map);
    });

    return () => {
      mounted = false;
      if (heatLayer) heatLayer.remove();
    };
  }, [map, points]);

  return null;
}
