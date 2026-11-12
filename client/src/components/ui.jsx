import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  House,
  Image as ImageIcon,
  ListChecks,
  LogOut,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { gooeyToast } from 'goey-toast';
import { fmtTime, STATUS, STATUS_TONE } from '../format.js';
import { EASE_OUT, SPRING, reveal, rise, swap } from '../lib/motion.js';
import logoColor from '../assets/logo.png';
import logoWhite from '../assets/logo-white.png';

const cx = (...parts) => parts.filter(Boolean).join(' ');

// ---------- icons (one stroke weight, currentColor, mirrored under RTL when direction-bearing) ----------
const ICONS = {
  back: { glyph: ArrowLeft, flip: true },
  next: { glyph: ArrowRight, flip: true },
  check: { glyph: Check },
  copy: { glyph: Copy },
  eye: { glyph: Eye },
  'eye-off': { glyph: EyeOff },
  logout: { glyph: LogOut, flip: true },
  bell: { glyph: Bell },
  alert: { glyph: TriangleAlert },
  trash: { glyph: Trash2 },
  close: { glyph: X },
  image: { glyph: ImageIcon },
  paperclip: { glyph: Paperclip },
  send: { glyph: Send, flip: true },
  home: { glyph: House },
  updates: { glyph: Clock3 },
  phases: { glyph: ListChecks },
  requests: { glyph: ClipboardList },
  files: { glyph: FileText },
  clients: { glyph: Users },
  projects: { glyph: FolderKanban },
  settings: { glyph: Settings },
  add: { glyph: Plus },
  chevron: { glyph: ChevronDown },
  'chevrons-right': { glyph: ChevronsRight },
  pencil: { glyph: Pencil },
  external: { glyph: ExternalLink, flip: true },
  monitor: { glyph: Monitor },
  tablet: { glyph: Tablet },
  smartphone: { glyph: Smartphone },
  'panel-open': { glyph: PanelLeftOpen },
  'panel-close': { glyph: PanelLeftClose },
  maximize: { glyph: Maximize2 },
  minimize: { glyph: Minimize2 },
  'comment-add': { glyph: MessageSquarePlus },
  sparkles: { glyph: Sparkles },
};

export function Icon({ name, className = 'size-4' }) {
  const { glyph: Glyph, flip } = ICONS[name];
  return (
    <Glyph className={cx('flex-none', flip && 'rtl:-scale-x-100', className)} strokeWidth={1.75} aria-hidden="true" focusable="false" />
  );
}

// Cross-fades between two icons on an infrequent state change (copy -> copied, show -> hide).
export function SwapIcon({ name }) {
  return (
    <span className="relative grid size-4 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span key={name} className="absolute inset-0 grid place-items-center" {...swap}>
          <Icon name={name} />
        </m.span>
      </AnimatePresence>
    </span>
  );
}

// Brand logo. Intrinsic size (251x200) is set so the browser reserves space and never distorts it;
// height comes from className, width follows. Use variant="white" on brand-colored backgrounds.
export function Logo({ variant = 'color', className = 'h-10', alt = '' }) {
  return <img src={variant === 'white' ? logoWhite : logoColor} width={251} height={200} alt={alt} draggable={false} className={cx('w-auto max-w-none flex-none select-none object-contain', className)} />;
}

// ---------- status ----------
export const Chip = ({ tone = 'gray', dot = false, live = false, children }) => (
  <span className={`chip ${tone}`}>
    {dot && <span className={cx('chip-dot', live && 'live')} aria-hidden="true" />}
    {children}
  </span>
);
export const StatusChip = ({ s }) => <Chip tone={STATUS_TONE[s]} dot live={s === 'current'}>{STATUS[s]}</Chip>;

// ---------- buttons ----------
// Variants: primary, secondary, outline, ghost, danger, success. Sizes: medium (44px), small (40px).
// `icon` makes a square icon-only button: always pass aria-label.
const BUTTON_VARIANTS = { primary: 'btn-primary', secondary: 'btn-secondary', outline: 'btn-outline', ghost: 'btn-ghost', quiet: 'btn-ghost', link: 'btn-link', danger: 'btn-danger', success: 'btn-success' };
const BUTTON_SIZES = { medium: 'btn-md', small: 'btn-sm' };
const buttonClass = ({ variant, size, icon, block, className }) =>
  cx('btn', BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary, BUTTON_SIZES[size] || BUTTON_SIZES.medium, icon && 'btn-icon', block && 'btn-block', className);

