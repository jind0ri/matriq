"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default function AccountingLayout({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return;

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "accounting") {
      router.replace("/unauthorized");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) return null;

  return <AppShell user={user}>{children}</AppShell>;
}