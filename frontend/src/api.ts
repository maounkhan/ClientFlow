export type Row = Record<string, any>;
let csrf = "";
export async function initCsrf() {
  const r = await fetch("/api/v1/auth/csrf");
  if (!r.ok)
    throw new Error(
      "Cannot connect to ClientFlow. Check that the server is running.",
    );
  csrf = (await r.json()).token;
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  if (method !== "GET" && !csrf) await initCsrf();
  const form = body instanceof FormData;
  const r = await fetch("/api/v1" + path, {
    method,
    headers: {
      ...(method !== "GET" ? { "X-CSRF-TOKEN": csrf } : {}),
      ...(!form && body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: form ? (body as FormData) : JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    let message = "Request failed. Please try again.";
    try {
      message = (await r.json()).message || message;
    } catch {}
    if (r.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(message);
  }
  return r.status === 204 || r.headers.get("content-length") === "0"
    ? null
    : r.text().then((t) => (t ? JSON.parse(t) : null));
}
export const fullDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export function relative(value: string) {
  const m = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  return m < 1
    ? "Just now"
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
}
export const initials = (name: string = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
export const complete = (t: Row) => ["Resolved", "Closed"].includes(t.status);
export function sla(t: Row) {
  if (complete(t)) return { label: "Completed", kind: "muted" };
  const mins = Math.round((new Date(t.due_at).getTime() - Date.now()) / 60000);
  return mins < 0
    ? {
        label: `${Math.abs(Math.floor(mins / 60))}h ${Math.abs(mins % 60)}m overdue`,
        kind: "danger",
      }
    : mins < 120
      ? {
          label: `${Math.floor(mins / 60)}h ${mins % 60}m remaining`,
          kind: "warning",
        }
      : {
          label: `${Math.floor(mins / 60)}h ${mins % 60}m remaining`,
          kind: "success",
        };
}
export function csv(name: string, rows: Row[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const blob = new Blob(
    [
      "\uFEFF" +
        [
          cols.map(escape).join(","),
          ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
        ].join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
