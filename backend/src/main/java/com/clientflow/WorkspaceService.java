package com.clientflow;

import java.time.*;
import java.util.*;
import java.util.stream.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkspaceService {
  final JdbcTemplate db;
  static final Set<String> PRIORITIES = Set.of("Low", "Medium", "High", "Critical");
  static final Set<String> CATEGORIES =
      Set.of(
          "Identity & access",
          "Integrations",
          "API & development",
          "Billing",
          "Reporting",
          "Security",
          "Onboarding",
          "Other");
  static final Map<String, Set<String>> TRANSITIONS =
      Map.of(
          "Open",
          Set.of("Triaged", "Escalated"),
          "Triaged",
          Set.of("In Progress", "Waiting for Client", "Escalated"),
          "In Progress",
          Set.of("Waiting for Client", "Resolved", "Escalated"),
          "Waiting for Client",
          Set.of("In Progress", "Escalated"),
          "Escalated",
          Set.of("In Progress", "Waiting for Client", "Resolved"),
          "Resolved",
          Set.of("Closed", "Reopened"),
          "Closed",
          Set.of("Reopened"),
          "Reopened",
          Set.of("Triaged", "In Progress", "Escalated"));

  WorkspaceService(JdbcTemplate db) {
    this.db = db;
  }

  public JdbcTemplate database() {
    return db;
  }

  String id() {
    return UUID.randomUUID().toString();
  }

  String now() {
    return Instant.now().toString();
  }

  Map<String, Object> one(String sql, Object... args) {
    var rows = db.queryForList(sql, args);
    if (rows.isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
    return rows.getFirst();
  }

  Map<String, Object> user(Authentication a) {
    return one(
        "SELECT id,name,email,role,org_id,team FROM users WHERE email=? AND enabled=TRUE",
        a.getName());
  }

  boolean client(Map<String, Object> u) {
    return "CLIENT".equals(u.get("role"));
  }

  void staff(Map<String, Object> u) {
    if (client(u)) deny();
  }

  void manager(Map<String, Object> u) {
    if (!Set.of("ADMIN", "MANAGER").contains(u.get("role"))) deny();
  }

  void admin(Map<String, Object> u) {
    if (!"ADMIN".equals(u.get("role"))) deny();
  }

  void deny() {
    throw new ResponseStatusException(
        HttpStatus.FORBIDDEN, "You do not have permission for this action");
  }

  void require(boolean condition, String message) {
    if (!condition) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  String text(Map<String, Object> b, String key, int max) {
    String s = Objects.toString(b.get(key), "").trim();
    require(
        !s.isEmpty() && s.length() <= max, key + " is required (maximum " + max + " characters)");
    return s;
  }

  void orgAccess(Map<String, Object> u, Object org) {
    if (client(u) && !Objects.equals(u.get("org_id"), org))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
  }

  void audit(Map<String, Object> u, String action, String resource, String detail) {
    db.update(
        "INSERT INTO audit_events VALUES (?,?,?,?,?,?)",
        id(),
        u.get("name"),
        action,
        resource,
        detail,
        now());
  }

  void event(Map<String, Object> u, String ticket, String action) {
    db.update(
        "INSERT INTO ticket_events VALUES (?,?,?,?,?)", id(), ticket, u.get("name"), action, now());
    audit(u, action, ticket, "");
  }

  void notifyOrg(Object org, String title, String body, String resource) {
    for (var u :
        db.queryForList(
            "SELECT id FROM users WHERE enabled=TRUE AND (role<>'CLIENT' OR org_id=?)", org))
      db.update(
          "INSERT INTO notifications VALUES (?,?,?,?,?,?,?)",
          id(),
          u.get("id"),
          title,
          body,
          resource,
          false,
          now());
  }

  String ticketSelect() {
    return "SELECT t.*,o.name org_name,u.name requester_name,a.name assignee_name FROM tickets t"
        + " JOIN organizations o ON t.org_id=o.id JOIN users u ON t.requester_id=u.id LEFT"
        + " JOIN users a ON t.assignee_id=a.id";
  }

  List<Map<String, Object>> tickets(Map<String, Object> u) {
    return client(u)
        ? db.queryForList(
            ticketSelect() + " WHERE t.org_id=? ORDER BY t.created_at DESC", u.get("org_id"))
        : db.queryForList(ticketSelect() + " ORDER BY t.created_at DESC");
  }

  Map<String, Object> ticket(Map<String, Object> u, String ticket) {
    var t = one(ticketSelect() + " WHERE t.id=?", ticket);
    orgAccess(u, t.get("org_id"));
    return t;
  }

  Map<String, Object> detail(Map<String, Object> u, String ticket) {
    var t = ticket(u, ticket);
    t.put(
        "comments",
        db.queryForList(
            "SELECT c.*,u.name actor_name,u.role actor_role FROM ticket_comments c JOIN users u ON"
                + " c.actor_id=u.id WHERE ticket_id=?"
                + (client(u) ? " AND internal_note=FALSE" : "")
                + " ORDER BY created_at",
            ticket));
    t.put(
        "events",
        db.queryForList(
            "SELECT * FROM ticket_events WHERE ticket_id=? ORDER BY created_at", ticket));
    t.put(
        "documents",
        db.queryForList("SELECT * FROM documents WHERE ticket_id=? ORDER BY created_at", ticket));
    return t;
  }

  @Transactional
  public Map<String, Object> createTicket(Map<String, Object> u, Map<String, Object> b) {
    String title = text(b, "title", 200),
        description = text(b, "description", 10000),
        priority = text(b, "priority", 20),
        category = text(b, "category", 50);
    require(PRIORITIES.contains(priority), "Select a valid priority");
    require(CATEGORIES.contains(category), "Select a valid category");
    String org = client(u) ? u.get("org_id").toString() : text(b, "org_id", 40);
    one("SELECT id FROM organizations WHERE id=?", org);
    var policy = one("SELECT * FROM sla_policies WHERE priority=?", priority);
    String ref =
        "CF-"
            + (db.queryForObject(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(id,4) AS DECIMAL(10,0))),1000)+1 FROM tickets",
                Integer.class));
    Instant created = Instant.now();
    db.update(
        "INSERT INTO"
            + " tickets(id,title,description,org_id,requester_id,category,priority,status,created_at,updated_at,due_at,response_due_at)"
            + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        ref,
        title,
        description,
        org,
        u.get("id"),
        category,
        priority,
        "Open",
        created.toString(),
        created.toString(),
        created
            .plus(Duration.ofHours(((Number) policy.get("resolution_hours")).longValue()))
            .toString(),
        created
            .plus(Duration.ofMinutes(((Number) policy.get("response_minutes")).longValue()))
            .toString());
    event(u, ref, "Ticket created");
    notifyOrg(org, "New support request", ref + " · " + title, ref);
    return detail(u, ref);
  }

  @Transactional
  public Map<String, Object> updateTicket(
      Map<String, Object> u, String ref, Map<String, Object> b) {
    var t = ticket(u, ref);
    String old = t.get("status").toString();
    if (b.containsKey("status")) {
      String next = text(b, "status", 40);
      if (client(u))
        require(
            (old.equals("Resolved") && Set.of("Closed", "Reopened").contains(next))
                || (old.equals("Closed") && next.equals("Reopened")),
            "Clients can confirm resolution or reopen a completed request");
      require(
          TRANSITIONS.getOrDefault(old, Set.of()).contains(next),
          "Cannot move from " + old + " to " + next);
      String resolution =
          next.equals("Resolved")
              ? text(b, "resolution", 5000)
              : Objects.toString(t.get("resolution"), null);
      db.update(
          "UPDATE tickets SET status=?,resolution=?,resolved_at=?,updated_at=? WHERE id=?",
          next,
          resolution,
          Set.of("Resolved", "Closed").contains(next)
              ? Objects.toString(t.get("resolved_at"), now())
              : null,
          now(),
          ref);
      if (next.equals("Reopened")) {
        var p = one("SELECT * FROM sla_policies WHERE priority=?", t.get("priority"));
        db.update(
            "UPDATE tickets SET escalated=FALSE,due_at=? WHERE id=?",
            Instant.now()
                .plus(Duration.ofHours(((Number) p.get("resolution_hours")).longValue()))
                .toString(),
            ref);
      }
      if (next.equals("Escalated")) db.update("UPDATE tickets SET escalated=TRUE WHERE id=?", ref);
      event(u, ref, "Status changed to " + next);
      notifyOrg(t.get("org_id"), "Ticket " + next.toLowerCase(), ref + " · " + t.get("title"), ref);
    }
    if (b.containsKey("assignee_id")) {
      manager(u);
      String assigned = Objects.toString(b.get("assignee_id"), "");
      if (!assigned.isEmpty())
        one(
            "SELECT id FROM users WHERE id=? AND role IN ('ENGINEER','MANAGER','ADMIN') AND"
                + " enabled=TRUE",
            assigned);
      db.update(
          "UPDATE tickets SET assignee_id=?,updated_at=? WHERE id=?",
          assigned.isEmpty() ? null : assigned,
          now(),
          ref);
      event(
          u,
          ref,
          assigned.isEmpty()
              ? "Ticket unassigned"
              : "Ticket assigned to "
                  + one("SELECT name FROM users WHERE id=?", assigned).get("name"));
      notifyOrg(t.get("org_id"), "Assignment updated", ref + " has a new assignment", ref);
    }
    if (b.containsKey("priority")) {
      staff(u);
      String p = text(b, "priority", 20);
      require(PRIORITIES.contains(p), "Invalid priority");
      var policy = one("SELECT * FROM sla_policies WHERE priority=?", p);
      Instant base = Instant.parse(t.get("created_at").toString());
      db.update(
          "UPDATE tickets SET priority=?,due_at=?,response_due_at=?,updated_at=? WHERE id=?",
          p,
          base.plus(Duration.ofHours(((Number) policy.get("resolution_hours")).longValue()))
              .toString(),
          base.plus(Duration.ofMinutes(((Number) policy.get("response_minutes")).longValue()))
              .toString(),
          now(),
          ref);
      event(u, ref, "Priority changed to " + p);
    }
    return detail(u, ref);
  }

  @Transactional
  public void comment(Map<String, Object> u, String ref, Map<String, Object> b) {
    var t = ticket(u, ref);
    String body = text(b, "body", 10000);
    boolean internal = Boolean.TRUE.equals(b.get("internal_note"));
    if (internal) staff(u);
    db.update(
        "INSERT INTO ticket_comments VALUES (?,?,?,?,?,?)",
        id(),
        ref,
        u.get("id"),
        body,
        internal,
        now());
    db.update("UPDATE tickets SET updated_at=? WHERE id=?", now(), ref);
    if (!client(u) && !internal && t.get("first_response_at") == null)
      db.update("UPDATE tickets SET first_response_at=? WHERE id=?", now(), ref);
    audit(u, internal ? "Internal note added" : "Public reply added", ref, "");
    if (!internal)
      notifyOrg(
          t.get("org_id"), "New ticket reply", ref + " · " + u.get("name") + " added a reply", ref);
  }

  List<Map<String, Object>> organizations(Map<String, Object> u) {
    return client(u)
        ? db.queryForList("SELECT * FROM organizations WHERE id=?", u.get("org_id"))
        : db.queryForList("SELECT * FROM organizations ORDER BY name");
  }

  @Transactional
  public Map<String, Object> createOrg(Map<String, Object> u, Map<String, Object> b) {
    manager(u);
    String org = id(), on = id();
    String contact = text(b, "contact", 150), plan = text(b, "plan", 30);
    require(contact.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"), "Enter a valid contact email");
    require(Set.of("Growth", "Enterprise").contains(plan), "Select a valid plan");
    db.update(
        "INSERT INTO organizations VALUES (?,?,?,?,?,?,?)",
        org,
        text(b, "name", 150),
        text(b, "industry", 100),
        plan,
        contact,
        "Submitted",
        now());
    db.update(
        "INSERT INTO onboarding VALUES (?,?,?,?,?,?)",
        on,
        org,
        "Submitted",
        u.get("name"),
        "",
        now());
    int position = 0;
    for (String task :
        List.of(
            "Organization profile",
            "Security documentation",
            "Technical configuration",
            "Team access",
            "Go-live readiness"))
      db.update(
          "INSERT INTO onboarding_tasks VALUES (?,?,?,?,?,?)",
          id(),
          on,
          task,
          "Complete this requirement before review.",
          false,
          position++);
    audit(u, "Organization created", org, "");
    return one("SELECT * FROM organizations WHERE id=?", org);
  }

  List<Map<String, Object>> onboardings(Map<String, Object> u) {
    var rows =
        client(u)
            ? db.queryForList(
                "SELECT b.*,o.name org_name,o.industry,o.plan FROM onboarding b JOIN organizations"
                    + " o ON b.org_id=o.id WHERE b.org_id=?",
                u.get("org_id"))
            : db.queryForList(
                "SELECT b.*,o.name org_name,o.industry,o.plan FROM onboarding b JOIN organizations"
                    + " o ON b.org_id=o.id ORDER BY b.updated_at DESC");
    for (var row : rows)
      row.put(
          "tasks",
          db.queryForList(
              "SELECT * FROM onboarding_tasks WHERE onboarding_id=? ORDER BY sort_order,id",
              row.get("id")));
    return rows;
  }

  @Transactional
  public void onboarding(Map<String, Object> u, String ref, Map<String, Object> b) {
    var row = one("SELECT * FROM onboarding WHERE id=?", ref);
    orgAccess(u, row.get("org_id"));
    String old = row.get("status").toString();
    if (b.containsKey("task_id")) {
      require(
          !Set.of("In Review", "Approved", "Active", "Rejected").contains(old),
          "This checklist is locked during review or after completion");
      int changed =
          db.update(
              "UPDATE onboarding_tasks SET completed=? WHERE id=? AND onboarding_id=?",
              Boolean.TRUE.equals(b.get("completed")),
              text(b, "task_id", 40),
              ref);
      require(changed == 1, "Task not found");
      audit(u, "Onboarding checklist updated", ref, "");
    }
    if (b.containsKey("status")) {
      String next = text(b, "status", 40);
      if (next.equals("In Review")) {
        require(
            Set.of("Submitted", "Information Requested").contains(old),
            "This application cannot be submitted");
        require(
            db.queryForObject(
                    "SELECT COUNT(*) FROM onboarding_tasks WHERE onboarding_id=? AND"
                        + " completed=FALSE",
                    Integer.class,
                    ref)
                == 0,
            "Complete all checklist items before submitting");
      } else {
        manager(u);
        require(
            (old.equals("In Review")
                    && Set.of("Approved", "Information Requested", "Rejected").contains(next))
                || (old.equals("Approved") && next.equals("Active")),
            "Invalid onboarding transition");
      }
      String note = Objects.toString(b.get("note"), "").trim();
      if (Set.of("Information Requested", "Rejected").contains(next))
        require(!note.isEmpty() && note.length() <= 3000, "A review reason is required");
      db.update(
          "UPDATE onboarding SET status=?,note=?,updated_at=? WHERE id=?", next, note, now(), ref);
      db.update("UPDATE organizations SET status=? WHERE id=?", next, row.get("org_id"));
      audit(u, "Onboarding " + next, ref, "");
      notifyOrg(
          row.get("org_id"),
          "Onboarding " + next.toLowerCase(),
          "Your organization onboarding has been updated.",
          ref);
    }
  }

  @Transactional
  public void sweep() {
    for (var t :
        db.queryForList(
            "SELECT * FROM tickets WHERE status NOT IN ('Resolved','Closed') AND"
                + " escalated=FALSE")) {
      boolean resolution = Instant.parse(t.get("due_at").toString()).isBefore(Instant.now());
      boolean response =
          t.get("first_response_at") == null
              && Instant.parse(t.get("response_due_at").toString()).isBefore(Instant.now());
      if (resolution || response) {
        int n =
            db.update(
                "UPDATE tickets SET escalated=TRUE,status='Escalated',updated_at=? WHERE id=? AND"
                    + " escalated=FALSE",
                now(),
                t.get("id"));
        if (n == 1) {
          Map<String, Object> system = Map.of("name", "SLA engine");
          event(
              system,
              t.get("id").toString(),
              (response ? "First response" : "Resolution")
                  + " SLA breached · automatically escalated");
          notifyOrg(
              t.get("org_id"),
              "SLA breached",
              t.get("id") + " requires attention",
              t.get("id").toString());
        }
      }
    }
  }

  Map<String, Object> analytics(Map<String, Object> u) {
    var ts = tickets(u);
    long open =
        ts.stream().filter(t -> !Set.of("Resolved", "Closed").contains(t.get("status"))).count();
    var done =
        ts.stream().filter(t -> Set.of("Resolved", "Closed").contains(t.get("status"))).toList();
    long met =
        done.stream()
            .filter(
                t ->
                    t.get("resolved_at") != null
                        && !Instant.parse(t.get("resolved_at").toString())
                            .isAfter(Instant.parse(t.get("due_at").toString())))
            .count();
    double response =
        ts.stream()
            .filter(t -> t.get("first_response_at") != null)
            .mapToLong(
                t ->
                    Duration.between(
                            Instant.parse(t.get("created_at").toString()),
                            Instant.parse(t.get("first_response_at").toString()))
                        .toMinutes())
            .average()
            .orElse(0);
    return Map.of(
        "total",
        ts.size(),
        "open",
        open,
        "resolved",
        done.size(),
        "sla_compliance",
        done.isEmpty() ? 100 : Math.round(met * 100.0 / done.size()),
        "avg_response_minutes",
        Math.round(response),
        "escalated",
        ts.stream()
            .filter(
                t ->
                    Boolean.TRUE.equals(t.get("escalated"))
                        && !Set.of("Resolved", "Closed").contains(t.get("status")))
            .count(),
        "overdue",
        ts.stream()
            .filter(
                t ->
                    !Set.of("Resolved", "Closed").contains(t.get("status"))
                        && Instant.parse(t.get("due_at").toString()).isBefore(Instant.now()))
            .count());
  }
}
