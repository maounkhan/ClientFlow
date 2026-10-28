package com.clientflow;

import java.time.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SeedData implements CommandLineRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder encoder;

  SeedData(JdbcTemplate db, PasswordEncoder encoder) {
    this.db = db;
    this.encoder = encoder;
  }

  @org.springframework.transaction.annotation.Transactional
  public void run(String... args) {
    if (db.queryForObject("SELECT COUNT(*) FROM users", Integer.class) > 0) return;
    String now = Instant.now().toString();
    String[][] orgs = {
      {
        "org-northstar",
        "Northstar Labs",
        "Technology",
        "Enterprise",
        "maya@northstar.demo",
        "Active"
      },
      {
        "org-meridian",
        "Meridian Health",
        "Healthcare",
        "Enterprise",
        "alex@meridian.demo",
        "In Review"
      },
      {"org-arch", "Arch & Co.", "Financial services", "Growth", "riley@arch.demo", "Submitted"},
      {"org-evergreen", "Evergreen Energy", "Energy", "Enterprise", "sam@evergreen.demo", "Active"}
    };
    for (var o : orgs)
      db.update(
          "INSERT INTO organizations VALUES (?,?,?,?,?,?,?)",
          o[0],
          o[1],
          o[2],
          o[3],
          o[4],
          o[5],
          now);
    String hash = encoder.encode("DemoFlow!2026");
    String[][] users = {
      {"u-manager", "Jordan Lee", "manager@clientflow.demo", "MANAGER", null, "Platform Support"},
      {
        "u-engineer", "Sofia Chen", "engineer@clientflow.demo", "ENGINEER", null, "Platform Support"
      },
      {"u-admin", "Avery Morgan", "admin@clientflow.demo", "ADMIN", null, "Operations"},
      {"u-client", "Maya Patel", "client@northstar.demo", "CLIENT", "org-northstar", null},
      {"u-meridian", "Alex Rivera", "client@meridian.demo", "CLIENT", "org-meridian", null},
      {"u-arch", "Riley Evans", "client@arch.demo", "CLIENT", "org-arch", null},
      {"u-evergreen", "Sam Taylor", "client@evergreen.demo", "CLIENT", "org-evergreen", null},
      {"u-engineer2", "Daniel Kim", "daniel@clientflow.demo", "ENGINEER", null, "Platform Support"}
    };
    for (var u : users)
      db.update(
          "INSERT INTO users(id,name,email,password_hash,role,org_id,team) VALUES (?,?,?,?,?,?,?)",
          u[0],
          u[1],
          u[2],
          hash,
          u[3],
          u[4],
          u[5]);
    String[] priorities = {"Critical", "High", "Medium", "Low"};
    int[] response = {30, 60, 240, 480};
    int[] resolution = {4, 8, 24, 72};
    for (int i = 0; i < 4; i++)
      db.update(
          "INSERT INTO sla_policies VALUES (?,?,?)", priorities[i], response[i], resolution[i]);
    String[][] tickets = {
      {
        "SSO authentication fails for workspace users",
        "Identity & access",
        "Critical",
        "In Progress",
        "org-northstar",
        "u-client",
        "u-engineer"
      },
      {
        "Data sync delay in reporting dashboard",
        "Integrations",
        "High",
        "Open",
        "org-meridian",
        "u-meridian",
        null
      },
      {
        "Configure production API access",
        "API & development",
        "Medium",
        "Triaged",
        "org-northstar",
        "u-client",
        "u-engineer2"
      },
      {
        "Billing export missing invoice references",
        "Billing",
        "High",
        "Waiting for Client",
        "org-evergreen",
        "u-evergreen",
        "u-engineer"
      },
      {
        "Webhook delivery returning intermittent 502s",
        "Integrations",
        "Critical",
        "Escalated",
        "org-northstar",
        "u-client",
        "u-engineer2"
      },
      {
        "Add new team members to workspace",
        "Identity & access",
        "Low",
        "Open",
        "org-arch",
        "u-arch",
        null
      },
      {
        "Update organization billing contact",
        "Billing",
        "Low",
        "Resolved",
        "org-northstar",
        "u-client",
        "u-engineer"
      },
      {
        "Validate sandbox environment setup",
        "API & development",
        "Medium",
        "Closed",
        "org-meridian",
        "u-meridian",
        "u-engineer2"
      },
      {
        "Custom report timezone mismatch",
        "Reporting",
        "Medium",
        "In Progress",
        "org-evergreen",
        "u-evergreen",
        "u-engineer"
      },
      {
        "Review IP allowlist configuration",
        "Security",
        "High",
        "Triaged",
        "org-northstar",
        "u-client",
        "u-engineer2"
      },
      {
        "Onboarding document upload fails",
        "Onboarding",
        "Medium",
        "Resolved",
        "org-meridian",
        "u-meridian",
        "u-engineer"
      },
      {
        "Service account token rotation",
        "Security",
        "Low",
        "Closed",
        "org-evergreen",
        "u-evergreen",
        "u-engineer2"
      }
    };
    for (int i = 0; i < tickets.length; i++) {
      var t = tickets[i];
      String id = "CF-" + (1048 - i);
      Instant created = Instant.now().minus(Duration.ofHours(2 + i * 9));
      Instant due =
          i == 4 ? Instant.now().minusSeconds(1800) : Instant.now().plusSeconds((i + 1) * 3700L);
      boolean done = t[3].equals("Resolved") || t[3].equals("Closed");
      db.update(
          "INSERT INTO"
              + " tickets(id,title,description,org_id,requester_id,category,priority,status,assignee_id,created_at,updated_at,due_at,response_due_at,first_response_at,resolved_at,resolution,escalated)"
              + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          t[0],
          "We are experiencing an issue with "
              + t[0].toLowerCase()
              + ". This is affecting our operations team. Please investigate and advise on the next"
              + " steps.\n\n"
              + "Environment: Production\n"
              + "Impact: Multiple workspace users\n"
              + "Steps taken: Reviewed configuration and retried the operation.",
          t[4],
          t[5],
          t[1],
          t[2],
          t[3],
          t[6],
          created.toString(),
          created.plusSeconds(1800).toString(),
          due.toString(),
          created.plusSeconds(3600).toString(),
          t[3].equals("Open") ? null : created.plusSeconds(900).toString(),
          done ? created.plusSeconds(3600 * 3).toString() : null,
          done
              ? "Configuration updated and verified with the client. Service is operating normally."
              : null,
          i == 4);
      db.update(
          "INSERT INTO ticket_events VALUES (?,?,?,?,?)",
          "ev-" + i,
          id,
          "ClientFlow",
          "Ticket created",
          created.toString());
      if (i < 5)
        db.update(
            "INSERT INTO ticket_comments VALUES (?,?,?,?,?,?)",
            "comment-" + i,
            id,
            "u-engineer",
            "Thanks for the details. I’m investigating the configuration and will share an update"
                + " shortly.",
            false,
            created.plusSeconds(1800).toString());
    }
    for (int i = 0; i < orgs.length; i++) {
      String id = "on-" + i;
      db.update(
          "INSERT INTO onboarding VALUES (?,?,?,?,?,?)",
          id,
          orgs[i][0],
          orgs[i][5],
          "Jordan Lee",
          i == 1 ? "Security documents are ready for review." : "",
          now);
      String[][] tasks = {
        {"Organization profile", "Confirm business details and primary contact."},
        {"Security documentation", "Upload your security questionnaire and compliance documents."},
        {"Technical configuration", "Configure your integration and confirm connectivity."},
        {"Team access", "Invite stakeholders and verify their access."},
        {"Go-live readiness", "Complete the kickoff review with your success team."}
      };
      for (int j = 0; j < tasks.length; j++)
        db.update(
            "INSERT INTO onboarding_tasks VALUES (?,?,?,?,?,?)",
            id + "-" + j,
            id,
            tasks[j][0],
            tasks[j][1],
            i == 0 || i == 1 || i == 3 || j < 1,
            j);
    }
    String[][] articles = {
      {
        "kb-1",
        "Get started with your ClientFlow workspace",
        "Getting started",
        "Everything your team needs for a smooth first week.",
        "Welcome to ClientFlow\n\n"
            + "1. Complete your organization profile in Onboarding.\n"
            + "2. Upload the required security documentation in Documents.\n"
            + "3. Configure your integration and verify connectivity.\n"
            + "4. Invite your team through your account manager.\n"
            + "5. Schedule a go-live review.\n\n"
            + "Need help? Create a ticket with the Onboarding category and your support team will"
            + " guide you."
      },
      {
        "kb-2",
        "Troubleshoot single sign-on",
        "Identity & access",
        "Resolve common SAML and identity provider configuration issues.",
        "Check the identity provider\n\n"
            + "Confirm the assertion consumer service URL and entity ID match your workspace"
            + " configuration. Check that the signing certificate has not expired.\n\n"
            + "Validate user access\n\n"
            + "Confirm the user has been assigned to the application in your identity provider."
            + " Clear the browser session and retry.\n\n"
            + "Still seeing an error?\n\n"
            + "Create an Identity & access ticket with the timestamp, error code, and affected user"
            + " count. Never share access tokens or passwords."
      },
      {
        "kb-3",
        "API keys and authentication",
        "API & development",
        "Connect your services securely with scoped credentials.",
        "Create a dedicated service account for each integration. Grant only required permissions"
            + " and store keys in a secrets manager.\n\n"
            + "Use the Authorization header and rotate credentials regularly. Never include"
            + " credentials in URLs, tickets, or logs.\n\n"
            + "For API access provisioning, submit an API & development ticket with your"
            + " environment and required scopes."
      },
      {
        "kb-4",
        "Understanding priorities and SLA targets",
        "Support essentials",
        "Know what to expect when you submit a support request.",
        "Critical: service unavailable, 30 minute response and 4 hour resolution target.\n"
            + "High: major feature impaired, 1 hour response and 8 hour resolution target.\n"
            + "Medium: limited impact, 4 hour response and 24 hour resolution target.\n"
            + "Low: general question, 8 hour response and 72 hour resolution target.\n\n"
            + "These are illustrative demonstration targets measured in elapsed time. An SLA breach"
            + " triggers a single escalation and notifies the support team."
      },
      {
        "kb-5",
        "Prepare your onboarding documents",
        "Getting started",
        "A checklist for security reviews and business verification.",
        "Upload your business registration, completed security questionnaire, and implementation"
            + " contact list through Documents.\n\n"
            + "Files are restricted to your organization and authorized staff. Accepted formats:"
            + " PDF, TXT, CSV, PNG, and JPEG, up to 5 MB each.\n\n"
            + "Mark the relevant task complete and submit your checklist for review when all"
            + " requirements are ready."
      },
      {
        "kb-6",
        "Webhook delivery and retry behavior",
        "Integrations",
        "Investigate failed deliveries and restore reliable event processing.",
        "Check your endpoint returns a 2xx response within the expected timeout. Verify TLS"
            + " certificates and firewall rules.\n\n"
            + "Use idempotency keys when processing events. Log event identifiers and timestamps"
            + " without storing sensitive payloads.\n\n"
            + "For support, include the event ID, delivery timestamp, HTTP status, and a"
            + " description of recent endpoint changes."
      }
    };
    for (var a : articles)
      db.update(
          "INSERT INTO knowledge_articles VALUES (?,?,?,?,?,?,?,?)",
          a[0],
          a[1],
          a[2],
          a[3],
          a[4],
          "ClientFlow Support",
          "Published",
          now);
    for (var u : users)
      db.update(
          "INSERT INTO notifications VALUES (?,?,?,?,?,?,?)",
          "n-" + u[0],
          u[0],
          "Welcome to your workspace",
          "Your service workspace is ready. Explore tickets, onboarding, and the knowledge base.",
          null,
          false,
          now);
    db.update(
        "INSERT INTO audit_events VALUES (?,?,?,?,?,?)",
        "a-seed",
        "System",
        "Demo workspace initialized",
        "workspace",
        "Fictional organizations and sample support requests created.",
        now);
  }
}
