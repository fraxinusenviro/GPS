import { Download, Upload, Map } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';
import { useToast } from './Toast';
import { useRef } from 'react';

export function Toolbar() {
  const { exportState, importState } = useLayerStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const state = exportState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nsinv-map-state.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Map state exported', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const state = JSON.parse(ev.target?.result as string);
        importState(state);
        showToast('Map state imported successfully', 'success');
      } catch {
        showToast('Failed to parse map state file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-sidebar border-b border-slate-700">
      <div className="flex items-center gap-2 flex-1">
        <Map size={20} className="text-accent" />
        <span className="text-white font-semibold text-sm tracking-wide">NSINV Map</span>
      </div>
      <button
        onClick={handleExport}
        title="Export map state"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Import map state"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
      >
        <Upload size={14} />
        <span className="hidden sm:inline">Import</span>
      </button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
