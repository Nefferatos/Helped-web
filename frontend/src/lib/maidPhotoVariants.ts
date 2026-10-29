/** Creates exact-size, center-weighted cover crops for maid profile photography. */
export const createMaidPhotoVariants = async (sources: string[]) => {
  const variants = await Promise.all(sources.map(async (source) => {
    if (!source) return { thumbnail: "", portrait: "" };
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not process an uploaded photo"));
      element.src = source;
    });
    const crop = (width: number, height: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo editing is not available in this browser");
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const sourceWidth = width / scale;
      const sourceHeight = height / scale;
      const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
      // Bias the crop slightly upward to keep faces in frame.
      const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * 0.38);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      return canvas.toDataURL("image/webp", 0.86);
    };
    return { thumbnail: crop(100, 125), portrait: crop(240, 400) };
  }));
  return {
    photoThumbnailDataUrls: variants.map((item) => item.thumbnail),
    photoPortraitDataUrls: variants.map((item) => item.portrait),
  };
};
