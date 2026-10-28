# Verification — 2026-10-28

## Executed successfully

- Clean packaged build using `./scripts/build`: locked dependency install, strict TypeScript compilation, Vite production bundling, Java compilation, Flyway migrations against H2, and executable Spring Boot packaging.
- **17 backend integration tests, zero failures/errors**. Covered credential success/failure, unauthenticated access, CSRF enforcement, tenant read/write isolation, client organization coercion, private internal notes, role restrictions, ticket transitions and resolution requirements, SLA deadline calculation, first-response breaches, duplicate-escalation prevention, onboarding validation and review/activation, notification ownership, preferences, request validation, pagination, private document downloads, and metrics.
- **6 Playwright browser tests, zero failures**, covering the complete role journey, onboarding, knowledge publishing, private document handling, mobile layout, delayed checkbox saves, failed-save rollback, and preservation of reply drafts during an in-flight request. The tests ran against an isolated packaged application and fresh in-memory database.
- Frontend Prettier validation and shell syntax checks.
- npm audit of production frontend dependencies: zero reported vulnerabilities at verification time. This is a dependency snapshot, not a production security certification.
- Interactive browser checks: role sign-in/out; client request submission; manager assignment; engineer triage, internal/public comments, resolution; client confirmation; internal-note isolation; reload persistence; organization creation; checklist submission/review/approval/activation; SLA policy changes and manual checks; article publication and search; document upload and authenticated download; preferences surviving reload; matching/empty ticket search results; live dashboards and analytics.
- Packaged application served the UI and API together on port 8080. Its health endpoint returned `UP`; OpenAPI generation returned 20 documented paths. The schema snapshot is in `docs/openapi.json`.
- Desktop viewport 1440×1000 and mobile viewport 390×844 checked in the browser. Overview and knowledge pages had document width equal to viewport width on mobile. Mobile navigation was exercised.
- Fresh sample data was restored after the interactive workflow checks. The previous test dataset was archived under `.tools/backups/`.

Screenshots of the actual packaged UI are in `docs/screenshots/`.

## Hosted checks and remaining integrations

- Docker/MySQL configuration is included; Docker is not installed in this environment, so the MySQL deployment was not executed.
- GitHub Actions runs the build, backend tests, and full browser suite on each push. The latest hosted result is available on the [Actions page](https://github.com/maounkhan/ClientFlow/actions).
- External SSO, email, object storage, hosted deployment, queue delivery, monitoring services, and a demonstration video are not connected/generated. See `docs/SCOPE.md`.
