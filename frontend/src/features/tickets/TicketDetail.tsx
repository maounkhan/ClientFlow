import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Upload,
} from "lucide-react";
import { useContext, useState } from "react";
import { fullDate, relative, Row, sla } from "../../api";
import { priorities, transitions } from "../../app/constants";
import { WorkspaceContext } from "../../app/WorkspaceContext";
import { Avatar, Badge } from "../../components/ui";
export function TicketDetail() {
  const {
    isClient,
    isManager,
    tickets,
    users,
    documents,
    setQuery,
    filter,
    priority,
    setEdit,
    setDialog,
    detail,
    article,
    busy,
    mutate,
    go,
  } = useContext(WorkspaceContext);
  const [reply, setReply] = useState(""),
    [internal, setInternal] = useState(false),
    [tab, setTab] = useState("Conversation"),
    [next, setNext] = useState(""),
    [resolution, setResolution] = useState("");
  if (!detail)
    return (
      <div className="page-loading">
        <Loader2 className="spin" />
        Loading request…
      </div>
    );
  const t = detail;
  const options = isClient
    ? ["Resolved", "Closed"].includes(t.status)
      ? t.status === "Resolved"
        ? ["Closed", "Reopened"]
        : ["Reopened"]
      : []
    : transitions[t.status] || [];
  return (
    <>
      <button className="back-link" onClick={() => go("tickets")}>
        ← Back to support tickets
      </button>
      <div className="ticket-detail-heading">
        <div>
          <div className="ticket-ref">
            <span>{t.id}</span>
            <Badge value={t.status} />
            <Badge value={t.priority} type="priority" />
          </div>
          <h1>{t.title}</h1>
          <p>
            Opened by {t.requester_name} · {t.org_name} ·{" "}
            {fullDate(t.created_at)}
          </p>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel">
            <div className="panel-header">
              <h2>Request details</h2>
              <span className="article-category">{t.category}</span>
            </div>
            <div className="description">{t.description}</div>
            {t.resolution && (
              <div className="resolution-box">
                <CheckCircle2 size={19} />
                <div>
                  <strong>Resolution summary</strong>
                  <p>{t.resolution}</p>
                </div>
              </div>
            )}
            {t.documents?.length > 0 && (
              <div className="attachment-list">
                {t.documents.map((d: Row) => (
                  <a
                    key={d.id}
                    href={"/api/v1/documents/" + d.id + "/download"}
                  >
                    <FileText size={16} />
                    {d.name}
                    <Download size={14} />
                  </a>
                ))}
              </div>
            )}
          </section>
          <section className="panel section-gap">
            <div className="tabs inset">
              {["Conversation", "Activity"].map((a) => (
                <button
                  key={a}
                  className={tab === a ? "active" : ""}
                  onClick={() => setTab(a)}
                >
                  {a} {a === "Conversation" && <span>{t.comments.length}</span>}
                </button>
              ))}
            </div>
            {tab === "Conversation" ? (
              <>
                <div className="conversation">
                  {t.comments.length ? (
                    t.comments.map((c: Row) => (
                      <div
                        key={c.id}
                        className={`comment ${c.internal_note ? "internal" : ""}`}
                      >
                        <Avatar name={c.actor_name} />
                        <div>
                          <div className="comment-meta">
                            <strong>{c.actor_name}</strong>
                            {c.internal_note ? (
                              <span>
                                <Lock size={11} />
                                Internal note
                              </span>
                            ) : (
                              <small>
                                {c.actor_role === "CLIENT"
                                  ? "Client"
                                  : "Support team"}
                              </small>
                            )}
                            <time>{relative(c.created_at)}</time>
                          </div>
                          <p>{c.body}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="inline-empty">
                      <MessageSquare size={18} />
                      Start the conversation. Your support team is listening.
                    </div>
                  )}
                </div>
                <form
                  className="reply-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await mutate(
                        "/tickets/" + t.id + "/comments",
                        "POST",
                        { body: reply, internal_note: internal },
                        internal ? "Internal note added" : "Reply sent",
                      )
                    )
                      setReply("");
                  }}
                >
                  {!isClient && (
                    <div className="reply-type">
                      <button
                        type="button"
                        className={!internal ? "active" : ""}
                        onClick={() => setInternal(false)}
                      >
                        <MessageSquare size={13} />
                        Public reply
                      </button>
                      <button
                        type="button"
                        className={internal ? "active internal-toggle" : ""}
                        onClick={() => setInternal(true)}
                      >
                        <Lock size={13} />
                        Internal note
                      </button>
                    </div>
                  )}
                  <textarea
                    aria-label={internal ? "Internal note" : "Reply message"}
                    placeholder={
                      internal
                        ? "Add a private note for your team…"
                        : "Write a reply…"
                    }
                    rows={4}
                    value={reply}
                    maxLength={10000}
                    required
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="reply-footer">
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setEdit({ org_id: t.org_id, ticket_id: t.id });
                        setDialog("document");
                      }}
                    >
                      <Upload size={14} />
                      Attach a file
                    </button>
                    <span>
                      {internal
                        ? "Only visible to staff"
                        : "Visible to client and support team"}
                    </span>
                    <button
                      className="btn primary small"
                      disabled={busy || !reply.trim()}
                    >
                      <Send size={14} />
                      {internal ? "Add note" : "Send reply"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="activity-timeline">
                {t.events.map((ev: Row) => (
                  <div key={ev.id}>
                    <span className="event-dot" />
                    <p>
                      <strong>{ev.action}</strong>
                      <small>
                        {ev.actor} · {fullDate(ev.created_at)}
                      </small>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside>
          <section className="panel ticket-properties">
            <div className="panel-header">
              <h2>Ticket properties</h2>
            </div>
            <div className="property">
              <span>Organization</span>
              <strong>
                <Building2 size={15} />
                {t.org_name}
              </strong>
            </div>
            <div className="property">
              <span>Assignee</span>
              {isManager ? (
                <select
                  aria-label="Ticket assignee"
                  value={t.assignee_id || ""}
                  disabled={busy}
                  onChange={(e) =>
                    mutate(
                      "/tickets/" + t.id,
                      "PATCH",
                      { assignee_id: e.target.value },
                      "Assignment updated",
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter((u) => u.role !== "CLIENT")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              ) : (
                <strong>{t.assignee_name || "Unassigned"}</strong>
              )}
            </div>
            <div className="property">
              <span>Priority</span>
              {!isClient ? (
                <select
                  aria-label="Ticket priority"
                  value={t.priority}
                  disabled={busy}
                  onChange={(e) =>
                    mutate(
                      "/tickets/" + t.id,
                      "PATCH",
                      { priority: e.target.value },
                      "Priority updated",
                    )
                  }
                >
                  {priorities.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <Badge value={t.priority} type="priority" />
              )}
            </div>
            <div className="property">
              <span>Resolution deadline</span>
              <strong className={`sla-label ${sla(t).kind}`}>
                <Clock size={14} />
                {sla(t).label}
              </strong>
              <small>{fullDate(t.due_at)}</small>
            </div>
            <div className="property">
              <span>First response</span>
              <strong>
                {t.first_response_at
                  ? fullDate(t.first_response_at)
                  : "Awaiting response"}
              </strong>
              <small>Target: {fullDate(t.response_due_at)}</small>
            </div>
            <div className="property">
              <span>Last updated</span>
              <strong>{fullDate(t.updated_at)}</strong>
            </div>
          </section>
          {options.length > 0 && (
            <section className="panel section-gap status-actions">
              <h2>Move this forward</h2>
              <p>
                {isClient
                  ? "Confirm the resolution or let us know you need more help."
                  : "Update the next step for this request."}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate(
                      "/tickets/" + t.id,
                      "PATCH",
                      { status: next, resolution },
                      "Ticket updated",
                    )
                  ) {
                    setNext("");
                    setResolution("");
                  }
                }}
              >
                <select
                  aria-label="Next ticket status"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                >
                  <option value="">Choose next status</option>
                  {options.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {next === "Resolved" && (
                  <textarea
                    aria-label="Resolution summary"
                    placeholder="Describe the resolution…"
                    rows={4}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    required
                    maxLength={5000}
                  />
                )}
                <button className="btn primary" disabled={busy || !next}>
                  Update status
                  <ArrowRight size={15} />
                </button>
              </form>
            </section>
          )}
          <section className="related-help">
            <BookOpen size={20} />
            <h3>A helpful starting point</h3>
            <p>Find relevant guidance in the knowledge base.</p>
            <button
              className="text-btn"
              onClick={() => {
                go("knowledge");
                setQuery(t.category);
              }}
            >
              Browse guides
              <ArrowUpRight size={14} />
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}
