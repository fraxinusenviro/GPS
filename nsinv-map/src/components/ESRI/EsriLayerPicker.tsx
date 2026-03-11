import type { EsriServiceMetadata } from '../../types/layers';

interface Props {
  metadata: EsriServiceMetadata;
  selected: number[];
  onChange: (selected: number[]) => void;
}

export function EsriLayerPicker({ metadata, selected, onChange }: Props) {
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
        <p className="text-xs font-medium text-slate-600">{metadata.mapName || 'Sub-layers'}</p>
        {metadata.serviceDescription && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{metadata.serviceDescription}</p>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
        {metadata.layers?.map((l) => (
          <label key={l.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(l.id)}
              onChange={() => toggle(l.id)}
              className="accent-accent"
            />
            <span className="text-sm text-slate-700">{l.name}</span>
            <span className="ml-auto text-xs text-slate-400">ID {l.id}</span>
          </label>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-slate-100 flex gap-2">
        <button
          type="button"
          onClick={() => onChange(metadata.layers?.map((l) => l.id) ?? [])}
          className="text-xs text-accent hover:underline"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-slate-400 hover:underline"
        >
          None
        </button>
      </div>
    </div>
  );
}
