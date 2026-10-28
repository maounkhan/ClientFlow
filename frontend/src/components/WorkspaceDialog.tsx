import { ClipboardCheck, Clock, Loader2, Plus, Upload } from "lucide-react";
import React, { useContext, useState } from "react";
import { Row } from "../api";
import { categories, priorities } from "../app/constants";
import { WorkspaceContext } from "../app/WorkspaceContext";
import { Field, Modal } from "../components/ui";
export function DialogContent() {
  const {
    user,
    isClient,
    tickets,
    organizations,
    articles,
    onboarding,
    documents,
    priority,
    edit,
    dialog,
    article,
    busy,
    mutate,
    openTicket,
    closeDialog,
  } = useContext(WorkspaceContext);
  const [values, setValues] = useState<Row>(
      dialog === "review"
        ? { ...edit, status: "Approved", note: "" }
        : edit || {
            priority: "Medium",
            category: "Other",
            org_id: isClient ? user.org_id : organizations[0]?.id,
            plan: "Growth",
            status: "Approved",
          },
    ),
    [file, setFile] = useState<File | null>(null),
    [err, setErr] = useState("");
  const update = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    let path = "",
      method = "POST",
      body: unknown = values,
      message = "Changes saved";
    if (dialog === "ticket") {
      path = "/tickets";
      message = "Support request created";
    }
    if (dialog === "organization") {
      path = "/organizations";
      message = "Organization created";
    }
    if (dialog === "policy") {
      path = "/sla-policies/" + edit?.priority;
      method = "PUT";
      message = "SLA policy updated for future requests";
    }
    if (dialog === "review") {
      path = "/onboarding/" + edit?.id;
      method = "PATCH";
      message = "Onboarding review saved";
    }
    if (dialog === "article") {
      path = "/articles" + (edit ? "/" + edit.id : "");
      method = edit ? "PATCH" : "POST";
      message = edit ? "Article updated" : "Article published";
    }
    if (dialog === "document") {
      if (!file) {
        setErr("Choose a file to upload.");
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("org_id", values.org_id);
      if (edit?.ticket_id) form.append("ticket_id", edit.ticket_id);
      body = form;
      path = "/documents";
      message = "Document uploaded";
    }
    const result = await mutate(path, method, body, message);
    if (result) {
      closeDialog();
      if (dialog === "ticket" && result.id) openTicket(result.id);
    }
  }
  const titles: Record<string, string> = {
    ticket: "Create a support ticket",
    organization: "Add an organization",
    policy: "Edit " + edit?.priority + " SLA policy",
    review: "Review " + edit?.org_name,
    article: edit ? "Edit knowledge article" : "Share what you know",
    document: "Upload a document",
  };
  return (
    <Modal
      title={titles[dialog!]}
      subtitle={
        dialog === "ticket"
          ? "Give your support team the context to get things moving."
          : dialog === "document"
            ? "Securely stored and restricted to the selected organization."
            : undefined
      }
      onClose={closeDialog}
      wide={dialog === "article"}
    >
      <form onSubmit={submit} className="modal-form">
        {dialog === "ticket" && (
          <>
            <Field label="Subject">
              <input
                autoFocus
                value={values.title || ""}
                onChange={(e) => update("title", e.target.value)}
                placeholder="A short, clear summary of your request"
                required
                maxLength={200}
              />
            </Field>
            {!isClient && (
              <Field label="Organization">
                <select
                  value={values.org_id}
                  onChange={(e) => update("org_id", e.target.value)}
                  required
                >
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-row">
              <Field label="Category">
                <select
                  value={values.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={values.priority}
                  onChange={(e) => update("priority", e.target.value)}
                >
                  {priorities.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Description"
              hint="Include impact, steps to reproduce, and any relevant error messages. Never share passwords or secrets."
            >
              <textarea
                rows={6}
                required
                maxLength={10000}
                value={values.description || ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Tell us what happened and how we can help…"
              />
            </Field>
          </>
        )}
        {dialog === "organization" && (
          <>
            <Field label="Organization name">
              <input
                autoFocus
                required
                maxLength={150}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Acme Industries"
              />
            </Field>
            <Field label="Industry">
              <input
                required
                maxLength={100}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="e.g. Technology"
              />
            </Field>
            <Field label="Primary contact email">
              <input
                type="email"
                required
                maxLength={150}
                onChange={(e) => update("contact", e.target.value)}
              />
            </Field>
            <Field label="Service plan">
              <select
                value={values.plan}
                onChange={(e) => update("plan", e.target.value)}
              >
                <option>Growth</option>
                <option>Enterprise</option>
              </select>
            </Field>
            <div className="info-banner">
              <ClipboardCheck size={18} />
              <span>
                A five-step onboarding checklist will be created automatically.
              </span>
            </div>
          </>
        )}
        {dialog === "policy" && (
          <>
            <div className="info-banner">
              <Clock size={18} />
              <span>
                Updates apply to new requests and priority changes. Existing
                deadlines are preserved.
              </span>
            </div>
            <Field label="First response target (minutes)">
              <input
                type="number"
                min="1"
                max="10080"
                step="1"
                required
                value={values.response_minutes}
                onChange={(e) =>
                  update("response_minutes", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Resolution target (hours)">
              <input
                type="number"
                min="1"
                max="720"
                step="1"
                required
                value={values.resolution_hours}
                onChange={(e) =>
                  update("resolution_hours", Number(e.target.value))
                }
              />
            </Field>
          </>
        )}
        {dialog === "review" && (
          <>
            <Field label="Review decision">
              <select
                value={
                  values.status === "In Review" ? "Approved" : values.status
                }
                onChange={(e) => update("status", e.target.value)}
              >
                <option>Approved</option>
                <option>Information Requested</option>
                <option>Rejected</option>
              </select>
            </Field>
            <Field label="Review note">
              <textarea
                rows={4}
                required={
                  values.status === "Information Requested" ||
                  values.status === "Rejected"
                }
                maxLength={3000}
                value={values.note || ""}
                onChange={(e) => update("note", e.target.value)}
                placeholder="Add feedback or explain the information needed…"
              />
            </Field>
          </>
        )}
        {dialog === "article" && (
          <>
            <Field label="Article title">
              <input
                required
                maxLength={200}
                value={values.title || ""}
                onChange={(e) => update("title", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <input
                required
                maxLength={60}
                value={values.category || ""}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Getting started"
              />
            </Field>
            <Field label="Short description">
              <input
                required
                maxLength={400}
                value={values.summary || ""}
                onChange={(e) => update("summary", e.target.value)}
              />
            </Field>
            <Field
              label="Article content"
              hint="Use plain text, with blank lines between sections."
            >
              <textarea
                rows={12}
                required
                maxLength={20000}
                value={values.body || ""}
                onChange={(e) => update("body", e.target.value)}
              />
            </Field>
          </>
        )}
        {dialog === "document" && (
          <>
            <Field label="Organization">
              <select
                disabled={!!edit?.ticket_id || isClient}
                required
                value={values.org_id}
                onChange={(e) => update("org_id", e.target.value)}
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="upload-zone">
              <Upload size={30} />
              <strong>{file ? file.name : "Choose a document"}</strong>
              <span>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : "PDF, TXT, CSV, PNG, JPG · Up to 5 MB"}
              </span>
              <input
                aria-label="Choose document"
                type="file"
                required
                accept=".pdf,.txt,.csv,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected && selected.size > 5 * 1024 * 1024) {
                    setErr("File must be 5 MB or smaller.");
                    setFile(null);
                  } else {
                    setFile(selected || null);
                    setErr("");
                  }
                }}
              />
            </label>
            {err && (
              <div className="form-error" role="alert">
                {err}
              </div>
            )}
          </>
        )}
        <div className="modal-footer">
          <button type="button" className="btn" onClick={closeDialog}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy || (dialog === "document" && !file)}
          >
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : dialog === "ticket" ? (
              <>
                <Plus size={16} />
                Create ticket
              </>
            ) : dialog === "article" ? (
              edit ? (
                "Save article"
              ) : (
                "Publish article"
              )
            ) : dialog === "document" ? (
              <>
                <Upload size={16} />
                Upload document
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
