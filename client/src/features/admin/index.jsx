import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { localData, useLocalData } from '../../localData.js';
import { fmtDate, fmtShort, fmtTime, KIND } from '../../format.js';
import { AppSidebar, AuthLayout, Bar, Button, ButtonLink, Card, ChatPanel, ChoiceGroup, Chip, CommentThread, Empty, ErrorBox, Field, FormError, Gantt, Icon, LinkCard, List, Loading, NavTabs, Page, PasswordInput, Range, Reveal, Select, StatusChip, SwapIcon, useAction, WorkspaceHeader } from '../../components/ui.jsx';
import PhaseEditor from './components/PhaseEditor.jsx';
import PasswordRecovery from '../auth/PasswordRecovery.jsx';
import MobileNav from '../../components/MobileNav.jsx';

// ---------- الدخول والإطار ----------
export function AdminLogin() {
  const [email, setEmail] = useState('admin@example.test');
  const [password, setPassword] = useState('admin123');
  const [missing, setMissing] = useState('');
  const { state } = useLocation();
  const [loggedOut] = useState(Boolean(state?.loggedOut));
  const { busy, err, run } = useAction();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMissing('أدخل بريدًا إلكترونيًا صحيحًا.'); return; }
    if (!password) { setMissing('أدخل كلمة المرور للمتابعة.'); return; }
    const ok = await run(
      () => localData('/admin/login', { method: 'POST', body: { email, password } }),
      'تم تسجيل الدخول بنجاح',
    );
    if (ok) nav('/admin', { replace: true });
  };
  return (
    <AuthLayout
      brand="دار شذرة"
      heading="لوحة تحكم الإدارة"
      description="تسجيل الدخول لفريق العمل وإدارة مشاريع العملاء."
      points={['إدارة العملاء والمشاريع', 'الجدولة والمراحل والطلبات', 'التواصل والتحديثات المباشرة']}
      notice={loggedOut ? 'تم تسجيل الخروج بنجاح' : null}
      onSubmit={submit}
    >
      <Field label="البريد الإلكتروني للإدارة" error={missing || err}>
        <input type="email" className="ltr" dir="ltr" autoFocus autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setMissing(''); }} placeholder="admin@example.test" />
      </Field>
      <Field label="كلمة المرور">
        <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setMissing(''); }} />
      </Field>
      <Button block loading={busy}>تسجيل دخول الإدارة</Button>
      <ButtonLink to="/admin/forgot-password" variant="ghost" size="small" block>هل نسيت كلمة المرور؟</ButtonLink>
    </AuthLayout>
  );
}

export function AdminPasswordRecovery() {
  return <PasswordRecovery role="admin" />;
}

export function AdminLayout() {
  const { error, loading } = useLocalData('/admin/me');
  const { data: clientsData } = useLocalData('/admin/clients');
  const nav = useNavigate();
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const logout = async () => { await localData('/admin/logout', { method: 'POST' }); nav('/admin/login', { replace: true, state: { loggedOut: true } }); };
  const items = [
    { to: '/admin', label: 'العملاء', icon: 'clients', end: true },
    { to: '/admin/projects', label: 'المشاريع', icon: 'projects', end: false },
    { to: '/admin/new', label: 'عميل جديد', icon: 'add' },
    { to: '/admin/settings', label: 'الإعدادات المحلية', icon: 'settings' },
  ];
  const waitingCount = Array.isArray(clientsData)
    ? clientsData.reduce((total, client) => total + (client.open_requests || 0) + (client.waiting_comments || 0), 0)
    : 0;
  return (
    <div className="app-shell">
      <AppSidebar
        items={items}
        label="الإدارة"
        logoTo="/admin"
        onLogout={logout}
        workspace="مساحة الفريق"
        notificationTo="/admin"
        unreadCount={waitingCount}
        notificationLabel="تنبيهات المتابعة"
      />
      <MobileNav
        items={items}
        label="الإدارة"
        title="مساحة الفريق"
        logoTo="/admin"
        onLogout={logout}
      />
      <main className="app-main">
        <WorkspaceHeader items={items} workspace="مساحة الفريق" homeTo="/admin" />
        <Outlet />
      </main>
    </div>
  );
}

