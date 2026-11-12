import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const { isAdminEmail, localData } = await import('./localData.js');
const post = (path, body) => localData(path, { method: 'POST', body });
const storageKey = 'react-portal-data-v2';
const clientEmail = 'client@example.test';
const clientPassword = 'client123';
const adminEmail = 'admin@example.test';
const adminPassword = 'admin123';
const wrongCode = (code) => (code === '000000' ? '000001' : '000000');

test('email login and password recovery work for client and admin demo accounts', async () => {
  storage.clear();
  assert.equal(isAdminEmail(adminEmail), true);
  assert.equal(isAdminEmail(` ${adminEmail.toUpperCase()} `), true);
  assert.equal(isAdminEmail(clientEmail), false);

  await assert.rejects(
    post('/client/login', { email: clientEmail, password: 'wrongpass' }),
    (error) => error.status === 401,
  );
  await assert.rejects(
    post('/client/login', { email: 'not-an-email', password: 'somepass' }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    post('/client/login', { email: 'new-client@example.com', password: '' }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    post('/client/login', { email: 'new-client@example.com', password: 'any-password' }),
    (error) => error.status === 401,
  );
  assert.equal((await post('/client/login', { email: adminEmail, password: adminPassword })).role, 'admin');
  assert.equal((await post('/admin/login', { email: clientEmail, password: clientPassword })).role, 'client');
  assert.equal((await post('/client/login', { email: clientEmail, password: clientPassword })).role, 'client');
  const demoOverview = await localData('/client/overview');
  assert.equal(demoOverview.client.id, 'demo-client');
  assert.equal(demoOverview.client.brand_name, 'ثقة');
  assert.equal(demoOverview.client.project_name, 'هوية ومتجر ثقة');
  assert.equal(demoOverview.client.progress, 42);
  assert.ok(demoOverview.phases.some((phase) => phase.status === 'current'));
  assert.equal(demoOverview.updates.length, 3);
  assert.equal(demoOverview.files.length, 2);
  assert.equal(demoOverview.messages.length, 3);
  assert.equal((await localData('/client/requests')).length, 2);
  assert.equal((await localData('/client/files')).length, 2);
  await localData('/client/messages', { method: 'DELETE' });
  assert.equal((await localData('/client/overview')).messages.length, 0);
  const attachment = { name: 'image.png', type: 'image/png', size: 1, dataUrl: 'data:image/png;base64,AA==' };
  await assert.rejects(post('/client/messages', { body: ' ' }), /اكتب رسالتك أو أرفق ملفًا/);
  await post('/client/messages', { body: 'رسالة اختبار قبل الحذف من الإدارة', attachments: [attachment] });
  const clientMessage = (await localData('/client/overview')).messages[0];
  assert.equal(clientMessage.body, 'رسالة اختبار قبل الحذف من الإدارة');
  assert.deepEqual(clientMessage.attachments, [attachment]);
  await assert.rejects(
    post('/client/messages', { body: '', attachments: Array(4).fill(attachment) }),
    /3 ملفات كحد أقصى/,
  );
  await assert.rejects(
    post('/client/messages', { body: '', attachments: [{ ...attachment, size: 1024 * 1024 + 1 }] }),
    /حجم المرفق/,
  );
  const setItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); };
  await assert.rejects(post('/client/messages', { body: 'اختبار مساحة التخزين' }), /مساحة التخزين المحلية ممتلئة/);
  globalThis.localStorage.setItem = setItem;
  await post('/client/logout', {});
  await assert.rejects(
    post('/client/login', { email: 'new-client@example.com', password: 'wrong-password' }),
    (error) => error.status === 401,
  );
  assert.deepEqual(await post('/client/password-reset', { email: 'new-client@example.com' }), { ok: true, resetCode: null });

  await post('/client/login', { email: ` ${clientEmail.toUpperCase()} `, password: clientPassword });
  assert.equal((await localData('/client/overview')).client.email, clientEmail);
  await post('/client/logout', {});

  const reset = await post('/client/password-reset', { email: clientEmail });
  assert.match(reset.resetCode, /^\d{6}$/);
  assert.deepEqual(await post('/client/password-reset', { email: 'unknown@example.test' }), { ok: true, resetCode: null });
  await assert.rejects(
    post('/client/password-reset/confirm', { email: clientEmail, code: wrongCode(reset.resetCode), password: 'newclient1' }),
    /رمز الاستعادة غير صحيح/,
  );
  await assert.rejects(
    post('/client/password-reset/confirm', { email: clientEmail, code: reset.resetCode, password: 'short' }),
    /8 أحرف/,
  );
  await post('/client/password-reset/confirm', { email: clientEmail, code: reset.resetCode, password: 'newclient1' });
  await assert.rejects(
    post('/client/password-reset/confirm', { email: clientEmail, code: reset.resetCode, password: 'newclient2' }),
    /رمز الاستعادة غير صحيح/,
  );
  await assert.rejects(post('/client/login', { email: clientEmail, password: clientPassword }), (error) => error.status === 401);
  await post('/client/login', { email: clientEmail, password: 'newclient1' });
  await post('/client/logout', {});

  const expiredReset = await post('/client/password-reset', { email: clientEmail });
  const state = JSON.parse(storage.get(storageKey));
  state.auth.passwordResets[`client:${clientEmail}`].expires_at = Date.now() - 1;
  storage.set(storageKey, JSON.stringify(state));
  await assert.rejects(
    post('/client/password-reset/confirm', { email: clientEmail, code: expiredReset.resetCode, password: 'another123' }),
    /رمز الاستعادة غير صحيح/,
  );

  const lockedReset = await post('/client/password-reset', { email: clientEmail });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(
      post('/client/password-reset/confirm', { email: clientEmail, code: wrongCode(lockedReset.resetCode), password: 'another123' }),
      /رمز الاستعادة غير صحيح/,
    );
  }
  await assert.rejects(
    post('/client/password-reset/confirm', { email: clientEmail, code: lockedReset.resetCode, password: 'another123' }),
    /رمز الاستعادة غير صحيح/,
  );

  await assert.rejects(post('/admin/login', { email: adminEmail, password: 'wrongpass' }), (error) => error.status === 401);
  await assert.rejects(post('/admin/login', { email: clientEmail, password: clientPassword }), (error) => error.status === 401);
  await post('/admin/login', { email: adminEmail, password: adminPassword });
  assert.deepEqual(await localData('/admin/me'), { ok: true });
  const demoClientAdminData = await localData(`/admin/clients/${demoOverview.client.id}`);
  assert.equal(demoClientAdminData.messages.length, 1);
  assert.deepEqual(demoClientAdminData.messages[0].attachments, [attachment]);
  await assert.rejects(
    post(`/admin/clients/${demoOverview.client.id}/messages`, { body: '' }),
    /اكتب ردًا أو أرفق ملفًا/,
  );
  await post(`/admin/clients/${demoOverview.client.id}/messages`, { body: '', attachments: [attachment] });
  assert.deepEqual(
    (await localData(`/admin/clients/${demoOverview.client.id}`)).messages.at(-1).attachments,
    [attachment],
  );
  await localData(`/admin/clients/${demoOverview.client.id}/messages`, { method: 'DELETE' });
  assert.equal((await localData(`/admin/clients/${demoOverview.client.id}`)).messages.length, 0);
  await post('/admin/logout', {});

  const adminReset = await post('/admin/password-reset', { email: adminEmail });
  assert.match(adminReset.resetCode, /^\d{6}$/);
  await post('/admin/password-reset/confirm', { email: adminEmail, code: adminReset.resetCode, password: 'newadmin123' });
  await assert.rejects(post('/admin/login', { email: adminEmail, password: adminPassword }), (error) => error.status === 401);
  await post('/admin/login', { email: adminEmail, password: 'newadmin123' });

  const created = await post('/admin/clients', {
    name: 'عميل جديد',
    project_name: 'مشروع تجريبي',
    email: 'new-client@example.test',
  });
  await post('/admin/logout', {});
  await post('/client/login', { email: 'new-client@example.test', password: clientPassword });
  assert.equal((await localData('/client/overview')).client.id, created.id);
  await post('/client/logout', {});

  storage.clear();
  await post('/client/login', { email: clientEmail, password: clientPassword });
  const legacyState = JSON.parse(storage.get(storageKey));
  delete legacyState.auth;
  delete legacyState.demoContentVersion;
  legacyState.clients[0].email = '';
  legacyState.clients[0].name = 'عميل تجريبي';
  legacyState.clients[0].project_name = 'الموقع الإلكتروني';
  legacyState.clients[0].progress = 25;
  delete legacyState.clients[0].brand_name;
  delete legacyState.clients[0].brand_tagline;
  delete legacyState.clients[0].brand_description;
  delete legacyState.clients[0].brand_palette;
  storage.set(storageKey, JSON.stringify(legacyState));
  await post('/client/logout', {});
  await post('/client/login', { email: clientEmail, password: clientPassword });
  const migratedOverview = await localData('/client/overview');
  assert.equal(migratedOverview.client.email, clientEmail);
  assert.equal(migratedOverview.client.brand_name, 'ثقة');
  assert.equal(migratedOverview.client.project_name, 'هوية ومتجر ثقة');
  assert.equal(migratedOverview.files.length, 2);
});

