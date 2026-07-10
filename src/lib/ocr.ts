"use client";

import { createWorker, Worker } from "tesseract.js";

async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      // Scale up small images for better OCR
      const scale = Math.max(1, Math.min(3, 1500 / Math.max(img.width, img.height)));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw with white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Increase contrast
        const contrast = 1.5;
        const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
        const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        // Apply threshold for binarization (Otsu's method simplified)
        const threshold = 128;
        const final = adjusted > threshold ? 255 : 0;

        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL
      resolve(canvas.toDataURL("image/png"));
    };

    img.src = URL.createObjectURL(file);
  });
}

async function preprocessBase64(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      const scale = Math.max(1, Math.min(3, 1500 / Math.max(img.width, img.height)));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrast = 1.5;
        const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
        const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        const threshold = 128;
        const final = adjusted > threshold ? 255 : 0;

        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };

    img.src = base64;
  });
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Preprocess image for better OCR
  onProgress?.(10);
  const processedImage = await preprocessImage(file);

  // Create worker with English language
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        // Map progress from 20-100% (preprocessing is 0-20%)
        onProgress(20 + Math.round(m.progress * 80));
      }
    },
  });

  try {
    // Set OCR parameters for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?@#$%^&*()_+-=[]{}|\\\"'<>/? \n\t",
      tessedit_pageseg_mode: "6" as any, // Assume uniform block of text
      preserve_interword_spaces: "1",
    });

    const { data } = await worker.recognize(processedImage);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractTextFromImageBase64(
  base64: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  onProgress?.(10);
  const processedImage = await preprocessBase64(base64);

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(20 + Math.round(m.progress * 80));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?@#$%^&*()_+-=[]{}|\\\"'<>/? \n\t",
      tessedit_pageseg_mode: "6" as any,
      preserve_interword_spaces: "1",
    });

    const { data } = await worker.recognize(processedImage);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