// ---------- العملاء ----------
export function Clients() {
  const { data, error, loading } = useLocalData('/admin/clients');
  const [q, setQ] = useState('');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const list = data.filter((c) => (c.name + c.project_name).includes(q));
  const openRequests = data.reduce((total, client) => total + (client.open_requests || 0), 0);
  const waitingComments = data.reduce((total, client) => total + (client.waiting_comments || 0), 0);
  return (
    <Page title="العملاء" sub="نظرة على المشاريع ومتابعة ما يحتاج إلى إجراء" actions={<ButtonLink to="/admin/new">عميل جديد</ButtonLink>}>
      <section className="tool-overview tool-overview-hero">
        <div className="tool-overview-copy">
          <span className="tool-overview-badge">
            <Icon name="clients" className="size-3.5" />
            <span>لوحة المتابعة الشاملة</span>
          </span>
          <h2>مساحة إدارة المشاريع</h2>
          <p>تابع تقدم مشاريع العملاء والطلبات المفتوحة والتعليقات المباشرة أولاً بأول في دار شذرة.</p>
        </div>
        <div className="tool-overview-stats" aria-label="ملخص العمل">
          <div className="tool-stat-card">
            <div className="tool-stat-header">
              <span className="tool-stat-icon clients"><Icon name="clients" className="size-4" /></span>
              <span className="tool-stat-label">إجمالي العملاء</span>
            </div>
            <strong className="tool-stat-number">{data.length}</strong>
          </div>
          <div className="tool-stat-card">
            <div className="tool-stat-header">
              <span className="tool-stat-icon requests"><Icon name="requests" className="size-4" /></span>
              <span className="tool-stat-label">طلبات مفتوحة</span>
            </div>
            <strong className="tool-stat-number highlight">{openRequests}</strong>
          </div>
          <div className="tool-stat-card">
            <div className="tool-stat-header">
              <span className="tool-stat-icon comments"><Icon name="updates" className="size-4" /></span>
              <span className="tool-stat-label">بانتظار الرد</span>
            </div>
            <strong className="tool-stat-number">{waitingComments}</strong>
          </div>
        </div>
      </section>
      <div className="client-list-search">
        <input type="search" placeholder="بحث باسم الشركة أو المشروع" aria-label="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 && <Card><Empty>لا يوجد عملاء.</Empty></Card>}
      <List className="cols">
        {list.map((c) => (
          <LinkCard key={c.id} to={`/admin/${c.id}`}>
            <h2>{c.name}</h2>
            <span className="muted">{c.project_name}</span>
            <Bar value={c.progress} label={c.name} />
            <div className="row">
              <Chip tone={{ ok: 'green', wait: 'amber', late: 'red' }[c.health]}>{{ ok: 'تمام', wait: 'ينتظر ردك', late: 'متأخر' }[c.health]}</Chip>
              {c.current_phase && <Chip tone="blue">{c.current_phase}</Chip>}
              <Chip tone="gray">{c.progress}%</Chip>
              <span className="muted small">التسليم {fmtShort(c.end_date)}</span>
              {c.open_requests > 0 && <Chip tone="amber">{c.open_requests} طلب مفتوح</Chip>}
              {c.waiting_comments > 0 && <Chip tone="red">{c.waiting_comments} تعليق ينتظر ردك</Chip>}
            </div>
          </LinkCard>
        ))}
      </List>
    </Page>
  );
}

