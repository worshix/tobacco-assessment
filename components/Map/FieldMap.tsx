"use client";

import React, { useEffect, useRef } from 'react';
import Map, { NavigationControl, FullscreenControl, ScaleControl, GeolocateControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface FieldMapProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  polygon?: any;
  children?: React.ReactNode;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function FieldMap({ initialViewState, polygon, children }: FieldMapProps) {
  return (
    <div className="w-full h-full relative">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState || {
          longitude: 31.05, 
          latitude: -17.83,
          zoom: 6
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />
        
        {polygon && (
          <Source id="my-data" type="geojson" data={polygon}>
            <Layer
              id="polygon-layer"
              type="fill"
              paint={{
                'fill-color': '#10b981',
                'fill-opacity': 0.4
              }}
            />
            <Layer
              id="outline-layer"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 2
              }}
            />
          </Source>
        )}

        {children}
      </Map>
      
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200 text-center max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Mapbox Token Required</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to your <code>.env</code> file to see the interactive satellite map.
            </p>
            <div className="text-xs bg-slate-50 p-2 rounded text-left font-mono">
              NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