// While `loading`, the button stays focusable (aria-disabled) but swallows clicks and implicit form submits.
export function Button({ variant = 'primary', size = 'medium', icon = false, block = false, loading = false, disabled = false, className = '', onClick, children, ...props }) {
  return (
    <button
      className={buttonClass({ variant, size, icon, block, className })}
      disabled={disabled && !loading}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {!(loading && icon) && children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'primary', size = 'medium', icon = false, block = false, className = '', children, ...props }) {
  return <Link to={to} className={buttonClass({ variant, size, icon, block, className })} {...props}>{children}</Link>;
}

// Link-styled as a button (opens a URL outside the app). Same shape/variants as Button.
export function ExternalButton({ href, variant = 'secondary', size = 'small', block = false, className = '', children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={buttonClass({ variant, size, block, className })} {...props}>
      {children}
      <Icon name="external" className="size-3.5" />
    </a>
  );
}

// Renders children at document.body so dialogs always stack above fullscreen layers and animated ancestors.
export const Overlay = ({ children }) => createPortal(children, document.body);

// Icon-only close button used by dialogs and overlays.
export function CloseButton({ onClick, label = 'إغلاق', className = '' }) {
  return <Button type="button" variant="ghost" size="small" icon aria-label={label} className={className} onClick={onClick}><Icon name="close" className="size-4" /></Button>;
}

// Segmented radio-style switcher (e.g. desktop / tablet / mobile).
export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-label={o.label} title={o.label} className={cx('segmented-item', value === o.value && 'active')} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} className="size-4" />}
          <span className="segmented-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- forms ----------
const isControlElement = (el) => isValidElement(el) && (['input', 'select', 'textarea'].includes(el.type) || el.type?.isControl);

export function Field({ label, children, error, hint }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isControl = isControlElement(children);
  const Label = isControl ? 'label' : 'span';
  const controlId = isControl ? children.props.id || id : undefined;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <Label className="field-label" htmlFor={controlId}>{label}</Label>
      {isControl ? cloneElement(children, { id: controlId, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy }) : children}
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      <FormError id={errorId} message={error} />
    </div>
  );
}

