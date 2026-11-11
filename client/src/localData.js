import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'react-portal-data-v2';
const DEMO_ADMIN = { email: 'admin@example.test', password: 'admin123' };
const DEMO_CLIENT = { email: 'client@example.test', password: 'client123' };
const DEFAULT_PHASES = ['جمع المتطلبات', 'التصميم', 'التطوير', 'الاختبار والمراجعة', 'التسليم'];
const timestamp = () => new Date().toISOString();
const relativeDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const relativeTimestamp = (days, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 20, 0, 0);
  return date.toISOString();
};
const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const MAX_CHAT_FILES = 3;
const MAX_CHAT_BYTES = 1024 * 1024;

export function isAdminEmail(email) {
  const norm = normalizeEmail(email);
  if (!norm) return false;
  let adminEmail = 'admin@example.test';
  try {
    adminEmail = normalizeEmail(readState().auth?.admin?.email || 'admin@example.test');
  } catch {}
  return (
    norm === adminEmail ||
    norm === 'admin@example.test' ||
    norm === 'admin@example.com' ||
    norm.startsWith('admin@') ||
    norm === 'admin'
  );
}

export function defaultProjectSections(projectName = 'المشروع') {
  return [
    {
      id: 'overview',
      title: 'نظرة عامة على المشروع',
      subtitle: 'ملخص الأهداف والنطاق الأساسي',
      content: `يهدف مشروع «${projectName}» إلى تقديم تجربة رقمية استثنائية متكاملة تعكس هوية العلامة التجارية، مع التركيز على سرعة التصفح وتجربة المستخدم السلسة وسهولة الوصول لكافة الخدمات والمنتجات.`,
    },
    {
      id: 'requirements',
      title: 'المتطلبات الفنية والمواصفات',
      subtitle: 'المعايير التقنية والبنية التحتية',
      content: 'توافق كامل مع مختلف المتصفحات والأجهزة الذكية، دعم واجهة عربية RTL أصيلة، سرعة تحميل متقدمة (Core Web Vitals)، وحماية أمنية معتمدة لبيانات العملاء.',
    },
    {
      id: 'features',
      title: 'الميزات والوظائف الأساسية',
      subtitle: 'الوحدات البرمجية والخدمات التفاعلية',
      content: 'نظام إدارة محتوى مرن، بوابات دفع إلكترونية متعددة وآمنة، تكامل مباشر مع خدمات الشحن وتتبع الطلبات، وتنبيهات فورية للمستخدمين عبر البريد الإلكتروني.',
    },
    {
      id: 'design_ui',
      title: 'الهوية البصرية وتصميم الواجهة (UI/UX)',
      subtitle: 'التوجه الفني وتجربة الاستخدام',
      content: 'تصميم مخصص يعتمد على هوية دار شذرة (الأخضر النباتي العميق #2C6852، الذهب الدافئ #DAB272، والبيج الرملي)، مع خط الإسكندرية العربي المتناسق وأيقونات انسيابية راقية.',
    },
    {
      id: 'deliverables',
      title: 'المخرجات والتسليمات النهائية',
      subtitle: 'الأصول البرمجية وحزم الإطلاق',
      content: 'الكود المصدري الكامل للمشروع، ملفات التصميم الأصلية، لوحة تحكم إدارية متكاملة، ودليل استخدام وتشغيل النظام.',
    },
    {
      id: 'timeline',
      title: 'الجدول الزمني ومراحل الإطلاق',
      subtitle: 'المحطات الرئيسية للعمل والتدشين',
      content: 'المرحلة 1: جمع المتطلبات والتخطيط (مكتملة).\nالمرحلة 2: التصميم وبناء النماذج التفاعلية (جارية).\nالمرحلة 3: التطوير البرمجي والربط التقني.\nالمرحلة 4: الاختبار ومراجعة الجودة.\nالمرحلة 5: التدشين والإطلاق الرسمي.',
    },
    {
      id: 'files',
      title: 'الملفات والمرفقات الرسمية',
      subtitle: 'المستندات والروابط المرجعية',
      content: 'عقد المشروع المعتمد، وثيقة متطلبات النظام، وروابط النماذج الأولية المعتمدة.',
    },
    {
      id: 'notes',
      title: 'ملاحظات إضافية وتوصيات الإطلاق',
      subtitle: 'إرشادات الفريق وتوصيات الصيانة',
      content: 'يوصى بتجهيز النطاق الرسمي (Domain) وشهادة الأمان SSL وحسابات بوابات الدفع قبل موعد الإطلاق بأسبوع لضمان فحص المعاملات الحية.',
    },
  ];
}

function resetCode() {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 1_000_000);
  return String(values[0] % 1_000_000).padStart(6, '0');
}

function resetKey(role, email) {
  return `${role}:${normalizeEmail(email)}`;
}

function requestPasswordReset(state, role, body) {
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) fail('أدخل بريدًا إلكترونيًا صحيحًا');

  const account = role === 'admin'
    ? (normalizeEmail(state.auth.admin.email) === email ? state.auth.admin : null)
    : state.auth.accounts[email] || null;
  let code = null;
  if (account) {
    code = resetCode();
    state.auth.passwordResets[resetKey(role, email)] = {
      code,
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    };
    saveState(state);
  }
  return { ok: true, resetCode: code };
}

function confirmPasswordReset(state, role, body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  const password = String(body.password || '');
  if (!isEmail(email) || !/^\d{6}$/.test(code)) fail('رمز الاستعادة غير صحيح أو منتهي الصلاحية');
  if (password.length < 8) fail('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');

  const account = role === 'admin'
    ? (normalizeEmail(state.auth.admin.email) === email ? state.auth.admin : null)
    : state.auth.accounts[email] || null;
  const key = resetKey(role, email);
  const reset = state.auth.passwordResets[key];
  if (!account || !reset || reset.expires_at <= Date.now() || reset.attempts >= 5) {
    if (reset) {
      delete state.auth.passwordResets[key];
      saveState(state);
    }
    fail('رمز الاستعادة غير صحيح أو منتهي الصلاحية');
  }
  if (reset.code !== code) {
    reset.attempts += 1;
    if (reset.attempts >= 5) delete state.auth.passwordResets[key];
    saveState(state);
    fail('رمز الاستعادة غير صحيح أو منتهي الصلاحية');
  }

  account.password = password;
  delete state.auth.passwordResets[key];
  if (role === 'admin') state.session.admin = false;
  else if (account.clientId === state.session.clientId) state.session.clientId = null;
  saveState(state);
  return { ok: true };
}

