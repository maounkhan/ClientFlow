import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Ticket,
  Upload,
  Zap,
} from "lucide-react";
import React, { useContext, useEffect, useState } from "react";
import { api, complete, csv, fullDate, Row, sla } from "../../api";
import { priorities, statuses } from "../../app/constants";
import { WorkspaceContext } from "../../app/WorkspaceContext";
import { AsyncCheckbox, Avatar, Badge, Empty } from "../../components/ui";
const ActivityChart = React.lazy(() =>
  import("../../Charts").then((m) => ({ default: m.ActivityChart })),
);
const StatusChart = React.lazy(() =>
  import("../../Charts").then((m) => ({ default: m.StatusChart })),
);
const WorkloadChart = React.lazy(() =>
  import("../../Charts").then((m) => ({ default: m.WorkloadChart })),
);
export function Overview() {
  const {
    data,
    user,
    isClient,
    tickets,
    onboarding,
    activeTickets,
    recent,
    period,
    setPeriod,
    filter,
    setFilter,
    priority,
    org,
    setDialog,
    go,
    openTicket,
    ticketTable,
    statCards,
    Button,
  } = useContext(WorkspaceContext);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, AT A GLANCE</div>
          <h1>
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
                ? "afternoon"
                : "evening"}
            , {user.name?.split(" ")[0]} <span className="greeting-dot">✳</span>
          </h1>
          <p>
            Here’s what’s happening with your{" "}
            {isClient ? "organization" : "clients and support team"} today.
          </p>
        </div>
        <div className="heading-actions">
          <span className="date-display">
            <Clock size={15} />
            {new Date().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button kind="primary" onClick={() => setDialog("ticket")}>
            <Plus size={17} />
            New ticket
          </Button>
        </div>
      </div>
      {statCards()}
      <div className="overview-grid">
        <section className="panel volume-panel">
          <div className="panel-header">
            <div>
              <h2>Ticket activity</h2>
              <p>A clearer picture of your support volume.</p>
            </div>
            <select
              aria-label="Ticket activity date range"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div className="chart-key">
            <span>
              <i />
              Created
            </span>
            <span>
              <i className="pale" />
              Resolved
            </span>
          </div>
          <div className="chart-wrap">
            <React.Suspense
              fallback={<div className="chart-loading">Loading chart…</div>}
            >
              <ActivityChart data={recent} />
            </React.Suspense>
          </div>
          <div className="chart-footer">
            <Activity size={14} />
            {
              tickets.filter(
                (t) =>
                  Date.now() - new Date(t.created_at).getTime() <
                  Number(period) * 86400000,
              ).length
            }{" "}
            requests created in the last {period} days
            <span>Live workspace data</span>
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-header">
            <div>
              <h2>
                Needs your attention{" "}
                <span className="count">
                  {
                    activeTickets.filter(
                      (t) => t.priority === "Critical" || t.escalated,
                    ).length
                  }
                </span>
              </h2>
              <p>A little focus goes a long way.</p>
            </div>
            <span className="attention-dot" />
          </div>
          <div className="attention-list">
            {activeTickets
              .filter((t) => t.priority === "Critical" || t.escalated)
              .slice(0, 3)
              .map((t) => (
                <button
                  className="attention-item"
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                >
                  <span className="attention-icon">
                    <AlertCircle size={17} />
                  </span>
                  <span>
                    <small>
                      {t.id} <span>· {t.org_name}</span>
                    </small>
                    <strong>{t.title}</strong>
                    <em className={sla(t).kind}>
                      {t.escalated ? "Escalated · " : ""}
                      {sla(t).label}
                    </em>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            {!activeTickets.some(
              (t) => t.priority === "Critical" || t.escalated,
            ) && (
              <div className="all-clear">
                <CheckCircle2 size={30} />
                <strong>All clear for now.</strong>
                <p>No critical requests need your attention.</p>
              </div>
            )}
          </div>
          <button
            className="panel-bottom-link"
            onClick={() => {
              go("tickets");
              setFilter("Active tickets");
            }}
          >
            View active tickets <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-header">
          <div>
            <h2>
              Recent support tickets{" "}
              <span className="count">{tickets.length}</span>
            </h2>
            <p>Every conversation, moving forward.</p>
          </div>
          <button className="text-btn" onClick={() => go("tickets")}>
            View all tickets <ArrowUpRight size={15} />
          </button>
        </div>
        {ticketTable(tickets.slice(0, 5), true)}
      </section>
      <div className="bottom-grid">
        <section className="panel onboarding-preview">
          <div className="panel-header">
            <div>
              <h2>Onboarding in motion</h2>
              <p>Set every client up for success.</p>
            </div>
            <button
              className="icon-btn"
              onClick={() => go("onboarding")}
              aria-label="View onboarding"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
          {onboarding
            .filter((o) => o.status !== "Active")
            .slice(0, 2)
            .map((o) => (
              <button
                className="mini-onboarding"
                key={o.id}
                onClick={() => go("onboarding")}
              >
                <span className="org-symbol">{o.org_name[0]}</span>
                <span>
                  <strong>{o.org_name}</strong>
                  <small>{o.status}</small>
                </span>
                <div className="mini-progress">
                  <span>
                    {Math.round(
                      (o.tasks.filter((t: Row) => t.completed).length /
                        o.tasks.length) *
                        100,
                    )}
                    %
                  </span>
                  <div className="progress-track">
                    <i
                      style={{
                        width: `${(o.tasks.filter((t: Row) => t.completed).length / o.tasks.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          {onboarding.every((o) => o.status === "Active") && (
            <div className="inline-empty">
              <CheckCircle2 size={18} />
              Your onboarding is complete. You’re ready to go.
            </div>
          )}
        </section>
        <section className="support-callout">
          <span className="callout-book">
            <BookOpen size={25} />
          </span>
          <div>
            <span className="eyebrow">ANSWERS, WITHOUT THE WAIT</span>
            <h2>
              A little knowledge.
              <br />A lot less friction.
            </h2>
            <p>Help your team find their next step.</p>
            <button className="text-btn" onClick={() => go("knowledge")}>
              Explore the knowledge base <ArrowRight size={16} />
            </button>
          </div>
          <div className="callout-decoration">✳</div>
        </section>
      </div>
    </>
  );
}
export function Tickets() {
  const {
    isClient,
    tickets,
    organizations,
    filtered,
    query,
    setQuery,
    filter,
    setFilter,
    priority,
    setPriority,
    org,
    setOrg,
    setDialog,
    ticketTable,
    Button,
  } = useContext(WorkspaceContext);
  const [pageIndex, setPageIndex] = useState(0);
  const count = Math.ceil(filtered.length / 8);
  useEffect(() => setPageIndex(0), [filter, priority, org, query]);
  return (
    <>
      <PageHeading
        title="Support tickets"
        subtitle="One shared queue. Every client conversation in context."
        actions={
          <>
            <Button onClick={() => csv("clientflow-tickets.csv", filtered)}>
              <Download size={16} />
              Export
            </Button>
            <Button kind="primary" onClick={() => setDialog("ticket")}>
              <Plus size={17} />
              New ticket
            </Button>
          </>
        }
      />
      <div className="tabs">
        {[
          "All tickets",
          "Active tickets",
          ...(!isClient ? ["My tickets"] : []),
          "Resolved",
          "Closed",
        ].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === "All tickets" && <span>{tickets.length}</span>}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="input-icon">
            <Search size={16} />
            <input
              aria-label="Search tickets"
              placeholder="Search by subject, ID, or organization…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>All priorities</option>
            {priorities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {!isClient && (
            <select
              aria-label="Filter organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
            >
              <option>All organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Filter status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "All tickets",
              "Active tickets",
              ...(!isClient ? ["My tickets"] : []),
              ...statuses,
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {ticketTable(filtered.slice(pageIndex * 8, pageIndex * 8 + 8))}
        <div className="table-footer">
          <span>
            Showing{" "}
            {filtered.length ? Math.min(pageIndex * 8 + 1, filtered.length) : 0}
            –{Math.min((pageIndex + 1) * 8, filtered.length)} of{" "}
            {filtered.length} tickets
          </span>
          <div>
            <button
              className="btn small"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
            >
              Previous
            </button>
            <span className="page-number">{pageIndex + 1}</span>
            <button
              className="btn small"
              disabled={pageIndex + 1 >= count}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  const {} = useContext(WorkspaceContext);
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">CLIENTFLOW WORKSPACE</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Onboarding() {
  const {
    isManager,
    onboarding,
    filter,
    org,
    setEdit,
    setDialog,
    busy,
    mutate,
    go,
    Button,
  } = useContext(WorkspaceContext);
  return (
    <>
      <PageHeading
        title="Client onboarding"
        subtitle="From first introduction to a confident go-live."
        actions={
          isManager ? (
            <Button kind="primary" onClick={() => setDialog("organization")}>
              <Plus size={17} />
              Add organization
            </Button>
          ) : undefined
        }
      />
      <div className="workflow-strip">
        {["Submitted", "In Review", "Approved", "Active"].map((s, i) => (
          <React.Fragment key={s}>
            <span>
              <i>{i + 1}</i>
              {s}
            </span>
            {i < 3 && <ChevronRight size={15} />}
          </React.Fragment>
        ))}
      </div>
      <div className="onboarding-grid">
        {onboarding.map((o) => {
          const done = o.tasks.filter((t: Row) => t.completed).length,
            pc = Math.round((done / o.tasks.length) * 100),
            locked = ["In Review", "Approved", "Active", "Rejected"].includes(
              o.status,
            );
          return (
            <section className="panel onboarding-card" key={o.id}>
              <div className="onboard-top">
                <span className="org-symbol big">{o.org_name[0]}</span>
                <div>
                  <h2>{o.org_name}</h2>
                  <small>
                    {o.industry} · {o.plan}
                  </small>
                </div>
                <Badge value={o.status} />
              </div>
              <div className="progress-header">
                <span>
                  {done} of {o.tasks.length} requirements complete
                </span>
                <strong>{pc}%</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${pc}%` }} />
              </div>
              <div className="task-list">
                {o.tasks.map((t: Row) => (
                  <label
                    className={`task ${t.completed ? "checked" : ""}`}
                    key={t.id}
                  >
                    <AsyncCheckbox
                      checked={t.completed}
                      disabled={locked || busy}
                      onCheckedChange={(completed) =>
                        mutate(
                          "/onboarding/" + o.id,
                          "PATCH",
                          { task_id: t.id, completed },
                          "Checklist updated",
                        )
                      }
                    />
                    <span>
                      <strong>{t.title}</strong>
                      <small>{t.description}</small>
                    </span>
                    {t.completed && <Check size={15} />}
                  </label>
                ))}
              </div>
              {o.note && (
                <div className="review-note">
                  <MessageSquare size={15} />
                  <p>{o.note}</p>
                </div>
              )}
              <div className="onboard-footer">
                <span>
                  <Avatar name={o.reviewer} size="small" />
                  Reviewer: {o.reviewer}
                </span>
                {["Submitted", "Information Requested"].includes(o.status) && (
                  <Button
                    kind="primary small"
                    disabled={pc !== 100}
                    onClick={() =>
                      mutate(
                        "/onboarding/" + o.id,
                        "PATCH",
                        { status: "In Review" },
                        "Submitted for review",
                      )
                    }
                  >
                    Submit for review
                    <ArrowRight size={14} />
                  </Button>
                )}
                {isManager && o.status === "In Review" && (
                  <Button
                    kind="primary small"
                    onClick={() => {
                      setEdit(o);
                      setDialog("review");
                    }}
                  >
                    Review submission
                    <ArrowRight size={14} />
                  </Button>
                )}
                {isManager && o.status === "Approved" && (
                  <Button
                    kind="primary small"
                    onClick={() =>
                      mutate(
                        "/onboarding/" + o.id,
                        "PATCH",
                        { status: "Active" },
                        "Client activated",
                      )
                    }
                  >
                    Activate client
                    <CheckCircle2 size={14} />
                  </Button>
                )}
                {o.status === "Active" && (
                  <span className="success">
                    <CheckCircle2 size={16} />
                    Ready for success
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
export function Knowledge() {
  const {
    isManager,
    articles,
    query,
    setQuery,
    filter,
    articleCategory,
    setArticleCategory,
    setEdit,
    setDialog,
    article,
    setArticle,
    Button,
  } = useContext(WorkspaceContext);
  const shown = articles.filter(
    (a) =>
      (articleCategory === "All articles" || a.category === articleCategory) &&
      (a.title + " " + a.summary + " " + a.body)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="A little knowledge goes a long way."
        subtitle="Practical answers, useful guides, and your next clear step."
        actions={
          isManager ? (
            <Button
              kind="primary"
              onClick={() => {
                setEdit(null);
                setDialog("article");
              }}
            >
              <Plus size={16} />
              Write article
            </Button>
          ) : undefined
        }
      />
      <div className="knowledge-hero">
        <BookOpen size={36} />
        <div>
          <h2>How can we help you move forward?</h2>
          <div className="input-icon">
            <Search size={18} />
            <input
              aria-label="Search knowledge base"
              placeholder="Search guides, troubleshooting, and more…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <span className="hero-star">✳</span>
      </div>
      <div className="chip-row">
        {["All articles", ...new Set(articles.map((a) => a.category))].map(
          (c) => (
            <button
              key={c}
              className={`chip ${articleCategory === c ? "active" : ""}`}
              onClick={() => setArticleCategory(c)}
            >
              {c}
            </button>
          ),
        )}
      </div>
      <div className="article-grid">
        {shown.map((a) => (
          <button
            className="panel article-card"
            key={a.id}
            onClick={() => setArticle(a)}
          >
            <div>
              <span className="article-icon">
                <FileText size={21} />
              </span>
              <span className="article-category">{a.category}</span>
              {a.status === "Archived" && <Badge value="Archived" />}
            </div>
            <h2>{a.title}</h2>
            <p>{a.summary}</p>
            <footer>
              <span>
                {Math.max(1, Math.ceil(a.body.length / 800))} min read
              </span>
              <ArrowUpRight size={18} />
            </footer>
          </button>
        ))}
      </div>
      {!shown.length && (
        <Empty
          title="No articles found"
          text="Try a different search or browse another category."
        />
      )}
      <div className="help-banner">
        <LifeBuoy size={24} />
        <div>
          <h3>Still need a hand?</h3>
          <p>Your support team is one conversation away.</p>
        </div>
        <Button onClick={() => setDialog("ticket")}>
          Create a support ticket
          <ArrowRight size={15} />
        </Button>
      </div>
    </>
  );
}
export function Sla() {
  const {
    data,
    isManager,
    tickets,
    activeTickets,
    priority,
    setEdit,
    setDialog,
    mutate,
    ticketTable,
    Button,
  } = useContext(WorkspaceContext);
  const atRisk = [...activeTickets].sort((a, b) =>
    a.due_at.localeCompare(b.due_at),
  );
  return (
    <>
      <PageHeading
        title="SLA & escalations"
        subtitle="Keep your commitments in view, and stay ahead of the clock."
        actions={
          isManager ? (
            <Button
              onClick={() =>
                mutate("/sla/sweep", "POST", undefined, "SLA check completed")
              }
            >
              <RefreshCw size={16} />
              Run SLA check
            </Button>
          ) : undefined
        }
      />
      <div className="info-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>Proactive by design.</strong> Active tickets are checked every
          minute. A missed first response or resolution deadline triggers one
          escalation.
        </div>
        <span className="live-label">
          <span className="live-dot" />
          Engine active
        </span>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Service level policies</h2>
            <p>
              Elapsed-time targets applied when a ticket is created or its
              priority changes.
            </p>
          </div>
          <span className="subtle">Demo service commitments</span>
        </div>
        <div className="policy-grid">
          {data?.policies.map((p: Row) => (
            <div className="policy-card" key={p.priority}>
              <Badge value={p.priority} type="priority" />
              <div>
                <span>First response</span>
                <strong>
                  {p.response_minutes < 60
                    ? `${p.response_minutes}m`
                    : `${p.response_minutes / 60}h`}
                </strong>
              </div>
              <div>
                <span>Resolution target</span>
                <strong>{p.resolution_hours}h</strong>
              </div>
              {isManager && (
                <button
                  className="text-btn"
                  onClick={() => {
                    setEdit(p);
                    setDialog("policy");
                  }}
                >
                  Edit policy
                  <SlidersHorizontal size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="panel section-gap">
        <div className="panel-header">
          <div>
            <h2>
              Active SLA monitor <span className="count">{atRisk.length}</span>
            </h2>
            <p>Ordered by resolution deadline, soonest first.</p>
          </div>
        </div>
        {ticketTable(atRisk)}
      </section>
    </>
  );
}
export function Analytics() {
  const {
    data,
    tickets,
    organizations,
    users,
    metrics,
    activeTickets,
    filter,
    org,
    statCards,
    Button,
  } = useContext(WorkspaceContext);
  const byStatus = statuses
    .map((s) => ({
      status: s,
      count: tickets.filter((t) => t.status === s).length,
    }))
    .filter((s) => s.count);
  const workload = users
    .filter((u) => ["ENGINEER", "MANAGER"].includes(u.role))
    .map((u) => ({
      name: u.name.split(" ")[0],
      active: activeTickets.filter((t) => t.assignee_id === u.id).length,
      resolved: tickets.filter((t) => t.assignee_id === u.id && complete(t))
        .length,
    }));
  return (
    <>
      <PageHeading
        title="Analytics & reports"
        subtitle="A shared understanding of your service performance."
        actions={
          <Button onClick={() => csv("clientflow-performance.csv", [metrics])}>
            <Download size={16} />
            Export report
          </Button>
        }
      />
      {statCards()}
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Requests by status</h2>
              <p>Current distribution across all organizations.</p>
            </div>
          </div>
          <div className="chart-wrap tall">
            <React.Suspense
              fallback={<div className="chart-loading">Loading chart…</div>}
            >
              <StatusChart data={byStatus} />
            </React.Suspense>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Team workload</h2>
              <p>Active requests and completed work by assignee.</p>
            </div>
          </div>
          <div className="chart-wrap tall">
            <React.Suspense
              fallback={<div className="chart-loading">Loading chart…</div>}
            >
              <WorkloadChart data={workload} />
            </React.Suspense>
          </div>
        </section>
      </div>
      <section className="panel section-gap">
        <div className="panel-header">
          <div>
            <h2>Organization performance</h2>
            <p>See where your clients need the most support.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Total requests</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Escalations</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => {
                const ts = tickets.filter((t) => t.org_id === o.id);
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="org-cell">
                        <span className="org-symbol">{o.name[0]}</span>
                        <strong>{o.name}</strong>
                      </span>
                    </td>
                    <td>{ts.length}</td>
                    <td>{ts.filter((t) => !complete(t)).length}</td>
                    <td>{ts.filter(complete).length}</td>
                    <td>
                      {ts.filter((t) => t.escalated && !complete(t)).length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="metric-note">
        <Target size={17} />
        <p>
          <strong>How we measure:</strong> Open tickets include all unresolved
          states. SLA compliance is the percentage of completed tickets resolved
          by their resolution deadline. Average first response uses tickets with
          a recorded first staff response. Unanswered requests are excluded from
          that average.
        </p>
      </div>
    </>
  );
}
export function Organizations() {
  const {
    isManager,
    tickets,
    organizations,
    onboarding,
    metrics,
    filter,
    org,
    setOrg,
    setDialog,
    go,
    Button,
  } = useContext(WorkspaceContext);
  return (
    <>
      <PageHeading
        title="Organizations"
        subtitle="The people and partnerships at the heart of your workspace."
        actions={
          isManager ? (
            <Button kind="primary" onClick={() => setDialog("organization")}>
              <Plus size={16} />
              Add organization
            </Button>
          ) : undefined
        }
      />
      <div className="org-grid">
        {organizations.map((o) => {
          const ts = tickets.filter((t) => t.org_id === o.id),
            on = onboarding.find((b) => b.org_id === o.id);
          return (
            <section className="panel org-card" key={o.id}>
              <div className="org-card-top">
                <span className="org-symbol big">{o.name[0]}</span>
                <Badge value={o.status} />
              </div>
              <h2>{o.name}</h2>
              <p>{o.industry}</p>
              <span className="plan-badge">
                <Zap size={12} />
                {o.plan} plan
              </span>
              <div className="org-contact">
                <Mail size={14} />
                {o.contact}
              </div>
              <div className="org-metrics">
                <span>
                  <strong>{ts.filter((t) => !complete(t)).length}</strong>Active
                  tickets
                </span>
                <span>
                  <strong>
                    {on
                      ? Math.round(
                          (on.tasks.filter((t: Row) => t.completed).length /
                            on.tasks.length) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                  Onboarded
                </span>
              </div>
              <button
                className="panel-bottom-link"
                onClick={() => {
                  go("tickets");
                  setOrg(o.id);
                }}
              >
                View support requests
                <ArrowRight size={15} />
              </button>
            </section>
          );
        })}
      </div>
    </>
  );
}
export function Documents() {
  const { onboarding, documents, setDialog, Button } =
    useContext(WorkspaceContext);
  return (
    <>
      <PageHeading
        title="Documents"
        subtitle="A secure home for onboarding files and support attachments."
        actions={
          <Button kind="primary" onClick={() => setDialog("document")}>
            <Upload size={16} />
            Upload document
          </Button>
        }
      />
      <div className="info-banner">
        <Lock size={18} />
        <div>
          Documents are private to their organization and authorized staff.
          Files up to 5 MB: PDF, TXT, CSV, PNG, and JPEG.
        </div>
      </div>
      <section className="panel">
        {documents.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Document name</th>
                  <th>Organization</th>
                  <th>Uploaded by</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="file-cell">
                        <FileText size={20} />
                        <strong>{d.name}</strong>
                        {d.ticket_id && (
                          <span className="muted">{d.ticket_id}</span>
                        )}
                      </span>
                    </td>
                    <td>{d.org_name}</td>
                    <td>{d.uploaded_by}</td>
                    <td>{(d.size_bytes / 1024).toFixed(1)} KB</td>
                    <td>{fullDate(d.created_at)}</td>
                    <td>
                      <a
                        className="icon-btn"
                        href={"/api/v1/documents/" + d.id + "/download"}
                        aria-label={"Download " + d.name}
                      >
                        <Download size={17} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your documents, organized."
            text="Upload a security questionnaire, business document, or support attachment to get started."
            action={
              <Button onClick={() => setDialog("document")}>
                <Upload size={16} />
                Upload your first document
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}
export function Team() {
  const { user, isAdmin, organizations, users, activeTickets, filter, mutate } =
    useContext(WorkspaceContext);
  return (
    <>
      <PageHeading
        title="Your people. One shared purpose."
        subtitle="The team keeping your client experiences moving."
      />
      <div className="team-grid">
        {users.map((u) => (
          <section className="panel team-card" key={u.id}>
            <Avatar name={u.name} size="large" />
            <h2>{u.name}</h2>
            <p>{u.email}</p>
            <span className="role-tag">
              {u.role
                .replace("ENGINEER", "Support engineer")
                .replace("MANAGER", "Team manager")
                .replace("ADMIN", "Administrator")
                .replace("CLIENT", "Client")}
            </span>
            <small>
              {u.team || organizations.find((o) => o.id === u.org_id)?.name}
            </small>
            <div className="team-count">
              <Ticket size={15} />
              {activeTickets.filter((t) => t.assignee_id === u.id).length}{" "}
              active assignments
            </div>
            {isAdmin && u.id !== user.id && u.role !== "CLIENT" && (
              <select
                aria-label={"Role for " + u.name}
                value={u.role}
                onChange={(e) =>
                  mutate(
                    "/users/" + u.id,
                    "PATCH",
                    { role: e.target.value },
                    "User access updated",
                  )
                }
              >
                <option value="ENGINEER">Support engineer</option>
                <option value="MANAGER">Team manager</option>
                <option value="ADMIN">Administrator</option>
              </select>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
export function Audit() {
  const { data, query, setQuery, filter, detail, Button } =
    useContext(WorkspaceContext);
  const rows = (data?.audit || []).filter((a: Row) =>
    (a.actor + " " + a.action + " " + a.resource_id)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Audit log"
        subtitle="A clear, append-only record of the actions that matter."
        actions={
          <Button onClick={() => csv("clientflow-audit.csv", rows)}>
            <Download size={16} />
            Export log
          </Button>
        }
      />
      <section className="panel">
        <div className="filter-bar">
          <div className="input-icon">
            <Search size={16} />
            <input
              aria-label="Search audit log"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, action, or resource…"
            />
          </div>
          <span className="subtle">Latest 200 workspace events</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a: Row) => (
                <tr key={a.id}>
                  <td>
                    <span className="assignee">
                      <Avatar name={a.actor} size="small" />
                      {a.actor}
                    </span>
                  </td>
                  <td>{a.action}</td>
                  <td>
                    <code>{a.resource_id}</code>
                  </td>
                  <td className="audit-detail">{a.detail || "—"}</td>
                  <td className="nowrap">{fullDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="No matching events"
            text="Try another actor, action, or resource."
          />
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const {
    user,
    organizations,
    notifications,
    prefs,
    setPrefs,
    detail,
    busy,
    mutate,
    go,
    logout,
    Button,
  } = useContext(WorkspaceContext);
  const [health, setHealth] = useState("Checking…");
  useEffect(() => {
    fetch("/actuator/health")
      .then((r) => r.json())
      .then((h) =>
        setHealth(h.status === "UP" ? "Operational" : "Needs attention"),
      )
      .catch(() => setHealth("Unavailable"));
  }, []);
  return (
    <>
      <PageHeading
        title="Workspace settings"
        subtitle="Make yourself at home, and keep your workspace in shape."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Your profile</h2>
              <p>Your identity and access in ClientFlow.</p>
            </div>
          </div>
          <div className="settings-body">
            <div className="profile-block">
              <Avatar name={user.name} size="large" />
              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="profile-detail">
              <span>Workspace role</span>
              <strong>{user.role}</strong>
            </div>
            <div className="profile-detail">
              <span>Team / organization</span>
              <strong>{user.team || organizations[0]?.name}</strong>
            </div>
            <div className="profile-detail">
              <span>Session</span>
              <span className="success">
                <ShieldCheck size={15} />
                Authenticated · HTTP-only cookie
              </span>
            </div>
            <Button onClick={logout}>
              <LogOut size={16} />
              Sign out
            </Button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Notification preferences</h2>
              <p>Choose what you see in your notification center.</p>
            </div>
          </div>
          <div className="settings-body">
            {[
              {
                key: "show_ticket_updates",
                label: "Ticket updates",
                desc: "Assignments, replies, and changes in status.",
              },
              {
                key: "show_sla_alerts",
                label: "SLA alerts",
                desc: "Escalations that need your attention.",
              },
              {
                key: "show_onboarding",
                label: "Onboarding updates",
                desc: "Review decisions and go-live milestones.",
              },
            ].map((p) => (
              <label className="pref-row" key={p.key}>
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.desc}</small>
                </span>
                <AsyncCheckbox
                  checked={prefs[p.key] !== false}
                  disabled={busy}
                  onCheckedChange={async (value) => {
                    const result = await mutate(
                      "/preferences",
                      "PUT",
                      { ...prefs, [p.key]: value },
                      "Preferences saved",
                    );
                    if (result) setPrefs((v) => ({ ...v, [p.key]: value }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>System & integrations</h2>
              <p>Local demo environment.</p>
            </div>
          </div>
          <div className="settings-body">
            <div className="integration">
              <span className="integration-icon">
                <Activity size={22} />
              </span>
              <div>
                <strong>Application health</strong>
                <small>Spring Boot / REST API / database</small>
              </div>
              <Badge value={health} />
            </div>
            <div className="integration">
              <span className="integration-icon">
                <Bell size={22} />
              </span>
              <div>
                <strong>In-app notifications</strong>
                <small>Refreshed every 15 seconds</small>
              </div>
              <Badge value="Active" />
            </div>
            <div className="integration">
              <span className="integration-icon">
                <Mail size={22} />
              </span>
              <div>
                <strong>Email & external identity</strong>
                <small>Not connected in the local demo</small>
              </div>
              <span className="muted">Not configured</span>
            </div>
            <a
              className="btn"
              href="http://127.0.0.1:8080/swagger-ui/index.html"
              target="_blank"
              rel="noreferrer"
            >
              Explore API documentation
              <ExternalLink size={15} />
            </a>
          </div>
        </section>
        <section className="settings-note">
          <Shield size={30} />
          <h2>Built to demonstrate the whole journey.</h2>
          <p>
            Use the four demo accounts to move from client request to
            engineering resolution and management oversight. Every change
            persists in the local database.
          </p>
          <p className="muted">
            Demo service targets are illustrative. Production OIDC, email
            delivery, and private object storage require deployment
            configuration.
          </p>
        </section>
      </div>
    </>
  );
}