export function Select({ id, value, onChange, options, disabled = false, ...props }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState('bottom');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const activeOption = options[activeIndex];
  const invalid = props['aria-invalid'] === true;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const showOptions = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const menuHeight = Math.min(256, options.length * 44 + 12);
      setPlacement(window.innerHeight - bounds.bottom < menuHeight && bounds.top > window.innerHeight - bounds.bottom ? 'top' : 'bottom');
    }
    setActiveIndex(index);
    setOpen(true);
  };
  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) showOptions();
      else setActiveIndex((index) => (index + direction + options.length) % options.length);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      if (activeOption) choose(activeOption);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault();
      showOptions();
    }
  };

  return (
    <div className="select-control" ref={rootRef}>
      <button
        {...props}
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeOption ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : showOptions())}
        onKeyDown={onKeyDown}
      >
        <span className={selectedIndex < 0 ? 'select-placeholder' : undefined}>
          {selectedIndex >= 0 ? options[selectedIndex].label : 'اختر خيارًا'}
        </span>
        <Icon name="chevron" className="select-chevron size-4" />
      </button>
      <div
        className="select-menu"
        id={listboxId}
        role="listbox"
        aria-labelledby={id}
        data-placement={placement}
        hidden={!open}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${listboxId}-option-${index}`}
            ref={(element) => { optionRefs.current[index] = element; }}
            role="option"
            aria-selected={value === option.value}
            className="select-option"
            data-active={index === activeIndex}
            data-selected={value === option.value}
            onPointerMove={() => setActiveIndex(index)}
            onClick={() => choose(option)}
          >
            <span>{option.label}</span>
            {value === option.value && <Icon name="check" className="size-4" />}
          </div>
        ))}
      </div>
    </div>
  );
}
Select.isControl = true;

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input {...props} type={show ? 'text' : 'password'} />
      <Button type="button" variant="ghost" size="small" icon aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
        <SwapIcon name={show ? 'eye-off' : 'eye'} />
      </Button>
    </div>
  );
}
PasswordInput.isControl = true;

export function FormError({ message, id }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <m.p key="error" id={id} role="alert" className="field-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
          <Icon name="alert" />
          <span>{message}</span>
        </m.p>
      )}
    </AnimatePresence>
  );
}

export function ChoiceGroup({ name, options, value, onChange, ariaLabel }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <label className="choice" data-checked={value === option.value} key={option.value}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
          <span className="choice-dot" aria-hidden="true" />
          <span className="text-base font-medium">{option.label}</span>
          {option.description && <span className="w-full text-sm font-normal text-muted">{option.description}</span>}
        </label>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}>
      <span className="switch-track"><m.span layout transition={SPRING} className="switch-thumb" /></span>
      <span>{checked ? 'مفعّل' : 'متوقف'}</span>
    </button>
  );
}

// Date range with a direction-aware separator (replaces the "←" glyph).
export const Range = ({ from, to }) => (
  <span className="inline-flex items-center gap-1.5">{from}<Icon name="next" className="size-3.5" />{to}</span>
);

// ---------- progress ----------
export function Bar({ value = 0, label, className = '' }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div
      className={cx('bar-container', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      dir="rtl"
    >
      <div className="bar-track">
        <m.div
          className="bar-fill"
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: 1.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <span className="bar-stream" aria-hidden="true" />
          {pct > 0 && (
            <span className="bar-bead" aria-hidden="true">
              <span className="bar-bead-core" />
              <span className="bar-bead-halo" />
            </span>
          )}
        </m.div>
      </div>
    </div>
  );
}

// ---------- structure ----------
// Reveal: one staggered entrance per route. Cards inside inherit the variants.
export const Reveal = ({ className = 'stack', children }) => (
  <m.div className={className} variants={reveal} initial="hidden" animate="show">{children}</m.div>
);

export const Page = ({ title, sub, children, actions, back }) => (
  <Reveal>
    <m.header variants={rise} className="page-head row between">
      <div>
        {back && <Link to={back.to} className="page-back"><Icon name="back" />{back.label}</Link>}
        {sub && <div className="page-sub">{sub}</div>}
        <h1>{title}</h1>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </m.header>
    {children}
  </Reveal>
);

const CARD_TAGS = { section: m.section, form: m.form, div: m.div };
export function Card({ as = 'section', title, children, hl, actions, className, ...props }) {
  const Tag = CARD_TAGS[as];
  return (
    <Tag variants={rise} className={cx('card', hl && 'hl', className)} {...props}>
      {(title || actions) && (
        <div className="card-header row between">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

const MotionLink = m.create(Link);
export const LinkCard = ({ className, ...props }) => <MotionLink variants={rise} className={cx('card', className)} {...props} />;

// Auto-animated container for lists whose rows are added, removed or reordered.
export function List({ className = 'list', children, ...props }) {
  const [ref] = useAutoAnimate({ duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  return <div ref={ref} className={className} {...props}>{children}</div>;
}

// Rendering is paused inside a view-transition callback, so wait on a timer, never requestAnimationFrame.
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

export function NavTabs({ items, id, label, start, end }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Wrap plain left-clicks in a View Transition; modified clicks, same-page clicks,
  // unsupported browsers and reduced-motion users get the normal navigation.
  const go = (e, to) => {
    if (!document.startViewTransition || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (to === pathname || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    document.startViewTransition(async () => {
      flushSync(() => navigate(to));
      await settle(); // let the route's data resolve so the new snapshot is the real page
    });
  };
  const tabsRef = useRef(null);
  useEffect(() => {
    tabsRef.current?.querySelector('.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [pathname]);
  return (
    <nav className="nav" aria-label={label} style={{ viewTransitionName: id }}>
      {start}
      <div className="nav-tabs" ref={tabsRef}>
        {items.map(({ to, label: text, end: exact = true, badge }) => (
          <NavLink key={to} to={to} end={exact} className="nav-link" onClick={(e) => go(e, to)}>
            {({ isActive }) => (
              <>
                {isActive && <m.span layoutId={id} className="nav-pill" transition={SPRING} />}
                <span className="nav-label">{text}{badge}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {end && <div className="nav-actions">{end}</div>}
    </nav>
  );
}

export function AppSidebar({
  items,
  logoTo,
  onLogout,
  trailing,
  label,
  workspace,
  notificationTo,
  unreadCount = 0,
  notificationLabel = 'الإشعارات',
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggle = () => setCollapsed((v) => {
    const next = !v;
    try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch { /* storage unavailable */ }
    return next;
  });
  return (
    <aside className={cx('app-sidebar', collapsed && 'is-collapsed')}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'فتح القائمة الجانبية' : 'طي القائمة الجانبية'}
        title={collapsed ? 'فتح القائمة' : 'طي القائمة'}
      >
        <Icon name="chevrons-right" className="size-4" />
      </button>
      <div className="sidebar-inner">
      <div className="sidebar-header-area">
        <Link to={logoTo} className="sidebar-brand" aria-label={`${workspace}، الصفحة الرئيسية`}>
          <Logo variant="white" className="sidebar-logo" />
          <span className="sidebar-brand-copy">
            <strong>{workspace}</strong>
            <small>دار شذرة</small>
          </span>
        </Link>
        {notificationTo && (
          <NavLink
            to={notificationTo}
            className={({ isActive }) => cx('sidebar-notification-btn', isActive && 'active')}
            title={unreadCount > 0 ? `${notificationLabel}، ${unreadCount} غير مقروء` : notificationLabel}
            aria-label={unreadCount > 0 ? `${notificationLabel}، ${unreadCount} غير مقروء` : notificationLabel}
          >
            <div className="sidebar-notification-inner">
              <span className="sidebar-notification-icon-wrap">
                <Icon name="bell" className="size-5" />
                {unreadCount > 0 && <span className="sidebar-notification-dot" aria-hidden="true" />}
              </span>
              <span className="sidebar-notification-label">{notificationLabel}</span>
            </div>
            {unreadCount > 0 && (
              <span className="sidebar-notification-badge" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        )}
      </div>
      <nav className="sidebar-nav" aria-label={label}>
        {items.map(({ to, label: text, icon, end = true, badgeCount = 0 }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="sidebar-link"
            title={badgeCount > 0 ? `${text}، ${badgeCount} غير مقروء` : text}
            aria-label={badgeCount > 0 ? `${text}، ${badgeCount} غير مقروء` : text}
          >
            <span className="sidebar-link-icon"><Icon name={icon} className="size-5" /></span>
            <span className="sidebar-label">{text}</span>
            {badgeCount > 0 && <span className="sidebar-count" aria-hidden="true">{badgeCount > 99 ? '99+' : badgeCount}</span>}
          </NavLink>
        ))}
      </nav>
      {trailing}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout" onClick={() => setLogoutOpen(true)}>
          <span className="sidebar-link-icon"><Icon name="logout" className="size-5" /></span>
          <span className="sidebar-label">تسجيل الخروج</span>
        </button>
      </div>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} onLogout={onLogout} />
      </div>
    </aside>
  );
}

export function WorkspaceHeader({ items, workspace, homeTo, trailing }) {
  const { pathname } = useLocation();
  const currentItem = items
    .filter(({ to, end = true }) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <header className="workspace-header">
      <nav className="breadcrumbs" aria-label="مسار التنقل">
        <Link to={homeTo}>{workspace}</Link>
        <span className="breadcrumb-sep" aria-hidden="true"><Icon name="next" className="size-3.5" /></span>
        <span aria-current="page">{currentItem?.label || workspace}</span>
      </nav>
      <div className="workspace-header-actions">
        {trailing}
        <div className="workspace-profile">
          <span className="workspace-profile-mark"><Icon name="home" className="size-4" /></span>
          <span>{workspace}</span>
        </div>
      </div>
    </header>
  );
}

// Logo that links home, for the start of the nav bar.
export const NavLogo = ({ to }) => (
  <Link to={to} className="nav-logo" aria-label="دار شذرة، الصفحة الرئيسية"><Logo className="h-9" /></Link>
);

// Modal on the native <dialog>: focus trap, Esc and inert background come from the platform;
// Motion only animates the overlay and panel in and out.
function DialogShell({ title, description, icon = 'logout', tone, confirmLabel, cancelLabel, busy, error, onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (dialog.open) dialog.close();
    };
  }, []);
  const cancel = () => { if (!busy) onCancel(); };
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} aria-describedby={descId} onCancel={(e) => { e.preventDefault(); cancel(); }}>
      <m.div className="dialog-overlay" onClick={cancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <div className="dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget) cancel(); }}>
        <m.div
          className="dialog-panel"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <span className={cx('dialog-icon', tone === 'danger' && 'danger')}><Icon name={icon} className="size-5" /></span>
          <div className="flex flex-col gap-1">
            <h2 id={titleId}>{title}</h2>
            <p id={descId} className="muted">{description}</p>
          </div>
          <FormError message={error} />
          <div className="dialog-actions">
            <Button variant="secondary" type="button" autoFocus disabled={busy} onClick={cancel}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} type="button" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </m.div>
      </div>
    </dialog>
  );
}

export const ConfirmDialog = ({ open, ...props }) => (
  <AnimatePresence>{open && <DialogShell key="dialog" {...props} />}</AnimatePresence>
);

export function ClearConversationButton({ onClear, audience }) {
  const [open, setOpen] = useState(false);
  const { busy, err, run } = useAction();
  const confirmClear = async () => {
    if (await run(onClear, 'تم مسح المحادثة')) setOpen(false);
  };
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="small"
        className="text-bad-700 hover:bg-bad-50"
        onClick={() => setOpen(true)}
      >
        <Icon name="trash" />
        مسح الشات
      </Button>
      <ConfirmDialog
        open={open}
        title="مسح المحادثة؟"
        description={`سيتم حذف جميع الرسائل بينك وبين ${audience} نهائيًا، ولا يمكن استعادتها.`}
        icon="trash"
        tone="danger"
        confirmLabel="مسح المحادثة"
        cancelLabel="إلغاء"
        busy={busy}
        error={err}
        onConfirm={confirmClear}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

const MAX_CHAT_FILES = 3;
const MAX_CHAT_BYTES = 1024 * 1024;

function readChatFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('تعذر قراءة الملف، حاول مرة أخرى.'));
        return;
      }
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(new Error(`تعذر قراءة الملف «${file.name}».`));
    reader.onabort = () => reject(new Error(`تم إلغاء قراءة الملف «${file.name}».`));
    reader.readAsDataURL(file);
  });
}

function ChatAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="chat-attachments">
      {attachments.map((attachment, index) => {
        const isImage = attachment.type?.startsWith('image/') && attachment.type !== 'image/svg+xml';
        return (
          <a
            key={`${attachment.name}-${index}`}
            className={isImage ? 'chat-attachment-image' : 'chat-attachment-file'}
            href={attachment.dataUrl}
            download={attachment.name}
            target={isImage ? '_blank' : undefined}
            rel={isImage ? 'noreferrer' : undefined}
          >
            {isImage
              ? <img src={attachment.dataUrl} alt={attachment.name} loading="lazy" />
              : <><Icon name="paperclip" /><span>{attachment.name}</span></>}
          </a>
        );
      })}
    </div>
  );
}

export function ChatPanel({ title, messages = [], currentUser, otherUser, label, clearAudience, onSend, onClear }) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [readingFiles, setReadingFiles] = useState(false);
  const conversationRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const { busy, err, run } = useAction();

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const addFiles = async (event) => {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!selected.length) return;
    setAttachmentError('');
    if (attachments.length + selected.length > MAX_CHAT_FILES) {
      setAttachmentError('يمكنك إرفاق 3 ملفات كحد أقصى في الرسالة الواحدة.');
      return;
    }
    if (attachments.reduce((total, file) => total + file.size, 0) + selected.reduce((total, file) => total + file.size, 0) > MAX_CHAT_BYTES) {
      setAttachmentError('الحد الإجمالي للمرفقات في الرسالة 1 ميجابايت.');
      return;
    }

    setReadingFiles(true);
    try {
      const loaded = await Promise.all(selected.map(readChatFile));
      setAttachments((current) => [...current, ...loaded]);
    } catch (error) {
      setAttachmentError(error.message);
    } finally {
      setReadingFiles(false);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const message = body.trim();
    if ((!message && !attachments.length) || readingFiles) return;
    const sent = await run(() => onSend({ body: message, attachments }), 'تم إرسال الرسالة');
    if (sent) {
      setBody('');
      setAttachments([]);
      setAttachmentError('');
      if (messageInputRef.current) messageInputRef.current.style.height = '2.5rem';
    }
  };

  return (
    <Card
      title={title}
      className="conversation-card"
      actions={messages.length > 0 && onClear && (
        <ClearConversationButton audience={clearAudience} onClear={onClear} />
      )}
    >
      <div className="conversation-scroll" ref={conversationRef} role="log" aria-label={label} aria-live="polite" tabIndex={0}>
        {messages.length ? (
          <List className="conversation-list col gap-2">
            {messages.map((message) => (
              <div key={message.id} className={`bubble${message.from_client ? (currentUser === 'client' ? ' me' : '') : (currentUser === 'team' ? ' me' : '')}`}>
                <span className="who">
                  <bdi>{message.from_client ? (currentUser === 'client' ? 'أنت' : otherUser) : (currentUser === 'team' ? 'أنت' : otherUser)}</bdi>
                  {message.created_at && <> · <time dateTime={message.created_at}><bdi>{fmtTime(message.created_at)}</bdi></time></>}
                </span>
                {message.body && <span className="whitespace-pre-wrap">{message.body}</span>}
                <ChatAttachments attachments={message.attachments} />
              </div>
            ))}
          </List>
        ) : <Empty>ابدأ المحادثة الآن.</Empty>}
      </div>

      <form className="chat-composer" onSubmit={send}>
        {attachments.length > 0 && (
          <div className="chat-pending-attachments" aria-label="المرفقات الجاهزة للإرسال">
            {attachments.map((attachment, index) => {
              const isImage = attachment.type.startsWith('image/') && attachment.type !== 'image/svg+xml';
              return (
                <div className="chat-pending-item" key={`${attachment.name}-${index}`}>
                  {isImage
                    ? <img src={attachment.dataUrl} alt="" />
                    : <Icon name="paperclip" />}
                  <span title={attachment.name}>{attachment.name}</span>
                  <button
                    type="button"
                    className="chat-remove-attachment"
                    aria-label={`إزالة ${attachment.name}`}
                    onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="chat-composer-row">
          <div className="chat-attach-actions">
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={addFiles} aria-label="اختيار صور" hidden />
            <input ref={fileInputRef} type="file" multiple onChange={addFiles} aria-label="اختيار ملفات" hidden />
            <Button type="button" variant="ghost" size="small" icon className="chat-attachment-action" aria-label="إرفاق صورة" title="إرفاق صورة" disabled={busy || readingFiles} onClick={() => imageInputRef.current?.click()}>
              <Icon name="image" />
            </Button>
            <Button type="button" variant="ghost" size="small" icon className="chat-attachment-action" aria-label="إرفاق ملف" title="إرفاق ملف" disabled={busy || readingFiles} onClick={() => fileInputRef.current?.click()}>
              <Icon name="paperclip" />
            </Button>
          </div>
          <textarea
            ref={messageInputRef}
            rows={1}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (!event.target.value) {
                event.currentTarget.style.height = '2.5rem';
                return;
              }
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
            }}
            placeholder="رسالة…"
            aria-label="رسالتك"
            disabled={busy}
          />
          <Button type="submit" icon className="chat-send-action" aria-label="إرسال الرسالة" title="إرسال الرسالة" loading={busy || readingFiles} disabled={busy || readingFiles || (!body.trim() && !attachments.length)}>
            <Icon name="send" />
          </Button>
        </div>
        <p className="chat-attachment-hint">حتى 3 مرفقات، بإجمالي 1 ميجابايت للرسالة.</p>
        {attachmentError && <p className="field-error" role="alert">{attachmentError}</p>}
        <FormError message={err} />
      </form>
    </Card>
  );
}

export function LogoutDialog({ open, onClose, onLogout }) {
  const { busy, err, run } = useAction();
  return (
    <ConfirmDialog
      open={open}
      title="تسجيل الخروج؟"
      description="ستنتهي جلستك على هذا الجهاز، ويمكنك الدخول مرة أخرى في أي وقت."
      confirmLabel="تسجيل خروج"
      cancelLabel="البقاء"
      busy={busy}
      error={err}
      onConfirm={() => run(onLogout)}
      onCancel={onClose}
    />
  );
}

export function LogoutButton({ onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="small" onClick={() => setOpen(true)}>
        <Icon name="logout" />
        تسجيل خروج
      </Button>
      <LogoutDialog open={open} onClose={() => setOpen(false)} onLogout={onLogout} />
    </>
  );
}

// Shared sign-in shell for client and admin: brand panel (wide screens) + form.
export function AuthLayout({ brand, heading, description, points, preview, mobilePreview, notice, onSubmit, children }) {
  return (
    <Reveal className="auth">
      <m.div variants={rise} className="auth-card">
        <aside className="auth-aside">
          <Logo variant="white" className="h-20 self-start" />
          {preview && <div className="auth-preview-desktop">{preview}</div>}
          <div className="col gap-4">
            <h2>{brand}</h2>
            <ul className="auth-points">
              {points.map((point) => <li key={point}><Icon name="check" className="size-4" />{point}</li>)}
            </ul>
          </div>
        </aside>
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <Logo className="h-16 self-start lg:hidden" alt="دار شذرة" />
          <div className="flex flex-col gap-3">
            <h1>{heading}</h1>
            {description && <p className="muted">{description}</p>}
          </div>
          {mobilePreview && <div className="auth-preview-mobile">{mobilePreview}</div>}
          {notice && <p className="notice" role="status"><Icon name="check" />{notice}</p>}
          {children}
        </form>
      </m.div>
    </Reveal>
  );
}

// ---------- states ----------
export const Loading = () => (
  <div className="stack loading-container" role="status" aria-live="polite">
    <span className="sr-only">جارٍ التحميل…</span>
    <div className="flex min-h-16 flex-col justify-center gap-2.5" aria-hidden="true">
      <div className="skeleton h-4 w-28 rounded-lg" />
      <div className="skeleton h-7 w-60 max-w-full rounded-lg" />
    </div>
    <div className="card" aria-hidden="true">
      <div className="skeleton h-5 w-40 rounded-lg" />
      <div className="skeleton h-2.5 w-full rounded-full" />
      <div className="skeleton h-4 w-2/3 rounded-lg" />
    </div>
    <div className="cols" aria-hidden="true">
      {[0, 1].map((i) => (
        <div className="card" key={i}>
          <div className="skeleton h-5 w-32 rounded-lg" />
          <div className="skeleton h-4 w-full rounded-lg" />
          <div className="skeleton h-4 w-3/4 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);
export const ErrorBox = ({ error }) => <p className="card err" role="alert">{error?.message || 'تعذر التحميل'}</p>;
export const Empty = ({ children }) => <p className="empty">{children}</p>;

// يشغّل إجراء مع حالة انشغال ورسالة خطأ
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn, successMessage) => {
    setBusy(true);
    setErr('');
    try {
      const out = await fn();
      const message = typeof successMessage === 'function' ? successMessage(out) : successMessage;
      if (message) {
        gooeyToast.success(message, {
          fillColor: '#ffffff',
          borderColor: '#dce6e9',
          preset: 'subtle',
          showTimestamp: false,
        });
      }
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, run };
}

// خيط تعليقات. me = من يشاهد: 'client' أو 'team'
export function CommentThread({ comments = [], me = 'client', onSend, canSend = true, placeholder = 'اكتب تعليقك…', button = 'إرسال' }) {
  const [body, setBody] = useState('');
  const { busy, err, run } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    const ok = await run(() => onSend(body), 'تم إرسال التعليق');
    if (ok) setBody('');
  };
  const name = (a) => (a === me ? 'أنت' : a === 'team' ? 'فريق المشروع' : 'العميل');
  return (
    <div className="col">
      {comments.length > 0 && (
        <List className="col gap-2">
          {comments.map((c) => (
            <div key={c.id} className={`bubble${c.author === me ? ' me' : ''}`}>
              <span className="who">{name(c.author)}</span>
              <span className="whitespace-pre-wrap">{c.body}</span>
            </div>
          ))}
        </List>
      )}
      {canSend && (
        <form onSubmit={submit} className="col gap-2">
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
          <FormError message={err} />
          <div className="flex items-center justify-end">
            <Button size="small" loading={busy} disabled={busy || !body.trim()}>{button}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function Gantt({ phases, start, end }) {
  const dated = phases.filter((p) => p.start_date && p.end_date);
  if (!dated.length) return <p className="muted">أضف تواريخ للمراحل لتظهر على الجدول الزمني.</p>;
  const t = (d) => new Date(d).getTime();
  const min = Math.min(...dated.map((p) => t(p.start_date)), start ? t(start) : Infinity);
  const max = Math.max(...dated.map((p) => t(p.end_date)), end ? t(end) : -Infinity);
  const span = Math.max(max - min, 1);
  return (
    <div className="gantt">
      {dated.map((p, i) => (
        <div className="gantt-row" key={p.id}>
          <span title={p.name}>{p.name}</span>
          <div className="gantt-track">
            <m.div
              className={`gantt-bar ${p.status}`}
              style={{ insetInlineStart: `${((t(p.start_date) - min) / span) * 100}%`, width: `${((t(p.end_date) - t(p.start_date)) / span) * 100}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 + i * 0.08 }}
              title={`${p.start_date} – ${p.end_date}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
