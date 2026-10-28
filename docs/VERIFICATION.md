# Verification — 2026-10-28

## Executed successfully

- Clean packaged build using `./scripts/build`: locked dependency install, strict TypeScript compilation, Vite production bundling, Java compilation, Flyway migrations against H2, and executable Spring Boot packaging.
- **17 backend integration tests, zero failures/errors**. Covered credential success/failure, unauthenticated access, CSRF enforcement, tenant read/write isolation, client organization coercion, private internal notes, role restrictions, ticket transitions and resolution requirements, SLA deadline calculation, first-response breaches, duplicate-escalation prevention, onboarding validation and review/activation, notification ownership, preferences, request validation, pagination, private document downloads, and metrics.
- Frontend Prettier validation and shell syntax checks.
- npm audit of production frontend dependencies: zero reported vulnerabilities at verification time. This is a dependency snapshot, not a production security certification.
- Interactive browser checks: role sign-in/out; client request submission; manager assignment; engineer triage, internal/public comments, resolution; client confirmation; internal-note isolation; reload persistence; organization creation; checklist submission/review/approval/activation; SLA policy changes and manual checks; article publication and search; document upload and authenticated download; preferences surviving reload; matching/empty ticket search results; live dashboards and analytics.
- Packaged application served the UI and API together on port 8080. Its health endpoint returned `UP`; OpenAPI generation returned 20 documented paths. The schema snapshot is in `docs/openapi.json`.
- Desktop viewport 1440×1000 and mobile viewport 390×844 checked in the browser. Overview and knowledge pages had document width equal to viewport width on mobile. Mobile navigation was exercised.
- Fresh sample data was restored after the interactive workflow checks. The previous test dataset was archived under `.tools/backups/`.

Screenshots of the actual packaged UI are in `docs/screenshots/`.

## Included but not claimed as executed

- The standard Playwright test suite is in `frontend/tests/demo.spec.ts`. Launching its separate headless Chromium process was blocked by the macOS execution sandbox (`MachPortRendezvousServer` permission denial). The equivalent core flows were executed using the interactive browser. Run `./scripts/test-e2e` from a normal terminal, or use the included CI workflow, for the Playwright report.
- Docker/MySQL configuration is included; Docker is not installed in this environment, so the MySQL deployment was not executed.
- The GitHub Actions workflow has not been dispatched on a hosted runner.
- External SSO, email, object storage, hosted deployment, queue delivery, monitoring services, and a demonstration video are not connected/generated. See `docs/SCOPE.md`.
