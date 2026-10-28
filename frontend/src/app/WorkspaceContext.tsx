import React from "react";
import type { Row } from "../api";
export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
export interface WorkspaceContextValue {
  data: Row | null;
  user: Row;
  isClient: boolean;
  isAdmin: boolean;
  isManager: boolean;
  tickets: Row[];
  organizations: Row[];
  articles: Row[];
  onboarding: Row[];
  notifications: Row[];
  users: Row[];
  documents: Row[];
  metrics: Row;
  unread: number;
  activeTickets: Row[];
  filtered: Row[];
  recent: Row[];
  period: string;
  setPeriod: Setter<string>;
  query: string;
  setQuery: Setter<string>;
  filter: string;
  setFilter: Setter<string>;
  priority: string;
  setPriority: Setter<string>;
  org: string;
  setOrg: Setter<string>;
  articleCategory: string;
  setArticleCategory: Setter<string>;
  prefs: Row;
  setPrefs: Setter<Row>;
  edit: Row | null;
  setEdit: Setter<Row | null>;
  dialog: string | null;
  setDialog: Setter<string | null>;
  detail: Row | null;
  detailId: string | null;
  article: Row | null;
  setArticle: Setter<Row | null>;
  busy: boolean;
  notify: (message: string, error?: boolean) => void;
  mutate: (
    path: string,
    method: string,
    body?: unknown,
    message?: string,
  ) => Promise<any>;
  refresh: () => Promise<any>;
  go: (key: string) => void;
  openTicket: (id: string) => void;
  logout: () => Promise<void>;
  closeDialog: () => void;
  ticketTable: (rows: Row[], compact?: boolean) => React.ReactNode;
  statCards: () => React.ReactNode;
  Button: React.ComponentType<{
    children: React.ReactNode;
    onClick: () => void;
    kind?: string;
    disabled?: boolean;
  }>;
}
export const WorkspaceContext = React.createContext<WorkspaceContextValue>(
  null!,
);
