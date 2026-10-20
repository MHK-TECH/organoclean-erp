import {
  DashboardCircleIcon,
  Package04Icon,
  FlaskConicalIcon,
  BeakerIcon,
  FactoryIcon,
  ShieldCheckIcon,
  WarehouseIcon,
  TruckIcon,
  BoxIcon,
  Wrench01Icon,
  UsersIcon,
  Money01Icon,
  Coins01Icon,
  Note01Icon,
  ChartAnalysisIcon,
  Robot01Icon,
  PuzzleIcon,
  Building02Icon,
  UserIcon,
  Settings01Icon,
  HistoryIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type NavItem = {
  title: string;
  href: string;
  icon: IconSvgElement;
  description: string;
  phase: string;
  status: "planned" | "in-progress";
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const item = (
  title: string,
  href: string,
  icon: IconSvgElement,
  description: string,
  phase = "Phase 2",
  status: NavItem["status"] = "in-progress",
): NavItem => ({ title, href, icon, description, phase, status });

export const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      item("Products", "/products", Package04Icon, "Chemical master data, SKUs, SDS/TDS references and lifecycle.", "Phase 2", "in-progress"),
      item("Formulations", "/formulations", FlaskConicalIcon, "Versioned BOMs, batch scaling, approval and release.", "Phase 2", "in-progress"),
      item("Digital Lab", "/lab", BeakerIcon, "R&D experiments, samples, measurements and results.", "Phase 2", "in-progress"),
      item("Production", "/production", FactoryIcon, "Work orders, batches, stage tracking and yield.", "Phase 2", "in-progress"),
      item("Quality", "/quality", ShieldCheckIcon, "Inspections, specs, nonconformance and CAPA.", "Phase 2", "in-progress"),
      item("Inventory", "/inventory", WarehouseIcon, "Traceable stock ledger, lots, expiry and counts.", "Phase 2", "in-progress"),
      item("Procurement", "/procurement", TruckIcon, "Suppliers, requisitions, POs and goods receipt.", "Phase 2", "in-progress"),
      item("Packaging", "/packaging", BoxIcon, "Packaging BOMs, labels, batch printing."),
      item("Maintenance", "/maintenance", Wrench01Icon, "Equipment register, schedules and downtime.", "Phase 2", "in-progress"),
    ],
  },
  {
    label: "Commercial",
    items: [
      item("Customers", "/customers", UsersIcon, "Customers, distributors, credit and follow-ups.", "Phase 2", "in-progress"),
      item("Sales", "/sales", Money01Icon, "Quotes, orders, dispatch and returns.", "Phase 2", "in-progress"),
      item("Finance", "/finance", Coins01Icon, "Invoices, payments, receivables and costing.", "Phase 4", "in-progress"),
    ],
  },
  {
    label: "Workspace",
    items: [
      item("Documents", "/documents", Note01Icon, "SDS/TDS, SOPs, records and version control.", "Phase 2", "in-progress"),
      item("Analytics", "/analytics", ChartAnalysisIcon, "KPIs, dashboards and executive briefing.", "Phase 7", "in-progress"),
      item("AI Assistant", "/ai", Robot01Icon, "Drafts, summaries and guided operations.", "Phase 6", "in-progress"),
      item("Integrations", "/integrations", PuzzleIcon, "APIs, webhooks, WooCommerce and n8n.", "Phase 5", "in-progress"),
    ],
  },
  {
    label: "Administration",
    items: [
      item("Organization", "/organization", Building02Icon, "Company profile, facilities and departments.", "Phase 1", "in-progress"),
      item("Users & Roles", "/users", UserIcon, "Accounts, RBAC permissions and sessions.", "Phase 1", "in-progress"),
      item("Settings", "/settings", Settings01Icon, "Units, currency, taxes, numbering and time zones.", "Phase 1", "in-progress"),
      item("Audit Trail", "/audit", HistoryIcon, "Tamper-evident log of every mutation and approval.", "Phase 1", "in-progress"),
    ],
  },
];

export const dashboardIcon = DashboardCircleIcon;
