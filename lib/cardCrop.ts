'use client';

// Business card output size (standard 9:5 ratio)
const CARD_WIDTH = 900;
const CARD_HEIGHT = 500;
// Downscaled width for edge detection (performance)
const PROCESS_WIDTH = 600;

type Point = [number, number];
type Quad = [Point, Point, Point, Point]; // TL, TR, BR, BL

export interface CropResult {
  croppedImage: string;
  detected: boolean;
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function loadImageToCanvas(imageData: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = imageData;
  });
}

function resizeCanvas(src: HTMLCanvasElement, targetWidth: number): HTMLCanvasElement {
  const scale = targetWidth / src.width;
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = Math.round(src.height * scale);
  canvas.getContext('2d')!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ─── Image processing ─────────────────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  return gray;
}

function gaussianBlur5x5(gray: Float32Array, width: number, height: number): Float32Array {
  const kernel = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1];
  const result = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, wSum = 0, ki = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const ny = y + ky, nx = x + kx;
          const w = kernel[ki++];
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx] * w;
            wSum += w;
          }
        }
      }
      result[y * width + x] = wSum > 0 ? sum / wSum : 0;
    }
  }
  return result;
}

function sobelEdges(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)]
        - 2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)]
        - gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)]
        + gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];
      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

// ─── Corner detection ─────────────────────────────────────────────────────────

/**
 * Find 4 corners of the card using extremal edge points:
 * TL = min(x+y),  TR = max(x−y),  BR = max(x+y),  BL = min(x−y)
 */
function findCardCorners(edges: Float32Array, width: number, height: number): Quad | null {
  let maxEdge = 0;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > maxEdge) maxEdge = edges[i];
  }
  if (maxEdge < 10) return null;

  const threshold = maxEdge * 0.15;
  const pad = Math.min(width, height) * 0.03;

  let tlScore = Infinity, trScore = -Infinity, brScore = -Infinity, blScore = Infinity;
  let tl: Point = [pad, pad];
  let tr: Point = [width - pad, pad];
  let br: Point = [width - pad, height - pad];
  let bl: Point = [pad, height - pad];

  for (let y = pad; y < height - pad; y++) {
    for (let x = pad; x < width - pad; x++) {
      if (edges[Math.round(y) * width + Math.round(x)] < threshold) continue;
      const s = x + y, d = x - y;
      if (s < tlScore) { tlScore = s; tl = [x, y]; }
      if (d > trScore) { trScore = d; tr = [x, y]; }
      if (s > brScore) { brScore = s; br = [x, y]; }
      if (d < blScore) { blScore = d; bl = [x, y]; }
    }
  }

  // Reject degenerate quads
  const area = Math.abs(
    (tl[0] * (tr[1] - bl[1]) + tr[0] * (br[1] - tl[1]) +
      br[0] * (bl[1] - tr[1]) + bl[0] * (tl[1] - br[1])) / 2
  );
  const imgArea = width * height;
  if (area < imgArea * 0.05 || area > imgArea * 0.97) return null;

  return [tl, tr, br, bl];
}

// ─── Perspective warp ─────────────────────────────────────────────────────────

function solveLinear8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-10) return null;

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col];
      for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j];
    }
  }
  return M.map(row => row[n]);
}

/**
 * Build inverse homography: maps dst rectangle pixels → src quad
 * For each dst pixel (u,v), find src pixel (x,y)
 */
function buildInverseHomography(srcCorners: Quad, dstW: number, dstH: number): number[] | null {
  const dstPts: Point[] = [[0, 0], [dstW, 0], [dstW, dstH], [0, dstH]];
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [u, v] = dstPts[i];
    const [x, y] = srcCorners[i];
    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]); b.push(y);
  }

  const h = solveLinear8x8(A, b);
  if (!h) return null;
  return [...h, 1]; // 9-element row-major 3×3
}

function warpToRect(srcCanvas: HTMLCanvasElement, corners: Quad, dstW: number, dstH: number): string {
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const ctx = dstCanvas.getContext('2d')!;

  const H = buildInverseHomography(corners, dstW, dstH);
  if (!H) {
    ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);
    return dstCanvas.toDataURL('image/jpeg', 0.9);
  }

  const srcCtx = srcCanvas.getContext('2d')!;
  const sd = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;

  const dstData = ctx.createImageData(dstW, dstH);
  const dd = dstData.data;

  for (let dv = 0; dv < dstH; dv++) {
    for (let du = 0; du < dstW; du++) {
      const w = H[6] * du + H[7] * dv + H[8];
      const sx = (H[0] * du + H[1] * dv + H[2]) / w;
      const sy = (H[3] * du + H[4] * dv + H[5]) / w;

      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = x0 + 1, y1 = y0 + 1;
      const di = (dv * dstW + du) * 4;

      if (x0 < 0 || y0 < 0 || x1 >= sw || y1 >= sh) {
        dd[di] = dd[di + 1] = dd[di + 2] = 255;
        dd[di + 3] = 255;
        continue;
      }

      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const v00 = sd[(y0 * sw + x0) * 4 + c];
        const v10 = sd[(y0 * sw + x1) * 4 + c];
        const v01 = sd[(y1 * sw + x0) * 4 + c];
        const v11 = sd[(y1 * sw + x1) * 4 + c];
        dd[di + c] = Math.round(
          v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) +
          v01 * (1 - fx) * fy + v11 * fx * fy
        );
      }
      dd[di + 3] = 255;
    }
  }

  ctx.putImageData(dstData, 0, 0);
  return dstCanvas.toDataURL('image/jpeg', 0.9);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function detectAndCropCard(imageData: string): Promise<CropResult> {
  try {
    const srcCanvas = await loadImageToCanvas(imageData);
    const scale = PROCESS_WIDTH / srcCanvas.width;
    const processCanvas = resizeCanvas(srcCanvas, PROCESS_WIDTH);

    const processCtx = processCanvas.getContext('2d')!;
    const imgData = processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height);

    const gray = toGrayscale(imgData.data, processCanvas.width, processCanvas.height);
    const blurred = gaussianBlur5x5(gray, processCanvas.width, processCanvas.height);
    const edges = sobelEdges(blurred, processCanvas.width, processCanvas.height);

    const corners = findCardCorners(edges, processCanvas.width, processCanvas.height);
    if (!corners) {
      return { croppedImage: imageData, detected: false };
    }

    // Scale corners back to original image coordinates
    const scaledCorners: Quad = corners.map(([x, y]) => [x / scale, y / scale]) as Quad;

    const cropped = warpToRect(srcCanvas, scaledCorners, CARD_WIDTH, CARD_HEIGHT);
    return { croppedImage: cropped, detected: true };
  } catch (e) {
    console.error('Card crop error:', e);
    return { croppedImage: imageData, detected: false };
  }
}
