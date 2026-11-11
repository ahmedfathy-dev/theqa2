# Design System

## Direction

Botanical Luxury, expressed as a quiet Arabic-first project workspace. The visual reference is a carefully indexed herbarium: clear labels, measured spacing, restrained natural colors, and progress that reads as a connected sequence. It informs the interface's palette, typography, density, and phase-progress treatment without turning navigation or controls into decorative artifacts.

## Palette

| Token | Value | Role |
|---|---|---|
| Forest Green | `#244B3D` | Primary actions and key progress |
| Deep Green | `#173B32` | Workspace navigation and strong emphasis |
| Teal | `#0F766E` | Active states and secondary emphasis |
| Warm Beige | `#D8BE94` | Quiet highlights and secondary details |
| Ivory | `#F4F6F2` | App canvas and subdued surfaces |
| White | `#FFFFFF` | Cards, forms, and primary surfaces |
| Primary Text | `#172F29` | Headings and body copy |
| Secondary Text | `#718078` | Supporting labels and metadata |

Use state colors only when they communicate status. Keep borders light, shadows soft, and gradients absent from the core interface.

## Typography

Use the installed Alexandria Variable family for Arabic and Latin text. Keep a compact, legible hierarchy: page title, section title, body, and metadata. Use tabular numerals for progress and counts. Keep user-entered email addresses and URLs left-to-right.

## Layout and Navigation

- Keep client and internal tool workspaces independent, each with its own layout, navigation items, active state, and sign-out action.
- Retain familiar dashboard navigation and standard web controls.
- Use a dark forest-green navigation rail on desktop and the existing compact mobile navigation on narrow screens.
- Pair page headings with a restrained breadcrumb/workspace header.
- Keep project progress and the current phase prominent in the client overview; show the searchable client list and data-derived pending-work summaries in the internal overview.

## Signature Pattern

Show project phases as a connected, ordered progress path. Completed, current, and upcoming phases remain distinct through their existing status labels and color tokens. The path is a wayfinding aid built from real phase data, not an illustration or replacement for standard links.

## Components and Motion

Reuse the shared components in `client/src/components/ui.jsx` and the installed Lucide React icon set. Keep cards, badges, buttons, dialogs, forms, and loading/error/empty states within one visual system. Use the existing `motion/react` and reduced-motion behavior for short, low-amplitude transitions; do not add a motion dependency.

## Responsive and RTL

Keep the document Arabic and RTL. Use logical spacing and direction-aware icons, preserve LTR treatment for email addresses and URLs, and collapse navigation into the existing mobile menu. On small screens, stack dashboard regions, keep controls full-width where needed, and keep timelines and file names readable without horizontal page overflow.

## Avoid

- Do not alter the logo, product name, route names, authentication, authorization, APIs, or business behavior.
- Do not introduce mock data, cross-client data, decorative botanical illustrations, excessive gradients, neon colors, or glass effects.
- Do not hide navigation or actions as a substitute for route authorization.
