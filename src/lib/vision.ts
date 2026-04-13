import { postJson } from './api';

export interface VisionAnalysisResult {
  meal_name?: string;
  meal_type?: string;
  calories?: number;
  fat_g?: number;
  protein_g?: number;
  carbs_g?: number;
  confidence?: number;
  route?: string;
  predicted_portion_g?: number | null;
  prompt_text?: string;
  ingredients_text?: string | null;
  portion_text?: string | null;
}

interface AnalyzeMealPhotoInput {
  image: File;
  ingredientsText?: string;
  portionText?: string;
}

const MAX_IMAGE_EDGE = 1440;
const IMAGE_QUALITY = 0.82;

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image.'));
    };
    image.src = objectUrl;
  });
}

async function encodeImageForApi(file: File) {
  const image = await readImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable in this browser.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

export async function analyzeMealPhoto({
  image,
  ingredientsText = '',
  portionText = '',
}: AnalyzeMealPhotoInput): Promise<VisionAnalysisResult> {
  const imageDataUrl = await encodeImageForApi(image);

  return postJson<VisionAnalysisResult>('/api/vision/analyze', {
    imageDataUrl,
    ingredientsText,
    portionText,
  });
}
