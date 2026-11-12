import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, ExternalButton, Icon, Loading, SegmentedControl } from './ui.jsx';

const VIEWPORTS = [
  { value: 'desktop', label: 'سطح المكتب', icon: 'monitor' },
  { value: 'tablet', label: 'لوحي', icon: 'tablet' },
  { value: 'mobile', label: 'هاتف', icon: 'smartphone' },
];

// يفحص الخادم رؤوس التضمين (X-Frame-Options / CSP) قبل عرض الموقع، ولا يعرض معاينة مزيفة أبدًا.
function SiteFrame({ url, viewport, fullscreen, onExitFullscreen }) {
  const [state, setState] = useState({ phase: 'checking' });
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let off = false;
    setState({ phase: 'checking' });
    setFrameLoaded(false);
    if (window.location.protocol === 'https:' && /^http:\/\//i.test(url)) {
      setState({ phase: 'blocked', message: 'الموقع يعمل بـ HTTP ولا يمكن تضمينه داخل صفحة آمنة (HTTPS).' });
      return undefined;
    }
    fetch(`/__frame-check?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok && /json/.test(r.headers.get('content-type') || '') ? r.json() : Promise.reject(new Error('check'))))
      .then((r) => { if (!off) setState(r.ok ? { phase: 'ready' } : { phase: 'blocked', message: r.message }); })
      .catch(() => { if (!off) setState({ phase: 'ready', unverified: true }); });
    return () => { off = true; };
  }, [url, attempt]);

  useEffect(() => {
    if (state.phase !== 'ready' || frameLoaded) return undefined;
    const t = setTimeout(() => setState({ phase: 'blocked', message: 'تعذر تحميل الموقع داخل الإطار (انتهت المهلة).' }), 20000);
    return () => clearTimeout(t);
  }, [state.phase, frameLoaded, attempt]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onExitFullscreen(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, onExitFullscreen]);

  return (
    <div className={`preview-stage ${fullscreen ? 'fullscreen' : ''}`}>
      <div className={`preview-iframe-wrapper ${viewport}`}>
        {state.phase === 'checking' && <div className="preview-state"><Loading /><span>جارٍ فحص إمكانية عرض الموقع…</span></div>}
        {state.phase === 'blocked' && (
          <div className="preview-state" role="alert">
            <Icon name="alert" className="size-8 text-warm-700" />
            <strong>تعذر عرض الموقع داخل اللوحة</strong>
            <span>{state.message}</span>
            <span className="text-xs text-muted">هذا قيد أمني من الموقع نفسه، ويمكنك فتحه مباشرة في تبويب جديد.</span>
            <div className="row gap-2 wrap justify-center">
              <ExternalButton href={url} variant="primary">فتح الموقع في نافذة جديدة</ExternalButton>
              <Button variant="secondary" size="small" onClick={() => setAttempt((n) => n + 1)}>إعادة المحاولة</Button>
            </div>
          </div>
        )}
        {state.phase === 'ready' && (
          <>
            {state.unverified && <div className="preview-unverified" role="status">تعذر التحقق مسبقًا من إمكانية التضمين. إذا ظهر الإطار فارغًا أو برسالة حظر فاستخدم «فتح في نافذة جديدة».</div>}
            {!frameLoaded && <div className="preview-state preview-state-overlay"><Loading /><span>جارٍ تحميل الموقع…</span></div>}
            <iframe
              key={`${url}-${attempt}`}
              title="معاينة الموقع الحي"
              src={url}
              className="preview-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setFrameLoaded(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}

// لوحة جانبية داخل وضع ملء الشاشة: أقسام المشروع والملاحظات، مع إضافة ملاحظة للعميل.
function PreviewSidebar({ title, sections, comments, onComment }) {
  return (
    <aside className="preview-aside" aria-label="أقسام المشروع والملاحظات">
      <div className="preview-aside-head">
        <strong>{title}</strong>
        <span className="text-xs text-muted">{comments.length} ملاحظة على {sections.length} أقسام</span>
      </div>
      <div className="preview-aside-body">
        {sections.map((section) => {
          const list = comments.filter((c) => c.section_id === section.id);
          return (
            <section key={section.id} className="preview-aside-section">
              <div className="row between items-center gap-2">
                <h4>{section.title}</h4>
                {onComment && (
                  <Button type="button" variant="link" size="small" onClick={() => onComment(section)}>
                    <Icon name="pencil" className="size-3.5" /><span>ملاحظة</span>
                  </Button>
                )}
              </div>
              {list.length === 0 && <p className="text-xs text-muted">لا توجد ملاحظات.</p>}
              {list.map((c) => (
                <div key={c.id} className="preview-aside-comment">
                  <span className="text-xs font-semibold">{c.author === 'client' ? 'العميل' : 'الإدارة'}</span>
                  <p>{c.content}</p>
                  {(c.replies || []).map((r) => (
                    <p key={r.id} className="preview-aside-reply">{r.content}</p>
                  ))}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

export default function ProjectPreview({ url, title = 'المشروع', sections = [], comments = [], onComment }) {
  const [viewport, setViewport] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 720);
  const hasPanel = sections.length > 0;

  const toolbar = (
    <div className="preview-toolbar">
      <div className="row gap-2 items-center">
        {fullscreen && hasPanel && (
          <Button
            variant={panelOpen ? 'primary' : 'secondary'}
            size="small"
            className="preview-panel-toggle"
            title={panelOpen ? 'إخفاء اللوحة الجانبية' : 'إظهار اللوحة الجانبية'}
            aria-pressed={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <Icon name={panelOpen ? 'panel-close' : 'panel-open'} className="size-4" />
            <span className="preview-panel-toggle-label">الأقسام والملاحظات</span>
            <span className="preview-panel-badge">{comments.length}</span>
          </Button>
        )}
        <span className="text-xs font-bold text-ink">{fullscreen ? title : 'معاينة الموقع الحي:'}</span>
        <SegmentedControl label="أبعاد العرض" value={viewport} onChange={setViewport} options={VIEWPORTS} />
      </div>
      <div className="preview-actions">
        <Button variant="ghost" size="small" onClick={() => setFullscreen((v) => !v)}>
          <Icon name={fullscreen ? 'minimize' : 'maximize'} className="size-3.5" />
          <span>{fullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}</span>
        </Button>
        <ExternalButton href={url}>فتح في نافذة جديدة</ExternalButton>
      </div>
    </div>
  );

  const body = (
    <div className="preview-body">
      <SiteFrame url={url} viewport={viewport} fullscreen={fullscreen} onExitFullscreen={() => setFullscreen(false)} />
      {fullscreen && hasPanel && panelOpen && <PreviewSidebar title={title} sections={sections} comments={comments} onComment={onComment} />}
    </div>
  );

  if (fullscreen) {
    return createPortal(<div className="preview-fs" role="dialog" aria-label="معاينة بملء الشاشة">{toolbar}{body}</div>, document.body);
  }
  return (
    <div className="preview-container">
      {toolbar}
      {body}
      <div className="preview-security-notice">
        <div className="row gap-2 items-center text-xs text-ink-soft">
          <Icon name="alert" className="size-4 text-warm-700 flex-none" />
          <span>التعليقات مرتبطة بأقسام المشروع أدناه، وليست على عناصر داخل الموقع الحي؛ فالمتصفح يمنع الوصول لمحتوى موقع من نطاق آخر.</span>
        </div>
      </div>
    </div>
  );
}
