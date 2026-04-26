"use client";

import { useMemo, useState } from "react";
import { getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import MetricStrip from "@/components/ui/MetricStrip";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const BRANCH_ROWS = [
  {
    branch_id: 1,
    branch_name: "Marikina",
    status: "Active",
    scope: "Operational branch",
    sync: "Cloud-synced",
  },
  {
    branch_id: 2,
    branch_name: "Pateros",
    status: "Active",
    scope: "Operational branch",
    sync: "Cloud-synced",
  },
];

const ROLE_ROWS = [
  {
    role: "Administrator",
    access: "Full system access",
    branch_rule: "Can manage all branches",
    notes: "User management, audit review, settings oversight",
  },
  {
    role: "Lab Technician",
    access: "Technical workflow",
    branch_rule: "Actions locked to assigned branch",
    notes: "Sample monitoring and test data entry",
  },
  {
    role: "Senior Technician",
    access: "Technical workflow with review visibility",
    branch_rule: "Actions locked to assigned branch",
    notes: "Can monitor assigned branch and view synced records",
  },
  {
    role: "QA Engineer",
    access: "Quality review workflow",
    branch_rule: "Actions locked to assigned branch",
    notes: "QA validation, review, and release workflow",
  },
  {
    role: "Accounting Staff",
    access: "Billing and payment workflow",
    branch_rule: "Actions locked to assigned branch",
    notes: "Payment updates, billing queue, and invoice records",
  },
];

const BRANCH_COLUMNS = [
  { key: "branch_name", label: "Branch", width: "160px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "scope", label: "Scope", width: "180px" },
  { key: "sync", label: "Sync Mode", width: "160px" },
];

const ROLE_COLUMNS = [
  { key: "role", label: "Role", width: "170px" },
  { key: "access", label: "Access", width: "220px" },
  { key: "branch_rule", label: "Branch Rule", width: "230px" },
  { key: "notes", label: "Notes", width: "260px" },
];

export default function AdminSettingsPage() {
  const user = getStoredUser();
  const userBranchId = Number(user?.branch_id);

  const [branchFilter, setBranchFilter] = useState(userBranchId ? "My" : "All");

  const branchOptions = useMemo(() => {
    if (!userBranchId) {
      return [
        { label: "All Branches", value: "All" },
        { label: "Marikina", value: "1" },
        { label: "Pateros", value: "2" },
      ];
    }

    const otherBranch =
      Number(userBranchId) === 1
        ? { label: "Pateros", value: "2" }
        : { label: "Marikina", value: "1" };

    return [
      { label: "All Branches", value: "All" },
      { label: "My Branch", value: "My" },
      otherBranch,
    ];
  }, [userBranchId]);

  const visibleBranches = useMemo(() => {
    return filterBranchesByView(BRANCH_ROWS, branchFilter, userBranchId);
  }, [branchFilter, userBranchId]);

  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>System Settings</h1>
          <p>
            Read-only system configuration overview for{" "}
            <strong>{branchLabel}</strong>.
          </p>
        </div>

        <div className="headerActions">
          <Select
            className="branchSelect"
            name="branchFilter"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {!userBranchId && (
        <section className="warningNotice">
          <strong>No branch assigned</strong>
          <span>
            This administrator account does not have a branch assigned, so the
            settings overview defaults to all branches.
          </span>
        </section>
      )}

      <section className="notice">
        <strong>Read-only configuration page</strong>
        <span>
          This page documents the current system rules for branch scope, account
          status, audit traceability, and role-based access. It does not save
          changes because editable system settings have not been connected to a
          backend settings API yet.
        </span>
      </section>

      <section className="statsRow">
        <StatCard
          label="Branches"
          value={visibleBranches.length}
          note="Configured operational branches"
          variant="brand"
        />

        <StatCard
          label="Roles"
          value={ROLE_ROWS.length}
          note="Supported system roles"
          variant="info"
        />

        <StatCard
          label="Audit Mode"
          value="On"
          note="Actions remain attributable"
          variant="success"
        />

        <StatCard
          label="Account Rule"
          value="Deactivate"
          note="No permanent delete in normal UI"
          variant="warning"
        />
      </section>

      <MetricStrip
        items={[
          {
            label: "Branch Scope",
            value: branchLabel,
          },
          {
            label: "Cloud Sync",
            value: "Active",
          },
          {
            label: "Admin Access",
            value: "All Branches",
          },
          {
            label: "Settings Mode",
            value: "Read-only",
          },
        ]}
      />

      <section className="contentGrid">
        <Card
          title="Branch Configuration"
          subtitle="Configured branch locations used for branch-aware records and cloud-synced monitoring."
        >
          <Table
            columns={BRANCH_COLUMNS}
            data={visibleBranches}
            emptyText="No branches found."
            density="comfortable"
            variant="minimal"
            className="settingsTable"
            renderRow={(item) => (
              <tr key={item.branch_id}>
                <td>{item.branch_name}</td>
                <td>
                  <Badge variant="success" size="sm">
                    {item.status}
                  </Badge>
                </td>
                <td>{item.scope}</td>
                <td>
                  <Badge variant="info" size="sm">
                    {item.sync}
                  </Badge>
                </td>
              </tr>
            )}
          />
        </Card>

        <Card
          title="Role Access Overview"
          subtitle="Role-based access rules used by protected pages and branch-aware workflows."
        >
          <Table
            columns={ROLE_COLUMNS}
            data={ROLE_ROWS}
            emptyText="No roles found."
            density="comfortable"
            variant="minimal"
            className="settingsTable roleTable"
            renderRow={(item) => (
              <tr key={item.role}>
                <td>
                  <RoleBadge role={item.role} />
                </td>
                <td>{item.access}</td>
                <td>{item.branch_rule}</td>
                <td>{item.notes}</td>
              </tr>
            )}
          />
        </Card>
      </section>

      <section className="rulesGrid">
        <RuleCard
          title="Account Status Rule"
          variant="warning"
          items={[
            "Administrators activate or deactivate accounts.",
            "Inactive users should not access protected system functions.",
            "Accounts are not permanently deleted from the normal interface.",
            "Historical sample, validation, payment, and audit records remain linked to the account that performed them.",
          ]}
        />

        <RuleCard
          title="Audit Trail Rule"
          variant="success"
          items={[
            "User actions are recorded for traceability.",
            "Audit records are read-only in the admin interface.",
            "Audit logs should show the user, branch, action, target, page or module, and timestamp.",
            "Deactivated accounts remain visible in historical audit records.",
          ]}
        />

        <RuleCard
          title="Branch Workflow Rule"
          variant="info"
          items={[
            "Default branch view is the user’s assigned branch.",
            "All Branches is used for cloud-synced monitoring.",
            "Non-admin actions are locked to the user’s assigned branch.",
            "Administrators may manage records across all branches.",
          ]}
        />

        <RuleCard
          title="Laboratory Workflow Rule"
          variant="brand"
          items={[
            "Samples move from registration to testing, QA review, release, and archive.",
            "Payment and invoice updates stay in Accounting pages.",
            "QA review and release actions stay in QA or technical review pages.",
            "Reports summarize activity without directly modifying source records.",
          ]}
        />
      </section>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          color: var(--color-text-primary);
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .header h1 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .header p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .header p strong {
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .headerActions {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .headerActions :global(.branchSelect) {
          width: 150px;
          min-width: 150px;
          flex: 0 0 150px;
        }

        .notice,
        .warningNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice {
          background: var(--color-info-bg);
          color: var(--color-info);
          border: 1px solid var(--color-info-border);
        }

        .warningNotice {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border: 1px solid var(--color-warning-border);
        }

        .notice strong,
        .warningNotice strong {
          color: inherit;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 18px;
          align-items: start;
        }

        .rulesGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        :global(.settingsTable table) {
          min-width: 640px;
        }

        :global(.roleTable table) {
          min-width: 860px;
        }

        @media (max-width: 1100px) {
          .statsRow,
          .contentGrid,
          .rulesGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            width: 100%;
            justify-content: flex-start;
          }

          .headerActions :global(.branchSelect) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}

function RuleCard({ title, items, variant = "brand" }) {
  return (
    <section className={`ruleCard ${variant}`}>
      <div className="ruleHeader">
        <h2>{title}</h2>
        <Badge variant={variant} size="sm">
          Rule
        </Badge>
      </div>

      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <style jsx>{`
        .ruleCard {
          display: grid;
          gap: 12px;
          padding: 16px;
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
          box-shadow: var(--shadow-xs);
        }

        .ruleCard.brand {
          border-color: var(--color-brand-border);
        }

        .ruleCard.info {
          border-color: var(--color-info-border);
        }

        .ruleCard.success {
          border-color: var(--color-success-border);
        }

        .ruleCard.warning {
          border-color: var(--color-warning-border);
        }

        .ruleHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        ul {
          display: grid;
          gap: 8px;
          margin: 0;
          padding-left: 18px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        li::marker {
          color: var(--color-text-muted);
        }
      `}</style>
    </section>
  );
}

function RoleBadge({ role }) {
  const variant = role === "Administrator" ? "brand" : "info";

  return (
    <Badge variant={variant} size="sm">
      {role}
    </Badge>
  );
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterBranchesByView(items, branchFilter, userBranchId) {
  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return items;

  return items.filter(
    (item) => Number(item.branch_id) === Number(resolvedBranch),
  );
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}