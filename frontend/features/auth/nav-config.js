export const NAV_CONFIG = {
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Branches", href: "/admin/branches" },
    { label: "Audit Logs", href: "/admin/audit-logs" },
    { label: "Reports", href: "/admin/reports" },
  ],

  qa_engineer: [
    { label: "Dashboard", href: "/technical" },
    { label: "Registry", href: "/technical/registry" },
    { label: "Validation", href: "/technical/validation" },
    { label: "Reports", href: "/technical/reports" },
  ],

  technician: [
    { label: "Dashboard", href: "/technical" },
    { label: "Sample Intake", href: "/technical/intake" },
    { label: "Registry", href: "/technical/registry" },
    { label: "Workflow", href: "/technical/workflow" },
  ],

  senior_technician: [
    { label: "Dashboard", href: "/technical" },
    { label: "Sample Intake", href: "/technical/intake" },
    { label: "Registry", href: "/technical/registry" },
    { label: "Validation", href: "/technical/validation" },
    { label: "Workflow", href: "/technical/workflow" },
  ],

  accounting: [
    { label: "Dashboard", href: "/accounting" },
    { label: "Billing", href: "/accounting/billing" },
    { label: "Invoices", href: "/accounting/invoices" },
    { label: "Reports", href: "/accounting/reports" },
  ],
};