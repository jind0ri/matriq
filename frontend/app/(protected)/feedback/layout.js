"use client";

import AppShell from "@/components/layout/AppShell";

export default function FeedbackLayout({ children }) {
  return (
    <AppShell
      allowedRoles={[
        "Lab Technician",
        "Senior Technician",
        "QA Engineer",
        "Accounting Staff",
        "Administrator",
      ]}
    >
      {children}
    </AppShell>
  );
}