function seedDemoProject(state) {
  if (state.demoContentVersion >= 4 || !state.clients?.some((client) => client.id === 'demo-client')) return false;

  const client = state.clients.find((row) => row.id === 'demo-client');
  if (client.name === 'عميل تجريبي' || client.name === 'دار سُدرة') client.name = 'دار شذرة';
  if (client.project_name === 'الموقع الإلكتروني' || client.project_name === 'هوية ومتجر دار سُدرة') client.project_name = 'هوية ومتجر دار شذرة';
  if (!client.contact_name || client.contact_name === 'محمد') client.contact_name = 'سارة العبدالله';
  if (client.progress === 25) client.progress = 42;
  client.start_date ||= relativeDate(-14);
  client.end_date ||= relativeDate(30);
  client.brand_name = 'دار شذرة';
  client.brand_tagline = 'عطور ومنتجات منزلية راقية بروح الطبيعة ولمسات الذهب';
  client.brand_description = 'منصة فاخرة للمنتجات المنزلية الطبيعية والعطور الحرفية، تجمع بين نقاء المواد وأصالة الحرف وهدوء التصميم الموشى بالذهب الدافئ.';
  client.brand_palette = [
    { name: 'أخضر شذرة النباتي', value: '#2C6852' },
    { name: 'ذهب شذرة الدافئ', value: '#DAB272' },
    { name: 'بيج رملي ناعم', value: '#E8DAC2' },
    { name: 'عاجي ناصع', value: '#FAF6F0' },
  ];

  const phases = state.phases.filter((phase) => phase.client_id === client.id).sort((a, b) => a.sort - b.sort);
  const phaseDates = [[-14, -8], [-7, 3], [4, 17], [18, 24], [25, 30]];
  phases.forEach((phase, index) => {
    if (phase.status === (index === 0 ? 'current' : 'next')) {
      phase.status = index === 0 ? 'done' : index === 1 ? 'current' : 'next';
    }
    phase.start_date ||= relativeDate(phaseDates[index]?.[0] ?? 0);
    phase.end_date ||= relativeDate(phaseDates[index]?.[1] ?? 7);
  });

  const completedAt = relativeTimestamp(-8, 15);
  const existingCurrentItem = state.items.find((item) => item.id === 'item-2');
  if (existingCurrentItem?.status === 'current') {
    existingCurrentItem.status = 'done';
    existingCurrentItem.done_at = completedAt;
  }
  const demoItems = [
    { id: 'item-4', phase_id: 'phase-1', name: 'تحديد جمهور المتجر ونبرة العلامة', status: 'done', sort: 2, done_at: completedAt },
    { id: 'item-5', phase_id: 'phase-2', name: 'تصميم الشعار والرمز', status: 'done', sort: 1, done_at: relativeTimestamp(-3, 14) },
    { id: 'item-6', phase_id: 'phase-2', name: 'اعتماد لوحة الألوان', status: 'current', sort: 2, done_at: null },
    { id: 'item-7', phase_id: 'phase-2', name: 'تصميم واجهة المتجر', status: 'next', sort: 3, done_at: null },
  ];
  demoItems.forEach((item) => {
    if (!state.items.some((existing) => existing.id === item.id)) {
      state.items.push({ ...item, client_id: client.id });
    }
  });

  const welcomeUpdate = state.updates.find((update) => update.id === 'update-1');
  if (welcomeUpdate?.title === 'أهلا بك في بوابة المشروع' || welcomeUpdate?.title === 'انطلاق مشروع هوية دار سُدرة') {
    welcomeUpdate.title = 'انطلاق مشروع هوية دار شذرة';
    welcomeUpdate.body = 'بدأنا بتحديد شخصية العلامة ونبرة دار شذرة الفاخرة والجمهور المستهدف للمنتجات المنزلية الطبيعية.';
    welcomeUpdate.phase_name = phases[0]?.name || DEFAULT_PHASES[0];
    welcomeUpdate.created_at = relativeTimestamp(-8, 11);
  }
  const updates = [
    {
      id: 'update-2', title: 'المسار البصري المعتمد: أخضر شذرة النباتي والذهب الدافئ',
      body: 'جهزنا مسارات بصرية تمزج أخضر شذرة النباتي بدرجات الذهب الدافئ الفاخر (#DAB272) والبيج الرملي والعاجي، مع خطوط عربية متناسقة ونماذج تغليف تعكس نقاء الطبيعة وفخامة الحرف اليدوية.',
      phase_name: 'التصميم', created_at: relativeTimestamp(-3, 14),
    },
    {
      id: 'update-3', title: 'الشعار الأولي وعبوات المنتجات الفاخرة جاهزة للمعاينة',
      body: 'أضفنا تصور الشعار ولوحة الهوية البصرية ونماذج عبوات الشموع والعطور بلمسات الذهبي الملكي. ننتظر اعتماد لوحة الألوان قبل استكمال الواجهة الرقمية.',
      phase_name: 'التصميم', created_at: relativeTimestamp(-1, 10),
    },
  ];
  state.updates ||= [];
  updates.forEach((update) => {
    if (!state.updates.some((existing) => existing.id === update.id)) {
      state.updates.push({ ...update, client_id: client.id });
    }
  });

  const firstRequest = state.requests.find((request) => request.id === 'request-1');
  if (firstRequest?.title === 'اختر اللون الرئيسي' || firstRequest?.title === 'اعتماد لوحة الألوان') {
    firstRequest.title = 'اعتماد لوحة الألوان لمجموعات دار شذرة';
    firstRequest.description = 'أي لوحة أقرب لهوية دار شذرة؟ اختيارك يحدد اتجاه تغليف المنتجات وتصميم واجهة المتجر ولمسات الذهب الملكي.';
    firstRequest.options = [
      { label: 'أخضر شذرة النباتي (#2C6852) مع ذهب دافئ (#DAB272) وعاجي (الموصى به)' },
      { label: 'أخضر زيتوني ملكي مع ذهب عتيق وبيج رملي' },
      { label: 'درجات خشب الصندل الدافئ مع أخضر الغابة العميق وذهب شذرة' },
    ];
  }
  state.requests ||= [];
  if (!state.requests.some((request) => request.id === 'request-2')) {
    state.requests.push({
      id: 'request-2', client_id: client.id, kind: 'approval',
      title: 'مراجعة واعتماد الشعار الأولي',
      description: 'راجع الشعار المرفق ونماذج استخدامه على المنتجات وأرسل اعتمادك أو ملاحظاتك للفريق.',
      options: [], status: 'open', answer: null, created_at: relativeTimestamp(-1, 10),
    });
  }

  state.files ||= [];
  [
    { id: 'file-brand-board', name: 'لوحة الهوية البصرية - دار شذرة.svg', url: '/demo/sidra-brand-board.svg', created_at: relativeTimestamp(-1, 9) },
    { id: 'file-brand-mark', name: 'الشعار الأولي - دار شذرة.svg', url: '/demo/sidra-mark.svg', created_at: relativeTimestamp(-3, 13) },
  ].forEach((file) => {
    if (!state.files.some((existing) => existing.id === file.id)) {
      state.files.push({ ...file, client_id: client.id });
    }
  });

  const welcomeMessage = state.messages.find((message) => message.id === 'message-1');
  if (welcomeMessage?.body === 'أهلا بك! يمكنك إرسال أي استفسار من هذه الصفحة.') {
    welcomeMessage.body = 'أهلًا سارة! شاركنا معك تصور هوية دار شذرة الأولي ونماذج المنتجات. يمكنك مراجعتها واعتماد لوحة الألوان من قسم «المطلوب منك».';
    welcomeMessage.created_at = relativeTimestamp(-3, 13);
  }
  state.messages ||= [];
  [
    { id: 'message-2', from_client: true, body: 'الأخضر النباتي مع لمسات الذهب الدافئ مناسب جداً وفخم، ويعكس تماماً طابع منتجات دار شذرة الراقية.', created_at: relativeTimestamp(-2, 10) },
    { id: 'message-3', from_client: false, body: 'سعداء جداً بإعجابك سارة! اعتمدنا لمسات الذهب الدافئ على حواف العبوات والشعار، وخيارات لوحة الألوان جاهزة لاعتمادك النهائي.', created_at: relativeTimestamp(-1, 11) },
  ].forEach((message) => {
    if (!state.messages.some((existing) => existing.id === message.id)) {
      state.messages.push({ ...message, client_id: client.id });
    }
  });

  state.notifications ||= [];
  const welcomeNotification = state.notifications.find((notification) => notification.id === 'notification-1');
  if (welcomeNotification) {
    welcomeNotification.text = 'تحديث جديد: انطلاق مشروع هوية دار شذرة';
  }
  [
    { id: 'notification-update-3', type: 'update', text: 'تحديث جديد: الشعار الأولي وعبوات المنتجات جاهزة للمراجعة', href: '/portal/updates/update-3', ref_id: 'update-3', read: false, created_at: relativeTimestamp(-1, 10) },
    { id: 'notification-request-2', type: 'request', text: 'مطلوب منك: مراجعة واعتماد الشعار الأولي', href: '/portal/requests', ref_id: 'request-2', read: false, created_at: relativeTimestamp(-1, 10) },
    { id: 'notification-file-board', type: 'file', text: 'أضفنا ملف «لوحة الهوية البصرية - دار شذرة.svg»', href: '/portal/files', ref_id: 'file-brand-board', read: false, created_at: relativeTimestamp(-1, 9) },
  ].forEach((notification) => {
    if (!state.notifications.some((existing) => existing.id === notification.id)) {
      state.notifications.push({ ...notification, client_id: client.id });
    }
  });

  // Projects and inline comments for real project management
  state.projects ||= [];
  state.inline_comments ||= [];

  if (!state.projects.some((p) => p.client_id === client.id)) {
    const demoProject = {
      id: 'project-demo-shathrah',
      client_id: client.id,
      name: 'هوية ومتجر دار شذرة الفاخر',
      description: 'منصة تسوق رقمية راقية ومتجر إلكتروني فاخر لمنتجات دار شذرة الطبيعية والعطور الحرفية مع بوابات دفع آمنة وتجربة تصفح موشاة بالذهب الدافئ.',
      production_url: 'https://shathrah.test',
      status: 'in_progress',
      progress: 42,
      start_date: relativeDate(-14),
      end_date: relativeDate(30),
      created_at: relativeTimestamp(-14),
      updated_at: relativeTimestamp(-1),
      sections: defaultProjectSections('هوية ومتجر دار شذرة الفاخر'),
    };
    state.projects.push(demoProject);

    if (!state.inline_comments.some((c) => c.project_id === demoProject.id)) {
      state.inline_comments.push({
        id: 'ic-demo-1',
        project_id: demoProject.id,
        section_id: 'design_ui',
        client_id: client.id,
        author: 'client',
        author_name: client.contact_name || 'سارة العبدالله',
        author_role: 'client',
        content: 'نود التأكد من ظهور شعار دار شذرة الذهبي بحجم واضح ومتناسق في الشريط العلوي للمتجر على شاشات الجوال.',
        status: 'resolved',
        created_at: relativeTimestamp(-2, 14),
        replies: [
          {
            id: 'reply-demo-1',
            author: 'admin',
            author_name: 'فريق دار شذرة',
            author_role: 'admin',
            content: 'تم اعتماد الملاحظة وتحديث قياس الشعار ليكون بارزاً وأنيقاً في نسخة الهاتف.',
            created_at: relativeTimestamp(-1, 16),
          },
        ],
      });
      state.inline_comments.push({
        id: 'ic-demo-2',
        project_id: demoProject.id,
        section_id: 'features',
        client_id: client.id,
        author: 'client',
        author_name: client.contact_name || 'سارة العبدالله',
        author_role: 'client',
        content: 'هل يمكن إضافة خيار تغليف الهدايا الفاخر مع بطاقة إهداء مخصصة في مرحلة الدفع وسلة الشراء؟',
        status: 'in_progress',
        created_at: relativeTimestamp(-1, 11),
        replies: [
          {
            id: 'reply-demo-2',
            author: 'admin',
            author_name: 'فريق دار شذرة',
            author_role: 'admin',
            content: 'فكرة ممتازة جداً وتتناسب مع هوية دار شذرة. جاري إضافة ميزة كرت الإهداء وصناديق التغليف المخملية ضمن خيارات الدفع.',
            created_at: relativeTimestamp(-1, 13),
          },
        ],
      });
    }
  }

  state.comments ||= [];
  const demoComments = [
    {
      id: 'comment-1',
      target_type: 'update',
      target_id: 'update-3',
      client_id: client.id,
      author_role: 'client',
      author_name: 'سارة العبدالله',
      body: 'تصميم العبوات أنيق للغاية وتدرجات الأخضر طبيعية ومريحة، ننتظر رؤية العينات الورقية.',
      created_at: relativeTimestamp(-1, 11),
    },
    {
      id: 'comment-2',
      target_type: 'update',
      target_id: 'update-3',
      client_id: client.id,
      author_role: 'admin',
      author_name: 'فريق دار شذرة',
      body: 'سعداء بإعجابك سارة! سنجهز نماذج الطباعة على الورق القطني خلال يومين.',
      created_at: relativeTimestamp(-1, 12),
    },
  ];
  demoComments.forEach((c) => {
    if (!state.comments.some((existing) => existing.id === c.id)) {
      state.comments.push(c);
    }
  });

  state.demoContentVersion = 4;
  return true;
}

