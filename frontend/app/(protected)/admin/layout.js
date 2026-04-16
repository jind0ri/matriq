"use client";

import AppShell from "@/components/layout/AppShell";

export default function AdminLayout({ children }) {
  return (
    <AppShell allowedRoles={["admin"]} branch="Main Laboratory - Marikina">
      {children}
    </AppShell>
  );
}