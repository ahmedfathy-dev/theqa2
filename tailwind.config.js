import tailwindcssAnimate from 'tailwindcss-animate';

// Every visual value resolves to a CSS variable defined in client/src/styles.css,
// so tokens live in one place and utilities stay in sync with component classes.
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, rgb(`${prefix}-${s}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  },
  future: { hoverOnlyWhenSupported: true },
  theme: {
    // One type scale for the whole app. Fixed rem steps, no ad-hoc pixel sizes.
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.5' }],
      sm: ['0.8125rem', { lineHeight: '1.6' }],
      base: ['0.9375rem', { lineHeight: '1.75' }],
      lg: ['1.125rem', { lineHeight: '1.5' }],
      xl: ['1.5rem', { lineHeight: '1.35' }],
      '2xl': ['1.875rem', { lineHeight: '1.25' }],
      stat: ['2.25rem', { lineHeight: '1.1' }],
    },
    extend: {
      colors: {
        brand: scale('brand', [50, 100, 200, 500, 600, 700, 800]),
        violet: scale('violet', [50, 100, 200, 300, 500, 600, 700]),
        warm: scale('warm', [50, 100, 200, 300, 400, 500, 600, 700]),
        ink: { DEFAULT: rgb('ink'), soft: rgb('ink-soft') },
        muted: rgb('muted'),
        surface: { DEFAULT: rgb('surface'), sunken: rgb('surface-sunken') },
        line: { DEFAULT: rgb('line'), soft: rgb('line-soft') },
        ok: scale('ok', [50, 100, 700]),
        info: scale('info', [50, 100, 700]),
        warn: scale('warn', [50, 100, 700]),
        bad: scale('bad', [50, 100, 600, 700]),
      },
      fontFamily: {
        sans: ['"Alexandria Variable"', 'Alexandria', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        float: 'var(--shadow-float)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
