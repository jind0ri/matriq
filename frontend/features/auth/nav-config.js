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
    { label: "Sample Tracking", href: "/technical/registry" },
    { label: "Reports", href: "/technical/reports" },
  ],

  technician: [
    { label: "Dashboard", href: "/technical" },
    { label: "Sample Intake", href: "/technical/intake" },
    { label: "Sample Tracking", href: "/technical/registry" },
  ],

  senior_technician: [
    { label: "Dashboard", href: "/technical" },
    { label: "Sample Intake", href: "/technical/intake" },
    { label: "Sample Tracking", href: "/technical/registry" },
  ],

  accounting: [
    { label: "Dashboard", href: "/accounting" },
    { label: "Billing", href: "/accounting/billing" },
    { label: "Invoices", href: "/accounting/invoices" },
    { label: "Reports", href: "/accounting/reports" },
  ],
};