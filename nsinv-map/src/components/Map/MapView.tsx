import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLayerStore } from '../../store/layerStore';
import { MapContext } from '../../hooks/useMap';
import { MapControls } from './MapControls';
import { BASEMAPS } from '../../types/layers';
import type { AnyLayer, EsriRestLayer, XyzLayer, WmsLayer, GeoJsonLayer, CogLayer } from '../../types/layers';
import { buildEsriRasterSource } from '../../lib/esriUtils';
import { CogCustomLayer } from '../../lib/cogRenderer';
import { useToast } from '../UI/Toast';
import type { ReactNode } from 'react';

const DEBOUNCE_MS = 300;

function buildBlankStyle(): maplibregl.StyleSpecification {
  return { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } }] };
}

function buildBasemapStyle(basemapId: string): maplibregl.StyleSpecification {
  const bm = BASEMAPS[basemapId as keyof typeof BASEMAPS];
  if (!bm || !bm.url) return buildBlankStyle();

  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [bm.url],
        tileSize: 256,
        attribution: bm.attribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

interface MapViewProps {
  children?: ReactNode;
  onMapClick?: (e: maplibregl.MapMouseEvent) => void;
}

export function MapView({ children, onMapClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { layers, activeBasemap, mapView, setMapView } = useLayerStore();
  const { showToast } = useToast();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedLayerIds = useRef<Set<string>>(new Set());
  // Keeps live CogCustomLayer instances so we can update and destroy them.
  const cogRenderers = useRef<Map<string, CogCustomLayer>>(new Map());
  // Stable ref so the basemap effect can always call the latest syncLayers.
  const syncLayersRef = useRef<() => void>(() => undefined);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: buildBasemapStyle(activeBasemap),
      center: mapView.center,
      zoom: mapView.zoom,
      bearing: mapView.bearing,
      pitch: mapView.pitch,
    });

    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), 'bottom-right');

    mapRef.current = map;

    const saveView = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const c = map.getCenter();
        setMapView({ center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      }, DEBOUNCE_MS);
    };

    map.on('moveend', saveView);
    map.on('zoomend', saveView);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [onMapClick]);

  // Basemap changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const style = buildBasemapStyle(activeBasemap);
    map.setStyle(style);
    syncedLayerIds.current.clear();
    // Tear down COG renderers (their map event listeners become invalid after setStyle).
    for (const renderer of cogRenderers.current.values()) renderer.onRemove();
    cogRenderers.current.clear();
    document.querySelectorAll('[id^="cog-canvas-"]').forEach((el) => el.remove());
    // Re-add all overlay layers once the new style has loaded.
    map.once('styledata', () => syncLayersRef.current());
  }, [activeBasemap]);

  // Sync layers to map
  const syncLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const currentIds = new Set(layers.map((l) => l.id));

    // Remove deleted layers
    for (const id of syncedLayerIds.current) {
      if (!currentIds.has(id)) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
        if (map.getLayer(`${id}-fill`)) map.removeLayer(`${id}-fill`);
        if (map.getLayer(`${id}-circle`)) map.removeLayer(`${id}-circle`);
        if (map.getLayer(`${id}-label`)) map.removeLayer(`${id}-label`);
        if (map.getLayer(`${id}-cog-layer`)) map.removeLayer(`${id}-cog-layer`);
        if (map.getSource(id)) map.removeSource(id);
        if (map.getSource(`${id}-cog-source`)) map.removeSource(`${id}-cog-source`);
        // Tear down COG renderer and remove its canvas from the DOM.
        const cogRenderer = cogRenderers.current.get(id);
        if (cogRenderer) {
          cogRenderer.onRemove();
          cogRenderers.current.delete(id);
        }
        document.getElementById(`cog-canvas-${id}`)?.remove();
        syncedLayerIds.current.delete(id);
      }
    }

    // Add/update layers
    const sorted = [...layers].sort((a, b) => a.order - b.order);
    for (const layer of sorted) {
      try {
        if (layer.type === 'xyz') addOrUpdateXyz(map, layer as XyzLayer);
        else if (layer.type === 'esri-mapserver') addOrUpdateEsriMapServer(map, layer as EsriRestLayer);
        else if (layer.type === 'esri-featureserver') addOrUpdateEsriFeatureServer(map, layer as EsriRestLayer);
        else if (layer.type === 'wms') addOrUpdateWms(map, layer as WmsLayer);
        else if (layer.type === 'geojson') addOrUpdateGeoJson(map, layer as GeoJsonLayer);
        else if (layer.type === 'cog') addOrUpdateCog(map, layer as CogLayer, cogRenderers.current);
        syncedLayerIds.current.add(layer.id);
      } catch (e) {
        console.error(`Layer sync error [${layer.id}]:`, e);
        showToast(`Error loading layer "${layer.name}"`, 'error');
      }
    }
  }, [layers, showToast]);

  // Keep the ref up-to-date so the basemap effect can always call the latest version.
  useEffect(() => {
    syncLayersRef.current = syncLayers;
  }, [syncLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.once('styledata', syncLayers);
    }
  }, [layers, syncLayers]);

  return (
    <MapContext.Provider value={mapRef}>
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />
        <MapControls />
        {children}
      </div>
    </MapContext.Provider>
  );
}

