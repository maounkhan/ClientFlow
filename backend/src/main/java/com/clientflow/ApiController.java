package com.clientflow;

import jakarta.servlet.http.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.context.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
public class ApiController {
  final WorkspaceService s;
  final AuthenticationManager auth;
  final SecurityContextRepository contexts;
  final PasswordEncoder encoder;
  final Path storage;
  final Map<String, List<Long>> attempts = new ConcurrentHashMap<>();

  ApiController(
      WorkspaceService s,
      AuthenticationManager auth,
      SecurityContextRepository contexts,
      PasswordEncoder encoder,
      @Value("${clientflow.storage}") String storage) {
    this.s = s;
    this.auth = auth;
    this.contexts = contexts;
    this.encoder = encoder;
    this.storage = Path.of(storage);
  }

  @GetMapping("/auth/demo-info")
  Map<String, Object> demoInfo() {
    return Map.of("application", "ClientFlow", "version", "1.0.0", "mode", "local-demo");
  }

  @GetMapping("/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/auth/login")
  Map<String, Object> login(
      @RequestBody Map<String, Object> b,
      HttpServletRequest request,
      HttpServletResponse response) {
    String ip = request.getRemoteAddr();
    var recent = attempts.computeIfAbsent(ip, k -> Collections.synchronizedList(new ArrayList<>()));
    synchronized (recent) {
      recent.removeIf(t -> t < System.currentTimeMillis() - 60000);
      if (recent.size() >= 15)
        throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again in a minute.");
      recent.add(System.currentTimeMillis());
    }
    try {
      Authentication result =
          auth.authenticate(
              UsernamePasswordAuthenticationToken.unauthenticated(
                  s.text(b, "email", 150), s.text(b, "password", 150)));
      if (request.getSession(false) != null) request.changeSessionId();
      var c = SecurityContextHolder.createEmptyContext();
      c.setAuthentication(result);
      SecurityContextHolder.setContext(c);
      contexts.saveContext(c, request, response);
      return s.user(result);
    } catch (AuthenticationException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
    }
  }

  @GetMapping("/preferences")
  Map<String, Object> preferences(Authentication a) {
    var u = s.user(a);
    var rows =
        s.database()
            .queryForList(
                "SELECT show_ticket_updates,show_sla_alerts,show_onboarding FROM user_preferences"
                    + " WHERE user_id=?",
                u.get("id"));
    return rows.isEmpty()
        ? Map.of("show_ticket_updates", true, "show_sla_alerts", true, "show_onboarding", true)
        : rows.getFirst();
  }

  @PutMapping("/preferences")
  void preferences(Authentication a, @RequestBody Map<String, Object> b) {
    var u = s.user(a);
    s.database().update("DELETE FROM user_preferences WHERE user_id=?", u.get("id"));
    s.database()
        .update(
            "INSERT INTO user_preferences VALUES (?,?,?,?)",
            u.get("id"),
            !Boolean.FALSE.equals(b.get("show_ticket_updates")),
            !Boolean.FALSE.equals(b.get("show_sla_alerts")),
            !Boolean.FALSE.equals(b.get("show_onboarding")));
  }

  @GetMapping("/users/me")
  Map<String, Object> me(Authentication a) {
    return s.user(a);
  }

  @GetMapping("/workspace")
  Map<String, Object> workspace(Authentication a) {
    var u = s.user(a);
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("user", u);
    data.put("organizations", s.organizations(u));
    data.put("tickets", s.tickets(u));
    data.put("onboarding", s.onboardings(u));
    data.put("analytics", s.analytics(u));
    data.put(
        "articles",
        s.database()
            .queryForList(
                "SELECT * FROM knowledge_articles"
                    + (s.client(u) ? " WHERE status='Published'" : "")
                    + " ORDER BY updated_at DESC"));
    data.put(
        "notifications",
        s.database()
            .queryForList(
                "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
                u.get("id")));
    data.put(
        "policies",
        s.database().queryForList("SELECT * FROM sla_policies ORDER BY resolution_hours"));
    data.put(
        "users",
        s.client(u)
            ? List.of()
            : s.database()
                .queryForList(
                    "SELECT id,name,email,role,org_id,team,enabled FROM users ORDER BY name"));
    data.put(
        "documents",
        s.client(u)
            ? s.database()
                .queryForList(
                    "SELECT d.*,o.name org_name FROM documents d JOIN organizations o ON"
                        + " d.org_id=o.id WHERE d.org_id=? ORDER BY created_at DESC",
                    u.get("org_id"))
            : s.database()
                .queryForList(
                    "SELECT d.*,o.name org_name FROM documents d JOIN organizations o ON"
                        + " d.org_id=o.id ORDER BY created_at DESC"));
    if (!s.client(u))
      data.put(
          "audit",
          s.database()
              .queryForList("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 200"));
    return data;
  }