export function NewClient() {
  const [f, setF] = useState({ name: '', project_name: '', contact_name: '', email: '', telegram_chat: '', start_date: '', end_date: '' });
  const { busy, err, run } = useAction();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    let id;
    if (await run(async () => { id = (await localData('/admin/clients', { method: 'POST', body: f })).id; }, 'تم إنشاء العميل بنجاح')) nav(`/admin/${id}`);
  };
  return (
    <Page title="عميل جديد" sub="سيُنشأ له حساب بالبريد ومراحل افتراضية. كلمة المرور الأولية: client123">
      <Card as="form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="اسم الشركة"><input type="text" value={f.name} onChange={set('name')} required /></Field>
          <Field label="اسم المشروع"><input type="text" value={f.project_name} onChange={set('project_name')} required /></Field>
          <Field label="اسم المسؤول"><input type="text" value={f.contact_name} onChange={set('contact_name')} /></Field>
          <Field label="البريد الإلكتروني"><input type="email" dir="ltr" value={f.email} onChange={set('email')} required /></Field>
          <Field label="Telegram chat id"><input type="text" dir="ltr" value={f.telegram_chat} onChange={set('telegram_chat')} /></Field>
          <Field label="تاريخ البداية"><input type="date" value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="تاريخ النهاية"><input type="date" value={f.end_date} onChange={set('end_date')} /></Field>
        </div>
        <FormError message={err} />
        <div className="flex items-center justify-end gap-3 pt-3">
          <ButtonLink to="/admin" variant="secondary">إلغاء</ButtonLink>
          <Button loading={busy} disabled={busy}>إنشاء العميل</Button>
        </div>
      </Card>
    </Page>
  );
}

// ---------- صفحة عميل ----------
export function AdminClient() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { data, error, loading, reload } = useLocalData(`/admin/clients/${id}`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { client } = data;
  const tabs = [['', 'نظرة عامة'], ['schedule', 'الجدولة'], ['requests', 'المطلوب من العميل'], ['comments', `تعليقات العميل${data.waiting_comments ? ` (${data.waiting_comments})` : ''}`], ['comms', 'التواصل'], ['files', 'الملفات']];
  return (
    <>
      <Page title={client.name} sub={client.project_name} back={{ to: '/admin', label: 'كل العملاء' }} />
      <NavTabs id="client-tabs" label="أقسام العميل" items={tabs.map(([p, label]) => ({ to: `/admin/${id}${p ? '/' + p : ''}`, label }))} />
      <Reveal key={pathname}>
        <Outlet context={{ d: data, id, reload }} />
      </Reveal>
    </>
  );
}

const useCtx = () => useOutletContext();

