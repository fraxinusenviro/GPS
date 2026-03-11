import { useState, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';
import { fetchEsriServiceMetadata } from '../../lib/esriUtils';
import { EsriLayerPicker } from '../ESRI/EsriLayerPicker';
import { WmsLayerPicker } from '../WMS/WmsLayerPicker';
import { useToast } from '../UI/Toast';
import type { AnyLayer, EsriRestLayer, CogLayer, XyzLayer, WmsLayer, GeoJsonLayer } from '../../types/layers';
import { fromUrl } from 'geotiff';
import { XMLParser } from 'fast-xml-parser';

const TABS = ['ESRI REST', 'COG', 'XYZ Tiles', 'WMS', 'Vector'] as const;
type Tab = typeof TABS[number];

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function uid() { return `layer-${crypto.randomUUID().slice(0, 8)}`; }

interface Props {
  onClose: () => void;
}

export function AddLayerModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('ESRI REST');
  const addLayer = useLayerStore((s) => s.addLayer);
  const layers = useLayerStore((s) => s.layers);
  const { showToast } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Add Layer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-5 gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'ESRI REST' && (
            <EsriTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'COG' && (
            <CogTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'XYZ Tiles' && (
            <XyzTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'WMS' && (
            <WmsTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'Vector' && (
            <VectorTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ESRI Tab ────────────────────────────────────────────────────────────────

function EsriTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('https://nsgiwa2.novascotia.ca/arcgis/rest/services/PLAN/PLAN_NSPRD_WM84/MapServer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchEsriServiceMetadata>> | null>(null);
  const [selectedLayers, setSelectedLayers] = useState<number[]>([]);
  const [isFeatureServer, setIsFeatureServer] = useState(false);

  const handleFetch = async () => {
    setLoading(true); setError(''); setMeta(null);
    try {
      const data = await fetchEsriServiceMetadata(url);
      setMeta(data);
      const isFS = url.toLowerCase().includes('featureserver');
      setIsFeatureServer(isFS);
      setSelectedLayers(data.layers?.map((l) => l.id) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!meta) return;
    const layer: EsriRestLayer = {
      id: uid(),
      name: meta.mapName || url.split('/').at(-2) || 'ESRI Layer',
      type: isFeatureServer ? 'esri-featureserver' : 'esri-mapserver',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      serviceMetadata: meta,
      visibleSubLayers: selectedLayers,
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Service URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setMeta(null); }}
          placeholder="https://server/arcgis/rest/services/.../MapServer"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-400 mt-1">MapServer or FeatureServer URL</p>
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Fetching…' : 'Fetch Service Info'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {meta && (
        <>
          {!isFeatureServer && meta.layers?.length > 0 && (
            <EsriLayerPicker metadata={meta} selected={selectedLayers} onChange={setSelectedLayers} />
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors"
          >
            Add Layer
          </button>
        </>
      )}
    </div>
  );
}

// ── COG Tab ─────────────────────────────────────────────────────────────────

function CogTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('https://nswetlands-mapping.s3.us-east-2.amazonaws.com/COG/DTW_cog.tif');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<{ width: number; height: number; bands: number } | null>(null);
  const [colorRamp, setColorRamp] = useState('terrain');
  const [minVal, setMinVal] = useState(0);
  const [maxVal, setMaxVal] = useState(10);

  const handleFetch = async () => {
    setLoading(true); setError(''); setInfo(null);
    try {
      const tiff = await fromUrl(url, { allowFullFile: false });
      const image = await tiff.getImage();
      setInfo({ width: image.getWidth(), height: image.getHeight(), bands: image.getSamplesPerPixel() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const layer: CogLayer = {
      id: uid(),
      name: url.split('/').pop()?.replace('.tif', '') || 'COG Layer',
      type: 'cog',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      colorRamp,
      minValue: minVal,
      maxValue: maxVal,
      bandIndex: 0,
      gamma: 1,
      autoStretch: true,
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">COG URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setInfo(null); }}
          placeholder="https://example.com/raster.tif"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Reading…' : 'Read Metadata'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 space-y-1">
          <p><span className="font-medium">Size:</span> {info.width} × {info.height} px</p>
          <p><span className="font-medium">Bands:</span> {info.bands}</p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Color Ramp</label>
        <select
          value={colorRamp}
          onChange={(e) => setColorRamp(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        >
          {['viridis','inferno','magma','plasma','blues','greens','reds','oranges','terrain','rdylgn','rdbu','greys'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 block mb-1">Min Value</label>
          <input type="number" value={minVal} onChange={(e) => setMinVal(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 block mb-1">Max Value</label>
          <input type="number" value={maxVal} onChange={(e) => setMaxVal(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!url}
        className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        Add COG Layer
      </button>
    </div>
  );
}

// ── XYZ Tab ──────────────────────────────────────────────────────────────────

function XyzTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [urlTemplate, setUrlTemplate] = useState('https://nswetlands-mapping.s3.us-east-2.amazonaws.com/BIGNEY/{z}/{x}/{y}.png');
  const [name, setName] = useState('');
  const [tileSize, setTileSize] = useState<256 | 512>(256);
  const [minZoom, setMinZoom] = useState(0);
  const [maxZoom, setMaxZoom] = useState(22);
  const [attribution, setAttribution] = useState('');

  const handleAdd = () => {
    const layer: XyzLayer = {
      id: uid(),
      name: name || urlTemplate.split('/').at(-4) || 'XYZ Layer',
      type: 'xyz',
      visible: true,
      opacity: 1,
      order: 0,
      urlTemplate,
      tileSize,
      minZoom,
      maxZoom,
      attribution,
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">URL Template</label>
        <input
          type="url"
          value={urlTemplate}
          onChange={(e) => setUrlTemplate(e.target.value)}
          placeholder="https://example.com/{z}/{x}/{y}.png"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-400 mt-1">Include the full path prefix before {'{z}/{x}/{y}'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Layer Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Auto-detected from URL"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Tile Size</label>
          <select
            value={tileSize}
            onChange={(e) => setTileSize(parseInt(e.target.value) as 256 | 512)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
          >
            <option value={256}>256 px</option>
            <option value={512}>512 px</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Attribution</label>
          <input
            type="text"
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Min Zoom</label>
          <input type="number" min={0} max={22} value={minZoom} onChange={(e) => setMinZoom(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Max Zoom</label>
          <input type="number" min={0} max={22} value={maxZoom} onChange={(e) => setMaxZoom(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!urlTemplate}
        className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        Add XYZ Layer
      </button>
    </div>
  );
}

// ── WMS Tab ──────────────────────────────────────────────────────────────────

function WmsTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableLayers, setAvailableLayers] = useState<Array<{ name: string; title: string }>>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [version, setVersion] = useState<'1.1.1' | '1.3.0'>('1.1.1');

  const handleFetch = async () => {
    setLoading(true); setError(''); setAvailableLayers([]);
    try {
      const capUrl = `${url}?SERVICE=WMS&REQUEST=GetCapabilities`;
      const res = await fetch(capUrl);
      const xml = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const parsed = parser.parse(xml);
      const cap = parsed.WMT_MS_Capabilities || parsed.WMS_Capabilities;
      const cap130 = parsed['WMS_Capabilities'];
      if (cap130) setVersion('1.3.0');
      const layerNode = cap?.Capability?.Layer || cap130?.Capability?.Layer;
      const extractLayers = (node: Record<string, unknown>): Array<{ name: string; title: string }> => {
        const result: Array<{ name: string; title: string }> = [];
        if (node.Name && typeof node.Name === 'string') {
          result.push({ name: node.Name, title: String(node.Title || node.Name) });
        }
        if (node.Layer) {
          const children = Array.isArray(node.Layer) ? node.Layer : [node.Layer];
          for (const child of children) result.push(...extractLayers(child));
        }
        return result;
      };
      if (layerNode) setAvailableLayers(extractLayers(layerNode));
      else throw new Error('Could not parse WMS capabilities');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selectedLayers.length) return;
    const layer: WmsLayer = {
      id: uid(),
      name: selectedLayers.join(', '),
      type: 'wms',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      layers: selectedLayers.join(','),
      version,
      format: 'image/png',
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">WMS URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setAvailableLayers([]); }}
          placeholder="https://example.com/geoserver/wms"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Fetching…' : 'Get Capabilities'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {availableLayers.length > 0 && (
        <>
          <WmsLayerPicker layers={availableLayers} selected={selectedLayers} onChange={setSelectedLayers} />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedLayers.length}
            className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Add WMS Layer{selectedLayers.length > 1 ? 's' : ''}
          </button>
        </>
      )}
    </div>
  );
}

// ── Vector Tab ───────────────────────────────────────────────────────────────

function VectorTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [subTab, setSubTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlAdd = async () => {
    setLoading(true); setError('');
    try {
      let dataUrl = url;
      let data: GeoJsonLayer['data'] | undefined;
      if (url.toUpperCase().includes('SERVICE=WFS')) {
        const wfsUrl = url.includes('outputFormat') ? url : `${url}&outputFormat=application/json`;
        const res = await fetch(wfsUrl);
        data = await res.json();
      } else {
        const res = await fetch(url);
        data = await res.json();
        dataUrl = url;
      }
      const layer: GeoJsonLayer = {
        id: uid(),
        name: url.split('/').pop() || 'Vector Layer',
        type: 'geojson',
        source: 'url',
        url: dataUrl,
        data,
        visible: true,
        opacity: 1,
        order: 0,
        fillColor: PRESET_COLORS[colorIdx % PRESET_COLORS.length],
        strokeColor: '#1a2332',
        strokeWidth: 1,
        pointRadius: 6,
      };
      onAdd(layer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError('');

    if (file.size > 10 * 1024 * 1024) {
      // Show warning but continue
      alert('Warning: File exceeds 10MB. Performance may be affected.');
    }

    try {
      let data: GeoJsonLayer['data'];
      if (file.name.endsWith('.zip')) {
        const shpjs = (await import('shpjs')).default;
        const ab = await file.arrayBuffer();
        const result = await shpjs(ab);
        if (Array.isArray(result)) {
          // Multi-layer: pick first for now
          data = result[0] as GeoJsonLayer['data'];
        } else {
          data = result as GeoJsonLayer['data'];
        }
      } else {
        const text = await file.text();
        data = JSON.parse(text);
      }
      const layer: GeoJsonLayer = {
        id: uid(),
        name: file.name.replace(/\.(geojson|json|zip)$/, ''),
        type: 'geojson',
        source: file.name.endsWith('.zip') ? 'shapefile' : 'file',
        data,
        originalFileName: file.name,
        visible: true,
        opacity: 1,
        order: 0,
        fillColor: PRESET_COLORS[colorIdx % PRESET_COLORS.length],
        strokeColor: '#1a2332',
        strokeWidth: 1,
        pointRadius: 6,
      };
      onAdd(layer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['url', 'file'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              subTab === t ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t === 'url' ? 'URL / WFS' : 'File Upload'}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1.5">Fill Color</label>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorIdx(i)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${colorIdx === i ? 'border-slate-800 scale-110' : 'border-transparent'}`}
            />
          ))}
        </div>
      </div>

      {subTab === 'url' ? (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">GeoJSON / WFS URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/data.geojson"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={handleUrlAdd}
            disabled={loading || !url}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Loading…' : 'Add Vector Layer'}
          </button>
        </>
      ) : (
        <>
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-sm text-slate-500">Click to select a file</p>
            <p className="text-xs text-slate-400 mt-1">.geojson, .json, .zip (Shapefile)</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".geojson,.json,.zip"
            className="hidden"
            onChange={handleFileChange}
          />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Processing file…
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
