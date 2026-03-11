import { useState } from 'react';
import { Eye, EyeOff, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLayerStore } from '../../store/layerStore';
import { CogSymbology } from '../COG/CogSymbology';
import { VectorStyleEditor } from '../Vector/VectorStyleEditor';
import type { AnyLayer, CogLayer, GeoJsonLayer, EsriRestLayer } from '../../types/layers';

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  'esri-mapserver': { label: 'ESRI', color: 'bg-blue-100 text-blue-700' },
  'esri-featureserver': { label: 'ESRI FS', color: 'bg-blue-100 text-blue-700' },
  cog: { label: 'COG', color: 'bg-amber-100 text-amber-700' },
  xyz: { label: 'XYZ', color: 'bg-purple-100 text-purple-700' },
  wms: { label: 'WMS', color: 'bg-teal-100 text-teal-700' },
  geojson: { label: 'Vector', color: 'bg-green-100 text-green-700' },
};

interface Props {
  layer: AnyLayer;
}

export function LayerItem({ layer }: Props) {
  const { updateLayer, removeLayer } = useLayerStore();
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const badge = TYPE_BADGES[layer.type] ?? { label: layer.type, color: 'bg-slate-100 text-slate-600' };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button {...attributes} {...listeners} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical size={14} />
        </button>

        <button
          onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
          className={`shrink-0 transition-colors ${layer.visible ? 'text-accent' : 'text-slate-300'}`}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-400 hover:text-slate-600 shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <span className="flex-1 text-sm text-slate-700 truncate min-w-0" title={layer.name}>
          {layer.name}
        </span>

        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
          {badge.label}
        </span>

        <button
          onClick={() => removeLayer(layer.id)}
          className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
          title="Remove layer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-12">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layer.opacity}
            onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
            className="flex-1 accent-accent h-1"
          />
          <span className="text-xs text-slate-400 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100">
          {layer.type === 'cog' && (
            <CogSymbology
              layer={layer as CogLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}
          {layer.type === 'geojson' && (
            <VectorStyleEditor
              layer={layer as GeoJsonLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}
          {(layer.type === 'esri-mapserver' || layer.type === 'esri-featureserver') && (
            <EsriSubLayerControl
              layer={layer as EsriRestLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}
          {layer.type === 'xyz' && (
            <p className="text-xs text-slate-400 pt-2">{(layer as import('../../types/layers').XyzLayer).urlTemplate}</p>
          )}
          {layer.type === 'wms' && (
            <p className="text-xs text-slate-400 pt-2">{(layer as import('../../types/layers').WmsLayer).layers}</p>
          )}
        </div>
      )}
    </div>
  );
}

function EsriSubLayerControl({ layer, onChange }: { layer: EsriRestLayer; onChange: (u: Partial<EsriRestLayer>) => void }) {
  if (!layer.serviceMetadata?.layers?.length) return null;
  const toggle = (id: number) => {
    const curr = layer.visibleSubLayers;
    onChange({ visibleSubLayers: curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id] });
  };
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-slate-500 mb-1">Sub-layers</p>
      {layer.serviceMetadata.layers.map((l) => (
        <label key={l.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.visibleSubLayers.includes(l.id)}
            onChange={() => toggle(l.id)}
            className="accent-accent"
          />
          {l.name}
        </label>
      ))}
    </div>
  );
}