test('Interactive Project Management, Client Isolation & Inline Comments System', async () => {
  storage.clear();

  // 1. Verify Mock Data cleanup: legacy fake clients should NOT exist
  await post('/admin/login', { email: adminEmail, password: adminPassword });
  const initialClients = await localData('/admin/clients');
  const fakeIds = ['client-scents', 'client-ceramics', 'client-gifting'];
  for (const fakeId of fakeIds) {
    assert.equal(initialClients.some((c) => c.id === fakeId), false);
  }

  // 2. Admin creates a second client for testing RBAC and client isolation
  const clientBRes = await post('/admin/clients', {
    name: 'شركة الأفق التقنية',
    project_name: 'منصة الأفق',
    email: 'clientb@example.test',
  });
  const clientBId = clientBRes.id;

  // 3. Admin creates a new project assigned specifically to demo client
  await assert.rejects(
    post('/admin/projects', { name: '', production_url: 'https://demo.thiqa.test', client_id: 'demo-client' }),
    /اسم المشروع مطلوب/,
  );
  await assert.rejects(
    post('/admin/projects', { name: 'متجر ثقة الجديد', production_url: 'invalid-url', client_id: 'demo-client' }),
    /رابط موقع حي صحيح/,
  );
  await assert.rejects(
    post('/admin/projects', { name: 'متجر ثقة الجديد', production_url: 'https://demo.test', client_id: 'non-existent-client' }),
    /العميل المحدد غير موجود/,
  );

  const createdProjectRes = await post('/admin/projects', {
    name: 'متجر ثقة الحي الفاخر',
    production_url: 'https://store.thiqa.test',
    client_id: 'demo-client',
    status: 'in_progress',
    progress: 55,
    description: 'المتجر الإلكتروني الرئيسي لثقة',
  });
  assert.ok(createdProjectRes.id);
  const projectId = createdProjectRes.id;

  // Verify project sections are automatically seeded with 8 standard sections
  const adminProjectView = await localData(`/admin/projects/${projectId}`);
  assert.equal(adminProjectView.project.name, 'متجر ثقة الحي الفاخر');
  assert.equal(adminProjectView.project.sections.length, 8);
  assert.ok(adminProjectView.project.sections.some((s) => s.id === 'design_ui'));

  await post('/admin/logout', {});

  // 4. Client A (demo client) logs in and sees their assigned project
  await post('/client/login', { email: clientEmail, password: clientPassword });
  const clientAProjects = await localData('/client/projects');
  assert.ok(clientAProjects.some((p) => p.id === projectId));

  // Client A views project details
  const clientAProjectDetail = await localData(`/client/projects/${projectId}`);
  assert.equal(clientAProjectDetail.project.id, projectId);
  assert.equal(clientAProjectDetail.project.production_url, 'https://store.thiqa.test');

  // Client A submits an inline comment on a section (e.g. design_ui)
  await assert.rejects(
    post(`/client/projects/${projectId}/comments`, { section_id: 'non-existent-section', content: 'ملاحظة' }),
    /القسم المحدد غير موجود/,
  );
  await assert.rejects(
    post(`/client/projects/${projectId}/comments`, { section_id: 'design_ui', content: ' ' }),
    /اكتب نص الملاحظة/,
  );

  const commentRes = await post(`/client/projects/${projectId}/comments`, {
    section_id: 'design_ui',
    content: 'نود تكبير الخط العربي في العناوين الرئيسية ليكون أوضح.',
  });
  assert.ok(commentRes.id);
  assert.equal(commentRes.author, 'client');
  assert.equal(commentRes.status, 'open');

  await post('/client/logout', {});

  // 5. Client B logs in and CANNOT access Client A's project (Client Isolation / RBAC)
  await post('/client/login', { email: 'clientb@example.test', password: clientPassword });
  const clientBProjects = await localData('/client/projects');
  assert.equal(clientBProjects.some((p) => p.id === projectId), false);

  // Directly requesting Client A's project should fail with 404
  await assert.rejects(
    localData(`/client/projects/${projectId}`),
    (error) => error.status === 404,
  );
  await assert.rejects(
    post(`/client/projects/${projectId}/comments`, { section_id: 'design_ui', content: 'تطفل' }),
    (error) => error.status === 404,
  );

  await post('/client/logout', {});

  // 6. Admin logs in, reviews the comment, updates status, and replies
  await post('/admin/login', { email: adminEmail, password: adminPassword });
  const adminCommentsView = await localData(`/admin/projects/${projectId}`);
  assert.equal(adminCommentsView.comments.length >= 1, true);
  const targetComment = adminCommentsView.comments.find((c) => c.id === commentRes.id);
  assert.ok(targetComment);

  // Admin replies and marks status as resolved
  await post(`/admin/projects/${projectId}/comments/${commentRes.id}/reply`, {
    content: 'تم اعتماد التعديل وتكبير الخط في كامل المتجر.',
    status: 'resolved',
  });

  // Verify status updated in admin view
  const updatedAdminView = await localData(`/admin/projects/${projectId}`);
  const resolvedComment = updatedAdminView.comments.find((c) => c.id === commentRes.id);
  assert.equal(resolvedComment.status, 'resolved');
  assert.equal(resolvedComment.replies.length, 1);
  assert.equal(resolvedComment.replies[0].author, 'admin');

  // 7. Admin updates project information (progress, name)
  await localData(`/admin/projects/${projectId}`, {
    method: 'PATCH',
    body: { progress: 85, name: 'متجر ثقة الرسمي' },
  });
  const patchedView = await localData(`/admin/projects/${projectId}`);
  assert.equal(patchedView.project.progress, 85);
  assert.equal(patchedView.project.name, 'متجر ثقة الرسمي');

  // 8. Admin deletes project and verifies cascade deletion
  await localData(`/admin/projects/${projectId}`, { method: 'DELETE' });
  await assert.rejects(
    localData(`/admin/projects/${projectId}`),
    (error) => error.status === 404,
  );

  await post('/admin/logout', {});
});
