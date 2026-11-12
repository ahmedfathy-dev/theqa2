import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// فحص حقيقي من جهة الخادم: هل يسمح الموقع بالتضمين داخل iframe؟
// المتصفح لا يستطيع قراءة رؤوس موقع من نطاق آخر، لذلك يتم الفحص هنا.
async function checkFrameable(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return { ok: false, reason: 'invalid', message: 'الرابط غير صالح' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: 'invalid', message: 'بروتوكول غير مدعوم' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(u, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 PortalFrameCheck', accept: 'text/html,*/*' },
    });
    try { await res.body?.cancel(); } catch { /* ignore */ }
    const finalUrl = res.url || u.href;
    const xfo = (res.headers.get('x-frame-options') || '').trim();
    const csp = res.headers.get('content-security-policy') || '';
    const fa = /(?:^|;)\s*frame-ancestors\s+([^;]*)/i.exec(csp)?.[1]?.trim();
    const base = { status: res.status, finalUrl, xFrameOptions: xfo || null, frameAncestors: fa || null };
    if (res.status >= 500) return { ok: false, reason: 'server-error', message: `الموقع يرجع خطأ ${res.status}`, ...base };
    if (res.status >= 400) return { ok: false, reason: 'http-error', message: `الموقع يرجع الحالة ${res.status}`, ...base };
    if (xfo && /deny|sameorigin/i.test(xfo))
      return { ok: false, reason: 'x-frame-options', message: `الموقع يمنع التضمين (X-Frame-Options: ${xfo})`, ...base };
    if (fa && !/(^|\s)(\*|https?:)(\s|$)/.test(fa))
      return { ok: false, reason: 'csp', message: `الموقع يمنع التضمين (CSP frame-ancestors: ${fa})`, ...base };
    return { ok: true, ...base };
  } catch (e) {
    const timeout = e?.name === 'AbortError';
    return { ok: false, reason: timeout ? 'timeout' : 'unreachable', message: timeout ? 'انتهت مهلة الاتصال بالموقع' : 'تعذر الوصول إلى الموقع' };
  } finally {
    clearTimeout(timer);
  }
}

function frameCheckPlugin() {
  const handler = async (req, res, next) => {
    if (!req.url?.startsWith('/__frame-check')) return next();
    const target = new URL(req.url, 'http://localhost').searchParams.get('url') || '';
    const out = await checkFrameable(target);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(out));
  };
  return {
    name: 'frame-check',
    configureServer(s) { s.middlewares.use(handler); },
    configurePreviewServer(s) { s.middlewares.use(handler); },
  };
}

export default defineConfig({
  root: 'client',
  plugins: [react(), frameCheckPlugin()],
  resolve: { alias: { '@': fileURLToPath(new URL('./client/src', import.meta.url)) } },
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173 },
});
