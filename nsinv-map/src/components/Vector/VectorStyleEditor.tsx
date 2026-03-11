import type { GeoJsonLayer } from '../../types/layers';

interface Props {
  layer: GeoJsonLayer;
  onChange: (updates: Partial<GeoJsonLayer>) => void;
  fields?: string[];
}

export function VectorStyleEditor({ layer, onChange, fields = [] }: Props) {
  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Fill Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.fillColor}
              onChange={(e) => onChange({ fillColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-slate-200"
            />
            <span className="text-xs text-slate-600">{layer.fillColor}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Stroke Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.strokeColor}
              onChange={(e) => onChange({ strokeColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-slate-200"
            />
            <span className="text-xs text-slate-600">{layer.strokeColor}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Stroke Width: {layer.strokeWidth}px
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={layer.strokeWidth}
          onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Point Radius: {layer.pointRadius}px
        </label>
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={layer.pointRadius}
          onChange={(e) => onChange({ pointRadius: parseInt(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      {fields.length > 0 && (
        <div>
          <label className="text-xs text-slate-500 block mb-1">Label Field</label>
          <select
            value={layer.labelField ?? ''}
            onChange={(e) => onChange({ labelField: e.target.value || undefined })}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-accent"
          >
            <option value="">— No labels —</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
