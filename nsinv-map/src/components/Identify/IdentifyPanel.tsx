import { X, Search } from 'lucide-react';
import { IdentifyResult } from './IdentifyResult';

interface IdentifyFeature {
  layerName: string;
  attributes: Record<string, unknown>;
}

interface Props {
  results: IdentifyFeature[];
  loading: boolean;
  onClose: () => void;
}

export function IdentifyPanel({ results, loading, onClose }: Props) {
  return (
    <div className="absolute right-14 top-3 z-10 bg-white rounded-xl shadow-lg border border-slate-200 w-72 max-h-96 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Identify Results</span>
          {results.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {results.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-16 text-sm text-slate-400">
            Identifying…
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-sm text-slate-400">
            No features found
          </div>
        ) : (
          results.map((r, i) => <IdentifyResult key={i} feature={r} />)
        )}
      </div>
    </div>
  );
}
