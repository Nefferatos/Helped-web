/**
 * Image compression utilities for reducing file sizes while maintaining quality
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxSizeMB?: number;
}

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
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.8,
    maxSizeMB = 2,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
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
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Compress with quality adjustment
      let compressedUrl = canvas.toDataURL("image/jpeg", quality);
      let sizeInMB = (compressedUrl.length * 0.75) / 1024 / 1024;

      // Further reduce quality if still too large
      let currentQuality = quality;
      while (sizeInMB > maxSizeMB && currentQuality > 0.3) {
        currentQuality -= 0.1;
        compressedUrl = canvas.toDataURL("image/jpeg", currentQuality);
        sizeInMB = (compressedUrl.length * 0.75) / 1024 / 1024;
      }

      resolve(compressedUrl);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
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
  return (dataUrl.length * 0.75) / 1024 / 1024;
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
