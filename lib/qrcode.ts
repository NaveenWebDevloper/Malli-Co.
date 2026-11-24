/**
 * Pure TypeScript QR Code generator (zero dependencies, ISO/IEC 18004 compliant).
 * Supports Byte mode (UTF-8), Error Correction levels L, M, Q, H, versions 1-10.
 * Directly generates clean SVG markup.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

// Standard QR specification tables
const ECC_CODEWORDS_PER_BLOCK: Record<QrErrorCorrectionLevel, number[]> = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 26, 16, 26],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};

const NUM_ERROR_CORRECTION_BLOCKS: Record<QrErrorCorrectionLevel, number[]> = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};

const CAPACITY_BYTES: Record<QrErrorCorrectionLevel, number[]> = {
  L: [0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274],
  M: [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216],
  Q: [0, 13, 22, 34, 48, 62, 76, 88, 110, 132, 154],
  H: [0, 9, 16, 26, 36, 46, 60, 66, 86, 100, 122],
};

const ALIGNMENT_PATTERN_POSITIONS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// Galois Field GF(256) tables for QR polynomial math
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function reedSolomonCompute(data: Uint8Array, numEcc: number): Uint8Array {
  // Generate generator polynomial
  const gen = new Uint8Array(numEcc + 1);
  gen[0] = 1;
  for (let i = 0; i < numEcc; i++) {
    for (let j = i + 1; j > 0; j--) {
      gen[j] = gen[j] ^ gfMultiply(gen[j - 1], GF_EXP[i]);
    }
  }

  const result = new Uint8Array(numEcc);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    for (let j = 0; j < numEcc - 1; j++) {
      result[j] = result[j + 1] ^ gfMultiply(factor, gen[j + 1]);
    }
    result[numEcc - 1] = gfMultiply(factor, gen[numEcc]);
  }
  return result;
}

export class QrCode {
  readonly version: number;
  readonly errorCorrection: QrErrorCorrectionLevel;
  readonly size: number;
  readonly modules: boolean[][];

  constructor(version: number, errorCorrection: QrErrorCorrectionLevel, modules: boolean[][]) {
    this.version = version;
    this.errorCorrection = errorCorrection;
    this.size = version * 4 + 17;
    this.modules = modules;
  }

  static encodeText(text: string, ecc: QrErrorCorrectionLevel = "M"): QrCode {
    const dataBytes = new TextEncoder().encode(text);

    // Pick minimum version
    let version = 1;
    while (version <= 10) {
      if (dataBytes.length <= CAPACITY_BYTES[ecc][version] - 2) break; // minus mode and length overhead
      version++;
    }
    if (version > 10) {
      throw new Error("Text too long for QR Code (max supported 10 in lightweight encoder)");
    }

    const totalCapacity = CAPACITY_BYTES[ecc][version];
    const bits: number[] = [];

    function pushBits(val: number, len: number) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >>> i) & 1);
      }
    }

    // Byte mode indicator: 0100
    pushBits(0b0100, 4);
    // Character count indicator (8 bits for version 1-9, 16 for version 10)
    pushBits(dataBytes.length, version <= 9 ? 8 : 16);
    // Payload bytes
    for (const b of dataBytes) {
      pushBits(b, 8);
    }
    // Terminator bits
    const totalDataBits = totalCapacity * 8;
    const termLen = Math.min(4, totalDataBits - bits.length);
    pushBits(0, termLen);
    // Pad to 8 bits
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }
    // Pad bytes 0xEC and 0x11
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < totalDataBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    // Convert bits to data bytes
    const fullDataBytes = new Uint8Array(totalCapacity);
    for (let i = 0; i < totalCapacity; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | bits[i * 8 + j];
      }
      fullDataBytes[i] = b;
    }

    // Interleave blocks
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][version];
    const eccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
    const shortBlockLen = Math.floor(totalCapacity / numBlocks);
    const numShortBlocks = numBlocks - (totalCapacity % numBlocks);

    const dataBlocks: Uint8Array[] = [];
    const eccBlocks: Uint8Array[] = [];
    let offset = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = i < numShortBlocks ? shortBlockLen : shortBlockLen + 1;
      const dBlock = fullDataBytes.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(dBlock);
      eccBlocks.push(reedSolomonCompute(dBlock, eccLen));
    }

    // Interleave all data codewords, then all ecc codewords
    const finalCodewords: number[] = [];
    const maxDataLen = shortBlockLen + 1;
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        if (i < dataBlocks[b].length) {
          finalCodewords.push(dataBlocks[b][i]);
        }
      }
    }
    for (let i = 0; i < eccLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalCodewords.push(eccBlocks[b][i]);
      }
    }

    // Setup matrix
    const size = version * 4 + 17;
    const modules: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    function setFunctionModule(r: number, c: number, val: boolean) {
      modules[r][c] = val;
      isFunction[r][c] = true;
    }

    // 1. Finder patterns at 3 corners
    function drawFinder(rCenter: number, cCenter: number) {
      for (let r = -4; r <= 4; r++) {
        for (let c = -4; c <= 4; c++) {
          const row = rCenter + r;
          const col = cCenter + c;
          if (row >= 0 && row < size && col >= 0 && col < size) {
            const dist = Math.max(Math.abs(r), Math.abs(c));
            setFunctionModule(row, col, dist !== 2 && dist !== 4);
          }
        }
      }
    }
    drawFinder(3, 3);
    drawFinder(3, size - 4);
    drawFinder(size - 4, 3);

    // 2. Alignment patterns
    const alignCoords = ALIGNMENT_PATTERN_POSITIONS[version];
    for (const r of alignCoords) {
      for (const c of alignCoords) {
        if (
          (r === 6 && c === 6) ||
          (r === 6 && c === size - 7) ||
          (r === size - 7 && c === 6)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFunctionModule(r + dr, c + dc, dist !== 1);
          }
        }
      }
    }

    // 3. Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (!isFunction[6][i]) setFunctionModule(6, i, i % 2 === 0);
      if (!isFunction[i][6]) setFunctionModule(i, 6, i % 2 === 0);
    }

    // 4. Dark module
    setFunctionModule(size - 8, 8, true);

    // 5. Reserve format bits
    for (let i = 0; i <= 8; i++) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
    }
    for (let i = size - 8; i < size; i++) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
    }

    // 6. Place data bits (zigzag)
    const finalBits: number[] = [];
    for (const cw of finalCodewords) {
      for (let i = 7; i >= 0; i--) {
        finalBits.push((cw >>> i) & 1);
      }
    }

    let bitIdx = 0;
    let right = size - 1;
    while (right > 0) {
      if (right === 6) right--; // skip vertical timing column
      const colPairs = [right, right - 1];
      const upward = ((right + 1) / 2) % 2 === 0;

      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (const c of colPairs) {
          if (!isFunction[r][c]) {
            modules[r][c] = bitIdx < finalBits.length ? finalBits[bitIdx] === 1 : false;
            bitIdx++;
          }
        }
      }
      right -= 2;
    }

    // 7. Mask pattern (Mask 0: (r + c) % 2 === 0) & apply format info
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c]) {
          const invert = (r + c) % 2 === 0;
          modules[r][c] = (modules[r][c] ?? false) !== invert;
        }
      }
    }

    // Format bits for Mask 0 and ECC Level
    const formatBitsMap: Record<QrErrorCorrectionLevel, number> = {
      L: 0x77c4, // ECC L (01) + Mask 000 with BCH
      M: 0x5412, // ECC M (00) + Mask 000 with BCH
      Q: 0x355f, // ECC Q (11) + Mask 000 with BCH
      H: 0x1689, // ECC H (10) + Mask 000 with BCH
    };
    const formatVal = formatBitsMap[ecc];

    // Place format bits
    for (let i = 0; i < 15; i++) {
      const bit = ((formatVal >>> (14 - i)) & 1) === 1;
      // Top-left finder region
      if (i <= 5) setFunctionModule(8, i, bit);
      else if (i === 6) setFunctionModule(8, 7, bit);
      else if (i === 7) setFunctionModule(8, 8, bit);
      else if (i === 8) setFunctionModule(7, 8, bit);
      else setFunctionModule(14 - i, 8, bit);

      // Split across bottom-left and top-right
      if (i < 8) {
        setFunctionModule(size - 1 - i, 8, bit);
      } else {
        setFunctionModule(8, size - 15 + i, bit);
      }
    }

    const cleanModules: boolean[][] = modules.map((row) =>
      row.map((val) => val === true),
    );
    return new QrCode(version, ecc, cleanModules);
  }

  /**
   * Generates crisp scalable SVG markup with quiet border padding
   */
  toSvg(sizePx: number = 240, marginModules: number = 4): string {
    const totalModules = this.size + marginModules * 2;
    let pathData = "";

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.modules[r][c]) {
          const x = c + marginModules;
          const y = r + marginModules;
          pathData += `M${x},${y}h1v1h-1z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <path d="${pathData.trim()}" fill="#000000"/>
</svg>`;
  }
}
