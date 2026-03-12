import { useState } from 'react';
import { Eye, EyeOff, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLayerStore } from '../../store/layerStore';
import { CogSymbology } from '../COG/CogSymbology';
import { VectorStyleEditor } from '../Vector/VectorStyleEditor';
import type { AnyLayer, CogLayer, GeoJsonLayer, EsriRestLayer, RasterEnhancement } from '../../types/layers';

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  'esri-mapserver':    { label: 'ESRI',    color: 'bg-blue-100 text-blue-700' },
  'esri-featureserver':{ label: 'ESRI FS', color: 'bg-blue-100 text-blue-700' },
  cog:   { label: 'COG',    color: 'bg-amber-100 text-amber-700' },
  xyz:   { label: 'XYZ',    color: 'bg-purple-100 text-purple-700' },
  wms:   { label: 'WMS',    color: 'bg-teal-100 text-teal-700' },
  geojson: { label: 'Vector', color: 'bg-green-100 text-green-700' },
};

const RASTER_TYPES = new Set(['esri-mapserver', 'xyz', 'wms', 'cog']);

interface Props { layer: AnyLayer }

export function LayerItem({ layer }: Props) {
  const { updateLayer, removeLayer } = useLayerStore();
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
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
        <button onClick={() => setExpanded((v) => !v)} className="text-slate-400 hover:text-slate-600 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="flex-1 text-sm text-slate-700 truncate min-w-0" title={layer.name}>{layer.name}</span>
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>{badge.label}</span>
        <button onClick={() => removeLayer(layer.id)} className="shrink-0 text-slate-300 hover:text-red-400 transition-colors" title="Remove layer">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Always-visible opacity row */}
      <div className="px-3 pb-2">
        <SliderRow
          label="Opacity"
          value={layer.opacity} min={0} max={1} step={0.01}
          display={`${Math.round(layer.opacity * 100)}%`}
          onChange={(v) => updateLayer(layer.id, { opacity: v })}
        />
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 space-y-3 pt-2">

          {/* COG – dedicated colour-ramp editor */}
          {layer.type === 'cog' && (
            <CogSymbology
              layer={layer as CogLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}

          {/* GeoJSON / Vector */}
          {layer.type === 'geojson' && (
            <VectorStyleEditor
              layer={layer as GeoJsonLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}

          {/* ESRI FeatureServer – treat like vector (same GeoJSON source) */}
          {layer.type === 'esri-featureserver' && (
            <EsriFeatureServerStyle
              layer={layer as EsriRestLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}

          {/* ESRI MapServer – sub-layer toggle */}
          {layer.type === 'esri-mapserver' && (
            <EsriSubLayerControl
              layer={layer as EsriRestLayer}
              onChange={(updates) => updateLayer(layer.id, updates as Partial<AnyLayer>)}
            />
          )}

          {/* URL / info rows for tile layers */}
          {layer.type === 'xyz' && (
            <p className="text-xs text-slate-400 break-all">{(layer as import('../../types/layers').XyzLayer).urlTemplate}</p>
          )}
          {layer.type === 'wms' && (
            <p className="text-xs text-slate-400">{(layer as import('../../types/layers').WmsLayer).layers}</p>
          )}

          {/* Raster display adjustments – brightness / contrast / saturation / hue */}
          {RASTER_TYPES.has(layer.type) && (
            <RasterEnhancementEditor
              value={layer.rasterEnhancement}
              onChange={(enh) => updateLayer(layer.id, { rasterEnhancement: enh } as Partial<AnyLayer>)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared slider ─────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-accent h-1" />
      <span className="text-xs text-slate-400 w-10 text-right shrink-0">{display}</span>
    </div>
  );
}

// ── Raster enhancement panel (ESRI MapServer, WMS, XYZ, COG) ─────────────────

const DEFAULT_ENH: RasterEnhancement = {
  brightnessMin: 0, brightnessMax: 1, contrast: 0, saturation: 0, hueRotate: 0, resampling: 'linear',
};

function RasterEnhancementEditor({ value, onChange }: {
  value?: RasterEnhancement;
  onChange: (v: RasterEnhancement) => void;
}) {
  const [open, setOpen] = useState(false);
  const e: RasterEnhancement = { ...DEFAULT_ENH, ...value };

  const set = (key: keyof RasterEnhancement, v: number | string) =>
    onChange({ ...e, [key]: v });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        {open ? '▾' : '▸'} Display adjustments
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          <SliderRow label="Brightness ↓" value={e.brightnessMin} min={0} max={1} step={0.01}
            display={e.brightnessMin.toFixed(2)} onChange={(v) => set('brightnessMin', v)} />
          <SliderRow label="Brightness ↑" value={e.brightnessMax} min={0} max={1} step={0.01}
            display={e.brightnessMax.toFixed(2)} onChange={(v) => set('brightnessMax', v)} />
          <SliderRow label="Contrast" value={e.contrast} min={-1} max={1} step={0.01}
            display={e.contrast.toFixed(2)} onChange={(v) => set('contrast', v)} />
          <SliderRow label="Saturation" value={e.saturation} min={-1} max={1} step={0.01}
            display={e.saturation.toFixed(2)} onChange={(v) => set('saturation', v)} />
          <SliderRow label="Hue rotate" value={e.hueRotate} min={0} max={360} step={1}
            display={`${Math.round(e.hueRotate)}°`} onChange={(v) => set('hueRotate', v)} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-16 shrink-0">Resampling</span>
            <select
              value={e.resampling}
              onChange={(ev) => set('resampling', ev.target.value)}
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value="linear">Linear (smooth)</option>
              <option value="nearest">Nearest (sharp)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_ENH)}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

// ── ESRI FeatureServer – colour controls ──────────────────────────────────────

function EsriFeatureServerStyle({ layer, onChange }: {
  layer: EsriRestLayer;
  onChange: (u: Partial<EsriRestLayer>) => void;
}) {
  // FeatureServer layers use MapLibre fill + line layers; the fill colour and
  // stroke can be edited here.  We piggyback on the EsriRestLayer optional fields
  // (stored in Zustand, applied in addOrUpdateEsriFeatureServer).
  const fillColor  = (layer as EsriRestLayer & { fillColor?: string }).fillColor  ?? '#3b82f6';
  const strokeColor= (layer as EsriRestLayer & { strokeColor?: string }).strokeColor ?? '#1d4ed8';

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-16 shrink-0">Fill</span>
        <input type="color" value={fillColor}
          onChange={(e) => onChange({ fillColor: e.target.value } as Partial<EsriRestLayer>)}
          className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-16 shrink-0">Outline</span>
        <input type="color" value={strokeColor}
          onChange={(e) => onChange({ strokeColor: e.target.value } as Partial<EsriRestLayer>)}
          className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0" />
      </div>
    </div>
  );
}

// ── ESRI MapServer – sub-layer toggle ─────────────────────────────────────────

function EsriSubLayerControl({ layer, onChange }: { layer: EsriRestLayer; onChange: (u: Partial<EsriRestLayer>) => void }) {
  if (!layer.serviceMetadata?.layers?.length) return null;
  const toggle = (id: number) => {
    const curr = layer.visibleSubLayers;
    onChange({ visibleSubLayers: curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id] });
  };
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">Sub-layers</p>
      {layer.serviceMetadata.layers.map((l) => (
        <label key={l.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={layer.visibleSubLayers.includes(l.id)}
            onChange={() => toggle(l.id)} className="accent-accent" />
          {l.name}
        </label>
      ))}
    </div>
  );
}
