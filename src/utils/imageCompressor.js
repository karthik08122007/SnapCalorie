import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.7;

/**
 * compressMealImage
 * Resizes to max 1024px wide and compresses to JPEG 0.7 quality.
 * Maintains aspect ratio. Returns a new URI pointing to the compressed file.
 *
 * @param {string} imageUri - local URI from ImagePicker or camera
 * @returns {Promise<string>} - compressed image URI
 */
export async function compressMealImage(imageUri) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_WIDTH } }],  // maintains aspect ratio automatically
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    // If compression fails, fall back to the original image — never block the scan
    console.warn('[imageCompressor] Compression failed, using original image');
    return imageUri;
  }
}
