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
    { to: '/admin', label: 'العملاء', icon: 'clients', end: false },
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
          <h2>مساحة إدارة المشاريع</h2>
          <p>تابع تقدم العملاء والطلبات والتعليقات التي تنتظر المتابعة.</p>
        </div>
        <div className="tool-overview-stats" aria-label="ملخص العمل">
          <div className="tool-stats-item"><strong>{data.length}</strong><span>عميل</span></div>
          <div className="tool-stats-item"><strong>{openRequests}</strong><span>طلب مفتوح</span></div>
          <div className="tool-stats-item"><strong>{waitingComments}</strong><span>تعليق ينتظر الرد</span></div>
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
