import { COLOR_RAMP_NAMES, COLOR_RAMPS } from '../../lib/colorRamps';
import type { CogLayer } from '../../types/layers';

interface Props {
  layer: CogLayer;
  onChange: (updates: Partial<CogLayer>) => void;
}

function RampSwatch({ name }: { name: string }) {
  const ramp = COLOR_RAMPS[name];
  const stops: string[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = Math.round((i / 4) * 255);
    const r = ramp[idx * 4], g = ramp[idx * 4 + 1], b = ramp[idx * 4 + 2];
    stops.push(`rgb(${r},${g},${b})`);
  }
  return (
    <div
      className="w-full h-4 rounded"
      style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
    />
  );
}

export function CogSymbology({ layer, onChange }: Props) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Color Ramp</label>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {COLOR_RAMP_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ colorRamp: name })}
              className={`p-1.5 rounded border text-left ${
                layer.colorRamp === name ? 'border-accent ring-1 ring-accent' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <RampSwatch name={name} />
              <p className="text-xs text-slate-600 mt-1 capitalize">{name}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-600">Value Range</label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={layer.autoStretch}
              onChange={(e) => onChange({ autoStretch: e.target.checked })}
              className="accent-accent"
            />
            Auto-stretch
          </label>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-400">Min</label>
            <input
              type="number"
              value={layer.minValue}
              onChange={(e) => onChange({ minValue: parseFloat(e.target.value) || 0, autoStretch: false })}
              className="w-full mt-0.5 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400">Max</label>
            <input
              type="number"
              value={layer.maxValue}
              onChange={(e) => onChange({ maxValue: parseFloat(e.target.value) || 1, autoStretch: false })}
              className="w-full mt-0.5 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">
          Gamma: {layer.gamma.toFixed(1)}
        </label>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={layer.gamma}
          onChange={(e) => onChange({ gamma: parseFloat(e.target.value) })}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
          <span>0.1</span><span>1.0</span><span>3.0</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Band Index</label>
        <input
          type="number"
          min={0}
          value={layer.bandIndex}
          onChange={(e) => onChange({ bandIndex: parseInt(e.target.value) || 0 })}
          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">No-data Value</label>
        <input
          type="number"
          placeholder="e.g. -9999"
          value={layer.noDataValue ?? ''}
          onChange={(e) => onChange({ noDataValue: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
