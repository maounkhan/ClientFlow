# A five-minute ClientFlow demo

Start the app with `./scripts/start` and visit http://127.0.0.1:8080. The sign-in cards populate the demo credentials; choose a card, then click **Enter workspace**.

## 1. Set the scene — team manager

Choose **Team manager / Jordan Lee**. Show the overview: real ticket counts, completed-ticket SLA compliance, average first response, active escalations, recent requests, and onboarding progress. Change the ticket activity date range. Open a critical request from “Needs your attention.”

## 2. Submit a request — client

Sign out, choose **Client / Maya Patel**, then **New ticket**.

- Subject: Production API cannot connect
- Category: Integrations
- Priority: High
- Description: Our production workspace cannot connect to the API. Three team members are affected. We have retried and checked the endpoint.

Create the ticket. Note its `CF-…` reference. Show the initial status, calculated SLA targets, empty conversation, and requester organization. The client sees only Northstar’s records.

## 3. Coordinate — manager

Sign out, return as **Team manager**, and find the reference using the workspace search or ticket search. Assign it to **Sofia Chen**. Show the notification center and chronological activity.

## 4. Investigate and resolve — engineer

Sign out, choose **Support engineer / Sofia Chen**, and open the reference.

1. Change **Open → Triaged → In Progress**.
2. Add an **Internal note**, such as “Reviewing the tenant connection configuration.”
3. Add a **Public reply**, such as “We corrected the configuration and verified connectivity.”
4. Change to **Resolved** and enter a resolution summary.

The service validates each transition and records the changes. Internal notes are visible only to staff.

## 5. Confirm — client

Return as **Client**, open the reference, and show that the public reply is visible while the internal note is absent. Select **Closed** to confirm the resolution. Reload to demonstrate persistence. A completed ticket can be reopened when further help is needed.

## 6. Show onboarding and operations — manager

- **Organizations → Add organization** creates a profile and a five-step checklist.
- In **Onboarding**, complete each task and **Submit for review**.
- **Review submission** allows approval, an information request, or rejection with a reason.
- An approved organization can be **Activated**.
- **SLA & escalations** shows current service targets and active deadlines. Edit a policy or **Run SLA check**. The scheduled engine runs every minute and prevents duplicate escalations.
- **Analytics & reports → Export report** downloads CSV data. Explain metric definitions below the report.
- **Documents → Upload document** accepts the fictional `docs/demo-assets/security-questionnaire.txt`. Download it from the table. Access is checked on the server.
- **Knowledge base** supports search, article reading, publication, editing, and archiving.
- **Audit log** records the demo actions without exposing comment bodies or document contents.
- **Administrator** can inspect and change staff roles. Staff accounts and client accounts remain separate.

## Presentation notes

- All data is fictional and local. Login sessions are real; credentials are deliberately visible for the demo.
- Notifications refresh every 15 seconds. SLA processing runs every minute.
- SLA targets are illustrative elapsed-time targets, not contractual commitments.
- Changes persist between presentations. Use the documented archive-and-reset script before repeating the story from a clean dataset.
- External email, OIDC, object storage, message queues, and public hosting are not connected. The settings screen and scope document make that explicit.