  @GetMapping("/tickets")
  Map<String, Object> tickets(
      Authentication a,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String status,
      @RequestParam(defaultValue = "") String priority) {
    s.require(page >= 0 && size > 0 && size <= 100, "Invalid pagination");
    var rows =
        s.tickets(s.user(a)).stream()
            .filter(
                t ->
                    (q.isBlank()
                            || (t.get("title") + " " + t.get("id"))
                                .toLowerCase()
                                .contains(q.toLowerCase()))
                        && (status.isBlank() || status.equals(t.get("status")))
                        && (priority.isBlank() || priority.equals(t.get("priority"))))
            .toList();
    return Map.of(
        "items",
        rows.stream().skip((long) page * size).limit(size).toList(),
        "total",
        rows.size(),
        "page",
        page,
        "size",
        size);
  }

  @GetMapping("/tickets/{id}")
  Map<String, Object> ticket(Authentication a, @PathVariable String id) {
    return s.detail(s.user(a), id);
  }

  @PostMapping("/tickets")
  @ResponseStatus(HttpStatus.CREATED)
  synchronized Map<String, Object> create(Authentication a, @RequestBody Map<String, Object> b) {
    return s.createTicket(s.user(a), b);
  }

  @PatchMapping("/tickets/{id}")
  Map<String, Object> patch(
      Authentication a, @PathVariable String id, @RequestBody Map<String, Object> b) {
    return s.updateTicket(s.user(a), id, b);
  }

  @PostMapping("/tickets/{id}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  void comment(Authentication a, @PathVariable String id, @RequestBody Map<String, Object> b) {
    s.comment(s.user(a), id, b);
  }

  @GetMapping("/organizations")
  List<Map<String, Object>> orgs(Authentication a) {
    return s.organizations(s.user(a));
  }

  @PostMapping("/organizations")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> org(Authentication a, @RequestBody Map<String, Object> b) {
    return s.createOrg(s.user(a), b);
  }

  @PatchMapping("/onboarding/{id}")
  void onboarding(Authentication a, @PathVariable String id, @RequestBody Map<String, Object> b) {
    s.onboarding(s.user(a), id, b);
  }

  @PatchMapping("/notifications/{id}/read")
  void read(Authentication a, @PathVariable String id) {
    var u = s.user(a);
    int count =
        id.equals("all")
            ? s.database()
                .update("UPDATE notifications SET is_read=TRUE WHERE user_id=?", u.get("id"))
            : s.database()
                .update(
                    "UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?",
                    id,
                    u.get("id"));
    if (count == 0 && !id.equals("all"))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
  }

  @PutMapping("/sla-policies/{priority}")
  void policy(Authentication a, @PathVariable String priority, @RequestBody Map<String, Object> b) {
    var u = s.user(a);
    s.manager(u);
    s.require(WorkspaceService.PRIORITIES.contains(priority), "Invalid priority");
    try {
      int response = Integer.parseInt(b.get("response_minutes").toString()),
          resolution = Integer.parseInt(b.get("resolution_hours").toString());
      s.require(
          response >= 1 && response <= 10080 && resolution >= 1 && resolution <= 720,
          "Use 1–10080 response minutes and 1–720 resolution hours");
      s.database()
          .update(
              "UPDATE sla_policies SET response_minutes=?,resolution_hours=? WHERE priority=?",
              response,
              resolution,
              priority);
      s.audit(
          u,
          "SLA policy updated",
          priority,
          response + " minute response / " + resolution + " hour resolution (new requests)");
    } catch (NumberFormatException | NullPointerException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter whole-number targets");
    }
  }

  @PostMapping("/sla/sweep")
  void sweep(Authentication a) {
    s.manager(s.user(a));
    s.sweep();
  }

  @Scheduled(initialDelay = 60000, fixedDelay = 60000)
  void scheduledSweep() {
    s.sweep();
  }

  @GetMapping("/analytics/overview")
  Map<String, Object> analytics(Authentication a) {
    return s.analytics(s.user(a));
  }