// ── Layer sync helpers ──────────────────────────────────────────────────────

function addOrUpdateXyz(map: maplibregl.Map, layer: XyzLayer) {
  const src = map.getSource(layer.id) as maplibregl.RasterTileSource | undefined;
  if (!src) {
    map.addSource(layer.id, {
      type: 'raster',
      tiles: [layer.urlTemplate],
      tileSize: layer.tileSize,
      minzoom: layer.minZoom,
      maxzoom: layer.maxZoom,
      attribution: layer.attribution,
    });
    map.addLayer({ id: layer.id, type: 'raster', source: layer.id });
  }
  map.setLayerZoomRange(layer.id, layer.minZoom, layer.maxZoom);
  map.setPaintProperty(layer.id, 'raster-opacity', layer.opacity);
  map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');
}

function addOrUpdateEsriMapServer(map: maplibregl.Map, layer: EsriRestLayer) {
  if (!map.getSource(layer.id)) {
    const source = buildEsriRasterSource(layer.url, layer.visibleSubLayers);
    map.addSource(layer.id, source);
    map.addLayer({ id: layer.id, type: 'raster', source: layer.id });
  }
  map.setPaintProperty(layer.id, 'raster-opacity', layer.opacity);
  map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');
}

function addOrUpdateEsriFeatureServer(map: maplibregl.Map, layer: EsriRestLayer) {
  if (!map.getSource(layer.id)) {
    map.addSource(layer.id, {
      type: 'geojson',
      data: `${layer.url}/query?where=1=1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`,
    });
    map.addLayer({ id: layer.id, type: 'fill', source: layer.id, paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.5 } });
    map.addLayer({ id: `${layer.id}-line`, type: 'line', source: layer.id, paint: { 'line-color': '#1d4ed8', 'line-width': 1 } });
  }
  map.setPaintProperty(layer.id, 'fill-opacity', layer.opacity * 0.5);
  map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');
  map.setLayoutProperty(`${layer.id}-line`, 'visibility', layer.visible ? 'visible' : 'none');
}

