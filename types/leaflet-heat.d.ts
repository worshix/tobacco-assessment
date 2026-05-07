// leaflet.heat patches L.heatLayer onto the global Leaflet object as a side effect.
// Usage: import('leaflet.heat').then(() => (L as any).heatLayer(...))
declare module 'leaflet.heat' {
  const leafletHeat: any;
  export default leafletHeat;
}