function createInitialState() {
  const clientId = 'demo-client';
  const now = timestamp();
  const phases = DEFAULT_PHASES.map((name, index) => ({
    id: `phase-${index + 1}`,
    client_id: clientId,
    name,
    sort: index,
    status: index === 0 ? 'current' : 'next',
    start_date: '',
    end_date: '',
  }));
  const items = [
    { id: 'item-1', phase_id: phases[0].id, client_id: clientId, name: 'مراجعة المتطلبات', status: 'done', sort: 0, done_at: now },
    { id: 'item-2', phase_id: phases[0].id, client_id: clientId, name: 'اعتماد نطاق المشروع', status: 'current', sort: 1, done_at: null },
    { id: 'item-3', phase_id: phases[1].id, client_id: clientId, name: 'إعداد التصور الأولي', status: 'next', sort: 0, done_at: null },
  ];
  const state = {
    session: { clientId, admin: false },
    auth: {
      admin: { ...DEMO_ADMIN },
      clients: { [clientId]: { ...DEMO_CLIENT } },
      accounts: {
        [normalizeEmail(DEMO_CLIENT.email)]: { ...DEMO_CLIENT, clientId },
      },
      passwordResets: {},
    },
    clients: [{
      id: clientId,
      username: 'demo-client',
      name: 'عميل تجريبي',
      project_name: 'الموقع الإلكتروني',
      contact_name: 'محمد',
      email: DEMO_CLIENT.email,
      telegram_chat: '',
      start_date: '',
      end_date: '',
      progress: 25,
      notify_email: false,
      notify_telegram: false,
      created_at: now,
    }],
    phases,
    items,
    requests: [{
      id: 'request-1',
      client_id: clientId,
      kind: 'decision',
      title: 'اختر اللون الرئيسي',
      description: 'اختر اللون الأنسب لهوية المشروع.',
      options: [{ label: 'أخضر' }, { label: 'أزرق' }],
      status: 'open',
      answer: null,
      created_at: now,
    }],
    updates: [{
      id: 'update-1',
      client_id: clientId,
      title: 'أهلا بك في بوابة المشروع',
      body: 'يمكنك متابعة تقدم المشروع والتواصل مع الفريق من هذه الصفحة.',
      phase_name: phases[0].name,
      created_at: now,
    }],
    files: [],
    messages: [{
      id: 'message-1',
      client_id: clientId,
      from_client: false,
      body: 'أهلا بك! يمكنك إرسال أي استفسار من هذه الصفحة.',
      created_at: now,
    }],
    comments: [],
    projects: [],
    inline_comments: [],
    notifications: [{
      id: 'notification-1',
      client_id: clientId,
      type: 'update',
      text: 'تحديث جديد: أهلا بك في بوابة المشروع',
      href: '/portal/updates/update-1',
      ref_id: 'update-1',
      read: false,
      created_at: now,
    }],
  };
  seedDemoProject(state);
  return state;
}