function addOrUpdateWms(map: maplibregl.Map, layer: WmsLayer) {
  const crsParam = layer.version === '1.3.0' ? 'CRS=EPSG:3857' : 'SRS=EPSG:3857';
  const bboxParam = layer.version === '1.3.0' ? '{bbox-epsg-3857}' : '{bbox-epsg-3857}';
  const wmsUrl =
    `${layer.url}?SERVICE=WMS&VERSION=${layer.version}&REQUEST=GetMap` +
    `&LAYERS=${encodeURIComponent(layer.layers)}&BBOX=${bboxParam}` +
    `&WIDTH=256&HEIGHT=256&${crsParam}&FORMAT=${encodeURIComponent(layer.format)}&TRANSPARENT=TRUE`;

  if (!map.getSource(layer.id)) {
    map.addSource(layer.id, { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
    map.addLayer({ id: layer.id, type: 'raster', source: layer.id });
  }
  map.setPaintProperty(layer.id, 'raster-opacity', layer.opacity);
  map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');
}

function addOrUpdateGeoJson(map: maplibregl.Map, layer: GeoJsonLayer) {
  if (!map.getSource(layer.id)) {
    const data: maplibregl.GeoJSONSourceSpecification['data'] = layer.data ?? (layer.url as string);
    map.addSource(layer.id, { type: 'geojson', data });

    map.addLayer({
      id: `${layer.id}-fill`,
      type: 'fill',
      source: layer.id,
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': layer.fillColor, 'fill-opacity': layer.opacity * 0.6 },
    });
    map.addLayer({
      id: `${layer.id}-line`,
      type: 'line',
      source: layer.id,
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      paint: { 'line-color': layer.strokeColor, 'line-width': layer.strokeWidth },
    });
    map.addLayer({
      id: `${layer.id}-circle`,
      type: 'circle',
      source: layer.id,
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-radius': layer.pointRadius, 'circle-color': layer.fillColor, 'circle-stroke-color': layer.strokeColor, 'circle-stroke-width': layer.strokeWidth },
    });

    if (layer.labelField) {
      map.addLayer({
        id: `${layer.id}-label`,
        type: 'symbol',
        source: layer.id,
        layout: { 'text-field': `{${layer.labelField}}`, 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 0.5] },
        paint: { 'text-color': '#1a2332', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
      });
    }
  } else {
    // Update style
    if (map.getLayer(`${layer.id}-fill`)) {
      map.setPaintProperty(`${layer.id}-fill`, 'fill-color', layer.fillColor);
      map.setPaintProperty(`${layer.id}-fill`, 'fill-opacity', layer.opacity * 0.6);
    }
    if (map.getLayer(`${layer.id}-line`)) {
      map.setPaintProperty(`${layer.id}-line`, 'line-color', layer.strokeColor);
      map.setPaintProperty(`${layer.id}-line`, 'line-width', layer.strokeWidth);
    }
    if (map.getLayer(`${layer.id}-circle`)) {
      map.setPaintProperty(`${layer.id}-circle`, 'circle-radius', layer.pointRadius);
      map.setPaintProperty(`${layer.id}-circle`, 'circle-color', layer.fillColor);
    }
  }

  const vis = layer.visible ? 'visible' : 'none';
  for (const suffix of ['-fill', '-line', '-circle', '-label']) {
    if (map.getLayer(`${layer.id}${suffix}`)) {
      map.setLayoutProperty(`${layer.id}${suffix}`, 'visibility', vis);
    }
  }
}

function addOrUpdateCog(map: maplibregl.Map, layer: CogLayer, cogRenderers: Map<string, CogCustomLayer>) {
  const sourceId = `${layer.id}-cog-source`;
  const layerId = `${layer.id}-cog-layer`;

  if (!map.getSource(sourceId)) {
    // Create the canvas that MapLibre's canvas source will read from.
    // CogCustomLayer.onAdd will find this element by ID and draw into it.
    const canvas = document.createElement('canvas');
    canvas.id = `cog-canvas-${layer.id}`;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);

    map.addSource(sourceId, {
      type: 'canvas',
      canvas: `cog-canvas-${layer.id}`,
      coordinates: [[-180, 90], [180, 90], [180, -90], [-180, -90]],
      animate: true,
    } as maplibregl.CanvasSourceSpecification);

    map.addLayer({ id: layerId, type: 'raster', source: sourceId });

    // Instantiate and connect the renderer now that the canvas exists in the DOM.
    const renderer = new CogCustomLayer(layer);
    renderer.onAdd(map);
    cogRenderers.set(layer.id, renderer);
  } else {
    // Propagate colour-ramp / value-range changes to the running renderer.
    const renderer = cogRenderers.get(layer.id);
    if (renderer) renderer.updateConfig(layer);
  }

  map.setPaintProperty(layerId, 'raster-opacity', layer.opacity);
  map.setLayoutProperty(layerId, 'visibility', layer.visible ? 'visible' : 'none');
}