  @PostMapping("/articles")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> article(Authentication a, @RequestBody Map<String, Object> b) {
    var u = s.user(a);
    s.manager(u);
    String id = s.id();
    s.database()
        .update(
            "INSERT INTO knowledge_articles VALUES (?,?,?,?,?,?,?,?)",
            id,
            s.text(b, "title", 200),
            s.text(b, "category", 60),
            s.text(b, "summary", 400),
            s.text(b, "body", 20000),
            u.get("name"),
            "Published",
            s.now());
    s.audit(u, "Knowledge article published", id, "");
    return s.one("SELECT * FROM knowledge_articles WHERE id=?", id);
  }

  @PatchMapping("/articles/{id}")
  void editArticle(Authentication a, @PathVariable String id, @RequestBody Map<String, Object> b) {
    var u = s.user(a);
    s.manager(u);
    s.one("SELECT id FROM knowledge_articles WHERE id=?", id);
    if (b.containsKey("status")) {
      String status = s.text(b, "status", 20);
      s.require(Set.of("Published", "Archived").contains(status), "Invalid status");
      s.database()
          .update(
              "UPDATE knowledge_articles SET status=?,updated_at=? WHERE id=?",
              status,
              s.now(),
              id);
    } else
      s.database()
          .update(
              "UPDATE knowledge_articles SET title=?,category=?,summary=?,body=?,updated_at=? WHERE"
                  + " id=?",
              s.text(b, "title", 200),
              s.text(b, "category", 60),
              s.text(b, "summary", 400),
              s.text(b, "body", 20000),
              s.now(),
              id);
    s.audit(u, "Knowledge article updated", id, "");
  }

  @PatchMapping("/users/{id}")
  void role(Authentication a, @PathVariable String id, @RequestBody Map<String, Object> b) {
    var u = s.user(a);
    s.admin(u);
    s.require(!id.equals(u.get("id")), "You cannot change your own access");
    var target = s.one("SELECT * FROM users WHERE id=?", id);
    String role = s.text(b, "role", 30);
    s.require(Set.of("CLIENT", "ENGINEER", "MANAGER", "ADMIN").contains(role), "Invalid role");
    s.require(
        !role.equals("CLIENT") || target.get("org_id") != null,
        "A client account must belong to an organization");
    s.require(
        !"CLIENT".equals(target.get("role")) || role.equals("CLIENT"),
        "Client accounts cannot be promoted to staff; use a dedicated staff account");
    s.database().update("UPDATE users SET role=? WHERE id=?", role, id);
    s.audit(u, "User role updated", id, role);
  }

  @PostMapping("/documents")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> upload(
      Authentication a,
      @RequestParam("file") MultipartFile file,
      @RequestParam String org_id,
      @RequestParam(required = false) String ticket_id)
      throws IOException {
    var u = s.user(a);
    s.orgAccess(u, org_id);
    s.one("SELECT id FROM organizations WHERE id=?", org_id);
    if (ticket_id != null) {
      var t = s.ticket(u, ticket_id);
      s.require(org_id.equals(t.get("org_id")), "Attachment organization must match the ticket");
    }
    s.require(
        !file.isEmpty() && file.getSize() <= 5 * 1024 * 1024, "Choose a non-empty file up to 5 MB");
    String name =
        Path.of(Objects.toString(file.getOriginalFilename(), "document")).getFileName().toString();
    s.require(name.length() <= 200, "Filename is too long");
    String extension =
        name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
    s.require(
        Set.of("pdf", "txt", "csv", "png", "jpg", "jpeg").contains(extension),
        "Supported formats: PDF, TXT, CSV, PNG, JPG");
    String id = s.id();
    Files.createDirectories(storage);
    try {
      Files.copy(file.getInputStream(), storage.resolve(id));
      s.database()
          .update(
              "INSERT INTO documents VALUES (?,?,?,?,?,?,?,?)",
              id,
              org_id,
              ticket_id,
              name,
              "application/octet-stream",
              file.getSize(),
              u.get("name"),
              s.now());
    } catch (Exception e) {
      Files.deleteIfExists(storage.resolve(id));
      throw e;
    }
    s.audit(u, "Document uploaded", id, "Private organization document");
    return s.one("SELECT * FROM documents WHERE id=?", id);
  }

  @GetMapping("/documents/{id}/download")
  ResponseEntity<Resource> download(Authentication a, @PathVariable String id) throws IOException {
    var d = s.one("SELECT * FROM documents WHERE id=?", id);
    s.orgAccess(s.user(a), d.get("org_id"));
    Path file = storage.resolve(id);
    if (!Files.isRegularFile(file))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File is no longer available");
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename(d.get("name").toString(), java.nio.charset.StandardCharsets.UTF_8)
                .build()
                .toString())
        .body(new FileSystemResource(file));
  }
}
