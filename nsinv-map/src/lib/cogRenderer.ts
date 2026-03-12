import { fromUrl } from 'geotiff';
import type { GeoTIFF, GeoTIFFImage } from 'geotiff';
import { COLOR_RAMPS, applyColorRamp } from './colorRamps';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { CogLayer } from '../types/layers';
import { mapLog } from '../store/logStore';

// Maximum canvas dimension for COG rendering.  Full-viewport resolution
// (especially on HiDPI screens) can be 4 M+ pixels and freezes the main thread
// while applyColorRamp processes them.  512 px gives a good quality/perf balance.
const MAX_RENDER_PX = 512;

// Reproject lon/lat bounds to pixel window in the GeoTIFF.
// resolutionImage: optional reference image to borrow pixel scale from (needed for
// overview images that lack a ModelPixelScaleTag of their own).
function bboxToWindow(
  image: GeoTIFFImage,
  west: number,
  south: number,
  east: number,
  north: number,
  resolutionImage?: GeoTIFFImage,
): [number, number, number, number] {
  const [ox, oy, , ,] = image.getOrigin();
  const [rx, ry] = image.getResolution(resolutionImage);
  const w = image.getWidth();
  const h = image.getHeight();
  const x1 = Math.max(0, Math.floor((west - ox) / rx));
  const y1 = Math.max(0, Math.floor((north - oy) / ry));
  const x2 = Math.min(w, Math.ceil((east - ox) / rx));
  const y2 = Math.min(h, Math.ceil((south - oy) / ry));
  return [x1, y1, x2, y2];
}

export class CogCustomLayer {
  id: string;
  type: 'custom' = 'custom';
  renderingMode: '2d' = '2d';

