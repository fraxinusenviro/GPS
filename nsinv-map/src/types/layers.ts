import type { FeatureCollection } from 'geojson';

export type LayerType = 'esri-mapserver' | 'esri-featureserver' | 'cog' | 'xyz' | 'wms' | 'geojson';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  order: number;
  /** Raster display adjustments — applied to ESRI MapServer, WMS and XYZ layers. */
  rasterEnhancement?: RasterEnhancement;
}

export interface RasterEnhancement {
  brightnessMin: number;  // 0–1   (MapLibre default 0)
  brightnessMax: number;  // 0–1   (MapLibre default 1)
  contrast:      number;  // -1–1  (MapLibre default 0)
  saturation:    number;  // -1–1  (MapLibre default 0)
  hueRotate:     number;  // 0–360 (MapLibre default 0)
  gamma:         number;  // 0.1–3 (approximated via brightness curve; 1 = no change)
  resampling:    'linear' | 'nearest';
}

export interface EsriServiceMetadata {
  serviceDescription: string;
  mapName: string;
  layers: Array<{ id: number; name: string; defaultVisibility: boolean }>;
  fullExtent: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference: { wkid: number };
  };
  supportedImageFormatTypes: string;
}

export interface EsriRestLayer extends BaseLayer {
  type: 'esri-mapserver' | 'esri-featureserver';
  url: string;
  serviceMetadata?: EsriServiceMetadata;
  visibleSubLayers: number[];
  /** FeatureServer only – client-side fill/stroke colours */
  fillColor?:   string;
  strokeColor?: string;
}

export interface CogLayer extends BaseLayer {
  type: 'cog';
  url: string;
  colorRamp: string;
  minValue: number;
  maxValue: number;
  noDataValue?: number;
  bandIndex: number;
  gamma: number;
  autoStretch: boolean;
}

export interface XyzLayer extends BaseLayer {
  type: 'xyz';
  urlTemplate: string;
  tileSize: 256 | 512;
  minZoom: number;
  maxZoom: number;
  attribution: string;
}

export interface WmsLayer extends BaseLayer {
  type: 'wms';
  url: string;
  layers: string;
  version: '1.1.1' | '1.3.0';
  format: 'image/png' | 'image/jpeg';
}

export interface GeoJsonLayer extends BaseLayer {
  type: 'geojson';
  source: 'url' | 'file' | 'shapefile';
  url?: string;
  data?: FeatureCollection;
  originalFileName?: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  pointRadius: number;
  labelField?: string;
}

export type AnyLayer = EsriRestLayer | CogLayer | XyzLayer | WmsLayer | GeoJsonLayer;

export interface PersistedMapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  activeBasemap: string;
  layers: AnyLayer[];
}

export const BASEMAPS = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  esriSatellite: {
    id: 'esriSatellite',
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
  cartoDB: {
    id: 'cartoDB',
    name: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://carto.com">CARTO</a>',
  },
  blank: {
    id: 'blank',
    name: 'Blank/White',
    url: '',
    attribution: '',
  },
  hrdemHillshade: {
    id: 'hrdemHillshade',
    name: 'NRCan Hillshade (DTM)',
    url: 'https://datacube.services.geo.ca/ows/elevation?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=dtm-hillshade&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&FORMAT=image/png&TRANSPARENT=TRUE',
    attribution: '© Natural Resources Canada',
  },
} as const;
