import ProjectPreview from '../../components/ProjectPreview.jsx';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { localData, useLocalData } from '../../localData.js';
import { fmtDate, fmtTime } from '../../format.js';
import { Bar, Button, CloseButton, Overlay, ExternalButton, Card, Chip, ErrorBox, Field, Icon, Loading, Page, Range, useAction } from '../../components/ui.jsx';

// ---------- تفاصيل المشروع والمراجعة التفاعلية ----------
export function ProjectDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLocalData(`/client/projects/${id}`);
  const [commentModalSection, setCommentModalSection] = useState(null);
  const [newCommentBody, setNewCommentBody] = useState('');
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const { busy, err, run } = useAction();

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const { project, comments = [] } = data;
  const sections = project.sections || [];

  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!newCommentBody.trim() || !commentModalSection) return;
    const ok = await run(
      () => localData(`/client/projects/${project.id}/comments`, {
        method: 'POST',
        body: { section_id: commentModalSection.id, content: newCommentBody.trim() },
      }),
      'تم إرسال ملاحظتك لفريق العمل بنجاح'
    );
    if (ok) {
      setNewCommentBody('');
      setCommentModalSection(null);
      reload();
    }
  };

  const handleReply = async (commentId) => {
    if (!replyBody.trim()) return;
    const ok = await run(
      () => localData(`/client/projects/${project.id}/comments/${commentId}/reply`, {
        method: 'POST',
        body: { content: replyBody.trim() },
      }),
      'تم إرسال ردك بنجاح'
    );
    if (ok) {
      setReplyBody('');
      setReplyTargetId(null);
      reload();
    }
  };

  const openCommentCount = comments.filter((c) => c.status !== 'resolved').length;

  return (
    <Page
      title={project.name}
      sub="المعاينة المباشرة وإبداء الملاحظات على أقسام المشروع"
      back={{ to: '/portal', label: 'العودة للرئيسية' }}
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
      {/* Overview Status Bar */}
      <Card hl className="overview-hero">
        <div className="overview-progress-heading">
          <div className="overview-progress-value">
            <h2>نسبة إنجاز المشروع</h2>
            <strong className="stat">{project.progress}%</strong>
          </div>
          <div className="row gap-3">
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
              {comments.length} إجمالي الملاحظات ({openCommentCount} بانتظار الإدارة)
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

      {/* Production Website Live Preview Section */}
      {project.production_url && (
        <ProjectPreview url={project.production_url} title={project.name} sections={sections} comments={comments} onComment={(section) => { setCommentModalSection(section); setNewCommentBody(''); }} />
      )}

      {/* Interactive Review Sections (Figma & Notion Hover Comments) */}
      <div className="stack gap-4">
        <div className="row between items-center">
          <div>
            <h2 className="text-xl font-bold text-ink">مراجعة أقسام ومواصفات المشروع</h2>
            <p className="text-xs text-muted">
              حرّك المؤشر فوق أي قسم أو انقر على زر القلم ✏️ لإضافة ملاحظة أو طلب استفسار لفريق العمل.
            </p>
          </div>
          <span className="text-xs text-muted bg-surface-sunken px-3 py-1.5 rounded-xl border border-line">
            وضع القراءة والتعليق فقط (حساب العميل)
          </span>
        </div>

        <div className="review-sections-list">
          {sections.map((section) => {
            const sectionComments = comments.filter((c) => c.section_id === section.id);
            return (
              <div key={section.id} className="review-section-card group">
                <div className="review-section-header">
                  <div className="review-section-titles">
                    <h3 className="review-section-title">{section.title}</h3>
                    {section.subtitle && <span className="review-section-sub">{section.subtitle}</span>}
                  </div>
                  <button
                    type="button"
                    className="review-comment-trigger"
                    onClick={() => {
                      setCommentModalSection(section);
                      setNewCommentBody('');
                    }}
                    title="إضافة ملاحظة على هذا القسم"
                  >
                    <Icon name="pencil" className="size-3.5" />
                    <span>إضافة ملاحظة</span>
                  </button>
                </div>

                {/* Section Content - Strict Read Only */}
                <p className="review-section-body">{section.content}</p>

                {/* Section Inline Comments Thread */}
                {sectionComments.length > 0 && (
                  <div className="section-comments-container">
                    <span className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
                      <Icon name="comment-add" className="size-3 text-brand-700" />
                      <span>الملاحظات والمناقشات على هذا القسم ({sectionComments.length}):</span>
                    </span>

                    {sectionComments.map((comment) => (
                      <div key={comment.id} className="section-comment-card">
                        <div className="section-comment-header">
                          <div className="row gap-2 items-center">
                            <strong>{comment.author_name || 'العميل'}</strong>
                            <span className="muted small">{fmtTime(comment.created_at)}</span>
                          </div>
                          <span className={`comment-status-pill ${comment.status}`}>
                            {comment.status === 'resolved' ? 'تم الحل والمطابقة ✓' : comment.status === 'in_progress' ? 'قيد المعالجة' : 'مفتوح بانتظار الرد'}
                          </span>
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

                        {/* Reply Form */}
                        {replyTargetId === comment.id ? (
                          <div className="stack gap-2 mt-2 pt-2 border-t border-line-soft">
                            <textarea
                              className="w-full text-xs p-2.5 rounded-lg border border-control-border bg-white"
                              rows={2}
                              placeholder="اكتب ردك على هذه الملاحظة..."
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <div className="row gap-2 justify-end">
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
                                onClick={() => handleReply(comment.id)}
                              >
                                إرسال الرد
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="row justify-end mt-1">
                            <Button type="button" variant="link" size="small" onClick={() => {
                                setReplyTargetId(comment.id);
                                setReplyBody('');
                              }}>رد على هذه المحادثة</Button>
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

      {/* New Comment Modal / Popover */}
      {commentModalSection && (
        <Overlay>
        <div className="portal-modal-backdrop" onClick={() => setCommentModalSection(null)}>
          <div className="portal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row between items-center mb-4 pb-3 border-b border-line-soft">
              <div>
                <h3 className="text-base font-bold text-ink">إضافة ملاحظة أو طلب استفسار</h3>
                <span className="text-xs text-brand-700 font-semibold">
                  قسم: {commentModalSection.title}
                </span>
              </div>
              <CloseButton onClick={() => setCommentModalSection(null)} />
            </div>

            <form onSubmit={handleCreateComment} className="stack gap-4">
              <Field label="نص الملاحظة أو التعديل المطلوب" error={err}>
                <textarea
                  rows={4}
                  required
                  autoFocus
                  className="w-full p-3 text-sm rounded-xl border border-control-border bg-surface-sunken"
                  placeholder="مثال: نود التحقق من توافق حجم الشعار أو إضافة خيار تغليف الهدايا..."
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                />
              </Field>

              <div className="row justify-end gap-2 pt-2 border-t border-line-soft">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCommentModalSection(null)}
                >
                  إلغاء
                </Button>
                <Button type="submit" loading={busy}>
                  إرسال الملاحظة
                </Button>
              </div>
            </form>
          </div>
        </div>
        </Overlay>
      )}
    </Page>
  );
}
