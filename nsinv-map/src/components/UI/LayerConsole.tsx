import { useLogStore } from '../../store/logStore';
import { Trash2 } from 'lucide-react';
import type { LogLevel } from '../../store/logStore';

function fmt(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const LEVEL_STYLE: Record<LogLevel, string> = {
  info:    'text-blue-400',
  success: 'text-green-400',
  warn:    'text-amber-400',
  error:   'text-red-400',
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  info:    'INFO',
  success: 'OK  ',
  warn:    'WARN',
  error:   'ERR ',
};

export function LayerConsole() {
  const { entries, clear } = useLogStore();

  return (
    <div className="absolute right-14 top-3 z-20 w-80 max-h-72 flex flex-col bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl overflow-hidden text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 shrink-0">
        <span className="text-slate-300 font-semibold tracking-wide">Layer Console</span>
        <button
          onClick={clear}
          title="Clear log"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {entries.length === 0 ? (
          <p className="text-slate-500 py-2 text-center">No events yet</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-start gap-1.5 leading-5">
              <span className="text-slate-500 shrink-0 w-20">{fmt(e.ts)}</span>
              <span className={`shrink-0 w-9 ${LEVEL_STYLE[e.level]}`}>{LEVEL_LABEL[e.level]}</span>
              <span className="text-slate-200 break-all">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
