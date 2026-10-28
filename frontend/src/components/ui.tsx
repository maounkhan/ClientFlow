import { FolderOpen, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { initials } from "../api";
const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");
export function Badge({
  value,
  type = "status",
}: {
  value: string;
  type?: string;
}) {
  return (
    <span className={`badge ${type} ${slug(value)}`}>
      <i />
      {value}
    </span>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${size} tone-${(name || "").charCodeAt(0) % 5}`}
    >
      {initials(name)}
    </span>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "New items will appear here as your workspace grows.",
  action,
}: {
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FolderOpen size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = React.useId();
  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id,
        "aria-label": label,
        "aria-describedby": hint ? id + "-hint" : undefined,
      })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export function AsyncCheckbox({
  checked,
  disabled = false,
  onCheckedChange,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => Promise<unknown>;
}) {
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  return (
    <input
      {...props}
      type="checkbox"
      checked={pendingValue ?? checked}
      disabled={disabled || pendingValue !== null}
      aria-busy={pendingValue !== null}
      onChange={async (e) => {
        const value = e.currentTarget.checked;
        setPendingValue(value);
        try {
          await onCheckedChange(value);
        } finally {
          setPendingValue(null);
        }
      }}
    />
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,textarea,select,a[href],[tabindex="0"]',
        );
        if (all?.length) {
          const first = all[0],
            last = all[all.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", listener);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
