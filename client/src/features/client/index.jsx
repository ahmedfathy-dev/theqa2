import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext, useParams, Link } from 'react-router-dom';
import { isAdminEmail, localData, useLocalData } from '../../localData.js';
import { fmtDate, fmtShort, fmtTime, KIND, NOTIF_TYPE } from '../../format.js';
import { AppSidebar, AuthLayout, Bar, Button, ButtonLink, Card, ChatPanel, Chip, CommentThread, Empty, ErrorBox, Field, FormError, Icon, LinkCard, List, Loading, Page, PasswordInput, Range, StatusChip, Switch, useAction, WorkspaceHeader } from '../../components/ui.jsx';
import MobileNav from '../../components/MobileNav.jsx';
import FeatureRequestCard from './components/RequestCard.jsx';
import PasswordRecovery from '../auth/PasswordRecovery.jsx';

// ---------- الدخول ----------
export function ClientLogin() {
  const [email, setEmail] = useState('client@example.test');
  const [password, setPassword] = useState('client123');
  const [missing, setMissing] = useState('');
  const { state } = useLocation();
  const [loggedOut] = useState(Boolean(state?.loggedOut));
  const { busy, err, run } = useAction();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setMissing('أدخل بريدًا إلكترونيًا صحيحًا.'); return; }
    if (!password) { setMissing('أدخل كلمة المرور للمتابعة.'); return; }
    const isAdmin = isAdminEmail(cleanEmail);
    let authRes = null;
    const ok = await run(
      async () => {
        authRes = await localData(isAdmin ? '/admin/login' : '/client/login', { method: 'POST', body: { email: cleanEmail, password } });
        return authRes;
      },
      'تم تسجيل الدخول بنجاح',
    );
    if (ok) {
      if (authRes?.role === 'admin' || isAdmin) {
        nav('/admin', { replace: true });
      } else {
        nav('/portal', { replace: true });
      }
    }
  };
  return (
    <AuthLayout
      brand="بوابة المشاريع"
      heading="متابعة مشروعك"
      description="سجّل دخولك لمتابعة تقدم المشروع وقراراته وتحديثاته."
      points={['تحديثات المشروع أولا بأول', 'المراحل والجدول الزمني', 'الطلبات والملفات في مكان واحد']}
      notice={loggedOut ? 'تم تسجيل الخروج بنجاح' : null}
      onSubmit={submit}
    >
      <Field label="البريد الإلكتروني" error={missing || err}>
        <input type="email" className="ltr" dir="ltr" autoFocus autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setMissing(''); }} placeholder="client@example.test" />
      </Field>
      <Field label="كلمة المرور">
        <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setMissing(''); }} />
      </Field>
      <Button block loading={busy}>تسجيل الدخول</Button>
      <ButtonLink to="/forgot-password" variant="ghost" size="small" block>هل نسيت كلمة المرور؟</ButtonLink>
    </AuthLayout>
  );
}

export function ClientPasswordRecovery() {
  return <PasswordRecovery role="client" />;
}

