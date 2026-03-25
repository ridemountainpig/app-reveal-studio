const MAX_IMAGE_DIMENSION = 1024;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          `File read error: ${reader.error?.message || "Unknown error"}`,
        ),
      );
    };

    reader.onabort = () => {
      reject(new Error("File read aborted"));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image file"));
    image.src = src;
  });
}

function getScaledSize(width: number, height: number) {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / maxDimension;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function readImageFileAsDataURL(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataURL(file);
  const image = await loadImage(originalDataUrl);
  const scaledSize = getScaledSize(image.naturalWidth, image.naturalHeight);

  if (
    scaledSize.width === image.naturalWidth &&
    scaledSize.height === image.naturalHeight
  ) {
    return originalDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = scaledSize.width;
  canvas.height = scaledSize.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to get canvas context for image resize");
  }

  context.drawImage(image, 0, 0, scaledSize.width, scaledSize.height);

  return canvas.toDataURL("image/png");
}
