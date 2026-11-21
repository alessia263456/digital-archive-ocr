# Plan — P22-03 · React and Playwright scaffold

## Size

S · One React entry point and one browser smoke test run in four configurations. Day 2, task 1 has no roadmap dependency and a provisional 75-minute timebox. The planning baseline is a clean, up-to-date main with no frontend directory. [Roadmap task](p22-roadmap.md#day-2--scaffold-react-and-prepare-document-input)

## Approach

Mount a minimal Romanian scaffold marker through React under frontend/. Use one disposable Docker Compose service to build the React assets and run Playwright with Chromium. Playwright starts Vite preview on 127.0.0.1 inside that same container and stops it after testing. Import one stylesheet using the approved light and dark Design Token values, with the browser’s color preference selecting the theme. The closest existing example is the DS-002 HTML mock (for awareness only). Its typography and color declarations illustrate the design source, while its viewer layout belongs to a separate task.

## Files

| Action after approval | Path | Purpose |
|---|---|---|
| Update | compose.yaml | Add a standalone frontend-test service under a test profile. Mount only the test results directory for screenshot retrieval. It needs no backend dependency or published port. |
| Add | .github/workflows/frontend.yml | On every push, check out the repository on a Linux runner and execute the same Compose command as local verification. Its exit status covers both the production build and the browser tests. |
| Add | docker/frontend-test/Dockerfile, frontend/.dockerignore | At implementation, verify a supported Node.js LTS patch against the chosen Vite and Playwright versions. Pin the official Node base image by full patch, Debian variant and verified image digest in FROM, install locked dependencies with npm ci, install Chromium and its OS dependencies with the project’s Playwright CLI, then build the assets. Exclude local dependencies and generated output from the build context. |
| Add | frontend/package.json, frontend/package-lock.json | React and React DOM for mounting, Vite for build and preview, Playwright Test for verification. Provide repeatable install, build and smoke commands. |
| Add | frontend/index.html, frontend/src/main.jsx | Romanian document language, mobile viewport, mount node and a React-rendered “Arhivă digitală” marker. |
| Add | frontend/src/theme.css | Apply the approved background, primary text and body typography to the scaffold. |
| Add | frontend/playwright.config.js, frontend/tests/scaffold.spec.js | Start a loopback preview of the built assets and exercise the same assertion set on desktop and mobile in light and dark. |
| Add | frontend/.gitignore | Exclude dependencies, build output and generated Playwright artifacts. |
| Update | AGENTS.md, docs/agents/ARCHITECTURE.md, docs/design/DESIGN.md | Replace the pending screenshot command, frontend status and token source pointer with their verified equivalents. |
| Update after verification | docs/agents/plans/p22-task-checklist.md, AI_LOG.md | Record P22-03 results and the course journal entry. |

## Tests

| # | Behaviour | Verification after approval |
|---|---|---|
| 1 | A clean install produces a production build | From the repository root run `docker compose run --build --rm frontend-test`. The image build runs npm ci and npm run build. |
| 2 | React mounts the marker in each viewport and theme | The same command runs npm run test:e2e inside the container against the built assets. Assert the React-rendered marker is visible and the document language is Romanian. |
| 3 | Theme CSS actually reaches the rendered document | In each project assert the computed background and text colors against the corresponding DESIGN.md values. Check for horizontal overflow and attach a screenshot per project. Inspect all four artifacts. |
| 4 | Repository checks pass | Run the documented containerized PHPUnit suite and python3 docs/agents/tools/ledger-lint.py. Report each failed or skipped check with its output or reason. |

The frontend job covers the frontend portion of the [every-push course requirement](p22-task-checklist.md). Wiring PHPUnit and Ledger lint into GitHub Actions is a separate CI follow-up. Verify the hosted frontend job on the next authorized push.

## Design

The scaffold exercises only the resting state on a desktop and an emulated phone in both themes. Use the approved body type scale, --font-body, --color-bg-primary and --color-text-primary. There are no controls, data, requests or registered Screen changes, so interaction, empty, loading, error and long-content states do not apply. Scaffold screenshots are test artifacts. Each product Screen retains its own mock approval and registry workflow.

## Sequencing

One builder. After approval, set up dependencies and the failing mount/theme test, implement the React root and stylesheet, then build, run the four browser projects and inspect their screenshots before recording results.

## Risks

A browser preference assertion alone can pass when the dark stylesheet is missing. Checking the rendered foreground and background catches that fault. The first image build needs network access to fetch packages and Chromium. Install browser dependencies during the image build so an incomplete installation fails before testing.

## Out of scope

Product Screens, routing, authentication, API integration, manual theme selection and persistence, live hosting, deployment, and the remaining Day 2 tasks.

## Knowledge used

Four previously confirmed decisions apply unchanged. D-001 sets the React stack and containerized server architecture, D-003 supplies the PHPUnit regression check, D-006 requires Playwright across viewport sizes and themes, and D-018 requires Romanian copy. [Decision entries](../DECISIONS.md)

| Entry | What it says | Why it applies | Call |
|---|---|---|---|
| Q-013 (answered) | The owner explicitly approves each repository Screen mock in chat. | P22-03 ends at the scaffold. Product Screen approval belongs to the corresponding Screen task. | Confirm / answered differently |

### Considered, not applied

- PATTERN-001 is a candidate for PostgreSQL migration tests. This scaffold introduces no migration.
- The contract index contains no entries. The smoke test runs against static assets and has no backend consumer.
- D-032 governs role-based access to product Screens. The scaffold implements none of those Screens.

### Assumptions for approval

Vite with npm, JavaScript, Chromium mobile emulation and browser-driven theme selection are proposed implementation choices for this task. The host prerequisite for the frontend smoke is Docker with Compose. Node, Chromium and Vite preview run inside the disposable container. There are no unresolved product requirements for the scaffold.

## Approval

Approved on 2026-11-21. The owner confirmed D-001, D-003, D-006, D-018 and Q-013.
