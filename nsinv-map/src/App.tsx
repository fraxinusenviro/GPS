import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { MapView } from './components/Map/MapView';
import { LayerManager } from './components/Map/LayerManager';
import { AddLayerModal } from './components/Map/AddLayerModal';
import { Sidebar } from './components/UI/Sidebar';
import { Toolbar } from './components/UI/Toolbar';
import { ToastProvider } from './components/UI/Toast';
import { LegendPanel } from './components/Legend/LegendPanel';
import { IdentifyPanel } from './components/Identify/IdentifyPanel';
import { useLayerStore } from './store/layerStore';
import { fetchEsriIdentify } from './lib/esriUtils';
import { InstallPrompt } from './components/UI/InstallPrompt';
import type { EsriRestLayer } from './types/layers';

interface IdentifyFeature {
  layerName: string;
  attributes: Record<string, unknown>;
}

function AppContent() {
  const layers = useLayerStore((s) => s.layers);
  const [identifyResults, setIdentifyResults] = useState<IdentifyFeature[] | null>(null);
  const [identifyLoading, setIdentifyLoading] = useState(false);
  // Track sidebar state so the FAB can be shown when the sidebar is collapsed.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [showFabModal, setShowFabModal] = useState(false);

  const handleMapClick = useCallback(async (e: maplibregl.MapMouseEvent) => {
    const esriLayers = layers.filter(
      (l) => (l.type === 'esri-mapserver') && l.visible,
    ) as EsriRestLayer[];

    if (esriLayers.length === 0) return;

    setIdentifyLoading(true);
    setIdentifyResults([]);

    const map = e.target;
    const bounds = map.getBounds();
    const canvas = map.getCanvas();

    const results: IdentifyFeature[] = [];

    await Promise.allSettled(
      esriLayers.map(async (layer) => {
        try {
          const data = await fetchEsriIdentify(
            layer.url,
            e.lngLat.lng,
            e.lngLat.lat,
            { xmin: bounds.getWest(), ymin: bounds.getSouth(), xmax: bounds.getEast(), ymax: bounds.getNorth() },
            { width: canvas.width, height: canvas.height },
            layer.visibleSubLayers,
          );
          if (data.results) {
            for (const r of data.results) {
              results.push({ layerName: r.layerName || layer.name, attributes: r.attributes || {} });
            }
          }
        } catch { /* swallow per-layer errors */ }
      }),
    );

    setIdentifyResults(results);
    setIdentifyLoading(false);
  }, [layers]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 font-sans">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCollapsedChange={setSidebarCollapsed}>
          <LayerManager />
        </Sidebar>
        <div className="flex-1 relative overflow-hidden">
          <MapView onMapClick={handleMapClick}>
            <LegendPanel />
            {(identifyResults !== null || identifyLoading) && (
              <IdentifyPanel
                results={identifyResults ?? []}
                loading={identifyLoading}
                onClose={() => setIdentifyResults(null)}
              />
            )}
            {/* FAB: visible whenever the sidebar is collapsed (especially on mobile) */}
            {sidebarCollapsed && (
              <button
                onClick={() => setShowFabModal(true)}
                className="absolute bottom-6 left-4 z-20 w-12 h-12 rounded-full bg-accent hover:bg-accent-hover text-white shadow-lg flex items-center justify-center transition-colors"
                aria-label="Add Layer"
                title="Add Layer"
              >
                <Plus size={22} />
              </button>
            )}
          </MapView>
          {showFabModal && <AddLayerModal onClose={() => setShowFabModal(false)} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
      <InstallPrompt />
    </ToastProvider>
  );
}
