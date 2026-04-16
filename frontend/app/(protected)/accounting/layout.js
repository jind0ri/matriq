"use client";

import AppShell from "@/components/layout/AppShell";

export default function AccountingLayout({ children }) {
  return (
    <AppShell allowedRoles={["accounting"]} branch="Main Laboratory - Marikina">
      {children}
    </AppShell>
  );
}