export function Overview() {
  const { d, id } = useCtx();
  const c = d.client;
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/login`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.email); setCopied(true); } catch { /* ignore */ }
  };
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <>
      <Card title="بيانات دخول العميل" hl>
        <p className="muted">أرسل للعميل بريده وكلمة المرور الأولية لتسجيل الدخول. يمكنه تغييرها من صفحة استعادة كلمة المرور.</p>
        <div className="userbox">{c.email}</div>
        <div className="row">
          <Button size="small" variant={copied ? 'success' : 'primary'} onClick={copy}>
            <SwapIcon name={copied ? 'check' : 'copy'} />
            {copied ? 'تم النسخ' : 'نسخ البريد'}
          </Button>
          <span className="muted ltr">{link}</span>
        </div>
        <span className="muted small">كلمة المرور الأولية: <bdi dir="ltr">client123</bdi></span>
      </Card>
      <div className="cols">
        <Card title="التقدم"><strong className="stat">{c.progress}%</strong><Bar value={c.progress} label="التقدم" />{(c.start_date || c.end_date) && <span className="muted"><Range from={fmtDate(c.start_date)} to={fmtDate(c.end_date)} /></span>}</Card>
        <Card title="ملخص">
          <span>طلبات مفتوحة: {d.requests.filter((r) => r.status === 'open').length}</span>
          <span>تعليقات تنتظر ردك: {d.waiting_comments}</span>
          <span>تحديثات منشورة: {d.updates.length}</span>
          <span>ملفات: {d.files.length}</span>
        </Card>
        <Card title="بيانات التواصل">
          <span>المسؤول: {c.contact_name || '—'}</span>
          <span>البريد: {c.email || '—'}</span>
          <span>تليجرام: {c.telegram_chat || '—'}</span>
        </Card>
      </div>
      <div className="flex justify-end pt-3">
        <ButtonLink to={`/admin/${id}/schedule`} variant="outline" size="small">
          إدارة الجدولة
          <Icon name="next" />
        </ButtonLink>
      </div>
    </>
  );
}

// ---------- الجدولة ----------
export function Schedule() {
  const { d, id, reload } = useCtx();
  const c = d.client;
  const [f, setF] = useState({ progress: c.progress, start_date: c.start_date || '', end_date: c.end_date || '' });
  const { busy, err, run } = useAction();
  const save = (e) => { e.preventDefault(); run(async () => { await localData(`/admin/clients/${id}`, { method: 'PATCH', body: f }); reload(); }, 'تم حفظ الجدول الزمني'); };
  return (
    <>
      <Card title="الجدول الزمني"><Gantt phases={d.phases} start={c.start_date} end={c.end_date} /></Card>
      <Card as="form" title="التقدم العام والتواريخ" onSubmit={save}>
        <div className="form-grid">
          <Field label="نسبة التقدم %"><input type="number" min="0" max="100" value={f.progress} onChange={(e) => setF({ ...f, progress: e.target.value })} /></Field>
          <Field label="البداية"><input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="النهاية"><input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
        </div>
        <FormError message={err} />
        <div className="flex justify-end pt-2">
          <Button loading={busy} disabled={busy}>حفظ التغييرات</Button>
        </div>
      </Card>
      {d.phases.map((phase) => <PhaseEditor key={phase.id} phase={phase} reload={reload} />)}
    </>
  );
}

// ---------- الطلبات ----------
export function AdminRequests() {
  const { d, id, reload } = useCtx();
  const [f, setF] = useState({ kind: 'decision', title: '', description: '', options: '' });
  const { busy, err, run } = useAction();
  const add = (e) => {
    e.preventDefault();
    run(async () => { await localData(`/admin/clients/${id}/requests`, { method: 'POST', body: f }); setF({ ...f, title: '', description: '', options: '' }); reload(); }, 'تمت إضافة الطلب');
  };
  return (
    <div className="cols">
      <Card title="الطلبات الحالية">
        {d.requests.length ? (
          <List>
            {d.requests.map((r) => (
              <div key={r.id} className="item">
                <div className="row between"><strong>{r.title}</strong><Chip tone={r.status === 'open' ? 'amber' : 'green'}>{r.status === 'open' ? `${KIND[r.kind]} · مفتوح` : 'تم'}</Chip></div>
                {r.description && <span className="muted">{r.description}</span>}
                {r.answer && <span className="ok">رد العميل: {r.answer}</span>}
              </div>
            ))}
          </List>
        ) : <Empty>لا توجد طلبات.</Empty>}
      </Card>
      <Card as="form" hl title="طلب جديد" onSubmit={add}>
        <Field label="نوع الطلب">
          <ChoiceGroup
            name="request-kind"
            ariaLabel="نوع الطلب"
            value={f.kind}
            onChange={(kind) => setF({ ...f, kind })}
            options={Object.entries(KIND).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="العنوان"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="شرح قصير"><input type="text" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {f.kind === 'decision' && <Field label="الخيارات (كل خيار في سطر)"><textarea rows={3} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} /></Field>}
        <FormError message={err} />
        <div className="flex justify-end pt-2">
          <Button loading={busy} disabled={busy || !f.title.trim()}>إضافة طلب</Button>
        </div>
      </Card>
    </div>
  );
}

// ---------- تعليقات العميل ----------
export function AdminComments() {
  const { id, reload: reloadClient } = useCtx();
  const { data, error, loading, reload } = useLocalData(`/admin/clients/${id}/comments`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data.length) return <Card><Empty>لا توجد تعليقات من العميل بعد.</Empty></Card>;
  return data.map((t) => (
    <Card key={t.target_type + t.target_id} title={t.title} actions={t.needs_reply ? <Chip tone="red">ينتظر ردك</Chip> : <Chip tone="green">تم الرد</Chip>}>
      <span className="muted small">{t.where}</span>
      <CommentThread comments={t.comments} me="team" placeholder="اكتب ردك على العميل…" button="إرسال الرد"
        onSend={async (body) => {
          await localData(`/admin/clients/${id}/threads/reply`, { method: 'POST', body: { target_type: t.target_type, target_id: t.target_id, body } });
          reload(); reloadClient();
        }} />
    </Card>
  ));
}

// ---------- التواصل ----------
export function Comms() {
  const { d, id, reload } = useCtx();
  const [u, setU] = useState({ title: '', body: '', phase_name: '' });
  const b = useAction();
  const publish = (e) => { e.preventDefault(); b.run(async () => { await localData(`/admin/clients/${id}/updates`, { method: 'POST', body: u }); setU({ title: '', body: '', phase_name: '' }); reload(); }, 'تم نشر التحديث وإشعار العميل'); };
  return (
    <div className="cols">
      <ChatPanel
        title="رسائل العميل"
        messages={d.messages}
        currentUser="team"
        otherUser={d.client.name}
        label="المحادثة مع العميل"
        clearAudience="العميل"
        onSend={async (message) => {
          await localData(`/admin/clients/${id}/messages`, { method: 'POST', body: message });
          reload();
        }}
        onClear={async () => {
          await localData(`/admin/clients/${id}/messages`, { method: 'DELETE' });
          reload();
        }}
      />
      <Card as="form" hl title="نشر تحديث للعميل" onSubmit={publish}>
        <Field label="العنوان"><input type="text" value={u.title} onChange={(e) => setU({ ...u, title: e.target.value })} /></Field>
        <Field label="المرحلة (اختياري)">
          <Select
            value={u.phase_name}
            onChange={(phase_name) => setU({ ...u, phase_name })}
            options={[{ value: '', label: '—' }, ...d.phases.map((phase) => ({ value: phase.name, label: phase.name }))]}
          />
        </Field>
        <Field label="التفاصيل"><textarea rows={5} value={u.body} onChange={(e) => setU({ ...u, body: e.target.value })} /></Field>
        <FormError message={b.err} />
        <div className="flex justify-end pt-2">
          <Button loading={b.busy} disabled={b.busy || !u.title.trim()}>نشر وإشعار العميل</Button>
        </div>
        <div className="col gap-1">
          <h3>التحديثات المنشورة</h3>
          <List className="col gap-1">
            {d.updates.map((x) => <span key={x.id} className="muted">{x.title} · {fmtShort(x.created_at)}</span>)}
          </List>
        </div>
      </Card>
    </div>
  );
}

// ---------- الملفات ----------
export function AdminFiles() {
  const { d, id, reload } = useCtx();
  const [f, setF] = useState({ name: '', url: '' });
  const { busy, err, run } = useAction();
  const add = (e) => { e.preventDefault(); run(async () => { await localData(`/admin/clients/${id}/files`, { method: 'POST', body: f }); setF({ name: '', url: '' }); reload(); }, 'تمت إضافة الملف'); };
  return (
    <>
      <Card as="form" hl title="إضافة ملف للعميل" onSubmit={add}>
        <div className="form-grid">
          <Field label="اسم الملف"><input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="الرابط (https://)"><input type="url" dir="ltr" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
        </div>
        <span className="muted small">ارفع الملف على Google Drive أو غيره وضع رابط المشاركة هنا.</span>
        <FormError message={err} />
        <div className="flex justify-end pt-2">
          <Button loading={busy} disabled={busy || !f.name.trim() || !f.url.trim()}>إضافة الملف</Button>
        </div>
      </Card>
      <Card title="ملفات العميل">
        {d.files.length ? (
          <List>
            {d.files.map((x) => (
              <a key={x.id} className="item" href={x.url} target="_blank" rel="noreferrer"><strong>{x.name}</strong><span className="muted small">{fmtDate(x.created_at)}</span></a>
            ))}
          </List>
        ) : <Empty>لا توجد ملفات.</Empty>}
      </Card>
    </>
  );
}

// ---------- الربط ----------
export function Settings() {
  const rows = [
    ['الإشعارات داخل الموقع', 'محلية', 'green', 'تُحفظ الإشعارات في هذا المتصفح فقط.'],
    ['البريد الإلكتروني', 'غير متاح', 'gray', 'هذا الإصدار لا يتصل بخدمات خارجية.'],
    ['تليجرام', 'غير متاح', 'gray', 'هذا الإصدار لا يتصل بخدمات خارجية.'],
    ['سلاك', 'غير متاح', 'gray', 'هذا الإصدار لا يتصل بخدمات خارجية.'],
  ];
  return (
    <Page title="الإعدادات المحلية" sub="خيارات تعمل داخل هذا المتصفح">
      <Card>
        <List>
          {rows.map(([n, s, t, note]) => (
            <div key={n} className="item"><div className="row between"><strong>{n}</strong><Chip tone={t}>{s}</Chip></div><span className="muted">{note}</span></div>
          ))}
        </List>
      </Card>
    </Page>
  );
}

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
              <button type="button" className="btn btn-ghost size-small" onClick={() => setCreateModal(false)}>
                <Icon name="close" className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="stack gap-4">
              {formError && <FormError message={formError} />}

              <Field label="اسم المشروع" required>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: متجر دار شذرة للعطور الفاخرة"
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
              <button type="button" className="btn btn-ghost size-small" onClick={() => setEditProject(null)}>
                <Icon name="close" className="size-4" />
              </button>
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
  const [viewport, setViewport] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);
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
            <a
              href={project.production_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary size-small gap-1.5"
            >
              <Icon name="external" className="size-3.5" />
              <span>زيارة الموقع الحي</span>
            </a>
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
        <div className="preview-container">
          <div className="preview-toolbar">
            <div className="row gap-2 items-center">
              <span className="text-xs font-bold text-ink">معاينة الموقع الحي:</span>
              <div className="viewport-switcher" role="radiogroup" aria-label="أبعاد العرض">
                <button
                  type="button"
                  className={`viewport-btn ${viewport === 'desktop' ? 'active' : ''}`}
                  onClick={() => setViewport('desktop')}
                >
                  <Icon name="monitor" className="size-3.5" />
                  <span>سطح المكتب</span>
                </button>
                <button
                  type="button"
                  className={`viewport-btn ${viewport === 'tablet' ? 'active' : ''}`}
                  onClick={() => setViewport('tablet')}
                >
                  <Icon name="tablet" className="size-3.5" />
                  <span>لوحي</span>
                </button>
                <button
                  type="button"
                  className={`viewport-btn ${viewport === 'mobile' ? 'active' : ''}`}
                  onClick={() => setViewport('mobile')}
                >
                  <Icon name="smartphone" className="size-3.5" />
                  <span>هاتف</span>
                </button>
              </div>
            </div>

            <div className="preview-actions">
              <button
                type="button"
                className="btn btn-ghost size-small gap-1"
                onClick={() => setFullscreen(!fullscreen)}
              >
                <Icon name={fullscreen ? 'minimize' : 'maximize'} className="size-3.5" />
                <span>{fullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}</span>
              </button>
              <a
                href={project.production_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary size-small gap-1"
              >
                <Icon name="external" className="size-3.5" />
                <span>فتح في نافذة جديدة</span>
              </a>
            </div>
          </div>

          <div className={`preview-stage ${fullscreen ? 'fullscreen' : ''}`}>
            {fullscreen && (
              <button
                type="button"
                className="absolute top-4 start-4 z-50 btn btn-primary size-small gap-1 shadow-lg"
                onClick={() => setFullscreen(false)}
              >
                <Icon name="close" className="size-4" />
                <span>إغلاق ملء الشاشة</span>
              </button>
            )}
            <div className={`preview-iframe-wrapper ${viewport}`}>
              <iframe
                title="معاينة الموقع الحي"
                src={project.production_url}
                className="preview-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"
              />
            </div>
          </div>
        </div>
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
                            <button
                              type="button"
                              className="text-xs text-brand-700 hover:text-brand-900 font-semibold cursor-pointer border-0 bg-transparent p-0"
                              onClick={() => {
                                setReplyTargetId(comment.id);
                                setReplyBody('');
                              }}
                            >
                              كتابة رد من فريق الإدارة
                            </button>
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
