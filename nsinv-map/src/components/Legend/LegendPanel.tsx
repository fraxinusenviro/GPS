import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';
import { fetchEsriLegend } from '../../lib/esriUtils';
import { COLOR_RAMPS } from '../../lib/colorRamps';
import type { AnyLayer, EsriRestLayer, CogLayer, XyzLayer } from '../../types/layers';

interface EsriLegendEntry {
  label: string;
  imageData: string;
  contentType: string;
}

interface EsriLegendLayer {
  layerName: string;
  legend: EsriLegendEntry[];
}

export function LegendPanel() {
  const layers = useLayerStore((s) => s.layers);
  const visibleLayers = layers.filter((l) => l.visible);
  const [open, setOpen] = useState(true);
  const [esriLegends, setEsriLegends] = useState<Record<string, EsriLegendLayer[]>>({});

  useEffect(() => {
    const esriLayers = visibleLayers.filter(
      (l) => l.type === 'esri-mapserver' || l.type === 'esri-featureserver',
    ) as EsriRestLayer[];

    for (const l of esriLayers) {
      if (!esriLegends[l.id]) {
        fetchEsriLegend(l.url).then((data) => {
          if (data?.layers) {
            setEsriLegends((prev) => ({ ...prev, [l.id]: data.layers }));
          }
        }).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLayers.map((l) => l.id).join(',')]);

  if (visibleLayers.length === 0) return null;

  return (
    <div className="absolute left-72 bottom-8 z-10 bg-white rounded-xl shadow-lg border border-slate-200 w-56 max-h-80 flex flex-col overflow-hidden md:left-72">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 w-full hover:bg-slate-50 transition-colors"
      >
        <BookOpen size={14} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700 flex-1 text-left">Legend</span>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {visibleLayers.map((layer) => (
            <LegendEntry key={layer.id} layer={layer} esriLegend={esriLegends[layer.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

function LegendEntry({ layer, esriLegend }: { layer: AnyLayer; esriLegend?: EsriLegendLayer[] }) {
  if (layer.type === 'esri-mapserver' || layer.type === 'esri-featureserver') {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1">{layer.name}</p>
        {esriLegend ? (
          esriLegend.map((ll) => (
            <div key={ll.layerName} className="mb-1">
              <p className="text-xs text-slate-500 mb-0.5">{ll.layerName}</p>
              {ll.legend.map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5 py-0.5">
                  <img src={`data:${entry.contentType};base64,${entry.imageData}`} className="w-4 h-4 object-contain" alt="" />
                  <span className="text-xs text-slate-600">{entry.label}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="w-4 h-4 rounded bg-blue-400 opacity-50" />
        )}
      </div>
    );
  }

  if (layer.type === 'cog') {
    const cogLayer = layer as CogLayer;
    const ramp = COLOR_RAMPS[cogLayer.colorRamp] || COLOR_RAMPS.viridis;
    const stops: string[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.round((i / 4) * 255);
      stops.push(`rgb(${ramp[idx * 4]},${ramp[idx * 4 + 1]},${ramp[idx * 4 + 2]})`);
    }
    return (
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1">{layer.name}</p>
        <div className="flex items-stretch gap-1">
          <div
            className="w-4 h-20 rounded"
            style={{ background: `linear-gradient(to bottom, ${[...stops].reverse().join(', ')})` }}
          />
          <div className="flex flex-col justify-between">
            <span className="text-xs text-slate-500">{cogLayer.maxValue.toFixed(1)}</span>
            <span className="text-xs text-slate-500">{cogLayer.minValue.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (layer.type === 'xyz') {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-600">{layer.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 break-all">{(layer as XyzLayer).urlTemplate}</p>
      </div>
    );
  }

  if (layer.type === 'geojson') {
    const gl = layer as import('../../types/layers').GeoJsonLayer;
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded border" style={{ backgroundColor: gl.fillColor, borderColor: gl.strokeColor }} />
        <p className="text-xs text-slate-600">{layer.name}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600">{layer.name}</p>
    </div>
  );
}
