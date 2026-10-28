import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CornerDownRight,
  Loader2,
  Shield,
  Ticket,
} from "lucide-react";
import React, { useState } from "react";
import { api, initCsrf, Row } from "../../api";
import { personas } from "../../app/constants";
import { Field } from "../../components/ui";
export function Login({ onLogin }: { onLogin: (u: Row) => void }) {
  const [selected, setSelected] = useState(0),
    [email, setEmail] = useState(personas[0].email),
    [password, setPassword] = useState("DemoFlow!2026"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await initCsrf();
      onLogin(await api("/auth/login", "POST", { email, password }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <CornerDownRight size={25} />
          </span>
          ClientFlow<span className="brand-dot">®</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow light">
            CONNECTED TEAMS. EXCEPTIONAL SERVICE.
          </span>
          <h1>
            Great client experiences
            <br />
            start with <em>flow.</em>
          </h1>
          <p>
            One workspace to onboard clients, solve problems,
            <br />
            and keep every commitment.
          </p>
          <div className="flow-visual">
            <div className="flow-line" />
            <div className="flow-card">
              <span className="flow-icon">
                <Building2 size={23} />
              </span>
              <div>
                <small>NEW CLIENT</small>
                <strong>Northstar Labs</strong>
                <span>Enterprise onboarding</span>
              </div>
              <CheckCircle2 className="flow-check" size={20} />
            </div>
            <div className="flow-card second">
              <span className="flow-icon lime">
                <Ticket size={23} />
              </span>
              <div>
                <small>SUPPORT, IN SYNC</small>
                <strong>Every request. One clear path.</strong>
                <span>Assigned → In progress → Resolved</span>
              </div>
            </div>
            <div className="flow-mini">
              <span className="live-dot" />
              Your next great client relationship starts here.
            </div>
          </div>
        </div>
        <footer>
          BUILT FOR THE WAY YOUR TEAM WORKS <span>ClientFlow / 2026</span>
        </footer>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="demo-pill">
            <span className="live-dot" />
            INTERACTIVE DEMO
          </span>
          <h2>Your workspace awaits.</h2>
          <p className="subtle">Choose a perspective and explore ClientFlow.</p>
          <div className="persona-grid">
            {personas.map((p, i) => (
              <button
                key={p.email}
                className={`persona ${selected === i ? "selected" : ""}`}
                onClick={() => {
                  setSelected(i);
                  setEmail(p.email);
                  setPassword("DemoFlow!2026");
                }}
              >
                <p.icon size={21} />
                <strong>{p.role}</strong>
                <small>{p.name}</small>
                {selected === i && (
                  <CheckCircle2 className="persona-check" size={15} />
                )}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <Field label="Email address">
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && (
              <div className="form-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button className="btn primary login-submit" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <>
                  Enter workspace <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-note">
            <Shield size={16} />
            <span>
              Fictional demo data. Changes are saved locally.
              <br />
              Demo password: <code>DemoFlow!2026</code>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
