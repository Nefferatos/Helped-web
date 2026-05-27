/**
 * Image compression utilities for reducing file sizes while maintaining quality
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxSizeMB?: number;
}

const estimateDataUrlSizeInMB = (dataUrl: string) => (dataUrl.length * 0.75) / 1024 / 1024;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read compressed image"));
    reader.readAsDataURL(blob);
  });

const canvasToCompressedDataUrl = async (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<string> => {
  if (typeof canvas.toBlob === "function") {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (blob) {
      return blobToDataUrl(blob);
    }
  }

  return canvas.toDataURL("image/jpeg", quality);
};

const compressImageFromSource = async (
  src: string,
  options: CompressionOptions = {},
): Promise<string> => {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.78,
    maxSizeMB = 1,
  } = options;

  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  let { width, height } = img;

  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;
    if (width > height) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let compressedUrl = await canvasToCompressedDataUrl(canvas, currentQuality);
  let sizeInMB = estimateDataUrlSizeInMB(compressedUrl);

  while (sizeInMB > maxSizeMB && currentQuality > 0.22) {
    currentQuality -= 0.08;
    compressedUrl = await canvasToCompressedDataUrl(canvas, currentQuality);
    sizeInMB = estimateDataUrlSizeInMB(compressedUrl);
  }

  return compressedUrl;
};

/**
 * Compress image by resizing and reducing quality
 * @param dataUrl - Base64 image data URL
 * @param options - Compression options
 * @returns Compressed image data URL
 */
export const compressImage = async (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> => {
  return compressImageFromSource(dataUrl, options);
};

export const compressImageFile = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await compressImageFromSource(objectUrl, options);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/**
 * Compress multiple images in parallel
 * @param dataUrls - Array of base64 image data URLs
 * @param options - Compression options
 * @returns Array of compressed image data URLs
 */
export const compressImages = async (
  dataUrls: string[],
  options: CompressionOptions = {}
): Promise<string[]> => {
  return Promise.all(dataUrls.map((url) => compressImage(url, options)));
};

/**
 * Get file size in MB from base64 data URL
 */
export const getImageSizeInMB = (dataUrl: string): number => {
  return estimateDataUrlSizeInMB(dataUrl);
};

/**
 * Get readable file size string
 */
export const getReadableFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