// ---------- الإطار ----------
export function ClientLayout() {
  const [unread, setUnread] = useState(0);
  const nav = useNavigate();
  useEffect(() => {
    let alive = true;
    const tick = () =>
      localData('/client/notifications/count')
        .then((d) => alive && setUnread(d.unread))
        .catch((e) => e.status === 401 && nav('/login', { replace: true }));
    tick();
    const t = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [nav]);
  const logout = async () => { await localData('/client/logout', { method: 'POST' }); nav('/login', { replace: true, state: { loggedOut: true } }); };
  const items = [
    { to: '/portal', label: 'الرئيسية', icon: 'home' },
    { to: '/portal/updates', label: 'التحديثات', icon: 'updates', end: false },
    { to: '/portal/phases', label: 'المراحل', icon: 'phases', end: false },
    { to: '/portal/requests', label: 'المطلوب منك', icon: 'requests' },
    { to: '/portal/files', label: 'الملفات', icon: 'files' },
  ];
  const allNavItems = [
    ...items,
    { to: '/portal/notifications', label: 'الإشعارات', icon: 'bell', badgeCount: unread },
  ];
  return (
    <div className="app-shell">
      <AppSidebar
        items={items}
        label="التنقل"
        logoTo="/portal"
        onLogout={logout}
        workspace="بوابة المشاريع"
        notificationTo="/portal/notifications"
        unreadCount={unread}
        notificationLabel="الإشعارات"
      />
      <MobileNav
        items={allNavItems}
        label="التنقل"
        title="بوابة المشاريع"
        logoTo="/portal"
        onLogout={logout}
      />
      <main className="app-main">
        <WorkspaceHeader items={allNavItems} workspace="بوابة المشاريع" homeTo="/portal" />
        <Outlet context={{ setUnread }} />
      </main>
    </div>
  );
}

// ---------- الرئيسية ----------
export function Portal() {
  const { data, error, loading, reload } = useLocalData('/client/overview');
  const messages = data?.messages;
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { client, phases, requests, updates, files, projects = [], recentComments = [] } = data;
  const open = requests.filter((r) => r.status === 'open');
  const currentPhase = phases.find((phase) => phase.status === 'current');

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status !== 'completed').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  return (
    <Page
      title={client.project_name}
      sub={`مرحبًا، ${client.contact_name || client.name} — أهلاً بك في بوابة متابعة المشاريع`}
      actions={<Chip tone="amber" dot live>مشروع نشط</Chip>}
    >
      {/* Metrics Summary Bar */}
      <div className="portal-metrics-grid">
        <div className="portal-metric-card">
          <span className="portal-metric-value">{totalProjects}</span>
          <span className="portal-metric-label">إجمالي المشاريع</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{activeProjects}</span>
          <span className="portal-metric-label">مشاريع قيد العمل</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{completedProjects}</span>
          <span className="portal-metric-label">مشاريع مكتملة</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{open.length}</span>
          <span className="portal-metric-label">طلبات تتطلب إجراءك</span>
        </div>
        <div className="portal-metric-card">
          <span className="portal-metric-value">{recentComments.length}</span>
          <span className="portal-metric-label">ملاحظات مراجعة</span>
        </div>
      </div>

      {/* Assigned Projects Section */}
      <Card
        title="مشاريعك المخصصة"
        actions={<span className="text-xs text-muted">إجمالي: {projects.length} مشروع</span>}
      >
        {projects.length ? (
          <div className="projects-grid">
            {projects.map((p) => (
              <div key={p.id} className="project-card">
                <div>
                  <div className="project-card-header">
                    <div className="project-card-title-wrap">
                      <h3 className="project-card-title">{p.name}</h3>
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
                      {p.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
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
                      <span>المشروع جاري</span>
                    )}
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                      <Icon name="comment-add" className="size-3.5" />
                      <span>{p.comment_count || 0} ملاحظة</span>
                    </span>
                  </div>

                  <ButtonLink to={`/portal/projects/${p.id}`} variant="primary" block>
                    معاينة ومراجعة المشروع ✏️
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            لا توجد مشاريع مخصصة لحسابك حالياً. عند إسناد أي مشروع من فريق الإدارة سيظهر هنا للمعاينة والمراجعة الفورية.
          </Empty>
        )}
      </Card>

      {/* Main Overall Progress Card */}
      <Card hl className="overview-progress-card overview-hero">
        <div className="overview-progress-heading">
          <div className="overview-progress-value">
            <h2>التقدم العام</h2>
            <strong className="stat">{client.progress}%</strong>
          </div>
          {currentPhase && (
            <div className="overview-current-phase">
              <span>المرحلة الحالية</span>
              <Link to={`/portal/phases/${currentPhase.id}`} className="overview-phase-link">
                <span>{currentPhase.name}</span>
                <Icon name="next" className="size-4" />
              </Link>
            </div>
          )}
        </div>
        <Bar value={client.progress} label="التقدم العام" />
        {(client.start_date || client.end_date) && <span className="muted"><Range from={fmtDate(client.start_date)} to={fmtDate(client.end_date)} /></span>}
      </Card>

      {client.brand_name && (
        <Card className="brand-identity">
          <div className="brand-identity-copy">
            <img src="/demo/sidra-mark.svg" width="72" height="72" alt="" className="brand-identity-mark" />
            <div className="col gap-1">
              <span className="brand-identity-label">هوية العلامة</span>
              <h2>{client.brand_name}</h2>
              <p className="brand-identity-tagline">{client.brand_tagline}</p>
              <p className="muted small">{client.brand_description}</p>
            </div>
          </div>
          <div className="brand-palette" aria-label="ألوان الهوية">
            {client.brand_palette.map((color) => (
              <span className="brand-color" key={color.value}>
                <i style={{ backgroundColor: color.value }} aria-hidden="true" />
                <b>{color.name}</b>
                <small dir="ltr">{color.value}</small>
              </span>
            ))}
          </div>
        </Card>
      )}

      {open.length > 0 && (
        <Card title={`مطلوب منك (${open.length})`} hl className="overview-actions overview-actions-card">
          <List>
            {open.map((r) => (
              <Link key={r.id} to="/portal/requests" className="item">
                <div className="row between"><strong>{r.title}</strong><Chip tone="amber">{KIND[r.kind]}</Chip></div>
                {r.description && <span className="muted">{r.description}</span>}
              </Link>
            ))}
          </List>
        </Card>
      )}

      <div className="cols overview-columns">
        <Card title="آخر التحديثات" actions={<Link to="/portal/updates" className="card-action-link">عرض الكل</Link>}>
          {updates.length ? (
            <List>
              {updates.map((u) => (
                <Link key={u.id} to={`/portal/updates/${u.id}`} className={`item${u.unread ? ' unread' : ''}`}>
                  <strong>{u.title}{u.unread && <> <Chip tone="red">جديد</Chip></>}</strong>
                  <span className="muted small">{fmtTime(u.created_at)}</span>
                </Link>
              ))}
            </List>
          ) : <Empty>لا توجد تحديثات بعد.</Empty>}
        </Card>
        <Card title="المراحل" className="overview-phases" actions={<Link to="/portal/phases" className="card-action-link">عرض الكل</Link>}>
          <List className="list phase-list">
            {phases.map((p) => (
              <Link key={p.id} to={`/portal/phases/${p.id}`} className={`item phase-step ${p.status}`}>
                <span className="phase-step-node" aria-hidden="true" />
                <div className="row between"><strong>{p.name}</strong><StatusChip s={p.status} /></div>
                {p.total > 0 && <span className="muted small">{p.done} من {p.total} منجز</span>}
              </Link>
            ))}
          </List>
        </Card>
      </div>

      <div className="cols overview-columns overview-secondary">
        <Card title="ملفات حديثة" actions={<Link to="/portal/files" className="card-action-link">عرض الكل</Link>}>
          {files.length ? (
            <List>
              {files.map((f) => (
                <a key={f.id} className="item" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
              ))}
            </List>
          ) : <Empty>لا توجد ملفات.</Empty>}
        </Card>
        <ChatPanel
          title="تواصل مع الفريق"
          messages={messages}
          currentUser="client"
          otherUser="فريق المشروع"
          label="المحادثة مع فريق المشروع"
          clearAudience="فريق المشروع"
          onSend={async (message) => {
            await localData('/client/messages', { method: 'POST', body: message });
            reload();
          }}
          onClear={async () => {
            await localData('/client/messages', { method: 'DELETE' });
            reload();
          }}
        />
      </div>
    </Page>
  );
}

// ---------- التحديثات ----------
export function Updates() {
  const { data, error, loading } = useLocalData('/client/updates');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <Page title="التحديثات" sub="كل ما حدث في مشروعك">
      <Card className="updates-list">
        {data.length ? (
          <List>
            {data.map((u) => (
              <Link key={u.id} to={`/portal/updates/${u.id}`} className={`item${u.unread ? ' unread' : ''}`}>
                <div className="row between">
                  <strong>{u.title}</strong>
                  <span className="row">{u.unread && <Chip tone="red">جديد</Chip>}{u.phase_name && <Chip tone="blue">{u.phase_name}</Chip>}</span>
                </div>
                <span className="muted small">{fmtTime(u.created_at)} · {u.comment_count} تعليق</span>
              </Link>
            ))}
          </List>
        ) : <Empty>لا توجد تحديثات بعد.</Empty>}
      </Card>
    </Page>
  );
}

export function UpdateDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLocalData(`/client/updates/${id}`);
  const { setUnread } = useOutletCtx();
  useEffect(() => {
    if (data) localData('/client/notifications/count').then((d) => setUnread(d.unread)).catch(() => {});
  }, [data, setUnread]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { update, comments } = data;
  return (
    <Page title={update.title} sub={fmtTime(update.created_at)} back={{ to: '/portal/updates', label: 'كل التحديثات' }}>
      <Card>
        {update.phase_name && <div><Chip tone="blue">{update.phase_name}</Chip></div>}
        <p className="max-w-[72ch] whitespace-pre-wrap leading-[1.9]">{update.body || '—'}</p>
      </Card>
      <Card title={`التعليقات (${comments.length})`}>
        <CommentThread comments={comments} me="client" onSend={async (body) => { await localData(`/client/updates/${id}/comments`, { method: 'POST', body: { body } }); reload(); }} />
      </Card>
    </Page>
  );
}

// ---------- المراحل ----------
export function Phases() {
  const { data, error, loading } = useLocalData('/client/phases');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <Page title="المراحل" sub="خطة المشروع من البداية للنهاية">
      <div className="cols">
        {data.map((p) => (
          <LinkCard key={p.id} to={`/portal/phases/${p.id}`}>
            <div className="row between"><h2>{p.name}</h2><StatusChip s={p.status} /></div>
            {(p.start_date || p.end_date) && <span className="muted"><Range from={fmtShort(p.start_date)} to={fmtShort(p.end_date)} /></span>}
            {p.total > 0 && <><Bar value={Math.round((p.done / p.total) * 100)} label={p.name} /><span className="muted small">{p.done} من {p.total} بند منجز</span></>}
          </LinkCard>
        ))}
      </div>
    </Page>
  );
}

