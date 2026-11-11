# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Clients sign in with their own email account to follow their project, review its phases and updates, respond to required actions, and access files and notifications.
- Internal team members use a separate tool workspace to manage clients, schedules, requests, comments, communication, and files.

## Product Purpose

Dar Shadhra's project dashboard gives clients a private place to follow project progress and phases, while the internal team uses a separate workspace to manage that work. Success means users can quickly understand project status and reach the next relevant action.

## Positioning

The product keeps client project tracking and internal project management in distinct, role-authorized workspaces while connecting them to the same project lifecycle.

## Operating Context

The product is Arabic-first and RTL. A client's primary task is to understand project progress and phases; updates, required actions, files, notifications, comments, and messages support that task. The internal team manages client-specific project information and communication.

## Capabilities and Constraints

- Preserve the existing client email sign-in, client-to-email association, internal sign-in, authorization checks, route guards, routes, and client-specific data boundaries.
- Keep the client portal and internal tool portal separate, with their own navigation and layouts.
- Preserve existing data, search, filters, pagination, export, and business behavior; do not change APIs, backend behavior, authentication, or authorization as part of interface work.
- Keep all existing screens and functionality available and make the interface responsive across desktop, tablet, and mobile.

## Brand Commitments

- Product identity: Dar Shadhra (دار شذرة), associated with refined home products and a natural, high-end character.
- Preserve the existing logo and brand name.
- Use the requested palette: Forest Green `#244B3D`, Deep Green `#173B32`, Teal `#0F766E`, Warm Beige `#D8BE94`, Ivory `#F4F6F2`, White `#FFFFFF`, Primary Text `#172F29`, and Secondary Text `#718078`.
- Prefer the existing Arabic typeface when it remains suitable.

## Evidence on Hand

- Existing logo assets: `client/src/assets/logo.png` and `client/src/assets/logo-white.png`.
- Existing project, client, notification, and phase data are supplied by the current application data layer. Do not replace them with presentation-only mock data.
- Existing botanical identity samples are in `client/public/demo/`.

## Product Principles

- Make project progress and phases immediately understandable to clients.
- Preserve strict separation between client and internal workspaces.
- Show only the signed-in client's own project information in the client portal.
- Keep existing workflows intact while making them easier to scan and use.
- Treat Arabic RTL and responsive layouts as first-class requirements.
