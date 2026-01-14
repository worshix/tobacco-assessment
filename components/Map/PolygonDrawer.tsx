"use client";

import React, { useCallback, useState } from 'react';
import { useControl } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface PolygonDrawerProps {
  onUpdate?: (event: any) => void;
  onCreate?: (event: any) => void;
  onDelete?: (event: any) => void;
}

export default function PolygonDrawer(props: PolygonDrawerProps) {
  useControl(
    () => new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'draw_polygon'
    }),
    ({ map }) => {
      map.on('draw.create', props.onCreate || (() => {}));
      map.on('draw.update', props.onUpdate || (() => {}));
      map.on('draw.delete', props.onDelete || (() => {}));
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate || (() => {}));
      map.off('draw.update', props.onUpdate || (() => {}));
      map.off('draw.delete', props.onDelete || (() => {}));
    },
    {
      position: 'top-right'
    }
  );

  return null;
}
