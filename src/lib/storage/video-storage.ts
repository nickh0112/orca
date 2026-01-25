import { put, del } from '@vercel/blob';

/**
 * Store a video in Vercel Blob Storage
 * @param videoBuffer - The video file as a Buffer
 * @param filename - The path/filename for the blob (e.g., "videos/batch123/creator456/post789.mp4")
 * @param contentType - The MIME type (e.g., "video/mp4")
 * @returns The public URL of the stored video
 */
export async function storeVideo(
  videoBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const blob = await put(filename, videoBuffer, {
    access: 'public',
    contentType,
  });
  return blob.url;
}

/**
 * Delete a video from Vercel Blob Storage
 * @param url - The blob URL to delete
 */
export async function deleteVideo(url: string): Promise<void> {
  await del(url);
}

/**
 * Check if Vercel Blob storage is configured
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}