  private config: CogLayer;
  private map: MaplibreMap | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tiff: GeoTIFF | null = null;
  private rendering = false;
  private lastRenderKey = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CogLayer) {
    this.id = config.id;
    this.config = config;
  }

  updateConfig(config: CogLayer) {
    this.config = config;
    this.scheduleRender();
  }

  onAdd(map: MaplibreMap) {
    this.map = map;
    // Reuse the canvas that addOrUpdateCog already created and registered with
    // the canvas source.  Creating a second canvas would leave the source canvas
    // permanently blank.
    const existing = document.getElementById(`cog-canvas-${this.config.id}`) as HTMLCanvasElement | null;
    this.canvas = existing ?? document.createElement('canvas');
    // Initialise to a stable size so MapLibre's canvas source is never 0×0.
    this.canvas.width = MAX_RENDER_PX;
    this.canvas.height = MAX_RENDER_PX;
    this.ctx = this.canvas.getContext('2d');

    mapLog('info', `COG "${this.config.name}": opening ${this.config.url}`);
    fromUrl(this.config.url, { allowFullFile: false }).then((t) => {
      this.tiff = t;
      // Debounced listeners: panning fires many moveend events in quick succession.
      map.on('moveend', this.scheduleRender);
      map.on('zoomend', this.scheduleRender);
      mapLog('success', `COG "${this.config.name}": file opened, starting render`);
      this.render_2d();
    }).catch((err) => {
      mapLog('error', `COG "${this.config.name}": failed to open – ${(err as Error).message}`);
      console.error(err);
    });
  }

  onRemove() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.map?.off('moveend', this.scheduleRender);
    this.map?.off('zoomend', this.scheduleRender);
    this.canvas = null;
    this.ctx = null;
    this.map = null;
  }

  // Debounce render calls so rapid panning only triggers one render after the
  // map settles, avoiding multiple heavy async operations queuing up.
  private scheduleRender = () => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render_2d(), 200);
  };

  render_2d = async () => {
    if (!this.map || !this.tiff || !this.canvas || !this.ctx || this.rendering) return;

    const bounds = this.map.getBounds();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const south = bounds.getSouth();
    const north = bounds.getNorth();

    // Cap render size to MAX_RENDER_PX to avoid processing millions of pixels
    // on the main thread (causes visible freeze on HiDPI / large viewports).
    const mapCanvas = this.map.getCanvas();
    const scale = Math.min(MAX_RENDER_PX / mapCanvas.width, MAX_RENDER_PX / mapCanvas.height, 1);
    const width  = Math.max(1, Math.round(mapCanvas.width  * scale));
    const height = Math.max(1, Math.round(mapCanvas.height * scale));

    const renderKey = `${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)},${width},${height}`;
    if (renderKey === this.lastRenderKey) return;

    this.rendering = true;
    this.lastRenderKey = renderKey;

    try {
      const imageCount = await this.tiff.getImageCount();
      // Choose overview: use highest overview at low zoom
      const zoom = this.map.getZoom();
      const ovIdx = Math.max(0, Math.min(imageCount - 1, Math.floor((20 - zoom) / 3)));
      const image = await this.tiff.getImage(ovIdx);

      mapLog('info', `COG "${this.config.name}": zoom=${zoom.toFixed(1)}, overview ${ovIdx}/${imageCount - 1}, tile ${image.getWidth()}×${image.getHeight()}px`);

      // Overview images (ovIdx > 0) often lack ModelPixelScaleTag and throw
      // "The image does not have an affine transformation" when getResolution()
      // or getBoundingBox() is called without a reference image.  We load the
      // base image (index 0) so overviews can borrow its pixel scale.
      const baseImage = ovIdx > 0 ? await this.tiff.getImage(0) : image;

      // Use the base image for bounding box – overviews cover the same extent
      // but their getBoundingBox() may throw without affine tags.
      const bbox = baseImage.getBoundingBox();
      mapLog('info', `COG "${this.config.name}": file bbox=[${bbox.map((v: number) => v.toFixed(4)).join(', ')}]`);

      // Check overlap
      if (east < bbox[0] || west > bbox[2] || north < bbox[1] || south > bbox[3]) {
        mapLog('info', `COG "${this.config.name}": viewport outside file extent – skipping`);
        this.rendering = false;
        return;
      }

      const window = bboxToWindow(image, west, south, east, north, baseImage);
      mapLog('info', `COG "${this.config.name}": pixel window=[${window.join(', ')}], output=${width}×${height}px`);

      if (window[2] <= window[0] || window[3] <= window[1]) {
        mapLog('info', `COG "${this.config.name}": degenerate pixel window – skipping`);
        this.rendering = false;
        return;
      }

      const rasters = await image.readRasters({
        window,
        width,
        height,
        resampleMethod: 'bilinear',
        samples: [this.config.bandIndex],
      });

      const rawData = rasters[0] as Float32Array | Int16Array | Uint16Array | Uint8Array;

      // Count valid vs nodata pixels for diagnostics
      let validCount = 0, nodataCount = 0, nanCount = 0;
      let dataMn = Infinity, dataMx = -Infinity;
      for (let i = 0; i < rawData.length; i++) {
        const v = rawData[i];
        if (!isFinite(v)) { nanCount++; continue; }
        if (this.config.noDataValue !== undefined && v === this.config.noDataValue) { nodataCount++; continue; }
        validCount++;
        if (v < dataMn) dataMn = v;
        if (v > dataMx) dataMx = v;
      }
      mapLog('info', `COG "${this.config.name}": pixels total=${rawData.length}, valid=${validCount}, nodata=${nodataCount}, nan=${nanCount}, noDataValue=${this.config.noDataValue ?? 'unset'}`);
      if (validCount > 0) {
        mapLog('info', `COG "${this.config.name}": actual data range=[${dataMn.toFixed(4)}, ${dataMx.toFixed(4)}]`);
      } else {
        mapLog('warn', `COG "${this.config.name}": no valid pixels in this viewport – try panning/zooming to the data extent`);
      }

      let minVal = this.config.minValue;
      let maxVal = this.config.maxValue;
      if (this.config.autoStretch && validCount > 0) {
        minVal = dataMn;
        maxVal = dataMx;
      }
      mapLog('info', `COG "${this.config.name}": rendering with range=[${minVal.toFixed(4)}, ${maxVal.toFixed(4)}], autoStretch=${this.config.autoStretch}, colorRamp=${this.config.colorRamp}, gamma=${this.config.gamma}`);

      const ramp = COLOR_RAMPS[this.config.colorRamp] || COLOR_RAMPS.viridis;
      const imageData = applyColorRamp(
        rawData, ramp, minVal, maxVal, this.config.noDataValue, this.config.gamma, width, height,
      );

      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.putImageData(imageData, 0, 0);
      mapLog('success', `COG "${this.config.name}": canvas updated ${width}×${height}px`);

      // Update the geographic extent of the canvas source to match the viewport.
      const sourceId = `${this.id}-cog-source`;
      const src = this.map.getSource(sourceId) as maplibregl.CanvasSource | undefined;
      if (src) {
        src.setCoordinates([
          [west, north], [east, north], [east, south], [west, south],
        ]);
      }
    } catch (err) {
      mapLog('error', `COG "${this.config.name}": render error – ${(err as Error).message}`);
      console.warn('COG render error:', err);
    } finally {
      this.rendering = false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_gl: WebGLRenderingContext, _matrix: number[]) {
    // Rendering handled via canvas source, not WebGL directly
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace maplibregl {
  interface CanvasSource {
    setCoordinates(coords: [[number, number], [number, number], [number, number], [number, number]]): void;
  }
}
