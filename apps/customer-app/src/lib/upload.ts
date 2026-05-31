import { http, BASE_URL } from '@shu/api-client';
import { Platform } from 'react-native';

/**
 * Upload a local image file URI to the server.
 * Returns the server-side URL (e.g. "/uploads/xxx.jpg"); prepend BASE_URL to display.
 */
export async function uploadImage(localUri: string): Promise<string> {
  let filename = localUri.split('/').pop() || 'photo.jpg';
  if (!filename.includes('.')) filename += '.jpg';

  if (Platform.OS === 'web') {
    // Native fetch is foolproof for web FormData and avoids Axios header conflicts.
    const response = await fetch(localUri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, filename);

    const token = http.defaults.headers.common['Authorization'] as string;
    const res = await fetch(`${BASE_URL}/uploads/image`, {
      method: 'POST',
      headers: token ? { Authorization: token } : {},
      body: formData,
    });
    if (!res.ok) throw new Error((await res.text()) || 'Upload failed');
    const data = await res.json();
    return data.url;
  }

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
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  const res = await http.post<{ url: string }>('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}

/** Build a full image URL from a server path like "/uploads/xxx.jpg". */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}
