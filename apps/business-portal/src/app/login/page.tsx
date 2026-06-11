'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi } from '@shu/api-client';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ phone, password });
      
      if (response.user.role !== 'BUSINESS') {
        setError('هذه البوابة مخصصة لأصحاب المنشآت فقط');
        setIsLoading(false);
        return;
      }

      setToken(response.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'بيانات الدخول غير صحيحة');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Right side - Form */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-surface shadow-2xl z-10" dir="rtl">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="flex flex-col items-center sm:items-start">
            <Image src="/logo.png" alt="شو عبالك؟" width={64} height={64} className="rounded-xl mb-6 shadow-sm" />
            <h1 className="text-3xl font-bold text-on-surface mb-2">تسجيل الدخول</h1>
            <p className="text-muted-gray text-sm">أهلاً بك في بوابة إدارة منشأتك</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface">رقم الهاتف</label>
              <input
                type="tel"
                dir="ltr"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface">كلمة المرور</label>
              <input
                type="password"
                dir="rtl"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-dark transition-all disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-primary/30"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  تسجيل الدخول
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
        <div className="z-10 text-center" dir="rtl">
          <h2 className="text-6xl font-black text-primary mb-6 drop-shadow-sm">شو عبالك؟</h2>
          <p className="text-2xl font-medium text-on-surface/80">بوابة إدارة المنشآت</p>
        </div>
      </div>
    </div>
  );
}
