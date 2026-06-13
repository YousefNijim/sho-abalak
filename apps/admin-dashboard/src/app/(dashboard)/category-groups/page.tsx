'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryGroupsApi, businessesApi } from '@shu/api-client';
import type { CategoryTemplate } from '@shu/api-client';

export default function CategoryGroupsPage() {
  const qc = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'businesses'>('templates');

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', imageUrl: '', parentId: '' });
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [templateImagePreview, setTemplateImagePreview] = useState<string | null>(null);

  const [showAssign, setShowAssign] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);

  const [editingTemplate, setEditingTemplate] = useState<CategoryTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');

  // Data
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['admin-category-groups'],
    queryFn: () => categoryGroupsApi.list(),
  });

  const { data: selectedGroup } = useQuery({
    queryKey: ['admin-category-group', selectedGroupId],
    queryFn: () => categoryGroupsApi.getById(selectedGroupId!),
    enabled: !!selectedGroupId,
  });

  const { data: allBusinesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list({ type: 'STORE' }),
    enabled: showAssign,
  });

  // Mutations
  const createGroup = useMutation({
    mutationFn: () => categoryGroupsApi.create({ name: groupForm.name, description: groupForm.description || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-category-groups'] }); setShowCreateGroup(false); setGroupForm({ name: '', description: '' }); },
  });

  const deleteGroup = useMutation({
    mutationFn: (id: string) => categoryGroupsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-category-groups'] }); if (selectedGroupId) setSelectedGroupId(null); },
  });

  const createTemplate = useMutation({
    mutationFn: () => categoryGroupsApi.createTemplate(selectedGroupId!, {
      name: templateForm.name,
      imageUrl: templateForm.imageUrl || undefined,
      parentId: templateForm.parentId || undefined,
    }),
    onSuccess: async (data) => {
      if (templateImageFile) {
        await categoryGroupsApi.uploadTemplateImage(data.id, templateImageFile);
      }
      qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] });
      setShowCreateTemplate(false);
      setTemplateForm({ name: '', imageUrl: '', parentId: '' });
      setTemplateImageFile(null);
      setTemplateImagePreview(null);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, name, file }: { id: string; name: string; file?: File }) => 
      file 
        ? categoryGroupsApi.uploadTemplateImage(id, file).then(() => categoryGroupsApi.updateTemplate(id, { name }))
        : categoryGroupsApi.updateTemplate(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] }); setEditingTemplate(null); },
  });

  const uploadExistingImage = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => categoryGroupsApi.uploadTemplateImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => categoryGroupsApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] }),
  });

  const assignBusinesses = useMutation({
    mutationFn: () => categoryGroupsApi.assignToBusinesses(selectedGroupId!, selectedBusinessIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] });
      setShowAssign(false);
      setSelectedBusinessIds([]);
    },
  });

  const removeAssignment = useMutation({
    mutationFn: ({ groupId, businessId }: { groupId: string; businessId: string }) =>
      categoryGroupsApi.removeFromBusiness(groupId, businessId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-category-group', selectedGroupId] }),
  });

  const templates: CategoryTemplate[] = (selectedGroup as any)?.templates ?? [];
  const assignments: any[] = (selectedGroup as any)?.assignments ?? [];

  // Flatten templates for parentId picker
  const flatTemplates = templates.flatMap((t) => [t, ...(t.children ?? [])]);

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="flex h-full gap-0" dir="rtl">
      {/* ── LEFT PANEL: Groups list ── */}
      <div className="w-72 border-l flex flex-col bg-white shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">مجموعات التصنيفات</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90"
          >
            + جديد
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {groups.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-8">لا توجد مجموعات</p>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setActiveTab('templates'); }}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selectedGroupId === g.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`حذف "${g.name}"؟`)) deleteGroup.mutate(g.id); }}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  حذف
                </button>
                <div className="text-right">
                  <p className="font-semibold text-sm">{g.name}</p>
                  {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {(g as any)._count?.templates ?? 0} تصنيف · {(g as any)._count?.assignments ?? 0} متجر
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: Group details ── */}
      {!selectedGroupId ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          اختر مجموعة لعرض تفاصيلها
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4 bg-white">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'templates' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                التصنيفات
              </button>
              <button
                onClick={() => setActiveTab('businesses')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'businesses' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                المتاجر المُعيَّنة ({assignments.length})
              </button>
            </div>
            <h3 className="font-bold text-lg mr-auto">{selectedGroup?.name}</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ── Templates Tab ── */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <button
                  onClick={() => { 
                    setShowCreateTemplate(true); 
                    setTemplateForm({ name: '', imageUrl: '', parentId: '' }); 
                    setTemplateImageFile(null);
                    setTemplateImagePreview(null);
                  }}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                >
                  + إضافة تصنيف رئيسي
                </button>

                {templates.map((tpl) => (
                  <div key={tpl.id} className="border rounded-xl overflow-hidden">
                    {/* Main template row */}
                    <TemplateRow
                      tpl={tpl}
                      onEdit={() => { setEditingTemplate(tpl); setEditTemplateName(tpl.name); }}
                      onDelete={() => { if (confirm(`حذف "${tpl.name}"؟`)) deleteTemplate.mutate(tpl.id); }}
                      onUploadImage={(file) => uploadExistingImage.mutate({ id: tpl.id, file })}
                    />

                    {/* Children */}
                    {(tpl.children ?? []).map((child) => (
                      <TemplateRow
                        key={child.id}
                        tpl={child}
                        isChild
                        onEdit={() => { setEditingTemplate(child); setEditTemplateName(child.name); }}
                        onDelete={() => { if (confirm(`حذف "${child.name}"؟`)) deleteTemplate.mutate(child.id); }}
                        onUploadImage={(file) => uploadExistingImage.mutate({ id: child.id, file })}
                      />
                    ))}

                    {/* Add sub-category */}
                    <button
                      onClick={() => { 
                        setShowCreateTemplate(true); 
                        setTemplateForm({ name: '', imageUrl: '', parentId: tpl.id }); 
                        setTemplateImageFile(null);
                        setTemplateImagePreview(null);
                      }}
                      className="w-full text-right px-4 py-2 text-xs text-gray-400 hover:text-primary hover:bg-gray-50 border-t"
                    >
                      + إضافة فرعي لـ "{tpl.name}"
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Businesses Tab ── */}
            {activeTab === 'businesses' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowAssign(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                >
                  + إسناد لمتجر
                </button>

                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-xl">
                    <button
                      onClick={() => { if (confirm('إلغاء التعيين؟')) removeAssignment.mutate({ groupId: selectedGroupId!, businessId: a.businessId }); }}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      إلغاء
                    </button>
                    <div className="text-right">
                      <p className="font-medium text-sm">{a.business?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.business?.isOpen ? 'مفتوح' : 'مغلق'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Create Group ── */}
      {showCreateGroup && (
        <Modal title="مجموعة تصنيفات جديدة" onClose={() => setShowCreateGroup(false)}>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-right text-sm"
              placeholder="اسم المجموعة *"
              value={groupForm.name}
              onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-right text-sm"
              placeholder="وصف (اختياري)"
              value={groupForm.description}
              onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button
              disabled={!groupForm.name.trim() || createGroup.isPending}
              onClick={() => createGroup.mutate()}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createGroup.isPending ? 'جاري الحفظ...' : 'إنشاء'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Create Template ── */}
      {showCreateTemplate && (
        <Modal title={templateForm.parentId ? 'إضافة تصنيف فرعي' : 'إضافة تصنيف رئيسي'} onClose={() => setShowCreateTemplate(false)}>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-right text-sm"
              placeholder="اسم التصنيف *"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="flex gap-4 items-center">
              {templateImagePreview && (
                <img src={templateImagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border" />
              )}
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1 text-right">الصورة (اختياري - يفضل 1:1)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setTemplateImageFile(file);
                      setTemplateImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            {!templateForm.parentId && flatTemplates.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-right">التصنيف الأب (اختياري)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                  value={templateForm.parentId}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, parentId: e.target.value }))}
                >
                  <option value="">بدون — تصنيف رئيسي</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              disabled={!templateForm.name.trim() || createTemplate.isPending}
              onClick={() => createTemplate.mutate()}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createTemplate.isPending ? 'جاري الحفظ...' : 'إضافة'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit Template ── */}
      {editingTemplate && (
        <Modal title="تعديل التصنيف" onClose={() => setEditingTemplate(null)}>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-right text-sm"
              value={editTemplateName}
              onChange={(e) => setEditTemplateName(e.target.value)}
            />
            <button
              disabled={!editTemplateName.trim() || updateTemplate.isPending}
              onClick={() => updateTemplate.mutate({ id: editingTemplate.id, name: editTemplateName })}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Assign Businesses ── */}
      {showAssign && (
        <Modal title="إسناد المجموعة لمتاجر" onClose={() => setShowAssign(false)}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {allBusinesses.map((b) => {
              const alreadyAssigned = assignments.some((a: any) => a.businessId === b.id);
              return (
                <label key={b.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${alreadyAssigned ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    disabled={alreadyAssigned}
                    checked={selectedBusinessIds.includes(b.id) || alreadyAssigned}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBusinessIds((ids) => [...ids, b.id]);
                      else setSelectedBusinessIds((ids) => ids.filter((id) => id !== b.id));
                    }}
                    className="ml-2"
                  />
                  <span className="text-sm text-right flex-1">{b.name}{alreadyAssigned ? ' (مُعيَّن)' : ''}</span>
                </label>
              );
            })}
          </div>
          <button
            disabled={selectedBusinessIds.length === 0 || assignBusinesses.isPending}
            onClick={() => assignBusinesses.mutate()}
            className="w-full mt-3 bg-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {assignBusinesses.isPending ? 'جاري الحفظ...' : `تعيين (${selectedBusinessIds.length})`}
          </button>
        </Modal>
      )}
    </div>
  );
}

function TemplateRow({ tpl, isChild = false, onEdit, onDelete, onUploadImage }: {
  tpl: CategoryTemplate;
  isChild?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUploadImage: (file: File) => void;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${isChild ? 'bg-gray-50 border-t' : 'bg-white'}`}>
      <div className="flex gap-2">
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded">حذف</button>
        <button onClick={onEdit} className="text-gray-500 hover:text-primary text-xs px-2 py-1 rounded">تعديل</button>
      </div>
      <div className="text-right flex items-center gap-2 group relative">
        <div className="relative overflow-hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border">
          {tpl.imageUrl ? (
            <img src={tpl.imageUrl} alt={tpl.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-gray-400">صورة</span>
          )}
          <input 
            type="file" 
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files?.[0]) onUploadImage(e.target.files[0]);
            }}
            title="تغيير الصورة"
          />
        </div>
        <span className={`text-sm font-medium ${isChild ? 'text-gray-600' : 'text-gray-800'}`}>
          {isChild ? '↳ ' : ''}{tpl.name}
        </span>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
