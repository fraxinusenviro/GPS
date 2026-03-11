import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyLayer, PersistedMapState } from '../types/layers';

interface MapView {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

interface LayerStore {
  layers: AnyLayer[];
  activeBasemap: string;
  mapView: MapView;

  addLayer: (layer: AnyLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<AnyLayer>) => void;
  reorderLayers: (layers: AnyLayer[]) => void;
  setBasemap: (id: string) => void;
  setMapView: (view: Partial<MapView>) => void;
  exportState: () => PersistedMapState;
  importState: (state: PersistedMapState) => void;
}

export const useLayerStore = create<LayerStore>()(
  persist(
    (set, get) => ({
      layers: [],
      activeBasemap: 'osm',
      mapView: { center: [-63.0, 45.0], zoom: 7, bearing: 0, pitch: 0 },

      addLayer: (layer) =>
        set((s) => ({ layers: [...s.layers, { ...layer, order: s.layers.length }] })),

      removeLayer: (id) =>
        set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),

      updateLayer: (id, updates) =>
        set((s) => ({
          layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } as AnyLayer : l)),
        })),

      reorderLayers: (layers) => set({ layers }),

      setBasemap: (id) => set({ activeBasemap: id }),

      setMapView: (view) =>
        set((s) => ({ mapView: { ...s.mapView, ...view } })),

      exportState: () => {
        const s = get();
        return {
          center: s.mapView.center,
          zoom: s.mapView.zoom,
          bearing: s.mapView.bearing,
          pitch: s.mapView.pitch,
          activeBasemap: s.activeBasemap,
          layers: s.layers,
        };
      },

      importState: (state) =>
        set({
          mapView: {
            center: state.center,
            zoom: state.zoom,
            bearing: state.bearing,
            pitch: state.pitch,
          },
          activeBasemap: state.activeBasemap,
          layers: state.layers,
        }),
    }),
    {
      name: 'nsinv-map-state',
      partialize: (s) => ({
        mapView: s.mapView,
        activeBasemap: s.activeBasemap,
        // Exclude large inline GeoJSON data (> 2MB)
        layers: s.layers.map((l) => {
          if (l.type === 'geojson' && l.data) {
            const size = JSON.stringify(l.data).length;
            if (size > 2 * 1024 * 1024) {
              return { ...l, data: undefined };
            }
          }
          return l;
        }),
      }),
    },
  ),
);