export function readState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const state = JSON.parse(saved);
    let migrated = false;
    state.auth ||= { admin: { ...DEMO_ADMIN }, clients: {}, accounts: {}, passwordResets: {} };
    state.session ||= { clientId: 'demo-client', admin: false };
    if (!state.auth.admin?.email || !state.auth.admin?.password) {
      state.auth.admin = { ...DEMO_ADMIN };
      migrated = true;
    }
    state.auth.clients ||= {};
    state.auth.accounts ||= {};
    if (!state.auth.accounts['client@example.test']) {
      state.auth.accounts['client@example.test'] = { email: 'client@example.test', password: 'client123', clientId: 'demo-client' };
      migrated = true;
    }
    state.auth.passwordResets ||= {};
    state.projects ||= [];
    state.inline_comments ||= [];
    // Clean up legacy mock clients from previous versions
    const fakeClientIds = new Set(['client-scents', 'client-ceramics', 'client-gifting']);
    if (state.clients?.some((c) => fakeClientIds.has(c.id))) {
      state.clients = state.clients.filter((c) => !fakeClientIds.has(c.id));
      state.phases = (state.phases || []).filter((p) => !fakeClientIds.has(p.client_id));
      state.items = (state.items || []).filter((i) => !fakeClientIds.has(i.client_id));
      state.updates = (state.updates || []).filter((u) => !fakeClientIds.has(u.client_id));
      state.requests = (state.requests || []).filter((r) => !fakeClientIds.has(r.client_id));
      state.files = (state.files || []).filter((f) => !fakeClientIds.has(f.client_id));
      state.comments = (state.comments || []).filter((c) => !fakeClientIds.has(c.client_id));
      for (const fakeId of fakeClientIds) {
        delete state.auth.clients[fakeId];
      }
      migrated = true;
    }
    if (seedDemoProject(state)) migrated = true;
    for (const client of state.clients ?? []) {
      const credentials = state.auth.clients[client.id];
      if (credentials) {
        if (!client.email) {
          client.email = credentials.email;
          migrated = true;
        }
        const email = normalizeEmail(credentials.email || client.email);
        if (email && !state.auth.accounts[email]) {
          state.auth.accounts[email] = { ...credentials, email, clientId: client.id };
          migrated = true;
        }
        continue;
      }
      const email = normalizeEmail(client.email) || (client.id === 'demo-client'
        ? DEMO_CLIENT.email
        : `${client.username || client.id}@example.test`);
      client.email = email;
      state.auth.clients[client.id] = {
        email,
        password: client.id === 'demo-client' ? DEMO_CLIENT.password : 'client123',
      };
      state.auth.accounts[email] = {
        ...state.auth.clients[client.id],
        clientId: client.id,
      };
      migrated = true;
    }

    // The old demo client name was saved into browsers that already ran the app.
    let renamed = false;
    for (const client of state.clients ?? []) {
      if (client.name === 'شركة النور') { client.name = 'عميل تجريبي'; renamed = true; }
    }
    if (renamed || migrated) {
      try {
        saveState(state);
      } catch {}
    }
    return state;
  } catch {
    throw new Error('تعذر قراءة البيانات المحلية. امسح بيانات الموقع من المتصفح للبدء من جديد.');
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function chatAttachments(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_CHAT_FILES) fail('يمكنك إرفاق 3 ملفات كحد أقصى في الرسالة الواحدة.');
  const attachments = input.map((file) => {
    const name = String(file?.name || '').trim();
    const type = String(file?.type || 'application/octet-stream');
    const size = Number(file?.size);
    const dataUrl = String(file?.dataUrl || '');
    if (!name || name.length > 255 || !Number.isInteger(size) || size < 0 || !/^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/]*={0,2}$/.test(dataUrl)) {
      fail('تعذر قراءة أحد المرفقات. اختر الملف مرة أخرى.');
    }
    const encodedData = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (type.length > 255 || size > MAX_CHAT_BYTES || encodedData.length > Math.ceil(size / 3) * 4) {
      fail('حجم المرفق غير صالح أو يتجاوز الحد المسموح.');
    }
    return { name, type, size, dataUrl };
  });
  if (attachments.reduce((total, file) => total + file.size, 0) > MAX_CHAT_BYTES) {
    fail('الحد الإجمالي للمرفقات في الرسالة 1 ميجابايت.');
  }
  return attachments;
}