export function PhaseDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLocalData(`/client/phases/${id}`);
  const { setUnread } = useOutletCtx();
  useEffect(() => {
    if (data) localData('/client/notifications/count').then((d) => setUnread(d.unread)).catch(() => {});
  }, [data, setUnread]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { phase, items } = data;
  return (
    <Page title={phase.name} sub={(phase.start_date || phase.end_date) ? <Range from={fmtShort(phase.start_date)} to={fmtShort(phase.end_date)} /> : undefined} actions={<StatusChip s={phase.status} />} back={{ to: '/portal/phases', label: 'كل المراحل' }}>
      {items.length ? items.map((it) => (
        <Card key={it.id}>
          <div className="row between"><strong>{it.name}</strong><StatusChip s={it.status} /></div>
          {it.status === 'done' ? (
            <>
              {it.done_at && <span className="muted small">اكتمل في {fmtDate(it.done_at)}</span>}
              <CommentThread comments={it.comments} me="client" placeholder="علّق على هذا البند المنجز…"
                onSend={async (body) => { await localData(`/client/items/${it.id}/comments`, { method: 'POST', body: { body } }); reload(); }} />
            </>
          ) : <span className="muted small">يمكنك التعليق بعد اكتمال البند.</span>}
        </Card>
      )) : <Card><Empty>لا توجد بنود في هذه المرحلة بعد.</Empty></Card>}
    </Page>
  );
}

