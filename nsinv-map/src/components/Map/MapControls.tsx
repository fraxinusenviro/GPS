import { ZoomIn, ZoomOut, Home, Locate, Layers, Terminal } from 'lucide-react';
import { useMap } from '../../hooks/useMap';
import { BASEMAPS } from '../../types/layers';
import { useLayerStore } from '../../store/layerStore';
import { useState } from 'react';
import { LayerConsole } from '../UI/LayerConsole';

const NOVA_SCOTIA_CENTER: [number, number] = [-63.0, 45.0];
const NOVA_SCOTIA_ZOOM = 7;

export function MapControls() {
  const mapRef = useMap();
  const { activeBasemap, setBasemap } = useLayerStore();
  const [showBasemaps, setShowBasemaps] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  const btn = 'flex items-center justify-center w-9 h-9 bg-white text-slate-700 rounded shadow hover:bg-slate-50 transition-colors';

  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
      {showConsole && <LayerConsole />}
      <button className={btn} title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
        <ZoomIn size={16} />
      </button>
      <button className={btn} title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
        <ZoomOut size={16} />
      </button>
      <button
        className={btn}
        title="Home"
        onClick={() => mapRef.current?.flyTo({ center: NOVA_SCOTIA_CENTER, zoom: NOVA_SCOTIA_ZOOM })}
      >
        <Home size={16} />
      </button>
      <button
        className={btn}
        title="My location"
        onClick={() => {
          navigator.geolocation?.getCurrentPosition((pos) => {
            mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14 });
          });
        }}
      >
        <Locate size={16} />
      </button>
      <button
        className={`${btn} ${showConsole ? 'bg-accent text-white' : ''}`}
        title="Layer console"
        onClick={() => setShowConsole((v) => !v)}
      >
        <Terminal size={16} />
      </button>
      <div className="relative">
        <button
          className={`${btn} ${showBasemaps ? 'bg-accent text-white' : ''}`}
          title="Basemap"
          onClick={() => setShowBasemaps((v) => !v)}
        >
          <Layers size={16} />
        </button>
        {showBasemaps && (
          <div className="absolute right-10 top-0 bg-white rounded shadow-lg border border-slate-200 overflow-hidden min-w-40">
            {Object.values(BASEMAPS).map((b) => (
              <button
                key={b.id}
                onClick={() => { setBasemap(b.id); setShowBasemaps(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  activeBasemap === b.id ? 'text-accent font-medium' : 'text-slate-700'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
