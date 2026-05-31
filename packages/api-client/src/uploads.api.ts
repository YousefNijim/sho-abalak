import { http } from './http';

export const uploadsApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await http.post<{ url: string }>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
