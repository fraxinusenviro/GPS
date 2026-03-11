import { createContext, useContext, useRef, type MutableRefObject } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';

export const MapContext = createContext<MutableRefObject<MaplibreMap | null>>({ current: null });

export function useMap() {
  return useContext(MapContext);
}

export function useMapRef() {
  return useRef<MaplibreMap | null>(null);
}