function saveChatMessage(state) {
  try {
    saveState(state);
  } catch (error) {
    if (error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014) {
      fail('مساحة التخزين المحلية ممتلئة. امسح المحادثة القديمة ثم حاول مجددًا.');
    }
    throw error;
  }
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function currentClient(state) {
  const client = state.clients.find((row) => row.id === state.session.clientId);
  if (!client) fail('سجّل الدخول للمتابعة', 401);
  return client;
}

function requireAdmin(state) {
  if (!state.session.admin) fail('سجّل الدخول للمتابعة', 401);
}

function notificationsFor(state, clientId) {
  return state.notifications.filter((row) => row.client_id === clientId);
}

function unreadCount(state, clientId) {
  return notificationsFor(state, clientId).filter((row) => !row.read).length;
}

function addNotification(state, clientId, { type, text, href, ref_id }) {
  state.notifications.push({
    id: id(), client_id: clientId, type, text, href, ref_id, read: false, created_at: timestamp(),
  });
}

function commentsFor(state, targetType, targetId) {
  return state.comments
    .filter((comment) => comment.target_type === targetType && comment.target_id === targetId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function phaseData(state, clientId) {
  return state.phases
    .filter((phase) => phase.client_id === clientId)
    .sort((a, b) => a.sort - b.sort)
    .map((phase) => {
      const items = state.items.filter((item) => item.phase_id === phase.id);
      return { ...phase, done: items.filter((item) => item.status === 'done').length, total: items.length };
    });
}

function updateData(state, clientId) {
  return state.updates
    .filter((update) => update.client_id === clientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((update) => ({
      ...update,
      unread: notificationsFor(state, clientId).some((n) => n.type === 'update' && n.ref_id === update.id && !n.read),
      comment_count: state.comments.filter((comment) => comment.target_type === 'update' && comment.target_id === update.id).length,
    }));
}

function clientThreads(state, clientId) {
  const clientComments = state.comments.filter((comment) => comment.client_id === clientId);
  const grouped = new Map();
  clientComments.forEach((comment) => {
    const key = `${comment.target_type}:${comment.target_id}`;
    if (!grouped.has(key)) grouped.set(key, {
      target_type: comment.target_type,
      target_id: comment.target_id,
      comments: [],
    });
    grouped.get(key).comments.push(comment);
  });
  return [...grouped.values()].map((thread) => {
    const isUpdate = thread.target_type === 'update';
    const update = state.updates.find((row) => row.id === thread.target_id);
    const item = state.items.find((row) => row.id === thread.target_id);
    const phase = state.phases.find((row) => row.id === item?.phase_id);
    return {
      ...thread,
      title: isUpdate ? update?.title || 'تحديث' : item?.name || 'بند',
      where: isUpdate ? 'تحديث منشور' : `بند منجز · ${phase?.name || ''}`,
      needs_reply: thread.comments.some((comment) => comment.needs_reply),
      last: thread.comments[thread.comments.length - 1].created_at,
    };
  }).sort((a, b) => Number(b.needs_reply) - Number(a.needs_reply) || b.last.localeCompare(a.last));
}

function clientOverview(state, client) {
  const phases = phaseData(state, client.id);
  const updates = updateData(state, client.id);
  const messages = state.messages
    .filter((message) => message.client_id === client.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
    .reverse();
  const clientProjects = (state.projects || [])
    .filter((p) => p.client_id === client.id)
    .map((p) => {
      const comments = (state.inline_comments || []).filter((c) => c.project_id === p.id);
      return {
        ...p,
        comment_count: comments.length,
        open_comment_count: comments.filter((c) => c.status !== 'resolved').length,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const recentComments = (state.inline_comments || [])
    .filter((c) => c.client_id === client.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return {
    client,
    projects: clientProjects,
    recentComments,
    phases,
    requests: state.requests.filter((row) => row.client_id === client.id),
    updates: updates.slice(0, 3),
    files: state.files.filter((row) => row.client_id === client.id).slice(0, 5),
    messages,
    unread: unreadCount(state, client.id),
  };
}

function adminClients(state) {
  const today = new Date().toISOString().slice(0, 10);
  return state.clients.map((client) => {
    const openRequests = state.requests.filter((row) => row.client_id === client.id && row.status === 'open').length;
    const waitingComments = state.comments.filter((row) => row.client_id === client.id && row.needs_reply).length;
    const late = client.end_date && client.end_date < today && client.progress < 100;
    return {
      ...client,
      open_requests: openRequests,
      waiting_comments: waitingComments,
      health: late ? 'late' : openRequests || waitingComments ? 'wait' : 'ok',
      current_phase: state.phases.find((phase) => phase.client_id === client.id && phase.status === 'current')?.name || null,
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function adminClient(state, clientId) {
  const client = state.clients.find((row) => row.id === clientId);
  if (!client) fail('العميل غير موجود', 404);
  return {
    client,
    phases: state.phases.filter((phase) => phase.client_id === clientId)
      .sort((a, b) => a.sort - b.sort)
      .map((phase) => ({ ...phase, items: state.items.filter((item) => item.phase_id === phase.id).sort((a, b) => a.sort - b.sort) })),
    requests: state.requests.filter((row) => row.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    updates: state.updates.filter((row) => row.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    files: state.files.filter((row) => row.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    messages: state.messages.filter((row) => row.client_id === clientId).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    waiting_comments: state.comments.filter((row) => row.client_id === clientId && row.needs_reply).length,
  };
}

function makeRecord(clientId, values) {
  return { id: id(), client_id: clientId, ...values, created_at: timestamp() };
}

export async function localData(path, { method = 'GET', body = {} } = {}) {
  const state = readState();
  const route = path.replace(/^\/+/, '');
  const parts = route.split('/');
  let result;

  if (route === 'client/password-reset' && method === 'POST') return requestPasswordReset(state, 'client', body);
  if (route === 'client/password-reset/confirm' && method === 'POST') return confirmPasswordReset(state, 'client', body);
  if (route === 'admin/password-reset' && method === 'POST') return requestPasswordReset(state, 'admin', body);
  if (route === 'admin/password-reset/confirm' && method === 'POST') return confirmPasswordReset(state, 'admin', body);

  if (route === 'client/login' && method === 'POST') {
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!isEmail(email) || !password) fail('أدخل بريدًا إلكترونيًا صحيحًا وكلمة المرور', 400);
    if (isAdminEmail(email)) {
      fail('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }
    let account = state.auth.accounts[email];
    if (!account) {
      const demoClient = state.clients.find((client) => client.id === 'demo-client') || state.clients[0];
      if (!demoClient) fail('لا يوجد حساب عميل تجريبي', 404);
      account = { email, password, clientId: demoClient.id };
      state.auth.accounts[email] = account;
    } else if (account.password !== password) {
      fail('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }
    state.session.clientId = account.clientId;
    state.session.admin = false;
    saveState(state);
    return { ok: true, role: 'client' };
  }
  if (route === 'client/logout' && method === 'POST') {
    state.session.clientId = null;
    state.session.admin = false;
    saveState(state);
    return { ok: true };
  }
  if (route === 'admin/login' && method === 'POST') {
    const norm = normalizeEmail(body.email);
    const adminEmail = normalizeEmail(state.auth?.admin?.email || 'admin@example.test');
    const validEmail = norm === adminEmail || norm === 'admin@example.test' || norm === 'admin@example.com' || norm.startsWith('admin@') || norm === 'admin';
    const validPassword = body.password === state.auth.admin.password;
    if (!validEmail || !validPassword) {
      fail('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }
    state.session.admin = true;
    state.session.clientId = null;
    saveState(state);
    return { ok: true, role: 'admin' };
  }
  if (route === 'admin/logout' && method === 'POST') {
    state.session.admin = false;
    state.session.clientId = null;
    saveState(state);
    return { ok: true };
  }

  if (parts[0] === 'client') {
    const client = currentClient(state);
    const clientId = client.id;
    if (route === 'client/overview') result = clientOverview(state, client);
    else if (route === 'client/updates' && method === 'GET') result = updateData(state, clientId);
    else if (parts[1] === 'updates' && parts.length === 3 && method === 'GET') {
      const update = state.updates.find((row) => row.id === parts[2] && row.client_id === clientId);
      if (!update) fail('التحديث غير موجود', 404);
      state.notifications.forEach((n) => { if (n.client_id === clientId && n.ref_id === update.id) n.read = true; });
      saveState(state);
      result = { update, comments: commentsFor(state, 'update', update.id) };
    } else if (parts[1] === 'updates' && parts[3] === 'comments' && method === 'POST') {
      const update = state.updates.find((row) => row.id === parts[2] && row.client_id === clientId);
      if (!update) fail('التحديث غير موجود', 404);
      const text = String(body.body || '').trim();
      if (!text) fail('اكتب تعليقك');
      result = makeRecord(clientId, { target_type: 'update', target_id: update.id, author: 'client', body: text, needs_reply: true });
      state.comments.push(result);
      saveState(state);
    } else if (route === 'client/phases' && method === 'GET') result = phaseData(state, clientId);
    else if (parts[1] === 'phases' && parts.length === 3 && method === 'GET') {
      const phase = state.phases.find((row) => row.id === parts[2] && row.client_id === clientId);
      if (!phase) fail('المرحلة غير موجودة', 404);
      const items = state.items.filter((row) => row.phase_id === phase.id).sort((a, b) => a.sort - b.sort);
      items.forEach((item) => { item.comments = commentsFor(state, 'item', item.id); });
      state.notifications.forEach((n) => { if (n.client_id === clientId && n.ref_id === phase.id) n.read = true; });
      saveState(state);
      result = { phase, items };
    } else if (parts[1] === 'items' && parts[3] === 'comments' && method === 'POST') {
      const item = state.items.find((row) => row.id === parts[2] && row.client_id === clientId);
      if (!item || item.status !== 'done') fail('التعليق متاح على البنود المنجزة فقط', 400);
      const text = String(body.body || '').trim();
      if (!text) fail('اكتب تعليقك');
      result = makeRecord(clientId, { target_type: 'item', target_id: item.id, author: 'client', body: text, needs_reply: true });
      state.comments.push(result);
      saveState(state);
    } else if (route === 'client/requests' && method === 'GET') {
      result = state.requests.filter((row) => row.client_id === clientId);
    } else if (parts[1] === 'requests' && parts[3] === 'answer' && method === 'POST') {
      const request = state.requests.find((row) => row.id === parts[2] && row.client_id === clientId && row.status === 'open');
      if (!request) fail('الطلب غير موجود أو تم الرد عليه', 404);
      if (request.kind === 'decision' && !request.options?.some((option) => option.label === body.answer)) fail('اختيار غير صالح');
      if (request.kind === 'content' && !String(body.answer || '').trim()) fail('اكتب المحتوى أو ضع رابطا');
      request.status = 'done';
      request.answer = request.kind === 'approval' ? 'تم الاعتماد' : String(body.answer || '').trim();
      request.answered_at = timestamp();
      saveState(state);
      result = { ok: true };
    } else if (route === 'client/files' && method === 'GET') {
      result = state.files.filter((row) => row.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (route === 'client/messages' && method === 'DELETE') {
      state.messages = state.messages.filter((message) => message.client_id !== clientId);
      saveState(state);
      result = { ok: true };
    } else if (route === 'client/messages' && method === 'POST') {
      const text = String(body.body || '').trim();
      const attachments = chatAttachments(body.attachments);
      if (!text && !attachments.length) fail('اكتب رسالتك أو أرفق ملفًا.');
      state.messages.push(makeRecord(clientId, { from_client: true, body: text, ...(attachments.length ? { attachments } : {}) }));
      saveChatMessage(state);
      result = { ok: true };
    } else if (route === 'client/notifications/count' && method === 'GET') result = { unread: unreadCount(state, clientId) };
    else if (route === 'client/notifications' && method === 'GET') {
      const items = notificationsFor(state, clientId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
      result = { items, unread: items.filter((n) => !n.read).length, prefs: { notify_email: client.notify_email, notify_telegram: client.notify_telegram } };
    } else if (route === 'client/notifications/read-all' && method === 'POST') {
      state.notifications.forEach((n) => { if (n.client_id === clientId) n.read = true; });
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'notifications' && parts[3] === 'read' && method === 'POST') {
      const notification = state.notifications.find((row) => row.id === parts[2] && row.client_id === clientId);
      if (notification) notification.read = true;
      saveState(state);
      result = { ok: true };
    } else if (route === 'client/prefs' && method === 'PATCH') {
      ['notify_email', 'notify_telegram'].forEach((key) => {
        if (typeof body[key] === 'boolean') client[key] = body[key];
      });
      saveState(state);
      result = { ok: true };
    } else if (route === 'client/projects' && method === 'GET') {
      result = (state.projects || [])
        .filter((p) => p.client_id === clientId)
        .map((p) => {
          const comments = (state.inline_comments || []).filter((c) => c.project_id === p.id);
          return {
            ...p,
            comment_count: comments.length,
            open_comment_count: comments.filter((c) => c.status !== 'resolved').length,
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (parts[1] === 'projects' && parts.length === 3 && method === 'GET') {
      const project = (state.projects || []).find((p) => p.id === parts[2] && p.client_id === clientId);
      if (!project) fail('المشروع غير موجود أو غير مصرح لك بالوصول إليه', 404);
      const comments = (state.inline_comments || [])
        .filter((c) => c.project_id === project.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      result = { project, comments };
    } else if (parts[1] === 'projects' && parts.length === 4 && parts[3] === 'comments' && method === 'POST') {
      const project = (state.projects || []).find((p) => p.id === parts[2] && p.client_id === clientId);
      if (!project) fail('المشروع غير موجود أو غير مصرح لك بالوصول إليه', 404);
      const sectionId = String(body.section_id || '').trim();
      const content = String(body.content || '').trim();
      if (!sectionId) fail('حدد القسم المراد التعليق عليه', 400);
      if (!content) fail('اكتب نص الملاحظة أو الاستفسار', 400);
      const sectionExists = (project.sections || []).some((s) => s.id === sectionId);
      if (!sectionExists) fail('القسم المحدد غير موجود في المشروع', 400);
      const newComment = {
        id: id(),
        project_id: project.id,
        section_id: sectionId,
        client_id: clientId,
        author: 'client',
        author_name: client.contact_name || client.name || 'العميل',
        author_role: 'client',
        content,
        status: 'open',
        created_at: timestamp(),
        replies: [],
      };
      state.inline_comments ||= [];
      state.inline_comments.push(newComment);
      saveState(state);
      result = newComment;
    } else if (parts[1] === 'projects' && parts[3] === 'comments' && parts[5] === 'reply' && method === 'POST') {
      const project = (state.projects || []).find((p) => p.id === parts[2] && p.client_id === clientId);
      if (!project) fail('المشروع غير موجود', 404);
      const comment = (state.inline_comments || []).find((c) => c.id === parts[4] && c.project_id === project.id);
      if (!comment) fail('الملاحظة غير موجودة', 404);
      const content = String(body.content || '').trim();
      if (!content) fail('اكتب نص الرد', 400);
      const reply = {
        id: id(),
        author: 'client',
        author_name: client.contact_name || client.name || 'العميل',
        author_role: 'client',
        content,
        created_at: timestamp(),
      };
      comment.replies ||= [];
      comment.replies.push(reply);
      if (comment.status === 'resolved') comment.status = 'open';
      saveState(state);
      result = reply;
    }
  } else if (parts[0] === 'admin') {
    requireAdmin(state);
    if (route === 'admin/me' && method === 'GET') result = { ok: true };
    else if (route === 'admin/projects' && method === 'GET') {
      result = (state.projects || []).map((p) => {
        const client = state.clients.find((c) => c.id === p.client_id);
        const comments = (state.inline_comments || []).filter((c) => c.project_id === p.id);
        return {
          ...p,
          client_name: client?.name || 'غير معروف',
          client_email: client?.email || '',
          contact_name: client?.contact_name || '',
          comment_count: comments.length,
          open_comment_count: comments.filter((c) => c.status !== 'resolved').length,
        };
      }).sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (route === 'admin/projects' && method === 'POST') {
      const name = String(body.name || '').trim();
      const productionUrl = String(body.production_url || '').trim();
      const clientId = String(body.client_id || '').trim();
      if (!name) fail('اسم المشروع مطلوب');
      if (!productionUrl || !/^https?:\/\//i.test(productionUrl)) fail('أدخل رابط موقع حي صحيح يبدأ بـ https:// أو http://');
      const targetClient = state.clients.find((c) => c.id === clientId);
      if (!targetClient) fail('العميل المحدد غير موجود');
      const newProjectId = id();
      const newProject = {
        id: newProjectId,
        client_id: targetClient.id,
        name,
        description: String(body.description || '').trim() || `مشروع ${name} المخصص لشركة ${targetClient.name}`,
        production_url: productionUrl,
        status: body.status || 'in_progress',
        progress: Math.max(0, Math.min(100, Number.parseInt(body.progress, 10) || 0)),
        start_date: body.start_date || relativeDate(0),
        end_date: body.end_date || relativeDate(30),
        created_at: timestamp(),
        updated_at: timestamp(),
        sections: defaultProjectSections(name),
      };
      state.projects ||= [];
      state.projects.push(newProject);
      addNotification(state, targetClient.id, {
        type: 'phase',
        text: `تم تدشين مشروعك الجديد «${name}» - يمكنك الآن معاينته وإبداء الملاحظات`,
        href: `/portal/projects/${newProjectId}`,
        ref_id: newProjectId,
      });
      saveState(state);
      result = { ok: true, id: newProjectId, project: newProject };
    } else if (parts[1] === 'projects' && parts.length === 3 && method === 'GET') {
      const project = (state.projects || []).find((p) => p.id === parts[2]);
      if (!project) fail('المشروع غير موجود', 404);
      const client = state.clients.find((c) => c.id === project.client_id);
      const comments = (state.inline_comments || [])
        .filter((c) => c.project_id === project.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      result = { project, client, comments };
    } else if (parts[1] === 'projects' && parts.length === 3 && method === 'PATCH') {
      const project = (state.projects || []).find((p) => p.id === parts[2]);
      if (!project) fail('المشروع غير موجود', 404);
      if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) fail('اسم المشروع مطلوب');
        project.name = name;
      }
      if (body.production_url !== undefined) {
        const url = String(body.production_url || '').trim();
        if (!/^https?:\/\//i.test(url)) fail('رابط الإنتاج يجب أن يبدأ بـ https:// أو http://');
        project.production_url = url;
      }
      if (body.client_id !== undefined) {
        const targetClient = state.clients.find((c) => c.id === body.client_id);
        if (!targetClient) fail('العميل المحدد غير موجود');
        project.client_id = targetClient.id;
      }
      if (body.description !== undefined) project.description = String(body.description || '').trim();
      if (body.status !== undefined) project.status = body.status;
      if (body.progress !== undefined) project.progress = Math.max(0, Math.min(100, Number.parseInt(body.progress, 10) || 0));
      if (body.start_date !== undefined) project.start_date = body.start_date;
      if (body.end_date !== undefined) project.end_date = body.end_date;
      project.updated_at = timestamp();
      saveState(state);
      result = { ok: true, project };
    } else if (parts[1] === 'projects' && parts.length === 3 && method === 'DELETE') {
      const idx = (state.projects || []).findIndex((p) => p.id === parts[2]);
      if (idx === -1) fail('المشروع غير موجود', 404);
      state.projects.splice(idx, 1);
      state.inline_comments = (state.inline_comments || []).filter((c) => c.project_id !== parts[2]);
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'projects' && parts[3] === 'comments' && parts.length === 5 && method === 'PATCH') {
      const project = (state.projects || []).find((p) => p.id === parts[2]);
      if (!project) fail('المشروع غير موجود', 404);
      const comment = (state.inline_comments || []).find((c) => c.id === parts[4] && c.project_id === project.id);
      if (!comment) fail('الملاحظة غير موجودة', 404);
      if (body.status && ['open', 'in_progress', 'resolved'].includes(body.status)) {
        comment.status = body.status;
      }
      saveState(state);
      result = { ok: true, comment };
    } else if (parts[1] === 'projects' && parts[3] === 'comments' && parts[5] === 'reply' && method === 'POST') {
      const project = (state.projects || []).find((p) => p.id === parts[2]);
      if (!project) fail('المشروع غير موجود', 404);
      const comment = (state.inline_comments || []).find((c) => c.id === parts[4] && c.project_id === project.id);
      if (!comment) fail('الملاحظة غير موجودة', 404);
      const content = String(body.content || '').trim();
      if (!content) fail('اكتب نص الرد', 400);
      const reply = {
        id: id(),
        author: 'admin',
        author_name: 'فريق الإدارة',
        author_role: 'admin',
        content,
        created_at: timestamp(),
      };
      comment.replies ||= [];
      comment.replies.push(reply);
      if (body.status && ['open', 'in_progress', 'resolved'].includes(body.status)) {
        comment.status = body.status;
      }
      addNotification(state, comment.client_id, {
        type: 'reply',
        text: `رد جديد من الإدارة على ملاحظتك في «${project.name}»`,
        href: `/portal/projects/${project.id}`,
        ref_id: comment.id,
      });
      saveState(state);
      result = reply;
    }
    else if (route === 'admin/clients' && method === 'GET') result = adminClients(state);
    else if (route === 'admin/clients' && method === 'POST') {
      const name = String(body.name || '').trim();
      const projectName = String(body.project_name || '').trim();
      if (!name || !projectName) fail('اسم الشركة والمشروع مطلوبان');
      const email = normalizeEmail(body.email);
      if (!isEmail(email)) fail('أدخل بريدًا إلكترونيًا صحيحًا للعميل');
      if (Object.values(state.auth.clients).some((credentials) => normalizeEmail(credentials.email) === email)) {
        fail('هذا البريد مرتبط بحساب عميل آخر');
      }
      if (state.auth.accounts[email]) fail('هذا البريد مرتبط بحساب عميل آخر');
      const clientId = id();
      const client = {
        id: clientId,
        username: `client-${Math.random().toString(36).slice(2, 10)}`,
        name,
        project_name: projectName,
        contact_name: body.contact_name || '',
        email,
        telegram_chat: body.telegram_chat || '',
        start_date: body.start_date || '',
        end_date: body.end_date || '',
        progress: 0,
        notify_email: false,
        notify_telegram: false,
        created_at: timestamp(),
      };
      state.clients.push(client);
      state.auth.clients[clientId] = { email, password: 'client123' };
      state.auth.accounts[email] = { ...state.auth.clients[clientId], clientId };
      DEFAULT_PHASES.forEach((phaseName, index) => state.phases.push({
        id: id(), client_id: clientId, name: phaseName, sort: index,
        status: index === 0 ? 'current' : 'next', start_date: '', end_date: '',
      }));
      saveState(state);
      result = { id: clientId };
    } else if (parts[1] === 'clients' && parts[2] && parts.length === 3 && method === 'GET') {
      result = adminClient(state, parts[2]);
    } else if (parts[1] === 'clients' && parts[2] && parts.length === 3 && method === 'PATCH') {
      const client = state.clients.find((row) => row.id === parts[2]);
      if (!client) fail('العميل غير موجود', 404);
      client.progress = Math.max(0, Math.min(100, Number.parseInt(body.progress, 10) || 0));
      client.start_date = body.start_date || '';
      client.end_date = body.end_date || '';
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'clients' && parts[3] === 'comments' && method === 'GET') {
      result = clientThreads(state, parts[2]);
    } else if (parts[1] === 'clients' && parts[3] === 'threads' && parts[4] === 'reply' && method === 'POST') {
      const { target_type: targetType, target_id: targetId, body: text } = body;
      if (!['update', 'item'].includes(targetType) || !String(text || '').trim()) fail('بيانات التعليق غير مكتملة');
      const client = state.clients.find((row) => row.id === parts[2]);
      if (!client) fail('العميل غير موجود', 404);
      const exists = targetType === 'update'
        ? state.updates.some((row) => row.id === targetId && row.client_id === client.id)
        : state.items.some((row) => row.id === targetId && row.client_id === client.id);
      if (!exists) fail('التعليق غير موجود', 404);
      state.comments.push(makeRecord(client.id, { target_type: targetType, target_id: targetId, author: 'team', body: String(text).trim(), needs_reply: false }));
      state.comments.forEach((comment) => {
        if (comment.client_id === client.id && comment.target_type === targetType && comment.target_id === targetId && comment.author === 'client') {
          comment.needs_reply = false;
        }
      });
      const refId = targetType === 'update' ? targetId : state.items.find((row) => row.id === targetId).phase_id;
      addNotification(state, client.id, {
        type: 'reply',
        text: 'فريق المشروع ردّ على تعليقك',
        href: targetType === 'update' ? `/portal/updates/${targetId}` : `/portal/phases/${refId}`,
        ref_id: refId,
      });
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'phases' && parts[2] && parts.length === 3 && method === 'PATCH') {
      const phase = state.phases.find((row) => row.id === parts[2]);
      if (!phase) fail('المرحلة غير موجودة', 404);
      const wasDone = phase.status === 'done';
      phase.status = body.status;
      phase.start_date = body.start_date || '';
      phase.end_date = body.end_date || '';
      if (phase.status === 'done' && !wasDone) addNotification(state, phase.client_id, {
        type: 'phase', text: `اكتملت مرحلة «${phase.name}»`, href: `/portal/phases/${phase.id}`, ref_id: phase.id,
      });
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'phases' && parts[3] === 'items' && method === 'POST') {
      const phase = state.phases.find((row) => row.id === parts[2]);
      const name = String(body.name || '').trim();
      if (!phase) fail('المرحلة غير موجودة', 404);
      if (!name) fail('اكتب اسم البند');
      const phaseItems = state.items.filter((item) => item.phase_id === phase.id);
      result = makeRecord(phase.client_id, {
        phase_id: phase.id, name, status: 'next', sort: phaseItems.length, done_at: null,
      });
      state.items.push(result);
      saveState(state);
    } else if (parts[1] === 'items' && parts[2] && method === 'PATCH') {
      const item = state.items.find((row) => row.id === parts[2]);
      if (!item) fail('البند غير موجود', 404);
      const wasDone = item.status === 'done';
      item.status = body.status;
      item.done_at = item.status === 'done' ? item.done_at || timestamp() : null;
      if (item.status === 'done' && !wasDone) addNotification(state, item.client_id, {
        type: 'phase', text: `تم إنجاز «${item.name}»`, href: `/portal/phases/${item.phase_id}`, ref_id: item.phase_id,
      });
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'clients' && parts[3] === 'requests' && method === 'POST') {
      const client = state.clients.find((row) => row.id === parts[2]);
      const title = String(body.title || '').trim();
      if (!client || !title) fail('بيانات الطلب غير مكتملة');
      const options = body.kind === 'decision'
        ? String(body.options || '').split('\n').map((label) => label.trim()).filter(Boolean).map((label) => ({ label }))
        : null;
      if (body.kind === 'decision' && options.length < 2) fail('القرار يحتاج خيارين على الأقل');
      if (!['decision', 'content', 'approval'].includes(body.kind)) fail('نوع الطلب غير صالح');
      result = makeRecord(client.id, {
        kind: body.kind, title, description: String(body.description || '').trim(), options, status: 'open', answer: null,
      });
      state.requests.push(result);
      addNotification(state, client.id, { type: 'request', text: `مطلوب منك: ${title}`, href: '/portal/requests', ref_id: result.id });
      saveState(state);
    } else if (parts[1] === 'clients' && parts[3] === 'updates' && method === 'POST') {
      const client = state.clients.find((row) => row.id === parts[2]);
      const title = String(body.title || '').trim();
      if (!client || !title) fail('اكتب عنوان التحديث');
      result = makeRecord(client.id, { title, body: String(body.body || '').trim(), phase_name: body.phase_name || null });
      state.updates.push(result);
      addNotification(state, client.id, { type: 'update', text: `تحديث جديد: ${title}`, href: `/portal/updates/${result.id}`, ref_id: result.id });
      saveState(state);
    } else if (parts[1] === 'clients' && parts[3] === 'files' && method === 'POST') {
      const client = state.clients.find((row) => row.id === parts[2]);
      const name = String(body.name || '').trim();
      const url = String(body.url || '').trim();
      if (!client || !name || !/^https?:\/\//i.test(url)) fail('الاسم والرابط (https://) مطلوبان');
      result = makeRecord(client.id, { name, url });
      state.files.push(result);
      addNotification(state, client.id, { type: 'file', text: `أضفنا ملف «${name}»`, href: '/portal/files', ref_id: result.id });
      saveState(state);
    } else if (parts[1] === 'clients' && parts[3] === 'messages' && method === 'DELETE') {
      const client = state.clients.find((row) => row.id === parts[2]);
      if (!client) fail('العميل غير موجود', 404);
      state.messages = state.messages.filter((message) => message.client_id !== client.id);
      saveState(state);
      result = { ok: true };
    } else if (parts[1] === 'clients' && parts[3] === 'messages' && method === 'POST') {
      const client = state.clients.find((row) => row.id === parts[2]);
      const text = String(body.body || '').trim();
      const attachments = chatAttachments(body.attachments);
      if (!client) fail('العميل غير موجود', 404);
      if (!text && !attachments.length) fail('اكتب ردًا أو أرفق ملفًا.');
      state.messages.push(makeRecord(client.id, { from_client: false, body: text, ...(attachments.length ? { attachments } : {}) }));
      addNotification(state, client.id, { type: 'reply', text: 'رد جديد من فريق المشروع على رسالتك', href: '/portal', ref_id: null });
      saveChatMessage(state);
      result = { ok: true };
    }
  }

  if (result === undefined) fail(`العملية المحلية غير مدعومة: ${method} ${path}`, 404);
  return result;
}

export function useLocalData(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const nav = useNavigate();
  const { pathname } = useLocation();
  const load = useCallback((silent = false) => {
    if (!silent) setState((current) => ({ ...current, loading: true }));
    try {
      const data = readState();
      const parts = path.replace(/^\/+/, '').split('/');
      if (parts[0] === 'client' && path !== '/client/login' && path !== '/client/logout') {
        currentClient(data);
      }
      if (parts[0] === 'admin' && !['/admin/login', '/admin/logout'].includes(path)) {
        requireAdmin(data);
      }
    } catch (error) {
      if (error.status === 401) nav(pathname.startsWith('/admin') ? '/admin/login' : '/login', { replace: true });
      setState({ data: null, error, loading: false });
      return Promise.resolve();
    }
    localData(path).then((result) => setState({ data: result, error: null, loading: false })).catch((error) => {
      if (error.status === 401) nav(pathname.startsWith('/admin') ? '/admin/login' : '/login', { replace: true });
      setState({ data: null, error, loading: false });
    });
    return Promise.resolve();
  }, [path, nav, pathname]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: () => load(true) };
}
