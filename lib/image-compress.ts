import sharp from "sharp";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

export interface CompressedImage {
  buffer: Buffer;
  contentType: string;
  format: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Compresses and resizes an image buffer using sharp.
 * Defaults to WebP format at 80% quality, max width 1600px.
 * If compression fails or if compressed is larger than original,
 * it returns the safest buffer.
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1600,
    maxHeight,
    quality = 80,
    format = "webp",
  } = options;

  const originalSize = inputBuffer.length;

  try {
    let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();

    const metadata = await pipeline.metadata();

    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === "png") {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
    }

    const { data: outputBuffer, info } = await pipeline.toBuffer({
      resolveWithObject: true,
    });

    const isOptimized = outputBuffer.length < originalSize;
    const finalBuffer = isOptimized ? outputBuffer : inputBuffer;
    const finalSize = finalBuffer.length;
    const ratio = Math.max(0, 1 - finalSize / originalSize);

    return {
      buffer: finalBuffer,
      contentType:
        isOptimized || format === "webp"
          ? `image/${format}`
          : metadata.format
            ? `image/${metadata.format}`
            : "image/jpeg",
      format: isOptimized ? format : metadata.format || "jpeg",
      width: info.width || metadata.width || 0,
      height: info.height || metadata.height || 0,
      size: finalSize,
      originalSize,
      compressionRatio: Number(ratio.toFixed(2)),
    };
  } catch (err) {
    console.warn(
      "[compressImage] Compression failed, falling back to original buffer:",
      err
    );
    return {
      buffer: inputBuffer,
      contentType: "image/jpeg",
      format: "jpeg",
      width: 0,
      height: 0,
      size: originalSize,
      originalSize,
      compressionRatio: 0,
    };
  }
}
