import { http, BASE_URL } from '@shu/api-client';

/**
 * Upload a local image file URI to the server.
 * Returns the server-side URL (e.g. "/uploads/xxx.jpg").
 * To display the image, prepend BASE_URL.
 */
export async function uploadImage(localUri: string): Promise<string> {
  const filename = localUri.split('/').pop() || 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  const formData = new FormData();
  // React Native accepts { uri, name, type } as a FormData file entry
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);

  const res = await http.post<{ url: string }>('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.url;
}

/** Build full image URL from a server path like "/uploads/xxx.jpg" */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}