// ---------- الطلبات ----------
export function Requests() {
  const { data, error, loading, reload } = useLocalData('/client/requests');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const open = data.filter((r) => r.status === 'open');
  const done = data.filter((r) => r.status !== 'open');
  return (
    <Page title="المطلوب منك" sub="قرارات ومحتوى واعتمادات">
      {open.length === 0 && <Card><Empty>لا يوجد شيء مطلوب منك الآن. شكرا!</Empty></Card>}
      <List className="stack">
        {open.map((r) => <FeatureRequestCard key={r.id} request={r} onDone={reload} />)}
      </List>
      {done.length > 0 && <h2 className="mt-2">تم الرد عليها</h2>}
      <List className="stack">
        {done.map((r) => <FeatureRequestCard key={r.id} request={r} onDone={reload} />)}
      </List>
    </Page>
  );
}

// ---------- الملفات ----------
export function Files() {
  const { data, error, loading } = useLocalData('/client/files');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <Page title="الملفات" sub="كل ملفات مشروعك">
      <Card>
        {data.length ? (
          <List>
            {data.map((f) => (
              <a key={f.id} className="item" href={f.url} target="_blank" rel="noreferrer">
                <strong>{f.name}</strong><span className="muted small">{fmtDate(f.created_at)}</span>
              </a>
            ))}
          </List>
        ) : <Empty>لا توجد ملفات بعد.</Empty>}
      </Card>
    </Page>
  );
}

