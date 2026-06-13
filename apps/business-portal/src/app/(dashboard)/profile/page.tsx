'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessesApi, uploadsApi, authApi, areasApi } from '@shu/api-client';

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: business, isLoading: isBusinessLoading } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  // Section 1: Business Information
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Section 2: Business Hours
  const [openTime, setOpenTime] = useState('09:00 ص');
  const [closeTime, setCloseTime] = useState('11:00 م');

  // Section 4: Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [deliveryAreaIds, setDeliveryAreaIds] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState('');

  const { data: allAreas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const cityVillages = React.useMemo(() => {
    if (!business?.area?.city) return [];
    return allAreas.filter((a: any) => a.city === business.area?.city);
  }, [allAreas, business]);

  const filteredVillages = React.useMemo(() => {
    if (!areaSearch.trim()) return cityVillages;
    return cityVillages.filter((v: any) => v.name.includes(areaSearch.trim()));
  }, [cityVillages, areaSearch]);

  const isDeliveryDirty = React.useMemo(() => {
    if (!business) return false;
    const original = (business.deliveryAreas || []).map((a: any) => a.id).sort().join(',');
    const current = [...deliveryAreaIds].sort().join(',');
    return original !== current;
  }, [business, deliveryAreaIds]);

  const toggleDeliveryArea = (id: string) => {
    setDeliveryAreaIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setPhone(business.phone || '');
      setAddressDetail(business.addressDetail || '');
      setImageUrl(business.imageUrl || '');
      setLogoUrl(business.logoUrl || '');
      setIsOpen(business.isOpen || false);
      setOpenTime(business.openTime || '09:00 ص');
      setCloseTime(business.closeTime || '11:00 م');
      setDeliveryAreaIds((business.deliveryAreas || []).map((a: any) => a.id));
    }
  }, [business]);

  const updateBusiness = useMutation({
    mutationFn: (dto: any) => businessesApi.update(business!.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-mine'] });
      alert('تم حفظ التغييرات بنجاح');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل في حفظ التغييرات';
      alert(Array.isArray(msg) ? msg.join('\n') : msg);
    },
  });

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      alert('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تغيير كلمة المرور';
      alert(Array.isArray(msg) ? msg.join('\n') : msg);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (newStatus: boolean) => businessesApi.update(business!.id, { isOpen: newStatus }),
    onSuccess: (_, newStatus) => {
      setIsOpen(newStatus);
      queryClient.invalidateQueries({ queryKey: ['business-mine'] });
    },
    onError: () => {
      alert('حدث خطأ أثناء تغيير حالة المنشأة');
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'cover') setIsUploadingImage(true);
    else setIsUploadingLogo(true);

    try {
      const { url } = await uploadsApi.uploadImage(file);
      if (type === 'cover') {
        setImageUrl(url);
        if (business) updateBusiness.mutate({ imageUrl: url });
      } else {
        setLogoUrl(url);
        if (business) updateBusiness.mutate({ logoUrl: url });
      }
    } catch (err) {
      alert('فشل رفع الصورة');
    } finally {
      if (type === 'cover') setIsUploadingImage(false);
      else setIsUploadingLogo(false);
    }
  };

  const handleSaveInfo = () => {
    updateBusiness.mutate({
      name,
      phone,
      addressDetail,
      openTime,
      closeTime,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (newPassword.length < 6) {
      alert('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }
    changePassword.mutate();
  };

  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (isBusinessLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">store</span>
        ملف المنشأة
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Business Information */}
        <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
          {/* Cover & Logo Header */}
          <div className="relative h-48 bg-surface-container-low border-b border-border">
            {imageUrl ? (
              <img src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:3001${imageUrl}`} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-gray">
                <span className="material-symbols-outlined text-6xl opacity-20">image</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <button 
                onClick={() => coverInputRef.current?.click()} 
                className="bg-white/80 backdrop-blur-md text-on-surface px-3 py-1.5 rounded-full shadow flex items-center gap-1 text-sm font-bold hover:bg-white transition-colors"
                disabled={isUploadingImage}
              >
                {isUploadingImage ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : <span className="material-symbols-outlined text-[16px]">edit</span>}
                تغيير الغلاف
              </button>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
            </div>

            {/* Logo */}
            <div className="absolute -bottom-10 right-6 w-24 h-24 rounded-full border-4 border-surface bg-surface-container flex items-center justify-center shadow-md overflow-hidden z-10 group">
              {logoUrl ? (
                <img src={logoUrl.startsWith('http') ? logoUrl : `http://localhost:3001${logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-primary">storefront</span>
              )}
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-colors"
              >
                {isUploadingLogo ? (
                  <span className="material-symbols-outlined animate-spin text-white">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                )}
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
            </div>
          </div>

          <div className="p-6 pt-12 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">معلومات المنشأة</h2>
              
              {/* isOpen Toggle */}
              <div className="flex items-center gap-3">
                <span className={`font-bold ${isOpen ? 'text-success' : 'text-error'}`}>
                  {isOpen ? 'مفتوح حالياً' : 'مغلق'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isOpen}
                    onChange={(e) => toggleStatus.mutate(e.target.checked)}
                    disabled={toggleStatus.isPending}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-success/30 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">اسم المنشأة</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">رقم الهاتف</label>
              <input 
                type="tel" 
                dir="ltr"
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">تفاصيل العنوان</label>
              <input 
                type="text" 
                value={addressDetail} 
                onChange={e => setAddressDetail(e.target.value)} 
                className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>


            <div className="flex gap-4 p-4 bg-surface-container-low rounded-lg border border-border mt-4">
              <div className="flex-1 text-center border-l border-border">
                <p className="text-xs text-muted-gray mb-1">التقييم</p>
                <p className="font-bold text-warning flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  {business?.rating?.toFixed(1) || '5.0'}
                </p>
              </div>
              <div className="flex-1 text-center border-l border-border">
                <p className="text-xs text-muted-gray mb-1">نسبة العمولة</p>
                <p className="font-bold text-on-surface">{business?.commissionRate || 10}%</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-gray mb-1">النوع</p>
                <p className="font-bold text-on-surface">{business?.type === 'FOOD' ? 'مطعم' : 'متجر'}</p>
              </div>
            </div>

            <button 
              onClick={handleSaveInfo}
              disabled={updateBusiness.isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition-colors mt-4 flex items-center justify-center gap-2"
            >
              {updateBusiness.isPending ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
              حفظ التغييرات
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 2: Business Hours */}
          <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              ساعات العمل
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">وقت الفتح</label>
                <input 
                  type="time" 
                  value={(() => {
                    // Convert "09:00 ص" to "09:00" for input type="time"
                    // Rough parser for basic support
                    if (!openTime) return '09:00';
                    const parts = openTime.split(' ');
                    let h_m = parts[0];
                    if (parts[1] === 'م' && !h_m.startsWith('12')) {
                      const [h, m] = h_m.split(':');
                      h_m = `${(parseInt(h) + 12).toString().padStart(2, '0')}:${m}`;
                    } else if (parts[1] === 'ص' && h_m.startsWith('12')) {
                      const [, m] = h_m.split(':');
                      h_m = `00:${m}`;
                    }
                    return h_m;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    let [h, m] = val.split(':');
                    let p = 'ص';
                    let hNum = parseInt(h);
                    if (hNum >= 12) {
                      p = 'م';
                      if (hNum > 12) hNum -= 12;
                    } else if (hNum === 0) {
                      hNum = 12;
                    }
                    setOpenTime(`${hNum.toString().padStart(2, '0')}:${m} ${p}`);
                  }}
                  className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
                <p className="text-xs text-muted-gray mt-1 mt-2">{openTime}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">وقت الإغلاق</label>
                <input 
                  type="time" 
                  value={(() => {
                    if (!closeTime) return '23:00';
                    const parts = closeTime.split(' ');
                    let h_m = parts[0];
                    if (parts[1] === 'م' && !h_m.startsWith('12')) {
                      const [h, m] = h_m.split(':');
                      h_m = `${(parseInt(h) + 12).toString().padStart(2, '0')}:${m}`;
                    } else if (parts[1] === 'ص' && h_m.startsWith('12')) {
                      const [, m] = h_m.split(':');
                      h_m = `00:${m}`;
                    }
                    return h_m;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    let [h, m] = val.split(':');
                    let p = 'ص';
                    let hNum = parseInt(h);
                    if (hNum >= 12) {
                      p = 'م';
                      if (hNum > 12) hNum -= 12;
                    } else if (hNum === 0) {
                      hNum = 12;
                    }
                    setCloseTime(`${hNum.toString().padStart(2, '0')}:${m} ${p}`);
                  }}
                  className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
                <p className="text-xs text-muted-gray mt-1 mt-2">{closeTime}</p>
              </div>
            </div>
            <p className="text-xs text-muted-gray mt-4 bg-surface-container-low p-2 rounded border border-border">
              ملاحظة: سيتم فتح وإغلاق المنشأة تلقائياً حسب هذه الأوقات (قريباً)
            </p>
            <button 
              onClick={handleSaveInfo}
              disabled={updateBusiness.isPending}
              className="w-full bg-surface-container-high hover:bg-border text-on-surface font-bold py-2.5 rounded-lg transition-colors mt-4 border border-border"
            >
              حفظ أوقات العمل
            </button>
          </div>

          {/* Section 3: Delivery Areas */}
          <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">map</span>
              مناطق التوصيل
            </h2>
            <p className="text-sm text-muted-gray mb-4">
              اختر القرى والأحياء التي يمكنك التوصيل إليها داخل مدينتك ({business?.area?.city || ''})
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="بحث عن قرية أو حي..."
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right bg-surface-container-low"
              />
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {cityVillages.length === 0 ? (
                <p className="text-muted-gray text-sm text-center py-6">لا توجد مناطق متاحة.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-border bg-surface-container-low">
                  {filteredVillages.map((area: any) => {
                    const isSelected = deliveryAreaIds.includes(area.id);
                    return (
                      <div
                        key={area.id}
                        onClick={() => toggleDeliveryArea(area.id)}
                        className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors hover:bg-primary/5 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                          {area.name}
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // toggled by outer click
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => updateBusiness.mutate({ deliveryAreaIds })}
              disabled={updateBusiness.isPending || !isDeliveryDirty}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-lg transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {updateBusiness.isPending ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">save</span>
              )}
              حفظ مناطق التوصيل
            </button>
          </div>

          {/* Section 4: Change Password */}
          <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              تغيير كلمة المرور
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">كلمة المرور الحالية</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="w-full border border-border rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  dir="ltr"
                />
              </div>
              <button 
                onClick={handleChangePassword}
                disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                className="w-full bg-surface-container-high hover:bg-border text-on-surface font-bold py-2.5 rounded-lg transition-colors mt-2 border border-border disabled:opacity-50"
              >
                {changePassword.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
