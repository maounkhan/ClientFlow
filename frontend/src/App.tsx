import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  CornerDownRight,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { api, complete, fullDate, initCsrf, relative, Row, sla } from "./api";
import { nav } from "./app/constants";
import { WorkspaceContext } from "./app/WorkspaceContext";
import { Avatar, Badge, Empty, Modal } from "./components/ui";
import { DialogContent } from "./components/WorkspaceDialog";
import { Login } from "./features/auth/Login";
import { TicketDetail } from "./features/tickets/TicketDetail";
import {
  Analytics,
  Audit,
  Documents,
  Knowledge,
  Onboarding,
  Organizations,
  Overview,
  SettingsPage,
  Sla,
  Team,
  Tickets,
} from "./features/workspace/Views";
export function App() {
  const [data, setData] = useState<Row | null>(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(
      location.hash.slice(1).split("/")[0] || "overview",
    ),
    [detailId, setDetailId] = useState<string | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [dialog, setDialog] = useState<string | null>(null),
    [article, setArticle] = useState<Row | null>(null),
    [toast, setToast] = useState<{ message: string; error: boolean } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [notif, setNotif] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All tickets"),
    [priority, setPriority] = useState("All priorities"),
    [org, setOrg] = useState("All organizations"),
    [query, setQuery] = useState(""),
    [period, setPeriod] = useState("7"),
    [articleCategory, setArticleCategory] = useState("All articles"),
    [prefs, setPrefs] = useState<Row>({}),
    [edit, setEdit] = useState<Row | null>(null),
    [connected, setConnected] = useState(true),
    [smallScreen, setSmallScreen] = useState(
      window.matchMedia("(max-width:800px)").matches,
    );
  useEffect(() => {
    const media = window.matchMedia("(max-width:800px)");
    const update = () => setSmallScreen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const refreshVersion = useRef(0);
  const activeTicketRef = useRef<string | null>(detailId);
  activeTicketRef.current = detailId;
  const loggedOut = () => {
    refreshVersion.current++;
    setData(null);
    setDetailId(null);
    setDetail(null);
    setNotif(false);
    setDialog(null);
  };
  useEffect(() => {
    window.addEventListener("session-expired", loggedOut);
    return () => window.removeEventListener("session-expired", loggedOut);
  }, []);
  async function refresh() {
    const version = ++refreshVersion.current;
    const [next, preferences] = await Promise.all([
      api("/workspace"),
      api("/preferences"),
    ]);
    if (version !== refreshVersion.current) return next;
    setData(next);
    setPrefs(preferences);
    setConnected(true);
    const ticketId = activeTicketRef.current;
    if (ticketId) {
      const updated = await api("/tickets/" + ticketId);
      if (activeTicketRef.current === ticketId) setDetail(updated);
    }
    return next;
  }
  useEffect(() => {
    initCsrf()
      .then(() => api("/users/me"))
      .then(() => refresh())
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(
      () => refresh().catch(() => setConnected(false)),
      15000,
    );
    return () => clearInterval(timer);
  }, [!!data]);
  useEffect(() => {
    const fn = () => {
      const parts = location.hash.slice(1).split("/");
      setPage(parts[0] || "overview");
      setDetailId(
        parts[0] === "tickets" && parts[1]
          ? decodeURIComponent(parts[1])
          : null,
      );
      setSearch("");
      setMobile(false);
    };
    window.addEventListener("hashchange", fn);
    fn();
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    let active = true;
    if (detailId && data)
      api("/tickets/" + detailId)
        .then((value) => {
          if (active) setDetail(value);
        })
        .catch((e) => {
          if (active) {
            notify(e.message, true);
            setDetailId(null);
          }
        });
    else setDetail(null);
    return () => {
      active = false;
    };
  }, [detailId, !!data]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        setNotif(false);
        setSearch("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>(
            'input[aria-label="Search workspace"]',
          )
          ?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        go("settings");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function notify(message: string, error = false) {
    setToast({ message, error });
  }
  function go(key: string) {
    setMobile(false);
    location.hash = key;
    setQuery("");
    setFilter("All tickets");
    setPriority("All priorities");
    setOrg("All organizations");
  }
  function openTicket(id: string) {
    if (detailId === id) return;
    setDetail(null);
    location.hash = "tickets/" + id;
  }
  async function mutate(
    path: string,
    method: string,
    body?: unknown,
    message = "Changes saved",
  ) {
    if (busy) return;
    refreshVersion.current++;
    setBusy(true);
    try {
      const result = await api(path, method, body);
      await refresh();
      notify(message);
      return result ?? true;
    } catch (e) {
      notify((e as Error).message, true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      loggedOut();
      await initCsrf();
      location.hash = "overview";
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  const user = data?.user || {},
    isClient = user.role === "CLIENT",
    isAdmin = user.role === "ADMIN",
    isManager = ["ADMIN", "MANAGER"].includes(user.role),
    tickets: Row[] = data?.tickets || [],
    organizations: Row[] = data?.organizations || [],
    articles: Row[] = data?.articles || [],
    onboarding: Row[] = data?.onboarding || [],
    notifications: Row[] = data?.notifications || [],
    users: Row[] = data?.users || [],
    documents: Row[] = data?.documents || [],
    metrics = data?.analytics || {},
    unread = notifications.filter((n) => !n.is_read).length;
  const allowed = nav.filter(
    (n) =>
      !isClient ||
      !["organizations", "sla", "analytics", "team", "audit"].includes(n.key),
  );
  const selectedNav = allowed.find((n) => n.key === page);
  const activePage = selectedNav
    ? page
    : page === "settings"
      ? "settings"
      : "overview";
  const filtered = tickets.filter(
    (t) =>
      (!query ||
        (t.title + " " + t.id + " " + t.org_name)
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (filter === "All tickets" ||
        (filter === "Active tickets" && !complete(t)) ||
        (filter === "My tickets" && t.assignee_id === user.id) ||
        filter === t.status) &&
      (priority === "All priorities" || priority === t.priority) &&
      (org === "All organizations" || org === t.org_id),
  );
  const recent = Array.from({ length: Number(period) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (Number(period) - 1 - i));
    const key = d.toLocaleDateString();
    return {
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created: tickets.filter(
        (t) => new Date(t.created_at).toLocaleDateString() === key,
      ).length,
      resolved: tickets.filter(
        (t) =>
          t.resolved_at && new Date(t.resolved_at).toLocaleDateString() === key,
      ).length,
    };
  });
  const activeTickets = tickets.filter((t) => !complete(t));
  const closeDialog = () => {
    setDialog(null);
    setEdit(null);
  };
  const Button = ({
    children,
    onClick,
    kind = "",
    disabled = false,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    kind?: string;
    disabled?: boolean;
  }) => (
    <button
      className={`btn ${kind}`}
      onClick={onClick}
      disabled={disabled || busy}
    >
      {children}
    </button>
  );
  function ticketTable(rows: Row[], compact = false) {
    return rows.length ? (
      <div className="table-scroll">
        <table className={`ticket-table ${compact ? "compact" : ""}`}>
          <thead>
            <tr>
              <th>Ticket / subject</th>
              {!isClient && <th>Organization</th>}
              <th>Status</th>
              <th>Priority</th>
              <th>{compact ? "Assignee" : "SLA deadline"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} onClick={() => openTicket(t.id)}>
                <td>
                  <button
                    className="ticket-link"
                    onClick={() => openTicket(t.id)}
                  >
                    <small>{t.id}</small>
                    <strong>{t.title}</strong>
                  </button>
                </td>
                {!isClient && (
                  <td>
                    <span className="org-cell">
                      <span className="org-symbol">{t.org_name[0]}</span>
                      {t.org_name}
                    </span>
                  </td>
                )}
                <td>
                  <Badge value={t.status} />
                </td>
                <td>
                  <Badge value={t.priority} type="priority" />
                </td>
                <td>
                  {compact ? (
                    t.assignee_name ? (
                      <span className="assignee">
                        <Avatar name={t.assignee_name} size="small" />
                        {t.assignee_name.split(" ")[0]}
                      </span>
                    ) : (
                      <span className="muted">Unassigned</span>
                    )
                  ) : (
                    <span className={`sla-label ${sla(t).kind}`}>
                      <Clock size={13} />
                      {sla(t).label}
                    </span>
                  )}
                </td>
                <td>
                  <ChevronRight size={16} className="muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="No matching tickets"
        text="Try another filter or create a new support request."
        action={
          <Button kind="primary" onClick={() => setDialog("ticket")}>
            <Plus size={16} />
            New ticket
          </Button>
        }
      />
    );
  }
  function statCards() {
    return (
      <div className="stats-grid">
        {[
          {
            title: "Open tickets",
            value: metrics.open,
            icon: Ticket,
            meta: `${tickets.filter((t) => t.status === "Open").length} awaiting triage`,
            color: "green",
          },
          {
            title: "SLA compliance",
            value: `${metrics.sla_compliance}%`,
            icon: ShieldCheck,
            meta: "Across completed tickets",
            color: "blue",
          },
          {
            title: "Avg. first response",
            value:
              metrics.avg_response_minutes < 60
                ? `${metrics.avg_response_minutes}m`
                : `${(metrics.avg_response_minutes / 60).toFixed(1)}h`,
            icon: Clock,
            meta: "From creation to first response",
            color: "amber",
          },
          {
            title: "Active escalations",
            value: metrics.escalated,
            icon: AlertCircle,
            meta: `${metrics.overdue} resolution deadline${metrics.overdue === 1 ? "" : "s"} overdue`,
            color: "red",
          },
        ].map((m) => (
          <div className="stat-card" key={m.title}>
            <div className="stat-top">
              <span>{m.title}</span>
              <span className={`stat-icon ${m.color}`}>
                <m.icon size={17} />
              </span>
            </div>
            <strong>{m.value ?? "—"}</strong>
            <small>
              <span className={`stat-dot ${m.color}`} />
              {m.meta}
            </small>
          </div>
        ))}
      </div>
    );
  }
  if (loading)
    return (
      <div className="startup">
        <span className="brand-mark">
          <CornerDownRight size={28} />
        </span>
        <h2>ClientFlow</h2>
        <Loader2 className="spin" size={20} />
      </div>
    );
  if (!data)
    return (
      <Login
        onLogin={async () => {
          setLoading(true);
          try {
            await refresh();
            await initCsrf();
          } catch (e) {
            notify((e as Error).message, true);
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  const visibleNotifications = notifications.filter((n) =>
    n.title === "SLA breached"
      ? prefs.show_sla_alerts !== false
      : n.title.startsWith("Onboarding")
        ? prefs.show_onboarding !== false
        : prefs.show_ticket_updates !== false,
  );
  return (
    <WorkspaceContext.Provider
      value={{
        data,
        user,
        isClient,
        isAdmin,
        isManager,
        tickets,
        organizations,
        articles,
        onboarding,
        notifications,
        users,
        documents,
        metrics,
        unread,
        activeTickets,
        filtered,
        recent,
        period,
        setPeriod,
        query,
        setQuery,
        filter,
        setFilter,
        priority,
        setPriority,
        org,
        setOrg,
        articleCategory,
        setArticleCategory,
        prefs,
        setPrefs,
        edit,
        setEdit,
        dialog,
        setDialog,
        detail,
        detailId,
        article,
        setArticle,
        busy,
        notify,
        mutate,
        refresh,
        go,
        openTicket,
        logout,
        closeDialog,
        ticketTable,
        statCards,
        Button,
      }}
    >
      <div className="app-shell">
        <a
          href="#main-content"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Skip to content
        </a>
        {mobile && (
          <div className="sidebar-scrim" onClick={() => setMobile(false)} />
        )}
        <aside
          className={`sidebar ${mobile ? "mobile-open" : ""}`}
          aria-hidden={smallScreen && !mobile}
          {...(smallScreen && !mobile ? { inert: "" } : {})}
        >
          <button className="brand" onClick={() => go("overview")}>
            <span className="brand-mark">
              <CornerDownRight size={23} />
            </span>
            ClientFlow<span className="brand-dot">®</span>
          </button>
          <div className="workspace-label">
            <span className="workspace-icon">C</span>
            <div>
              <strong>ClientFlow workspace</strong>
              <small>
                {isClient
                  ? organizations[0]?.name
                  : "Enterprise service operations"}
              </small>
            </div>
            <Lock size={12} />
          </div>
          <span className="nav-label">WORKSPACE</span>
          <nav>
            {allowed.map((n, i) => (
              <React.Fragment key={n.key}>
                {i === 6 && (
                  <span className="nav-label resources-label">
                    RESOURCES & PEOPLE
                  </span>
                )}
                <button
                  className={activePage === n.key ? "active" : ""}
                  onClick={() => go(n.key)}
                >
                  <n.icon size={18} />
                  <span>{n.label}</span>
                  {n.key === "tickets" && (
                    <span className="nav-count">{metrics.open}</span>
                  )}
                  {n.key === "sla" && metrics.escalated > 0 && (
                    <span className="nav-alert" />
                  )}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-status">
              <span className="live-dot" />
              <span>Demo workspace</span>
              <span className="version">v1.0</span>
            </div>
            <button
              className={activePage === "settings" ? "active" : ""}
              onClick={() => go("settings")}
            >
              <Settings size={18} />
              Settings<span className="keyboard">⌘ ,</span>
            </button>
            <button onClick={() => go("knowledge")}>
              <LifeBuoy size={18} />
              Help & resources
              <ArrowUpRight size={14} />
            </button>
            <div className="sidebar-profile">
              <Avatar name={user.name} />
              <button onClick={() => go("settings")}>
                <strong>{user.name}</strong>
                <small>
                  {isClient
                    ? "Client"
                    : isAdmin
                      ? "Administrator"
                      : user.role === "MANAGER"
                        ? "Team manager"
                        : "Support engineer"}
                </small>
              </button>
              <button
                className="logout-btn"
                onClick={logout}
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace-main">
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-btn mobile-menu"
                onClick={() => setMobile(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>
                {activePage === "settings"
                  ? "Settings"
                  : selectedNav?.label || "Overview"}
              </strong>
              {detailId && (
                <>
                  <ChevronRight size={13} />
                  <span>{detailId}</span>
                </>
              )}
            </div>
            <div className="topbar-actions">
              <div className="global-search">
                <Search size={16} />
                <input
                  aria-label="Search workspace"
                  placeholder="Search your workspace…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>
                  <Command size={10} />K
                </span>
                {search && (
                  <div className="search-results">
                    <small>SUPPORT TICKETS</small>
                    {tickets
                      .filter((t) =>
                        (t.title + " " + t.id)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .slice(0, 4)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            openTicket(t.id);
                            setSearch("");
                          }}
                        >
                          <Ticket size={16} />
                          <span>
                            <strong>{t.title}</strong>
                            <small>
                              {t.id} · {t.status}
                            </small>
                          </span>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    <small>KNOWLEDGE BASE</small>
                    {articles
                      .filter((a) =>
                        (a.title + " " + a.summary)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .slice(0, 3)
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setArticle(a);
                            setSearch("");
                          }}
                        >
                          <BookOpen size={16} />
                          <span>
                            <strong>{a.title}</strong>
                            <small>{a.category}</small>
                          </span>
                        </button>
                      ))}
                    {!tickets.some((t) =>
                      (t.title + " " + t.id)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    ) &&
                      !articles.some((a) =>
                        (a.title + " " + a.summary)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      ) && <p>No results for “{search}”</p>}
                  </div>
                )}
              </div>
              <span className="top-divider" />
              <div className="notification-wrap">
                <button
                  className={`icon-btn notification-btn ${notif ? "selected" : ""}`}
                  aria-label={`Notifications, ${unread} unread`}
                  onClick={() => setNotif(!notif)}
                >
                  <Bell size={19} />
                  {unread > 0 && <i />}
                </button>
                {notif && (
                  <div className="notification-panel">
                    <div className="notification-header">
                      <h3>
                        Notifications <span className="count">{unread}</span>
                      </h3>
                      <button
                        className="text-btn"
                        onClick={() =>
                          mutate(
                            "/notifications/all/read",
                            "PATCH",
                            undefined,
                            "All notifications marked as read",
                          )
                        }
                      >
                        <CheckCheck size={16} />
                        Read all
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setNotif(false)}
                        aria-label="Close notifications"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="notification-list">
                      {visibleNotifications.map((n) => (
                        <button
                          key={n.id}
                          className={`notification-item ${n.is_read ? "" : "unread"}`}
                          onClick={() => {
                            mutate(
                              "/notifications/" + n.id + "/read",
                              "PATCH",
                              undefined,
                              "Notification marked as read",
                            );
                            if (n.resource_id?.startsWith("CF-"))
                              openTicket(n.resource_id);
                            else if (n.resource_id?.startsWith("on-"))
                              go("onboarding");
                            setNotif(false);
                          }}
                        >
                          <span className="notification-icon">
                            <Bell size={16} />
                          </span>
                          <span>
                            <strong>{n.title}</strong>
                            <p>{n.body}</p>
                            <small>{relative(n.created_at)}</small>
                          </span>
                          {!n.is_read && <i />}
                        </button>
                      ))}
                      {!visibleNotifications.length && (
                        <Empty
                          title="All caught up"
                          text="Important updates will appear here."
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="top-avatar"
                onClick={() => go("settings")}
                aria-label="Open profile settings"
              >
                <Avatar name={user.name} size="small" />
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="content">
            {!connected && (
              <div className="connection-banner" role="alert">
                <AlertCircle size={17} />
                Connection interrupted. Showing the latest saved data.
                <button
                  onClick={() =>
                    refresh().catch(() =>
                      notify(
                        "Still unable to connect. Check the server.",
                        true,
                      ),
                    )
                  }
                >
                  Retry
                </button>
              </div>
            )}
            {detailId ? (
              <TicketDetail key={detailId} />
            ) : activePage === "overview" ? (
              <Overview />
            ) : activePage === "tickets" ? (
              <Tickets />
            ) : activePage === "onboarding" ? (
              <Onboarding />
            ) : activePage === "knowledge" ? (
              <Knowledge />
            ) : activePage === "sla" ? (
              <Sla />
            ) : activePage === "analytics" ? (
              <Analytics />
            ) : activePage === "organizations" ? (
              <Organizations />
            ) : activePage === "documents" ? (
              <Documents />
            ) : activePage === "team" ? (
              <Team />
            ) : activePage === "audit" ? (
              <Audit />
            ) : (
              <SettingsPage />
            )}
            <footer className="page-footer">
              <span>
                <span className={`live-dot ${connected ? "" : "offline"}`} />
                {connected ? "Workspace connected" : "Reconnecting…"}
              </span>
              <span>
                Thoughtfully connected. ClientFlow © {new Date().getFullYear()}
              </span>
              <button onClick={() => go("knowledge")}>
                Need a hand?
                <ArrowUpRight size={12} />
              </button>
            </footer>
          </main>
        </div>
        {dialog && <DialogContent />}
        {article && (
          <Modal
            title={article.title}
            subtitle={`${article.category} · ${article.author}`}
            onClose={() => setArticle(null)}
            wide
          >
            <div className="article-body">{article.body}</div>
            <div className="modal-footer">
              <span className="muted">
                Updated {fullDate(article.updated_at)}
              </span>
              {isManager && (
                <>
                  <button
                    className="btn"
                    onClick={async () => {
                      if (
                        await mutate(
                          "/articles/" + article.id,
                          "PATCH",
                          {
                            status:
                              article.status === "Archived"
                                ? "Published"
                                : "Archived",
                          },
                          article.status === "Archived"
                            ? "Article published"
                            : "Article archived",
                        )
                      )
                        setArticle(null);
                    }}
                  >
                    {article.status === "Archived" ? "Publish" : "Archive"}
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setEdit(article);
                      setArticle(null);
                      setDialog("article");
                    }}
                  >
                    Edit article
                  </button>
                </>
              )}
              <button className="btn" onClick={() => setArticle(null)}>
                Done
              </button>
            </div>
          </Modal>
        )}
        {toast && (
          <div
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
