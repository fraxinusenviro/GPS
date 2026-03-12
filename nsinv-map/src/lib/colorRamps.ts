// 256-step RGBA color ramp definitions
export type ColorRamp = Uint8ClampedArray; // length = 256 * 4

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function buildRamp(stops: Array<[number, number, number, number]>): ColorRamp {
  const data = new Uint8ClampedArray(256 * 4);
  const n = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(Math.floor(t * n), n - 1);
    const local = t * n - seg;
    const [r1, g1, b1, a1] = stops[seg];
    const [r2, g2, b2, a2] = stops[seg + 1];
    data[i * 4 + 0] = lerp(r1, r2, local);
    data[i * 4 + 1] = lerp(g1, g2, local);
    data[i * 4 + 2] = lerp(b1, b2, local);
    data[i * 4 + 3] = lerp(a1, a2, local);
  }
  return data;
}

export const COLOR_RAMPS: Record<string, ColorRamp> = {
  viridis: buildRamp([
    [68, 1, 84, 255], [72, 40, 120, 255], [62, 83, 160, 255], [49, 104, 142, 255],
    [38, 130, 142, 255], [31, 158, 137, 255], [53, 183, 121, 255], [110, 206, 88, 255],
    [181, 222, 43, 255], [253, 231, 37, 255],
  ]),
  inferno: buildRamp([
    [0, 0, 4, 255], [40, 11, 84, 255], [101, 21, 110, 255], [159, 42, 99, 255],
    [212, 72, 66, 255], [245, 125, 21, 255], [252, 185, 36, 255], [252, 230, 121, 255],
    [252, 255, 164, 255],
  ]),
  magma: buildRamp([
    [0, 0, 4, 255], [28, 16, 68, 255], [79, 18, 123, 255], [129, 37, 129, 255],
    [181, 54, 122, 255], [229, 80, 100, 255], [251, 135, 97, 255], [254, 195, 150, 255],
    [252, 253, 191, 255],
  ]),
  plasma: buildRamp([
    [13, 8, 135, 255], [75, 3, 161, 255], [125, 3, 168, 255], [168, 34, 150, 255],
    [203, 70, 121, 255], [229, 107, 93, 255], [248, 148, 65, 255], [253, 195, 40, 255],
    [240, 249, 33, 255],
  ]),
  blues: buildRamp([
    [247, 251, 255, 255], [198, 219, 239, 255], [158, 202, 225, 255], [107, 174, 214, 255],
    [66, 146, 198, 255], [33, 113, 181, 255], [8, 81, 156, 255], [8, 48, 107, 255],
  ]),
  greens: buildRamp([
    [247, 252, 245, 255], [199, 233, 192, 255], [161, 217, 155, 255], [116, 196, 118, 255],
    [65, 171, 93, 255], [35, 139, 69, 255], [0, 109, 44, 255], [0, 68, 27, 255],
  ]),
  reds: buildRamp([
    [255, 245, 240, 255], [254, 203, 161, 255], [252, 146, 114, 255], [251, 106, 74, 255],
    [239, 59, 44, 255], [203, 24, 29, 255], [153, 0, 13, 255], [103, 0, 13, 255],
  ]),
  oranges: buildRamp([
    [255, 245, 235, 255], [254, 216, 166, 255], [253, 174, 107, 255], [253, 141, 60, 255],
    [241, 105, 19, 255], [217, 72, 1, 255], [166, 54, 3, 255], [127, 39, 4, 255],
  ]),
  terrain: buildRamp([
    [51, 102, 153, 255], [92, 153, 102, 255], [102, 179, 77, 255], [166, 204, 128, 255],
    [230, 230, 128, 255], [179, 153, 77, 255], [128, 102, 51, 255], [102, 77, 51, 255],
    [255, 255, 255, 255],
  ]),
  rdylgn: buildRamp([
    [165, 0, 38, 255], [215, 48, 39, 255], [244, 109, 67, 255], [253, 174, 97, 255],
    [254, 224, 139, 255], [255, 255, 191, 255], [217, 239, 139, 255], [166, 217, 106, 255],
    [102, 189, 99, 255], [26, 152, 80, 255], [0, 104, 55, 255],
  ]),
  rdbu: buildRamp([
    [103, 0, 31, 255], [178, 24, 43, 255], [214, 96, 77, 255], [244, 165, 130, 255],
    [253, 219, 199, 255], [247, 247, 247, 255], [209, 229, 240, 255], [146, 197, 222, 255],
    [67, 147, 195, 255], [33, 102, 172, 255], [5, 48, 97, 255],
  ]),
  greys: buildRamp([
    [255, 255, 255, 255], [240, 240, 240, 255], [189, 189, 189, 255], [115, 115, 115, 255],
    [37, 37, 37, 255], [0, 0, 0, 255],
  ]),
};

export const COLOR_RAMP_NAMES = Object.keys(COLOR_RAMPS);

export function applyColorRamp(
  values: Float32Array | Int16Array | Uint16Array | Uint8Array,
  ramp: ColorRamp,
  minVal: number,
  maxVal: number,
  noDataValue: number | undefined,
  gamma: number,
  width: number,
  height: number,
): ImageData {
  const imageData = new ImageData(width, height);
  const range = maxVal - minVal || 1;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isFinite(v) || (noDataValue !== undefined && v === noDataValue)) {
      imageData.data[i * 4 + 3] = 0;
      continue;
    }
    let t = Math.max(0, Math.min(1, (v - minVal) / range));
    if (gamma !== 1) t = Math.pow(t, 1 / gamma);
    const idx = Math.round(t * 255);
    imageData.data[i * 4 + 0] = ramp[idx * 4 + 0];
    imageData.data[i * 4 + 1] = ramp[idx * 4 + 1];
    imageData.data[i * 4 + 2] = ramp[idx * 4 + 2];
    imageData.data[i * 4 + 3] = ramp[idx * 4 + 3];
  }
  return imageData;
}
