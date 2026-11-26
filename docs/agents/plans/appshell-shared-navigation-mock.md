# Plan — Shared AppShell navigation mock

**Status** — Plan approved by the owner on 2026-11-26. Save this plan only; implementation requires a separate explicit request.

## Size

M — One simple standalone interactive HTML mock, a role-specific navigation mapping, and a draft registry entry. The mock demonstrates layout and navigation states without implementing application behavior.

## Approach

Create a standalone mock for a shared `AppShell` Component, using the supplied image as the primary visual reference and existing DS-001 content as example content. Keep interactions limited to switching role, sidebar state, theme, and mobile panel. Use Romanian copy and derive labels and access from D-042 and the Screen registry; the labels in the reference image are illustrative.

The authenticated shell and minimizable sidebar appear on every authenticated Screen, including the Document Viewer and Editor. DS-010 Login and DS-009 public share viewer are the only shell exceptions. On desktop, show expanded and minimized sidebar states. On mobile, the sidebar opens as a temporary panel from the header and can be dismissed. Compare the reference colors with the Design Tokens; when a color used by the mock is absent, add the measured token to `docs/design/DESIGN.md` and its theme values to `frontend/src/theme.css`, as requested by the owner. Do not substitute guessed color values.

## Files

| Action | Path | What |
|---|---|---|
| Add | `docs/design/mocks/DS-013.html` | Simple interactive mock with DS-001 example content, reference-matched branding, role switching, desktop sidebar states, mobile panel, and theme switching. |
| Add | `docs/design/appshell-navigation.md` | Navigation groups, Screen-to-role matrix for DS-001–DS-012, contextual destinations, and shell exceptions. |
| Update | `docs/design/registry.yaml` | Register DS-013 as a draft shared Component, not a new application Screen. |
| Add | `docs/design/tests/DS-013.spec.js` | Focused mock checks for navigation visibility, sidebar states, mobile behavior, themes, keyboard access, and narrow viewport overflow. |
| Conditional update | `docs/design/DESIGN.md` | Add only any measured reference color not already represented by a Design Token. |
| Conditional update | `frontend/src/theme.css` | Define light and dark values for any new token required by the mock. |

## Navigation order

For `admin` and `arhivar`, use these entries in this order:

1. **Căutare în arhivă** — DS-001.
2. **Încărcare documente** — DS-003.
3. **Cozi de lucru** — DS-004.
4. **Retenție și casare** — DS-005.
5. **Statistici** — DS-007.
6. **Jurnal de audit** — DS-008.
7. **Nomenclator arhivistic** — DS-012.

Separate **Administrare** — DS-006 at the bottom for `admin` only. The `arhivar` role can view and filter DS-005 but cannot manage retention or destruction. `cititor` sees **Căutare în arhivă** only. Keep notifications in the header. DS-002 Document Viewer and DS-011 Editor are contextual destinations opened from archive and review workflows, not permanent navigation entries. DS-009 and DS-010 are outside the authenticated navigation.

## Tests

| # | Behaviour | Test | Manual verification |
|---|---|---|---|
| 1 | Mock loads at desktop and mobile sizes in light and dark themes. | `DS-013.spec.js` · Playwright | — |
| 2 | Role switching applies the approved navigation order and role visibility. | `DS-013.spec.js` · Playwright | Check `arhivar` read-only retention copy and admin-only administration entry. |
| 3 | Desktop sidebar toggles between expanded and minimized; mobile panel opens and closes. | `DS-013.spec.js` · Playwright | — |
| 4 | Keyboard access, accessible names, tooltips, and no horizontal overflow at 320px. | `DS-013.spec.js` · Playwright | Review focus visibility, contrast, and visual match to the supplied reference. |
| 5 | Reference color values are compared with existing tokens; missing colors are added with light/dark values. | Manual token audit during mock work | Sample the attached image; do not infer or approximate color values. |

Use the existing standalone mock Playwright approach from PATTERN-007 when carrying out the design work. No application behavior or React implementation is tested or changed by this plan.

## Design

Use Design Tokens for typography, spacing, radii, shadow, and motion. Match the reference image’s header and active-navigation colors exactly where measured; add a token only when the color is absent from the token set. Keep the mock intentionally simple and use the existing theme mechanism. Cover active, hover, focus, icon tooltip, long labels, all three roles, expanded/minimized desktop navigation, mobile panel open/closed, and light/dark themes. Use DS-001 archive content as the single example Screen. Register DS-013 as `kind: component`, `status: draft`.

The shared shell remains visible on DS-002 and DS-011. Login DS-010 and public share viewer DS-009 omit it. Do not change the content or workflow of any existing Screen.

## Sequencing

One builder: audit the reference image and token palette; create the navigation mapping and simple mock; add any required color token and theme values; update the registry; add focused mock checks; inspect screenshots before presenting the draft for review. Build no React AppShell from this plan.

## Risks

The roadmap schedules final shared branding and navigation after functional Screen integrations. This work is a design deliverable only. Role-aware navigation is a presentation of the approved access matrix and does not replace server-side authorization. Adding tokens unnecessarily would expand the approved design system, so compare the measured colors with existing tokens before adding any.

## Out of scope

React AppShell implementation, route integration, backend authorization changes, notification behavior, edits to existing Screen workflows, unrelated token changes, and Figma updates.

## Knowledge used

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| D-018 | Romanian-only interface and system messages | All mock labels and copy are Romanian. | confirm |
| D-019 | Notifications are in-app, with a badge and panel | Informs the header notification control. | confirm |
| D-033 | Archive browsing modes, dossier permissions, and role limits | Governs archive navigation and `cititor` access. | confirm |
| D-042 | Twelve Screens and their approved role access | Source of truth for the navigation mapping. | confirm |
| C-003 | Session authentication and role-protected API; grants follow D-042 | The shell reflects the authenticated role but does not replace authorization. | confirm |
| PATTERN-007 | Standalone mock checks use existing Playwright projects | Reuse the repository’s mock verification approach. | confirm |

### Considered, not applied

- C-001 — Signed URL document delivery contract; this mock does not change document delivery.

### Assumptions

- `DS-013` is the next available design ID for a shared Component; it does not add a thirteenth application Screen.
- The account menu displays the username and role already available in authenticated user data; no display name is assumed.
