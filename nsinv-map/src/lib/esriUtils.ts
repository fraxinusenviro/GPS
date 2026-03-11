import type { EsriServiceMetadata } from '../types/layers';

export function buildEsriRasterSource(serviceUrl: string, visibleLayers: number[]) {
  const layerParam = visibleLayers.length > 0 ? `show:${visibleLayers.join(',')}` : 'all';
  return {
    type: 'raster' as const,
    tiles: [
      `${serviceUrl}/export?bbox={bbox-epsg-3857}&bboxSR=3857&layers=${layerParam}&size=256,256&imageSR=3857&format=png32&transparent=true&f=image`,
    ],
    tileSize: 256,
  };
}

export async function fetchEsriServiceMetadata(serviceUrl: string): Promise<EsriServiceMetadata> {
  const url = `${serviceUrl}?f=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ESRI metadata: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'ESRI service error');
  return data as EsriServiceMetadata;
}

export async function fetchEsriFeatures(featureServerUrl: string) {
  const url = `${featureServerUrl}/query?where=1=1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch features: ${res.statusText}`);
  return res.json();
}

export async function fetchEsriLegend(serviceUrl: string) {
  const url = `${serviceUrl}/legend?f=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchEsriIdentify(
  serviceUrl: string,
  lng: number,
  lat: number,
  mapExtent: { xmin: number; ymin: number; xmax: number; ymax: number },
  imageDisplay: { width: number; height: number },
  visibleLayers: number[],
) {
  const params = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    layers: visibleLayers.length ? `visible:${visibleLayers.join(',')}` : 'all',
    tolerance: '5',
    mapExtent: `${mapExtent.xmin},${mapExtent.ymin},${mapExtent.xmax},${mapExtent.ymax}`,
    imageDisplay: `${imageDisplay.width},${imageDisplay.height},96`,
    returnGeometry: 'true',
  });
  const url = `${serviceUrl}/identify?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Identify failed: ${res.statusText}`);
  return res.json();
}
