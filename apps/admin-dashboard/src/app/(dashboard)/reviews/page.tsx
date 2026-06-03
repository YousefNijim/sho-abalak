'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, businessesApi, driversApi } from '@shu/api-client';
import type { Review } from '@shu/api-client';
import { StatCard } from '@/components/stat-card';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<Review>();

export default function ReviewsPage() {
  const qc = useQueryClient();

  // Filters State
  const [search, setSearch] = useState('');
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL'); // 1, 2, 3, 4, 5

  // Confirmation Dialogue State
  const [confirmDeleteReview, setConfirmDeleteReview] = useState<Review | null>(null);

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => reviewsApi.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  // KPI calculations
  const stats = useMemo(() => {
    if (reviews.length === 0) return { totalReviews: 0, avgBusinessRating: 0, withComments: 0 };
    const totalBusiness = reviews.reduce((sum, r) => sum + r.businessRating, 0);
    const withComment = reviews.filter((r) => r.comment && r.comment.trim() !== '').length;
    return {
      totalReviews: reviews.length,
      avgBusinessRating: totalBusiness / reviews.length,
      withComments: withComment,
    };
  }, [reviews]);

  // Mutations
  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      // Invalidate businesses and drivers so their rating numbers are updated in UI
      qc.invalidateQueries({ queryKey: ['businesses'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      showToast('success', 'تم حذف التقييم وإعادة احتساب المتوسطات بنجاح');
      setConfirmDeleteReview(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل حذف التقييم');
      setConfirmDeleteReview(null);
    },
  });

  // Filtering Logic
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const customerName = r.order?.customer?.name || '';
      const comment = r.comment || '';
      const matchesSearch =
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        comment.toLowerCase().includes(search.toLowerCase());

      const matchesBusiness =
        businessFilter === 'ALL' || r.order?.business?.id === businessFilter;

      const matchesDriver =
        driverFilter === 'ALL' || r.order?.driver?.id === driverFilter;

      const matchesRating =
        ratingFilter === 'ALL' || r.businessRating === parseInt(ratingFilter, 10);

      return matchesSearch && matchesBusiness && matchesDriver && matchesRating;
    });
  }, [reviews, search, businessFilter, driverFilter, ratingFilter]);

  // TanStack table definitions
  const columns = useMemo(
    () => [
      columnHelper.accessor('order.customer.name', {
        header: 'الزبون',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {info.getValue()?.charAt(0) ?? '?'}
            </div>
            <div>
              <span className="font-bold text-on-surface">{info.getValue() ?? '—'}</span>
              <p className="text-[10px] text-muted-gray mt-0.5">{info.row.original.order?.customer?.phone ?? ''}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('order.business.name', {
        header: 'المتجر المقيّم',
        cell: (info) => <span className="font-bold text-on-surface">{info.getValue() ?? '—'}</span>,
      }),
      columnHelper.accessor('businessRating', {
        header: 'تقييم المتجر',
        cell: (info) => (
          <div className="flex items-center gap-1">
            <span className="font-bold text-warning-amber">{info.getValue()}</span>
            <span className="material-symbols-outlined text-[16px] text-warning-amber fill-current">star</span>
          </div>
        ),
      }),
      columnHelper.accessor('deliveryRating', {
        header: 'تقييم التوصيل',
        cell: (info) => {
          const val = info.getValue();
          if (val == null) return (<span className="text-muted-gray text-xs">—</span>);
          const driverName = info.row.original.order?.driver?.user?.name ?? 'السائق';
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#3B82F6]">{val}</span>
                <span className="material-symbols-outlined text-[16px] text-[#3B82F6] fill-current">star</span>
              </div>
              <span className="text-[10px] text-muted-gray">{driverName}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('comment', {
        header: 'ملاحظة وتعليق الزبون',
        cell: (info) => {
          const commentStr = info.getValue();
          return (
            <div className="max-w-xs break-words">
              {commentStr && commentStr.trim() !== '' ? (
                <span className="text-on-surface leading-relaxed text-[13px]">{commentStr}</span>
              ) : (
                <span className="italic text-muted-gray/60 text-xs">بدون أي تعليق مكتوب</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاريخ التقييم',
        cell: (info) => (
          <span className="text-[11px] text-muted-gray" dir="ltr">
            {new Date(info.getValue()).toLocaleString('ar-PS')}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الرقابة والتحكم',
        cell: (info) => {
          const rowReview = info.row.original;
          return (
            <button
              onClick={() => setConfirmDeleteReview(rowReview)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-error/20 bg-error/5 text-error transition-all hover:bg-error hover:text-white"
              title="حذف المراجعة والتعليق"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredReviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 left-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-white shadow-lg`}
          style={{ backgroundColor: toast.type === 'success' ? '#165A34' : '#EF4444' }}
          dir="rtl"
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1 text-right" dir="rtl">
        <h2 className="text-2xl font-bold text-on-surface">إدارة وتقييمات المنصة</h2>
        <p className="text-[12px] text-muted-gray mt-0.5">مراقبة الجودة، مراجعة آراء الزبائن، والتحكم في حذف التعليقات المسيئة والنابية</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-3 mt-margin-standard" dir="rtl">
        <StatCard icon="rate_review" label="إجمالي تقييمات ومراجعات المنصة" value={String(stats.totalReviews)} tone="primary" />
        <StatCard icon="star" label="متوسط تقييم المتاجر بالمنصة" value={`${stats.avgBusinessRating.toFixed(1)} / 5.0`} tone="tertiary" />
        <StatCard icon="comment" label="المراجعات المرفقة بتعليق مكتوب" value={String(stats.withComments)} tone="secondary" />
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm mt-margin-standard" dir="rtl">
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الزبون أو نص التعليق..."
              className="h-11 w-full rounded-lg border border-border-beige pr-11 pl-4 text-[13px] text-on-surface placeholder:text-muted-gray focus:border-primary focus:outline-none"
            />
          </div>

          {/* Business Select */}
          <div className="relative">
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-8 text-[13px] text-on-surface focus:border-primary focus:outline-none appearance-none font-bold"
            >
              <option value="ALL">كل المتاجر</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Driver Select */}
          <div className="relative">
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-8 text-[13px] text-on-surface focus:border-primary focus:outline-none appearance-none font-bold"
            >
              <option value="ALL">كل السائقين</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user?.name ?? 'سائق غير معروف'}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Rating filter select */}
          <div className="relative">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-8 text-[13px] text-on-surface focus:border-primary focus:outline-none appearance-none font-bold"
            >
              <option value="ALL">كل التقييمات</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 نجوم)</option>
              <option value="4">⭐⭐⭐⭐ (4 نجوم)</option>
              <option value="3">⭐⭐⭐ (3 نجوم)</option>
              <option value="2">⭐⭐ (نجمتان)</option>
              <option value="1">⭐ (نجمة واحدة)</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>
        </div>

        {/* Datatable */}
        {isReviewsLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-gray">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-[13px] font-bold">جاري تحميل مراجعات المنصة...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-surface-container-low text-[13px] text-on-surface border-b border-border font-semibold">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-6 py-4">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border-beige">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-container-low/20">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-3.5 text-[13px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredReviews.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-gray">
                      لا توجد أي مراجعة مطابقة للمحددات وشروط البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredReviews.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-border-beige pt-4">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-gray font-bold">
                  <span>صفحة</span>
                  <span className="text-on-surface">{table.getState().pagination.pageIndex + 1}</span>
                  <span>من</span>
                  <span className="text-on-surface">{table.getPageCount()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border-beige px-3.5 text-[12px] font-bold text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-40"
                  >
                    السابق
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border-beige px-3.5 text-[12px] font-bold text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-40"
                  >
                    التالي
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Delete Review */}
      {confirmDeleteReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteReview(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">هل أنت متأكد من حذف هذه المراجعة؟</h3>
              <p className="mt-2 text-[12px] text-muted-gray leading-relaxed">
                ستقوم بحذف تعليق وتقييم الزبون <span className="font-bold text-on-surface">"{confirmDeleteReview.order?.customer?.name ?? '—'}"</span> لمتجر <span className="font-bold text-on-surface">"{confirmDeleteReview.order?.business?.name ?? '—'}"</span> نهائياً. 
                سيؤدي ذلك إلى إعادة حساب متوسط التقييم للمتجر وللسائق فوراً.
              </p>
            </div>

            <div className="mt-6 flex justify-center gap-3 border-t border-border-beige pt-4">
              <button
                onClick={() => setConfirmDeleteReview(null)}
                className="h-11 flex-1 rounded-xl border border-border-beige bg-white text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteReviewMutation.mutate(confirmDeleteReview.id)}
                disabled={deleteReviewMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-error text-[13px] font-bold text-white shadow-md hover:bg-error/90 transition-all disabled:opacity-50"
              >
                {deleteReviewMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
