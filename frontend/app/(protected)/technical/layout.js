"use client";

import AppShell from "@/components/layout/AppShell";

export default function TechnicalLayout({ children }) {
  return (
    <AppShell
      allowedRoles={[
        "QA Engineer",
        "Lab Technician",
        "Senior Technician",
        "Administrator",
      ]}
    >
      {children}
    </AppShell>
  );
}
