import crypto from "crypto";

export interface R2Config {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

export function getR2Config(): R2Config | null {
  const accountId =
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    "82f82e50e85cd74b78420fa00122c226"; // Default provided by project
  const bucketName =
    process.env.R2_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    "malli-and-co";
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;
  const publicUrl =
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicUrl: publicUrl?.replace(/\/$/, ""),
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate AWS Signature Version 4 headers for Cloudflare R2 S3-compatible API.
 */
function generateSigV4Headers({
  method,
  url,
  payload,
  contentType,
  accessKeyId,
  secretAccessKey,
}: {
  method: string;
  url: string;
  payload: Buffer;
  contentType: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const pathname = parsedUrl.pathname;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const payloadHash = sha256Hex(payload);

  // Headers to sign
  const headersToSign: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (contentType) {
    headersToSign["content-type"] = contentType;
  }

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${headersToSign[k]}\n`)
    .join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  // Canonical Request
  const canonicalRequest = [
    method,
    pathname,
    "", // Canonical Query String
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  // Calculate signature
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Host: host,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

/**
 * Upload an image or file buffer directly to Cloudflare R2 bucket.
 */
export async function uploadToR2({
  buffer,
  key,
  contentType,
}: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  const config = getR2Config();
  if (!config) {
    return {
      success: false,
      url: "",
      key,
      error: "Cloudflare R2 is not fully configured. Missing credentials.",
    };
  }

  // Ensure clean key (no leading slash)
  const cleanKey = key.replace(/^\/+/, "");
  const targetUrl = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${cleanKey}`;

  const headers = generateSigV4Headers({
    method: "PUT",
    url: targetUrl,
    payload: buffer,
    contentType,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  });

  try {
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers,
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[R2] PUT failed (${res.status} ${res.statusText}):`, errText);
      return {
        success: false,
        url: "",
        key: cleanKey,
        error: `Cloudflare R2 upload rejected (${res.status}): ${errText || res.statusText}`,
      };
    }

    // Determine public URL:
    // If user configured a public R2.dev or custom domain, use it directly (Cloudflare Edge CDN)
    // Otherwise, route through the application proxy /api/media/r2/[...key]
    const finalUrl = config.publicUrl
      ? `${config.publicUrl}/${cleanKey}`
      : `/api/media/r2/${cleanKey}`;

    return {
      success: true,
      url: finalUrl,
      key: cleanKey,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error uploading to Cloudflare R2";
    console.error("[R2] Upload exception:", err);
    return {
      success: false,
      url: "",
      key: cleanKey,
      error: msg,
    };
  }
}

/**
 * Retrieve an object from Cloudflare R2 using AWS SigV4 signed GET request.
 */
export async function getFromR2(key: string): Promise<{
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  size?: number;
  error?: string;
}> {
  const config = getR2Config();
  if (!config) {
    return { success: false, error: "Cloudflare R2 is not configured" };
  }

  const cleanKey = key.replace(/^\/+/, "");
  const targetUrl = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${cleanKey}`;

  const headers = generateSigV4Headers({
    method: "GET",
    url: targetUrl,
    payload: Buffer.alloc(0),
    contentType: "",
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  });

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Object not found or access denied in R2 (${res.status})`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return {
      success: true,
      buffer,
      contentType,
      size: buffer.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching from R2";
    return { success: false, error: msg };
  }
}
