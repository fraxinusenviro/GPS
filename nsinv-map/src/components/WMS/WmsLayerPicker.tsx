interface WmsLayerInfo {
  name: string;
  title: string;
}

interface Props {
  layers: WmsLayerInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function WmsLayerPicker({ layers, selected, onChange }: Props) {
  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  };

  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
        <p className="text-xs font-medium text-slate-600">Available Layers ({layers.length})</p>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
        {layers.map((l) => (
          <label key={l.name} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(l.name)}
              onChange={() => toggle(l.name)}
              className="accent-accent"
            />
            <div>
              <p className="text-sm text-slate-700">{l.title || l.name}</p>
              {l.title && l.name !== l.title && <p className="text-xs text-slate-400">{l.name}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
