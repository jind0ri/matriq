export const PERMISSIONS = {
  admin: [
    "view_admin_dashboard",
    "manage_users",
    "manage_branches",
    "view_audit_logs",
    "view_reports",
  ],

  qa_engineer: [
    "view_technical_dashboard",
    "view_registry",
    "review_results",
    "approve_reports",
    "view_validation_queue",
  ],

  technician: [
    "view_technical_dashboard",
    "create_sample",
    "view_registry",
    "update_sample_status",
  ],

  senior_technician: [
    "view_technical_dashboard",
    "create_sample",
    "view_registry",
    "update_sample_status",
    "manual_validate_ai_result",
  ],

  accounting: [
    "view_accounting_dashboard",
    "view_billing",
    "manage_invoices",
    "view_financial_reports",
  ],
};