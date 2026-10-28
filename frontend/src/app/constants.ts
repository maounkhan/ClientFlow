import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
export const priorities = ["Low", "Medium", "High", "Critical"];
export const statuses = [
  "Open",
  "Triaged",
  "In Progress",
  "Waiting for Client",
  "Escalated",
  "Resolved",
  "Closed",
  "Reopened",
];
export const categories = [
  "Identity & access",
  "Integrations",
  "API & development",
  "Billing",
  "Reporting",
  "Security",
  "Onboarding",
  "Other",
];
export const transitions: Record<string, string[]> = {
  Open: ["Triaged", "Escalated"],
  Triaged: ["In Progress", "Waiting for Client", "Escalated"],
  "In Progress": ["Waiting for Client", "Resolved", "Escalated"],
  "Waiting for Client": ["In Progress", "Escalated"],
  Escalated: ["In Progress", "Waiting for Client", "Resolved"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["Triaged", "In Progress", "Escalated"],
};
export const personas = [
  {
    role: "Team manager",
    name: "Jordan Lee",
    email: "manager@clientflow.demo",
    desc: "Coordinate teams & monitor service",
    icon: BarChart3,
  },
  {
    role: "Support engineer",
    name: "Sofia Chen",
    email: "engineer@clientflow.demo",
    desc: "Investigate, collaborate & resolve",
    icon: LifeBuoy,
  },
  {
    role: "Client",
    name: "Maya Patel",
    email: "client@northstar.demo",
    desc: "Track requests & get onboarded",
    icon: Building2,
  },
  {
    role: "Administrator",
    name: "Avery Morgan",
    email: "admin@clientflow.demo",
    desc: "Manage access & configuration",
    icon: ShieldCheck,
  },
];
export const nav = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "tickets", label: "Support tickets", icon: Ticket },
  { key: "onboarding", label: "Onboarding", icon: ClipboardCheck },
  { key: "organizations", label: "Organizations", icon: Building2 },
  { key: "sla", label: "SLA & escalations", icon: ShieldCheck },
  { key: "analytics", label: "Analytics & reports", icon: BarChart3 },
  { key: "knowledge", label: "Knowledge base", icon: BookOpen },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "team", label: "Team members", icon: Users },
  { key: "audit", label: "Audit log", icon: ScrollText },
];
