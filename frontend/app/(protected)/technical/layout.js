"use client";

import AppShell from "@/components/layout/AppShell";

export default function TechnicalLayout({ children }) {
  return (
    <AppShell
      allowedRoles={["qa_engineer", "technician", "senior_technician"]}
      branch="Main Laboratory - Marikina"
    >
      {children}
    </AppShell>
  );
}