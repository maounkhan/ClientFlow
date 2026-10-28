# Demo scope

The product brief is treated as requirements, not as instructions to publish, contact third parties, create paid infrastructure, or claim unimplemented services.

## Implemented and usable

Authentication/logout; four demo perspectives; server-side role and tenant checks; client and employee dashboards; ticket creation, filters, assignment, public/private conversations, attachments, lifecycle validation, resolutions and reopening; onboarding checklists and review decisions; SLA policies and scheduled escalation; persisted in-app notifications and preferences; analytics and CSV exports; organizations; private documents; knowledge publishing/editing/archiving; staff role management; append-only application audit records; health and OpenAPI endpoints; migrations, integration tests, browser test source, container configuration, CI definition, startup and reset scripts.

## Deliberate local-demo substitutions

| Brief target | Delivered local behavior |
|---|---|
| Keycloak/OIDC/JWT | BCrypt + Spring Security session authentication, role checks, CSRF |
| MySQL as mandatory runtime | Persistent H2 by default; MySQL profile and Compose configuration included |
| Separate business microservices | Single deployable Spring Boot app with centralized business rules |
| RabbitMQ/email/WebSockets | Transactional in-app records with 15-second polling |
| Private object storage | Private local files with authorization-checked download endpoints |
| Team-specific access partitions | One internal support operation; strict client organization isolation |
| SQL aggregation at scale | Metrics derived from database-loaded records for the local dataset |

## Not connected or not implemented

- External identity provider, invitation/account-activation flows, self-service password recovery, and MFA.
- Email/SMS delivery, a delivery retry queue, or broker-based service events.
- Cloud object storage, document malware scanning, or external integrations.
- Independently deployed microservices, an API gateway, or service-owned databases.
- Configurable onboarding templates, support categories, customer-plan-specific SLA policies, or business-hour calendars.
- Client satisfaction surveys, CRM integration, or load testing.
- Prometheus/Grafana dashboards, distributed tracing, or a deployment provider.
- A public hosted URL or recorded demonstration video.

The included CI workflow and Docker/MySQL configuration are source deliverables; they have not been run on a hosted CI runner or Docker engine in this environment. This application is ready for a **local demonstration**, not an assertion of production completion against every advanced requirement in the brief.
