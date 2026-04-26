"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import MetricStrip from "@/components/ui/MetricStrip";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const BRANCH_COLUMNS = [
  { key: "branch_name", label: "Branch", width: "170px" },
  { key: "location", label: "Location", width: "140px" },
  { key: "status", label: "Status", width: "130px" },
  { key: "sync_mode", label: "Sync Mode", width: "160px" },
  { key: "action", label: "Action", align: "right", width: "130px" },
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
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branchDrafts, setBranchDrafts] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [savingBranchId, setSavingBranchId] = useState("");
  const [error, setError] = useState("");

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

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getAdminSettings();

      const nextBranches = Array.isArray(res?.branches) ? res.branches : [];
      const nextSettings = Array.isArray(res?.settings) ? res.settings : [];
      const nextRoles = Array.isArray(res?.roles) ? res.roles : [];

      setBranches(nextBranches);
      setSettings(nextSettings);
      setRoles(nextRoles);

      setBranchDrafts(
        Object.fromEntries(
          nextBranches.map((branch) => [
            String(branch.branch_id),
            {
              branch_name: branch.branch_name || "",
              location: branch.location || "",
              status: branch.status || "Active",
              sync_mode: branch.sync_mode || "Cloud-synced",
            },
          ]),
        ),
      );
    } catch (err) {
      setError(err.message || "Failed to load admin settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const visibleBranches = useMemo(() => {
    return filterBranchesByView(branches, branchFilter, userBranchId);
  }, [branches, branchFilter, userBranchId]);

  const groupedSettings = useMemo(() => {
    const map = new Map();

    settings.forEach((setting) => {
      const category = setting.category || "System Rules";

      if (!map.has(category)) {
        map.set(category, []);
      }

      map.get(category).push(setting);
    });

    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [settings]);

  const enabledCount = settings.filter((item) => item.enabled).length;
  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  function updateBranchDraft(branchId, field, value) {
    setBranchDrafts((current) => ({
      ...current,
      [String(branchId)]: {
        ...(current[String(branchId)] || {}),
        [field]: value,
      },
    }));
  }

  async function saveBranch(branchId) {
    const draft = branchDrafts[String(branchId)];

    if (!draft) return;

    setSavingBranchId(String(branchId));
    setError("");

    try {
      const updated = await apiClient.updateAdminBranch(branchId, draft);

      setBranches((current) =>
        current.map((branch) =>
          Number(branch.branch_id) === Number(branchId) ? updated : branch,
        ),
      );

      setBranchDrafts((current) => ({
        ...current,
        [String(branchId)]: {
          branch_name: updated.branch_name || "",
          location: updated.location || "",
          status: updated.status || "Active",
          sync_mode: updated.sync_mode || "Cloud-synced",
        },
      }));
    } catch (err) {
      setError(err.message || "Failed to update branch settings.");
    } finally {
      setSavingBranchId("");
    }
  }

  async function toggleSetting(setting) {
    setSavingKey(setting.setting_key);
    setError("");

    try {
      const updated = await apiClient.updateAdminSetting({
        setting_key: setting.setting_key,
        value: !setting.enabled,
      });

      setSettings((current) =>
        current.map((item) =>
          item.setting_key === updated.setting_key ? updated : item,
        ),
      );
    } catch (err) {
      setError(err.message || "Failed to update setting.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>System Settings</h1>
          <p>
            Manage branch configuration and system rules for{" "}
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

          <Button variant="secondary" size="sm" onClick={loadSettings}>
            Refresh
          </Button>
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
        <strong>Dynamic configuration page</strong>
        <span>
          Settings are loaded from the backend and changes are audit logged.
          These controls are limited to safe configuration records such as branch
          status, sync mode, and workflow rule flags.
        </span>
      </section>

      {loading && <Loader label="Loading system settings..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Branches"
              value={visibleBranches.length}
              note="Configured operational branches"
              variant="brand"
            />

            <StatCard
              label="Roles"
              value={roles.length}
              note="Supported system roles"
              variant="info"
            />

            <StatCard
              label="Enabled Rules"
              value={enabledCount}
              note="Active configurable rules"
              variant="success"
            />

            <StatCard
              label="Settings Mode"
              value="Dynamic"
              note="Backend-managed records"
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
                value: "Configurable",
              },
              {
                label: "Admin Access",
                value: "All Branches",
              },
              {
                label: "Audit Logging",
                value: "Enabled",
              },
            ]}
          />

          <section className="contentGrid">
            <Card
              className="settingsPanel branchPanel"
              title="Branch Configuration"
              subtitle="Update branch labels, location, operational status, and displayed sync mode."
            >
              {visibleBranches.length === 0 ? (
                <EmptyState
                  title="No branches found"
                  description="No branch settings are available for this scope."
                />
              ) : (
                <Table
                  columns={BRANCH_COLUMNS}
                  data={visibleBranches}
                  emptyText="No branches found."
                  density="comfortable"
                  variant="minimal"
                  className="settingsTable"
                  renderRow={(item) => {
                    const draft = branchDrafts[String(item.branch_id)] || {};

                    return (
                      <tr key={item.branch_id}>
                        <td>
                          <input
                            className="tableInput"
                            value={draft.branch_name || ""}
                            onChange={(event) =>
                              updateBranchDraft(
                                item.branch_id,
                                "branch_name",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="tableInput"
                            value={draft.location || ""}
                            onChange={(event) =>
                              updateBranchDraft(
                                item.branch_id,
                                "location",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td>
                          <select
                            className="tableSelect"
                            value={draft.status || "Active"}
                            onChange={(event) =>
                              updateBranchDraft(
                                item.branch_id,
                                "status",
                                event.target.value,
                              )
                            }
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>

                        <td>
                          <select
                            className="tableSelect"
                            value={draft.sync_mode || "Cloud-synced"}
                            onChange={(event) =>
                              updateBranchDraft(
                                item.branch_id,
                                "sync_mode",
                                event.target.value,
                              )
                            }
                          >
                            <option value="Cloud-synced">Cloud-synced</option>
                            <option value="Local monitoring">
                              Local monitoring
                            </option>
                            <option value="Sync paused">Sync paused</option>
                          </select>
                        </td>

                        <td className="right">
                          <button
                            type="button"
                            className="rowAction"
                            disabled={savingBranchId === String(item.branch_id)}
                            onClick={() => saveBranch(item.branch_id)}
                          >
                            {savingBranchId === String(item.branch_id)
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </Card>

            <Card
              className="settingsPanel rolePanel"
              title="Role Access Overview"
              subtitle="Role-based access rules used by protected pages and branch-aware workflows."
            >
              <Table
                columns={ROLE_COLUMNS}
                data={roles}
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
            {groupedSettings.map((group) => (
              <Card
                key={group.category}
                className="settingsPanel rulePanel"
                title={group.category}
                subtitle="Toggle backend-managed system rule flags."
              >
                <div className="settingsList">
                  {group.items.map((setting) => (
                    <SettingRow
                      key={setting.setting_key}
                      setting={setting}
                      saving={savingKey === setting.setting_key}
                      onToggle={() => toggleSetting(setting)}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </section>
        </>
      )}

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

        .headerActions > :global(button) {
          width: auto;
          min-width: 0;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
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

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .rulesGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .contentGrid > :global(.settingsPanel),
        .rulesGrid > :global(.settingsPanel) {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .contentGrid > :global(.settingsPanel .body),
        .rulesGrid > :global(.settingsPanel .body) {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .contentGrid > :global(.settingsPanel .body > div),
        .rulesGrid > :global(.settingsPanel .body > div) {
          flex: 1;
        }

        .settingsList {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .tableInput,
        .tableSelect {
          width: 100%;
          min-height: 32px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          padding: 0 10px;
          font-size: var(--text-xs);
          outline: none;
        }

        .tableInput:focus,
        .tableSelect:focus {
          border-color: var(--color-brand-border);
          box-shadow: 0 0 0 3px var(--color-brand-bg);
        }

        .rowAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }

        .rowAction:hover {
          background: var(--color-overlay);
          color: var(--color-brand);
        }

        .rowAction:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.settingsTable) {
          width: 100%;
        }

        :global(.settingsTable table) {
          min-width: 820px;
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

          .contentGrid > :global(.settingsPanel),
          .rulesGrid > :global(.settingsPanel) {
            height: auto;
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

          .headerActions :global(.branchSelect),
          .headerActions > :global(button) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}

function SettingRow({ setting, saving, onToggle }) {
  return (
    <div className="settingRow">
      <div className="settingText">
        <div className="settingTitle">
          <strong>{setting.label}</strong>
          <Badge variant={setting.enabled ? "success" : "danger"} size="sm">
            {setting.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <p>{setting.description}</p>
      </div>

      <button
        type="button"
        className={setting.enabled ? "toggle active" : "toggle"}
        disabled={saving}
        onClick={onToggle}
        aria-label={`Toggle ${setting.label}`}
      >
        <span />
      </button>

      <style jsx>{`
        .settingRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 48px;
          gap: 14px;
          align-items: center;
          padding: 13px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
        }

        .settingText {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .settingTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
          line-height: 1.4;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.5;
        }

        .toggle {
          width: 46px;
          height: 26px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-full);
          background: var(--color-surface);
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            opacity var(--transition-base);
        }

        .toggle span {
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          background: var(--color-text-muted);
          transition:
            transform var(--transition-base),
            background-color var(--transition-base);
        }

        .toggle.active {
          background: var(--color-success-bg);
          border-color: var(--color-success-border);
        }

        .toggle.active span {
          transform: translateX(20px);
          background: var(--color-success);
        }

        .toggle:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
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