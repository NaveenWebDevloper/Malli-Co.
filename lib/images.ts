/**
 * Pure Node.js image dimension extractor for JPEG, PNG, and WebP buffers.
 * Zero external dependencies (Rule 10 compliant).
 */
export interface ImageDimensions {
  width: number;
  height: number;
  type: "png" | "jpeg" | "webp";
}

export function getImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (!buffer || buffer.length < 24) return null;

  // 1. Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    // IHDR chunk: width at 16, height at 20 (big-endian 32-bit uint)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: "png" };
  }

  // 2. Check JPEG signature (FF D8)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      // SOF markers (Start Of Frame):
      // 0xC0 (baseline), 0xC1 (extended seq), 0xC2 (progressive), 0xC3 (lossless)
      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSOF) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, type: "jpeg" };
      }

      // Skip past segment length
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }

  // 3. Check WebP signature ("RIFF" ... "WEBP")
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunkType = buffer.toString("ascii", 12, 16);

    // VP8 lossy chunk
    if (chunkType === "VP8 " && buffer.length >= 30) {
      // 26..27 = width, 28..29 = height (little endian 14-bit)
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height, type: "webp" };
    }

    // VP8L lossless chunk
    if (chunkType === "VP8L" && buffer.length >= 25) {
      const b1 = buffer[21];
      const b2 = buffer[22];
      const b3 = buffer[23];
      const b4 = buffer[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height =
        1 + ((((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)) & 0x3fff);
      return { width, height, type: "webp" };
    }

    // VP8X extended chunk
    if (chunkType === "VP8X" && buffer.length >= 30) {
      // Width: 24..26 (3 bytes LE) + 1
      const width =
        1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      // Height: 27..29 (3 bytes LE) + 1
      const height =
        1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width, height, type: "webp" };
    }
  }

  return null;
}

