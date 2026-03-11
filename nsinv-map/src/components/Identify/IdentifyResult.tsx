interface IdentifyFeature {
  layerName: string;
  attributes: Record<string, unknown>;
}

interface Props {
  feature: IdentifyFeature;
}

export function IdentifyResult({ feature }: Props) {
  const attrs = Object.entries(feature.attributes).filter(([k]) => k !== 'OBJECTID' && k !== 'Shape');

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-3 py-2">
        <p className="text-xs font-semibold text-blue-800">{feature.layerName}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {attrs.map(([key, val]) => (
          <div key={key} className="flex px-3 py-1.5 text-xs">
            <span className="text-slate-500 w-32 shrink-0 truncate" title={key}>{key}</span>
            <span className="text-slate-800 flex-1 break-words">{String(val ?? '')}</span>
          </div>
        ))}
        {attrs.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">No attributes</p>
        )}
      </div>
    </div>
  );
}
