import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CardNav from './CardNav.jsx';
import { LogoutDialog } from './ui.jsx';
import logoUrl from '../assets/logo.png';

// CardNav links render <a href>; route them through the router instead of a full page load.
const RouterLink = ({ href, ...props }) => <Link to={href} {...props} />;

// Re-skin CardNav's light theme with the Portal tokens.
const SKIN = {
  '--cn-logo': '34px',
  '--cn-radius': '16px',
  '--cn-panel': '#ffffff',
  '--cn-solid': '#ffffff',
  '--cn-edge': 'rgb(var(--line))',
  '--cn-highlight': '#ffffff',
  '--cn-shadow': 'var(--shadow-float)',
  '--cn-blur': 'none',
  '--cn-text': 'rgb(var(--ink))',
  '--cn-muted': 'rgb(var(--muted))',
  '--cn-hover': 'rgb(var(--brand-50))',
  '--cn-ring': 'rgb(var(--brand-600))',
  '--cn-tile': '#ffffff',
  '--cn-tile-rim': 'inset 0 0 0 1px rgb(var(--line))',
  '--cn-cta': 'rgb(var(--brand-600))',
  '--cn-cta-ink': '#ffffff',
  '--cn-cta-shadow': 'var(--shadow-xs)',
  '--cn-cta-hover': 'brightness(1.08)',
};

// Small-screen navbar: the same links as the desktop tabs, inside a CardNav menu.
// `trailing` (e.g. the notification bell) sits beside the bar.
export default function MobileNav({ items, label, title, logoTo, onLogout, trailing }) {
  const { pathname } = useLocation();
  const [confirming, setConfirming] = useState(false);
  const cards = [{
    label: title,
    links: items.map(({ to, label: text, end = true }) => ({
      label: text,
      href: to,
      active: end ? pathname === to : pathname.startsWith(to),
    })),
  }];
  return (
    <div className="mobile-nav hidden max-[900px]:flex">
      <CardNav
        className="min-w-0 flex-1"
        logo={logoUrl}
        logoAlt="دار شذرة، الصفحة الرئيسية"
        logoHref={logoTo}
        items={cards}
        cta={{ label: 'تسجيل خروج', onClick: () => setConfirming(true) }}
        accentColor="#244B3D"
        cardHeight={0}
        maxWidth={640}
        intro={false}
        menuText="القائمة"
        closeText="إغلاق"
        openMenuLabel="فتح القائمة"
        closeMenuLabel="إغلاق القائمة"
        ariaLabel={label}
        linkComponent={RouterLink}
        style={SKIN}
      />
      {trailing && <div className="mobile-nav-trailing">{trailing}</div>}
      <LogoutDialog open={confirming} onClose={() => setConfirming(false)} onLogout={onLogout} />
    </div>
  );
}
