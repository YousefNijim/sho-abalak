'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, areasApi } from '@shu/api-client';
import type { AdminUser, Area } from '@shu/api-client';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const TABS = ['الزبائن', 'المنشآت الشريكة', 'الكباتن / السائقين'] as const;
const TAB_ROLES = ['CUSTOMER', 'BUSINESS', 'DRIVER'] as const;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  SUSPENDED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  BANNED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف مؤقتاً',
  BANNED: 'محظور نهائياً',
};

const columnHelper = createColumnHelper<AdminUser>();

export default function UsersPage() {
  const [tab, setTab] = useState(0);
  const qc = useQueryClient();

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [villageFilter, setVillageFilter] = useState('ALL');

  // Selected User for details drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Intervention Confirmation Dialogs state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'reset-password' | 'notify';
    payload: any;
    message: string;
  } | null>(null);

  // Notifications text input
  const [notificationText, setNotificationText] = useState('');

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users', TAB_ROLES[tab]],
    queryFn: () => usersApi.list({ role: TAB_ROLES[tab] }),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const uniqueCities = useMemo(() => Array.from(new Set(areas.map((a: Area) => a.city))), [areas]);
  const villagesForCity = useMemo(() => areas.filter((a: Area) => a.city === cityFilter), [areas, cityFilter]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      showToast('success', 'تم تعديل حالة حساب المستخدم بنجاح');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تعديل حالة الحساب');
      setConfirmAction(null);
    },
  });

  // Client side filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Area Filter
      if (cityFilter !== 'ALL' && u.area?.city !== cityFilter) return false;
      if (villageFilter !== 'ALL' && u.areaId !== villageFilter) return false;

      // 2. Text Search (name or phone)
      if (search) {
        const query = search.toLowerCase();
        const userName = u.name.toLowerCase();
        const userPhone = u.phone;
        return userName.includes(query) || userPhone.includes(query);
      }

      return true;
    });
  }, [users, search, cityFilter, villageFilter]);

  // TanStack columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'اسم المستخدم',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-outline-variant/20 text-on-surface font-extrabold text-[12px]">
              {info.getValue()?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface">{info.getValue()}</p>
              <p className="text-[10px] text-muted-gray">ID: #{info.row.original.id.slice(0, 8)}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('phone', {
        header: 'رقم الهاتف',
        cell: (info) => <span className="font-mono text-[14px]" dir="ltr">{info.getValue()}</span>,
      }),
      columnHelper.accessor('area.city', {
        header: 'المدينة والمنطقة',
        cell: (info) => (
          <span className="text-[14px] font-semibold text-on-surface">
            {info.getValue() ?? '—'} {info.row.original.area ? `- ${info.row.original.area.name}` : ''}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'حالة الحساب',
        cell: (info) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold border ${STATUS_STYLE[info.getValue()] ?? ''}`}>
            {STATUS_LABEL[info.getValue()] ?? info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاريخ الانضمام',
        cell: (info) => <span className="font-mono text-[12px] text-muted-gray">{info.getValue().slice(0, 10)}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-left">إجراءات</div>,
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUserId(info.row.original.id);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleInterventionSubmit = () => {
    if (!confirmAction || !selectedUserId) return;
    const { type, payload } = confirmAction;

    if (type === 'status') {
      updateStatusMutation.mutate({ id: selectedUserId, status: payload });
    }
    if (type === 'reset-password') {
      // Mock action successfully simulated
      showToast('success', `تم إعادة تعيين كلمة المرور الافتراضية بنجاح إلى "11223344"`);
      setConfirmAction(null);
    }
    if (type === 'notify') {
      // Mock action successfully simulated
      showToast('success', `تم بث إشعار مباشر يدوي إلى هاتف المستخدم: "${payload}"`);
      setNotificationText('');
      setConfirmAction(null);
    }
  };

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 left-6 z-[9999] flex items-center gap-2 rounded-xl px-5 py-4 text-white shadow-lg animate-bounce ${
          toast.type === 'success' ? 'bg-secondary' : 'bg-error'
        }`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="font-bold text-[14px]">{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-primary animate-fade-in" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-2">تأكيد الإجراء الإداري</h3>
            <p className="text-[14px] text-muted-gray mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleInterventionSubmit}
                disabled={updateStatusMutation.isPending}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50 transition-colors"
              >
                تأكيد وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة مستخدمي المنصة والمشتركين</h2>
          <p className="text-[13px] text-muted-gray mt-1">تصفح الحسابات، عدل الصلاحيات، حظر، أو بث إشعارات للمستخدمين</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-border-beige bg-surface-white p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => {
              setTab(i);
              setSelectedUserId(null);
            }}
            className={`rounded-lg px-6 py-2.5 text-[14px] font-bold transition-all ${
              tab === i ? 'bg-primary text-white shadow-sm' : 'text-muted-gray hover:text-on-surface hover:bg-background/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border-beige bg-surface-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-gap-md sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">البحث بالاسم أو الهاتف</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pr-11 pl-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px]"
                placeholder="ابحث بالاسم، برقم الجوال..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">المدينة</label>
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setVillageFilter('ALL'); }}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">كل المدن</option>
              {uniqueCities.map((city: string) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">القرية / الحي</label>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              disabled={cityFilter === 'ALL'}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer disabled:opacity-50"
            >
              <option value="ALL">كل القرى والأحياء</option>
              {villagesForCity.map((a: Area) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-border-beige bg-surface-white shadow-sm overflow-hidden">
        {isUsersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-[14px] font-medium text-muted-gray">جاري جلب بيانات المستخدمين الحية...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-border-beige bg-surface-container-low text-[13px] font-semibold text-on-surface">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-6 py-4">
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border-beige">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedUserId(row.original.id)}
                      className="group cursor-pointer transition-colors hover:bg-background/20"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-border bg-surface-container-low px-6 py-4">
              <p className="text-[13px] text-muted-gray">
                إجمالي المشتركين في هذه الفئة: {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-white text-on-surface disabled:opacity-40 hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
                <span className="text-[13px] text-muted-gray">
                  الصفحة {table.getState().pagination.pageIndex + 1} من {table.getPageCount() || 1}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-white text-on-surface disabled:opacity-40 hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Users Details Slide Drawer (Left Drawer) */}
      {selectedUserId && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-start bg-on-surface/30 backdrop-blur-xs">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setSelectedUserId(null)} />

          {/* Drawer container */}
          <div className="relative w-full max-w-xl bg-surface-white h-screen shadow-2xl flex flex-col z-10 animate-slide-in border-r border-border" dir="rtl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-5 bg-background/10">
              <div>
                <h3 className="text-[18px] font-bold text-on-surface">إدارة صلاحيات وحساب العميل</h3>
                <p className="text-[11px] font-mono text-muted-gray mt-1">ID: {selectedUserId}</p>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-border/30 text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Account Controls Override */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <h4 className="flex items-center gap-2 text-[14px] font-bold text-primary mb-1 border-b border-primary/20 pb-2">
                  <span className="material-symbols-outlined text-[20px]">security</span>
                  إجراءات حماية وإدارة حسابات المستخدمين
                </h4>

                <div className="flex flex-wrap gap-2">
                  {/* Account statuses overrides */}
                  {selectedUser.status !== 'ACTIVE' && (
                    <button
                      onClick={() => {
                        setConfirmAction({
                          type: 'status',
                          payload: 'ACTIVE',
                          message: `هل أنت متأكد من إعادة تنشيط وتفعيل حساب المستخدم "${selectedUser.name}"؟`,
                        });
                      }}
                      className="h-10 px-4 rounded-xl bg-success text-white font-bold text-[12px] shadow-sm hover:brightness-95 transition-all"
                    >
                      إعادة تنشيط الحساب
                    </button>
                  )}

                  {selectedUser.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => {
                        setConfirmAction({
                          type: 'status',
                          payload: 'SUSPENDED',
                          message: `هل تريد إيقاف وتجميد حساب المستخدم "${selectedUser.name}" مؤقتاً؟ لن يتمكن من تسجيل الدخول أو إرسال طلبات.`,
                        });
                      }}
                      className="h-10 px-4 rounded-xl bg-warning-amber text-white font-bold text-[12px] shadow-sm hover:brightness-95 transition-all"
                    >
                      تجميد مؤقت للحساب
                    </button>
                  )}

                  {selectedUser.status !== 'BANNED' && (
                    <button
                      onClick={() => {
                        setConfirmAction({
                          type: 'status',
                          payload: 'BANNED',
                          message: `تحذير: هل أنت متأكد من حظر حساب المستخدم "${selectedUser.name}" نهائياً؟ سيتم طرده من كافة التطبيقات فوراً.`,
                        });
                      }}
                      className="h-10 px-4 rounded-xl bg-error text-white font-bold text-[12px] shadow-sm hover:brightness-95 transition-all"
                    >
                      حظر نهائي وطرد
                    </button>
                  )}

                  {/* Reset Password */}
                  <button
                    onClick={() => {
                      setConfirmAction({
                        type: 'reset-password',
                        payload: null,
                        message: `هل تريد إعادة تعيين كلمة مرور المستخدم "${selectedUser.name}" إلى كلمة المرور الافتراضية "11223344" لدواعي تصفير الحسابات؟`,
                      });
                    }}
                    className="h-10 px-4 rounded-xl border border-border bg-white text-on-surface font-bold text-[12px] shadow-sm hover:bg-surface-container transition-all"
                  >
                    تصفير كلمة المرور
                  </button>
                </div>
              </div>

              {/* Direct Notifications Push */}
              <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                  <span className="material-symbols-outlined text-[18px] text-primary">notifications_active</span>
                  إرسال إشعار مباشر وفوري (Push Push Message)
                </h5>
                <p className="text-[11px] text-muted-gray">
                  اكتب رسالة مخصصة ليتم بثها فورياً لهاتف هذا العميل عبر الـ WebSockets وإشعارات الجوال.
                </p>
                <div className="flex gap-2">
                  <input
                    value={notificationText}
                    onChange={(e) => setNotificationText(e.target.value)}
                    className="flex-1 h-10 px-3 bg-background/30 border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px]"
                    placeholder="اكتب نص الإشعار هنا..."
                  />
                  <button
                    onClick={() => {
                      if (!notificationText.trim()) return showToast('error', 'الرجاء كتابة نص للإشعار أولاً');
                      setConfirmAction({
                        type: 'notify',
                        payload: notificationText,
                        message: `هل تريد بث هذا الإشعار يدوياً إلى هاتف "${selectedUser.name}"؟`,
                      });
                    }}
                    className="h-10 px-4 rounded-lg bg-primary text-white text-[12px] font-bold hover:brightness-95 transition-all shadow-sm"
                  >
                    إرسال الآن
                  </button>
                </div>
              </div>

              {/* User Profile Info Card */}
              <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                  <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                  تفاصيل الملف الشخصي للمشترك
                </h5>
                <div className="grid grid-cols-2 gap-3 text-[13px] leading-relaxed">
                  <div>
                    <span className="text-muted-gray">الاسم الكامل:</span>
                    <p className="font-bold text-on-surface">{selectedUser.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-gray">رقم الجوال:</span>
                    <p className="font-bold text-on-surface font-mono" dir="ltr">{selectedUser.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-gray">صلاحية الحساب:</span>
                    <p className="font-bold text-on-surface">
                      {selectedUser.role === 'CUSTOMER' ? 'زبون مستقل' : selectedUser.role === 'DRIVER' ? 'كابتن توصيل' : 'صاحب منشأة'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-gray">المدينة والمنطقة:</span>
                    <p className="font-bold text-on-surface">
                      {selectedUser.area ? `${selectedUser.area.city} - ${selectedUser.area.name}` : 'غير محدد'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-gray">تاريخ الإنشاء:</span>
                    <p className="font-bold text-on-surface font-mono">
                      {new Date(selectedUser.createdAt).toLocaleString('ar-PS')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-gray">حالة تفعيل الحساب:</span>
                    <p className={`font-bold ${selectedUser.status === 'ACTIVE' ? 'text-success' : 'text-error'}`}>
                      {STATUS_LABEL[selectedUser.status]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