// ---------- الإشعارات ----------
export function Notifications() {
  const { data, error, loading, reload } = useLocalData('/client/notifications');
  const { setUnread } = useOutletCtx();
  const nav = useNavigate();
  useEffect(() => { if (data) setUnread(data.unread); }, [data, setUnread]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const open = async (n) => {
    if (!n.read) await localData(`/client/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    nav(n.href || '/portal');
  };
  const markAll = async () => { await localData('/client/notifications/read-all', { method: 'POST' }); reload(); };
  const pref = async (k) => { await localData('/client/prefs', { method: 'PATCH', body: { [k]: !data.prefs[k] } }); reload(); };
  return (
    <Page title="الإشعارات" actions={data.unread > 0 && <Button variant="secondary" size="small" onClick={markAll}>تعليم الكل كمقروء</Button>}>
      <Card>
        {data.items.length ? (
          <List className="list notification-list">
            {data.items.map((n) => (
              <button key={n.id} onClick={() => open(n)} className={`notification-item${n.read ? '' : ' unread'}`}>
                <div className="row between"><strong>{n.text}</strong><Chip tone={n.read ? 'gray' : 'blue'}>{NOTIF_TYPE[n.type] || n.type}</Chip></div>
                <span className="muted small">{fmtTime(n.created_at)}</span>
              </button>
            ))}
          </List>
        ) : <Empty>لا توجد إشعارات.</Empty>}
      </Card>
      <Card title="كيف تصلك الإشعارات؟">
        <p className="muted">الإشعارات تظهر هنا دائما. يمكنك أيضا استقبالها على:</p>
        {[['notify_email', 'البريد الإلكتروني'], ['notify_telegram', 'تليجرام']].map(([k, label]) => (
          <div key={k} className="row between">
            <span>{label}</span>
            <Switch checked={!!data.prefs[k]} label={label} onChange={() => pref(k)} />
          </div>
        ))}
      </Card>
    </Page>
  );
}

function useOutletCtx() {
  return useOutletContext();
}

// ---------- تفاصيل المشروع والمراجعة التفاعلية ----------
export function ProjectDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLocalData(`/client/projects/${id}`);
  const [viewport, setViewport] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);
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
                title={fullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
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

          <div className="preview-security-notice">
            <div className="row gap-2 items-center text-xs text-ink-soft">
              <Icon name="alert" className="size-4 text-warm-700 flex-none" />
              <span>
                تنويه: بعض المواقع تطبق سياسات أمان متقدمة تمنع العرض المباشر داخل الإطارات المضمنة (X-Frame-Options أو CSP). إذا ظهرت الصفحة بيضاء، يمكنك النقر على «فتح في نافذة جديدة» للمعاينة الفورية.
              </span>
            </div>
          </div>
        </div>
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
                            <button
                              type="button"
                              className="text-xs text-brand-700 hover:text-brand-900 font-semibold cursor-pointer border-0 bg-transparent p-0"
                              onClick={() => {
                                setReplyTargetId(comment.id);
                                setReplyBody('');
                              }}
                            >
                              رد على هذه المحادثة
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

      {/* New Comment Modal / Popover */}
      {commentModalSection && (
        <div className="portal-modal-backdrop" onClick={() => setCommentModalSection(null)}>
          <div className="portal-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row between items-center mb-4 pb-3 border-b border-line-soft">
              <div>
                <h3 className="text-base font-bold text-ink">إضافة ملاحظة أو طلب استفسار</h3>
                <span className="text-xs text-brand-700 font-semibold">
                  قسم: {commentModalSection.title}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost size-small"
                onClick={() => setCommentModalSection(null)}
              >
                <Icon name="close" className="size-4" />
              </button>
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
      )}
    </Page>
  );
}
