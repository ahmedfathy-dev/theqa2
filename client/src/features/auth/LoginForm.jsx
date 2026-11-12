import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { localData } from '../../localData.js';
import { AuthLayout, Button, ButtonLink, Field, PasswordInput, useAction } from '../../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOME = { admin: '/admin', client: '/portal' };

// صفحة دخول واحدة تخدم الإدارة والعميل: الخادم يحدد الدور من البريد، والواجهة توجّه إلى اللوحة الصحيحة.
export default function LoginForm({ emailLabel, placeholder, submitLabel, forgotTo, layout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [missing, setMissing] = useState('');
  const { state } = useLocation();
  const [loggedOut] = useState(Boolean(state?.loggedOut));
  const { busy, err, run } = useAction();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) { setMissing('أدخل بريدًا إلكترونيًا صحيحًا.'); return; }
    if (!password) { setMissing('أدخل كلمة المرور للمتابعة.'); return; }
    let res = null;
    const ok = await run(async () => {
      res = await localData('/auth/login', { method: 'POST', body: { email: cleanEmail, password } });
      return res;
    }, (r) => `${r?.role === 'admin' ? 'تم الدخول كمسؤول — لوحة الإدارة' : 'تم الدخول كعميل — بوابة العميل'} (${r?.email})`);
    if (ok) nav(HOME[res?.role] || '/portal', { replace: true });
  };

  return (
    <AuthLayout {...layout} notice={loggedOut ? 'تم تسجيل الخروج بنجاح' : null} onSubmit={submit}>
      <Field label={emailLabel} error={missing || err}>
        <input type="email" className="ltr" dir="ltr" autoFocus autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setMissing(''); }} placeholder={placeholder} />
      </Field>
      <Field label="كلمة المرور">
        <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setMissing(''); }} />
      </Field>
      <Button block loading={busy}>{submitLabel}</Button>
      <ButtonLink to={forgotTo} variant="ghost" size="small" block>هل نسيت كلمة المرور؟</ButtonLink>
    </AuthLayout>
  );
}
