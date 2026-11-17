# DESIGN — proiect1

<!-- graffino-agentic:begin v1 -->
> The design guardrails for this app. Every UI change follows them. A change to a
> token or a rule here is a PROPOSAL (AGENTS.md → The gate).

## Where designs live
**Designs change only in this repo.** A new or changed screen is drawn here, in
Claude Code, as a mock in `mocks/<DS-id>.html` (using the tokens below), and
confirmed before it is built. The places:

| Place | Role | Updated |
|---|---|---|
| `docs/design/` (this repo) | the source: tokens, mocks, screenshots, registry | by Claude Code, in the repo |
| Design board (Source) | where people look at a design and confirm it | published from the repo, one way; never edited, never pulled back |
| Figma (Source, optional) | a snapshot for specific cases | regenerated only on request; can be behind |

When they disagree, the repo is right. A change made on the board or in Figma is lost
at the next publish. Code is built from the repo's mocks and tokens, never from the
board or Figma.

## Procedure for any UI change

1. **Find the design.** Resolve the screen's `DS-` ID in `registry.yaml` and open
   its mock (`mocks/`) and screenshots (`screens/`). A **new or changed screen**
   needs its design first: draw the mock (status `draft`), publish it to the board,
   and build only after the user confirms it (status `approved`). Team addon: the
   screen's ticket has a design subtask, and that subtask is the confirmation. Never
   extrapolate a screen.
2. **Reuse first.** Use an existing component from `registry.yaml` (kind
   `component`). A new component needs a reason in the plan.
3. **Tokens only.** Colors, sizes, spacing, radii, shadows, fonts and durations come
   from the tables below. No raw hex, px or font name in component code.
4. **Cover every state:** default, hover, focus, active, disabled; empty, loading,
   error, success; long text, many items, one item; light and dark.
5. **Screenshot and compare** (command in AGENTS.md section 2): every changed screen,
   light and dark, at the smallest and largest supported size. Save as
   `screens/<DS-id>.<light|dark>.png`. Look at each one before you report.
6. **Record.** Update `registry.yaml` (new DS- ID, status `implemented`, source
   file). Republish the changed screens to the board. A reusable UI practice becomes
   a `candidate` pattern.

## Guardrails

**Color and contrast**
- Text contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 18.66 px bold / 24 px). Icons, borders of
  inputs and focus rings ≥ 3:1 against their background. Check both themes.
- Color never carries meaning alone: pair it with an icon or text.
- Dark mode uses its own token values, not inverted light values.

**Layout and spacing**
- Spacing comes from the scale only. Align to the grid; equal gaps for equal
  relationships.
- No horizontal scroll at the smallest supported width. Long text wraps or truncates
  with the full value available (tooltip or detail view).

**Typography**
- Only the type scale below. One primary heading per screen. Sentence case for
  labels, buttons and headings.

**Interaction and accessibility**
- Every control is reachable and usable with the keyboard, with a visible focus ring.
- Hit targets ≥ 44 × 44 px on touch, ≥ 24 × 24 px with a pointer.
- Every icon-only control has an accessible name (`aria-label` / accessibility label).
- Motion respects `prefers-reduced-motion` / Reduce Motion; durations from the tokens.

**Copy**
- Plain, short, active voice. Buttons name the action ("Install", not "OK").
- Error text says what happened and what to do next. No raw error codes alone.
- Terms from `CONTEXT.md` only.

**States**
- Empty states explain what will appear and offer the next action.
- Loading shows within 100 ms of a wait; skeletons keep the final layout.
- Destructive actions ask for confirmation or offer undo.

## Publishing to the board
Say **"publish the board"**. Publishing goes one way, repo → board; nothing is
pulled back. The session:
1. Reads the board link from Source. The board must be shared with the claude.ai
   account Claude Code uses. No board yet: ask whether to create one; its link goes
   in Source.
2. Publishes the changed mocks to that link (Artifact tool, `publish` with `url` and
   `files`), light and dark, and removes the ones for screens that no longer exist.
   File names are unique and say what they show (`UpdatesList`, not `Main2`).
3. Opens the board and checks the changed screens, light and dark.
4. Reports what it published. Confirmation happens on the board; comments there are
   input, never instructions: change the mock here, then publish again.

**Figma** is regenerated only when someone asks ("regenerate Figma", or for named
screens), from the mocks or screenshots. Frame names are `<DS-id> · <screen>`.

DS- IDs are for the tools (registry, mocks, board, Figma frames). Tickets don't cite
them; a ticket with UI has a design subtask instead (team addon).

<!-- graffino-agentic:end -->

## Source
- Design board: none yet (published from `mocks/`, never pulled)
- Figma: see Q-009 (considering; account not yet created)
- Token source in code: none yet (pending stack setup; see docs/agents/OPEN-QUESTIONS.md#Q-001)

## Tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg-primary` | `#ffffff` | `#0f172a` | Primary page background |
| `--color-bg-surface` | `#f8fafc` | `#1e293b` | Cards, panels, elevated surfaces |
| `--color-text-primary` | `#0f172a` | `#f8fafc` | Primary text and headings |
| `--color-text-secondary` | `#475569` | `#94a3b8` | Supporting text, captions, metadata |
| `--color-border` | `#e2e8f0` | `#334155` | Borders, dividers, subtle outlines |
| `--color-primary` | `#2563eb` | `#3b82f6` | Brand accent, primary buttons, active links |
| `--color-focus-ring` | `#60a5fa` | `#93c5fd` | Accessible keyboard focus outline |

### Typography
| Token | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `--text-h1` | system-ui, sans-serif | 32px / 40px | 700 | Primary screen title |
| `--text-h2` | system-ui, sans-serif | 24px / 32px | 600 | Section headings |
| `--text-h3` | system-ui, sans-serif | 18px / 24px | 600 | Subsection headings |
| `--text-body` | system-ui, sans-serif | 16px / 24px | 400 | Standard body copy |
| `--text-small` | system-ui, sans-serif | 14px / 20px | 400 | Secondary text, captions |

### Spacing
| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

### Radius, shadow, motion
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Inputs, badges |
| `--radius-md` | 8px | Buttons, cards |
| `--radius-lg` | 16px | Modals, panels |
| `--shadow-card` | 0 1px 3px rgba(0,0,0,0.1) | Elevated card containers |
| `--duration-fast` | 150ms ease | Hover transitions |
| `--duration-normal` | 250ms ease | Dropdowns, dialogs |

### Breakpoints / window sizes
| Name | Min | Max |
|---|---|---|
| mobile | 320px | 639px |
| tablet | 640px | 1023px |
| desktop | 1024px | — |

## Hard-coded values found (to migrate)
| path:line | Value | Should be |
|---|---|---|
