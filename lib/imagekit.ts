export interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

export function getImageKitConfig(): ImageKitConfig | null {
  const publicKey = (
    process.env.IMAGEKIT_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
    ""
  ).trim();

  const privateKey = (
    process.env.IMAGEKIT_PRIVATE_KEY ||
    process.env.IMAGEKIT_SECRET_KEY ||
    ""
  ).trim();

  const urlEndpoint = (
    process.env.IMAGEKIT_URL_ENDPOINT ||
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  return { publicKey, privateKey, urlEndpoint };
}

export function isImageKitConfigured(): boolean {
  return getImageKitConfig() !== null;
}

export interface ImageKitUploadParams {
  buffer: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
  useUniqueFileName?: boolean;
}

export interface ImageKitUploadResult {
  success: boolean;
  url?: string;
  fileId?: string;
  name?: string;
  filePath?: string;
  width?: number;
  height?: number;
  size?: number;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Upload an image buffer directly to ImageKit using their standard REST API.
 * Uses native Node 20+ fetch and FormData with 0 third-party npm packages.
 */
export async function uploadToImageKit(
  params: ImageKitUploadParams
): Promise<ImageKitUploadResult> {
  const config = getImageKitConfig();
  if (!config) {
    return {
      success: false,
      error:
        "ImageKit credentials missing in environment variables (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT).",
    };
  }

  try {
    const formData = new FormData();
    const base64File = params.buffer.toString("base64");
    formData.append("file", base64File);
    formData.append("fileName", params.fileName);

    if (params.folder) {
      const sanitizedFolder = params.folder.startsWith("/")
        ? params.folder
        : `/${params.folder}`;
      formData.append("folder", sanitizedFolder);
    }

    formData.append(
      "useUniqueFileName",
      params.useUniqueFileName !== undefined
        ? String(params.useUniqueFileName)
        : "true"
    );

    if (params.tags && params.tags.length > 0) {
      formData.append("tags", params.tags.join(","));
    }

    const authHeader = `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}`;

    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `ImageKit upload failed with HTTP ${res.status}: ${errText}`,
      };
    }

    const data = await res.json();

    return {
      success: true,
      url: data.url,
      fileId: data.fileId,
      name: data.name,
      filePath: data.filePath,
      width: data.width,
      height: data.height,
      size: data.size,
      thumbnailUrl: data.thumbnailUrl,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown ImageKit upload error";
    return {
      success: false,
      error: msg,
    };
  }
}

