import ProjectPreview from '../../components/ProjectPreview.jsx';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { localData, useLocalData } from '../../localData.js';
import { fmtDate, fmtTime } from '../../format.js';
import { Bar, Button, ButtonLink, CloseButton, ExternalButton, Card, Chip, Empty, ErrorBox, Field, FormError, Icon, Loading, Page, Range, useAction } from '../../components/ui.jsx';

// ---------- إدارة المشاريع (Admin Projects) ----------
export function AdminProjects() {
  const { data: projects, error, loading, reload } = useLocalData('/admin/projects');
  const { data: clientsData } = useLocalData('/admin/clients');
  const [q, setQ] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form fields for new project
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formStatus, setFormStatus] = useState('in_progress');
  const [formProgress, setFormProgress] = useState(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');

  const { busy, run } = useAction();

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const clients = Array.isArray(clientsData) ? clientsData : [];
  const list = (projects || []).filter((p) =>
    (p.name + p.client_name + p.production_url).toLowerCase().includes(q.toLowerCase())
  );

  const openCreateModal = () => {
    setFormName('');
    setFormUrl('');
    setFormClientId(clients[0]?.id || '');
    setFormStatus('in_progress');
    setFormProgress(0);
    setFormStartDate('');
    setFormEndDate('');
    setFormDesc('');
    setFormError('');
    setCreateModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { setFormError('اسم المشروع مطلوب'); return; }
    if (!formUrl.trim() || !/^https?:\/\//i.test(formUrl.trim())) {
      setFormError('رابط الإنتاج يجب أن يبدأ بـ https:// أو http://');
      return;
    }
    if (!formClientId) { setFormError('اختر العميل المخصص له هذا المشروع'); return; }

    const ok = await run(
      () => localData('/admin/projects', {
        method: 'POST',
        body: {
          name: formName.trim(),
          production_url: formUrl.trim(),
          client_id: formClientId,
          status: formStatus,
          progress: formProgress,
          start_date: formStartDate,
          end_date: formEndDate,
          description: formDesc.trim(),
        },
      }),
      'تم إنشاء وتخصيص المشروع للعميل بنجاح'
    );
    if (ok) {
      setCreateModal(false);
      reload();
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editProject.name.trim()) return;
    if (!editProject.production_url || !/^https?:\/\//i.test(editProject.production_url)) {
      setFormError('رابط الإنتاج يجب أن يبدأ بـ https:// أو http://');
      return;
    }

    const ok = await run(
      () => localData(`/admin/projects/${editProject.id}`, {
        method: 'PATCH',
        body: {
          name: editProject.name,
          production_url: editProject.production_url,
          client_id: editProject.client_id,
          status: editProject.status,
          progress: editProject.progress,
          start_date: editProject.start_date,
          end_date: editProject.end_date,
          description: editProject.description,
        },
      }),
      'تم تحديث بيانات المشروع بنجاح'
    );
    if (ok) {
      setEditProject(null);
      reload();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const ok = await run(
      () => localData(`/admin/projects/${deleteConfirm.id}`, { method: 'DELETE' }),
      'تم حذف المشروع والملاحظات التابعة له'
    );
    if (ok) {
      setDeleteConfirm(null);
      reload();
    }
  };

  const inProgressCount = (projects || []).filter((p) => p.status !== 'completed').length;
  const completedCount = (projects || []).filter((p) => p.status === 'completed').length;
  const totalComments = (projects || []).reduce((acc, p) => acc + (p.comment_count || 0), 0);

  return (
    <Page
      title="إدارة المشاريع"
      sub="إنشاء المشاريع وتخصيصها للعملاء ومتابعة الروابط الحية وملاحظات المراجعة"
      actions={<Button onClick={openCreateModal}><Icon name="add" className="size-4" /> مشروع جديد</Button>}
    >
      {/* Overview Stats */}
      <div className="portal-metrics-grid">
        <div className="portal-metric-card">
          <span className="portal-metric-value">{projects.length}</span>
          <span className="portal-metric-label">إجمالي المشاريع</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{inProgressCount}</span>
          <span className="portal-metric-label">قيد التنفيذ والتطوير</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{completedCount}</span>
          <span className="portal-metric-label">مشاريع مكتملة</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{totalComments}</span>
          <span className="portal-metric-label">ملاحظات مراجعة العملاء</span>
        </div>
      </div>

      <Card
        title="قائمة المشاريع الحية"
        actions={
          <input
            type="search"
            className="text-xs p-2 rounded-xl border border-control-border bg-surface-sunken w-48"
            placeholder="بحث في المشاريع..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
      >
        {list.length ? (
          <div className="projects-grid">
            {list.map((p) => (
              <div key={p.id} className="project-card">
                <div>
                  <div className="project-card-header">
                    <div className="project-card-title-wrap">
                      <h3 className="project-card-title">{p.name}</h3>
                      <span className="text-xs font-semibold text-brand-800">
                        العميل: {p.client_name} ({p.client_email})
                      </span>
                      {p.production_url && (
                        <a
                          href={p.production_url}
                          target="_blank"
                          rel="noreferrer"
                          className="project-card-url"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="external" className="size-3" />
                          <span>{p.production_url}</span>
                        </a>
                      )}
                    </div>
                    <Chip tone={p.status === 'completed' ? 'green' : 'amber'}>
                      {p.status === 'completed' ? 'مكتمل' : 'قيد التطوير'}
                    </Chip>
                  </div>
                  {p.description && <p className="project-card-desc">{p.description}</p>}
                </div>

                <div className="stack gap-3 mt-auto">
                  <div className="col gap-1.5">
                    <div className="row between text-xs font-semibold">
                      <span>نسبة الإنجاز</span>
                      <span className="text-brand-800">{p.progress}%</span>
                    </div>
                    <Bar value={p.progress} label={`إنجاز ${p.name}`} />
                  </div>

                  <div className="project-card-meta">
                    {(p.start_date || p.end_date) ? (
                      <span className="truncate">
                        <Range from={fmtDate(p.start_date)} to={fmtDate(p.end_date)} />
                      </span>
                    ) : (
                      <span>مستمر</span>
                    )}
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                      <Icon name="comment-add" className="size-3.5" />
                      <span>{p.comment_count || 0} ملاحظة ({p.open_comment_count || 0} مفتوح)</span>
                    </span>
                  </div>

                  <div className="row gap-2 pt-2 border-t border-line-soft">
                    <ButtonLink to={`/admin/projects/${p.id}`} variant="primary" size="small" className="flex-1">
                      المعاينة والملاحظات ✏️
                    </ButtonLink>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setEditProject({ ...p })}
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setDeleteConfirm(p)}
                      className="text-bad-700 hover:bg-bad-50"
                    >
                      <Icon name="trash" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>لا توجد مشاريع مطابقة. انقر على «مشروع جديد» لإضافة مشروع وربطه بعميل.</Empty>
        )}
      </Card>

      {/* Create Project Modal */}
      {createModal && (
        <div className="portal-modal-backdrop" onClick={() => setCreateModal(false)}>
          <div className="portal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row between items-center mb-4 pb-3 border-b border-line-soft">
              <div>
                <h3 className="text-base font-bold text-ink">إضافة مشروع جديد وتخصيصه للعميل</h3>
                <span className="text-xs text-muted">سيظهر المشروع فور إنشائه في لوحة تحكم العميل المحدد</span>
              </div>
              <CloseButton onClick={() => setCreateModal(false)} />
            </div>

            <form onSubmit={handleCreate} className="stack gap-4">
              {formError && <FormError message={formError} />}

              <Field label="اسم المشروع" required>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: متجر إلكتروني للعطور الفاخرة"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </Field>

              <Field label="رابط الموقع الحي (Production URL)" required>
                <input
                  type="url"
                  required
                  dir="ltr"
                  className="ltr"
                  placeholder="https://example.com"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </Field>

              <Field label="تخصيص للعميل" required>
                <select
                  required
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-control-border bg-surface"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || c.contact_name})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="حالة المشروع">
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-control-border bg-surface"
                  >
                    <option value="in_progress">قيد التنفيذ والتطوير</option>
                    <option value="review">مرحلة المراجعة والاعتماد</option>
                    <option value="completed">مكتمل ومدشن</option>
                    <option value="paused">متوقف مؤقتاً</option>
                  </select>
                </Field>

                <Field label={`نسبة الإنجاز: ${formProgress}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={formProgress}
                    onChange={(e) => setFormProgress(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="تاريخ البدء">
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </Field>
                <Field label="التسليم المتوقع">
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="وصف موجز للمشروع">
                <textarea
                  rows={3}
                  placeholder="أهداف المشروع والميزات الرئيسية..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </Field>

              <div className="row justify-end gap-2 pt-3 border-t border-line-soft">
                <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>
                  إلغاء
                </Button>
                <Button type="submit" loading={busy}>
                  إنشاء وتخصيص المشروع
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div className="portal-modal-backdrop" onClick={() => setEditProject(null)}>
          <div className="portal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row between items-center mb-4 pb-3 border-b border-line-soft">
              <h3 className="text-base font-bold text-ink">تعديل بيانات المشروع</h3>
              <CloseButton onClick={() => setEditProject(null)} />
            </div>

            <form onSubmit={handleEditSave} className="stack gap-4">
              <Field label="اسم المشروع" required>
                <input
                  type="text"
                  required
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                />
              </Field>

              <Field label="رابط الموقع الحي (Production URL)" required>
                <input
                  type="url"
                  required
                  dir="ltr"
                  className="ltr"
                  value={editProject.production_url}
                  onChange={(e) => setEditProject({ ...editProject, production_url: e.target.value })}
                />
              </Field>

              <Field label="العميل المخصص">
                <select
                  value={editProject.client_id}
                  onChange={(e) => setEditProject({ ...editProject, client_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-control-border bg-surface"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || c.contact_name})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="الحالة">
                  <select
                    value={editProject.status}
                    onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-control-border bg-surface"
                  >
                    <option value="in_progress">قيد التنفيذ والتطوير</option>
                    <option value="review">مرحلة المراجعة والاعتماد</option>
                    <option value="completed">مكتمل ومدشن</option>
                    <option value="paused">متوقف مؤقتاً</option>
                  </select>
                </Field>

                <Field label={`نسبة الإنجاز: ${editProject.progress}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editProject.progress}
                    onChange={(e) => setEditProject({ ...editProject, progress: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="تاريخ البدء">
                  <input
                    type="date"
                    value={editProject.start_date || ''}
                    onChange={(e) => setEditProject({ ...editProject, start_date: e.target.value })}
                  />
                </Field>
                <Field label="التسليم المتوقع">
                  <input
                    type="date"
                    value={editProject.end_date || ''}
                    onChange={(e) => setEditProject({ ...editProject, end_date: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="الوصف">
                <textarea
                  rows={3}
                  value={editProject.description || ''}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                />
              </Field>

              <div className="row justify-end gap-2 pt-3 border-t border-line-soft">
                <Button type="button" variant="secondary" onClick={() => setEditProject(null)}>
                  إلغاء
                </Button>
                <Button type="submit" loading={busy}>
                  حفظ التعديلات
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="portal-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="portal-modal-panel max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="row gap-3 items-start mb-4">
              <span className="p-2.5 rounded-xl bg-bad-100 text-bad-700 flex-none">
                <Icon name="trash" className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">حذف المشروع نهائياً؟</h3>
                <p className="text-xs text-muted mt-1">
                  هل أنت متأكد من رغبتك في حذف مشروع «{deleteConfirm.name}»؟ سيتم حذف جميع الملاحظات والمناقشات المرتبطة به.
                </p>
              </div>
            </div>

            <div className="row justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteConfirm(null)}>
                تراجع
              </Button>
              <Button type="button" loading={busy} onClick={handleDelete} className="bg-bad-700 hover:bg-bad-800 text-white">
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ---------- صفحة تفاصيل المشروع للإدارة ومتابعة الملاحظات ----------
export function AdminProjectDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLocalData(`/admin/projects/${id}`);
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const { busy, run } = useAction();

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const { project, client, comments = [] } = data;
  const sections = project.sections || [];

  const handleAdminReply = async (commentId) => {
    if (!replyBody.trim()) return;
    const ok = await run(
      () => localData(`/admin/projects/${project.id}/comments/${commentId}/reply`, {
        method: 'POST',
        body: { content: replyBody.trim(), status: replyStatus },
      }),
      'تم إرسال رد الإدارة وتحديث حالة الملاحظة'
    );
    if (ok) {
      setReplyBody('');
      setReplyTargetId(null);
      reload();
    }
  };

  const handleStatusChange = async (commentId, newStatus) => {
    const ok = await run(
      () => localData(`/admin/projects/${project.id}/comments/${commentId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      }),
      'تم تحديث حالة الملاحظة'
    );
    if (ok) reload();
  };

  const openCount = comments.filter((c) => c.status !== 'resolved').length;

  return (
    <Page
      title={project.name}
      sub={`العميل المخصص: ${client?.name || 'غير معروف'} (${client?.email || ''})`}
      back={{ to: '/admin/projects', label: 'العودة لقائمة المشاريع' }}
      actions={
        <div className="row gap-2">
          <Chip tone={project.status === 'completed' ? 'green' : 'amber'}>
            {project.status === 'completed' ? 'المشروع مكتمل' : 'قيد التطوير'}
          </Chip>
          {project.production_url && (
            <ExternalButton href={project.production_url}>زيارة الموقع الحي</ExternalButton>
          )}
        </div>
      }
    >
      {/* Overview Card */}
      <Card hl className="overview-hero">
        <div className="overview-progress-heading">
          <div className="overview-progress-value">
            <h2>نسبة إنجاز المشروع</h2>
            <strong className="stat">{project.progress}%</strong>
          </div>
          <div className="row gap-3">
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
              {comments.length} إجمالي الملاحظات ({openCount} بانتظار الإجراء)
            </span>
          </div>
        </div>
        <Bar value={project.progress} label={`إنجاز ${project.name}`} />
        {(project.start_date || project.end_date) && (
          <span className="muted text-xs">
            <Range from={fmtDate(project.start_date)} to={fmtDate(project.end_date)} />
          </span>
        )}
      </Card>

      {/* Production Website Live Preview */}
      {project.production_url && (
        <ProjectPreview url={project.production_url} title={project.name} sections={sections} comments={comments} />
      )}

      {/* Interactive Review Sections & Client Feedback */}
      <div className="stack gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">أقسام المشروع وملاحظات العميل</h2>
          <p className="text-xs text-muted">
            راجع ملاحظات العميل على كل قسم، حدّث حالة الملاحظة، واكتب الردود المباشرة ليراها العميل في لوحته.
          </p>
        </div>

        <div className="review-sections-list">
          {sections.map((section) => {
            const sectionComments = comments.filter((c) => c.section_id === section.id);
            return (
              <div key={section.id} className="review-section-card">
                <div className="review-section-header">
                  <div className="review-section-titles">
                    <h3 className="review-section-title">{section.title}</h3>
                    {section.subtitle && <span className="review-section-sub">{section.subtitle}</span>}
                  </div>
                  <span className="text-xs font-semibold text-muted bg-surface-sunken px-2.5 py-1 rounded-lg">
                    {sectionComments.length} ملاحظات
                  </span>
                </div>

                <p className="review-section-body">{section.content}</p>

                {sectionComments.length > 0 && (
                  <div className="section-comments-container">
                    {sectionComments.map((comment) => (
                      <div key={comment.id} className="section-comment-card">
                        <div className="section-comment-header">
                          <div className="row gap-2 items-center">
                            <strong>{comment.author_name} ({comment.author === 'client' ? 'العميل' : 'الإدارة'})</strong>
                            <span className="muted small">{fmtTime(comment.created_at)}</span>
                          </div>

                          {/* Admin Status Changer */}
                          <div className="row gap-2 items-center">
                            <span className="text-xs text-muted">الحالة:</span>
                            <select
                              value={comment.status}
                              onChange={(e) => handleStatusChange(comment.id, e.target.value)}
                              className="text-xs p-1 rounded-lg border border-control-border bg-white"
                            >
                              <option value="open">مفتوح بانتظار الإجراء</option>
                              <option value="in_progress">قيد المعالجة</option>
                              <option value="resolved">تم الحل والمطابقة ✓</option>
                            </select>
                          </div>
                        </div>

                        <p className="text-xs text-ink leading-relaxed">{comment.content}</p>

                        {/* Thread Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="stack gap-2 mt-1">
                            {comment.replies.map((r) => (
                              <div key={r.id} className="comment-reply-item">
                                <div className="row between text-xs font-semibold">
                                  <span className={r.author === 'admin' ? 'text-brand-800' : 'text-ink'}>
                                    {r.author_name} {r.author === 'admin' && '(فريق الإدارة)'}
                                  </span>
                                  <span className="muted small font-normal">{fmtTime(r.created_at)}</span>
                                </div>
                                <p className="text-xs text-ink-soft mt-0.5">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Admin Reply Form */}
                        {replyTargetId === comment.id ? (
                          <div className="stack gap-2 mt-2 pt-2 border-t border-line-soft">
                            <textarea
                              className="w-full text-xs p-2.5 rounded-lg border border-control-border bg-white"
                              rows={2}
                              placeholder="اكتب رد فريق الإدارة للعميل..."
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <div className="row between items-center">
                              <label className="row gap-1.5 items-center text-xs">
                                <span>تحديث الحالة إلى:</span>
                                <select
                                  value={replyStatus}
                                  onChange={(e) => setReplyStatus(e.target.value)}
                                  className="text-xs p-1 rounded border border-control-border"
                                >
                                  <option value="resolved">تم الحل والمطابقة ✓</option>
                                  <option value="in_progress">قيد المعالجة</option>
                                  <option value="open">مفتوح</option>
                                </select>
                              </label>

                              <div className="row gap-2">
                                <Button
                                  size="small"
                                  variant="secondary"
                                  onClick={() => {
                                    setReplyTargetId(null);
                                    setReplyBody('');
                                  }}
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  size="small"
                                  loading={busy}
                                  onClick={() => handleAdminReply(comment.id)}
                                >
                                  إرسال رد الإدارة
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="row justify-end mt-1">
                            <Button type="button" variant="link" size="small" onClick={() => {
                                setReplyTargetId(comment.id);
                                setReplyBody('');
                              }}>كتابة رد من فريق الإدارة</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
