"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const USER_COLUMNS = [
  { key: "user", label: "User", width: "230px" },
  { key: "role", label: "Role", width: "170px" },
  { key: "branch", label: "Branch", width: "130px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "action", label: "Action", align: "right", width: "180px" },
];

const ROLE_OPTIONS = [
  "Administrator",
  "Lab Technician",
  "QA Engineer",
  "Senior Technician",
  "Accounting Staff",
];

export default function AdminUsersPage() {
  const currentUser = getStoredUser();
  const userBranchId = Number(currentUser?.branch_id);
  const currentUserId = String(getUserId(currentUser) || "");

  const [users, setUsers] = useState([]);
  const [branchFilter, setBranchFilter] = useState(userBranchId ? "My" : "All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "Lab Technician",
    branch_id: userBranchId ? String(userBranchId) : "1",
    is_active: true,
  });

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

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!userBranchId && branchFilter === "My") {
      setBranchFilter("All");
    }
  }, [branchFilter, userBranchId]);

  const visibleUsers = useMemo(() => {
    return filterItemsByBranchView(users, branchFilter, userBranchId);
  }, [users, branchFilter, userBranchId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleUsers.filter((user) => {
      const role = getUserRole(user);
      const active = isUserActive(user);

      const matchesSearch =
        !q ||
        getUserDisplayName(user).toLowerCase().includes(q) ||
        String(user.username || "").toLowerCase().includes(q) ||
        String(user.email || "").toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        formatBranch(user.branch_id).toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "All" ||
        normalizeRoleName(role) === normalizeRoleName(roleFilter);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && active) ||
        (statusFilter === "Inactive" && !active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [visibleUsers, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const activeUsers = visibleUsers.filter((user) => isUserActive(user));
    const inactiveUsers = visibleUsers.filter((user) => !isUserActive(user));
    const adminUsers = visibleUsers.filter(
      (user) => normalizeRoleName(getUserRole(user)) === "Administrator",
    );

    return {
      total: visibleUsers.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      admins: adminUsers.length,
    };
  }, [visibleUsers]);

  function openCreateModal() {
    setCreateError("");
    setForm({
      full_name: "",
      username: "",
      password: "",
      role: "Lab Technician",
      branch_id: userBranchId ? String(userBranchId) : "1",
      is_active: true,
    });
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setCreateOpen(false);
    setCreateError("");
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateUser() {
    setCreateError("");

    if (!form.full_name.trim()) {
      setCreateError("Full name is required.");
      return;
    }

    if (!form.username.trim()) {
      setCreateError("Username or email is required.");
      return;
    }

    if (!form.password.trim() || form.password.trim().length < 6) {
      setCreateError("Temporary password must be at least 6 characters.");
      return;
    }

    if (!form.role) {
      setCreateError("Role is required.");
      return;
    }

    if (!form.branch_id) {
      setCreateError("Branch is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        branch_id: Number(form.branch_id),
        is_active: Boolean(form.is_active),
      };

      if (typeof apiClient.createUser === "function") {
        await apiClient.createUser(payload);
      } else if (typeof apiClient.createAdminUser === "function") {
        await apiClient.createAdminUser(payload);
      } else {
        throw new Error(
          "Create user API is not available yet. Add apiClient.createUser() first.",
        );
      }

      setCreateOpen(false);
      await loadData();
    } catch (err) {
      setCreateError(err.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user) {
    const userId = getUserId(user);

    if (String(userId) === currentUserId) {
      setError("You cannot deactivate your own account while logged in.");
      return;
    }

    if (!userId) {
      setError("Unable to update this user because no user ID was found.");
      return;
    }

    const nextActive = !isUserActive(user);
    const confirmed = window.confirm(
      `Are you sure you want to ${nextActive ? "activate" : "deactivate"} ${getUserDisplayName(user)}?`,
    );

    if (!confirmed) return;

    setUpdatingUserId(String(userId));
    setError("");

    try {
      if (typeof apiClient.updateUserStatus === "function") {
        await apiClient.updateUserStatus(userId, {
          is_active: nextActive,
        });
      } else if (typeof apiClient.updateUser === "function") {
        await apiClient.updateUser(userId, {
          is_active: nextActive,
        });
      } else if (typeof apiClient.setUserActive === "function") {
        await apiClient.setUserActive(userId, nextActive);
      } else {
        throw new Error(
          "User status API is not available yet. Add apiClient.updateUserStatus() or apiClient.updateUser().",
        );
      }

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setUpdatingUserId("");
    }
  }

  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>User Management</h1>
          <p>
            Create accounts, assign roles, assign branches, and manage access
            for <strong>{branchLabel}</strong>.
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

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={openCreateModal}>
            Create User
          </Button>
        </div>
      </header>

      {!userBranchId && (
        <section className="warningNotice">
          <strong>No branch assigned</strong>
          <span>
            This administrator account does not have a branch assigned, so the
            page defaults to all branches.
          </span>
        </section>
      )}

      <section className="notice">
        <strong>Account status rule</strong>
        <span>
          Users should be activated or deactivated, not permanently deleted.
          Deactivation prevents access while preserving sample updates,
          validation actions, payment actions, and audit records linked to that
          account.
        </span>
      </section>

      {loading && <Loader label="Loading users..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Total Users"
              value={stats.total}
              note="Accounts in selected scope"
              variant="brand"
            />

            <StatCard
              label="Active"
              value={stats.active}
              note="Allowed to access system"
              variant="success"
            />

            <StatCard
              label="Inactive"
              value={stats.inactive}
              note="Access disabled"
              variant="danger"
            />

            <StatCard
              label="Administrators"
              value={stats.admins}
              note="System admin accounts"
              variant="info"
            />
          </section>

          <section className="toolbar">
            <Input
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, username, email, role, or branch..."
            />

            <Select
              name="roleFilter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="All">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>

            <Select
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </section>

          <Card
            title="User Accounts"
            subtitle="Manage account access without deleting users, so historical records remain attributable."
          >
            {filteredUsers.length === 0 ? (
              <EmptyState
                title="No users found"
                description="Adjust the branch, role, status, or search filters."
              />
            ) : (
              <Table
                columns={USER_COLUMNS}
                data={filteredUsers}
                emptyText="No users found."
                density="comfortable"
                variant="minimal"
                className="usersTable"
                renderRow={(user) => (
                  <tr key={getUserId(user) || user.username}>
                    <td>
                      <div className="userCell">
                        <strong>{getUserDisplayName(user)}</strong>
                        <span>{user.email || user.username || "-"}</span>
                      </div>
                    </td>

                    <td>
                      <RoleBadge role={getUserRole(user)} />
                    </td>

                    <td>{formatBranch(user.branch_id)}</td>

                    <td>
                      <UserStatusBadge user={user} />
                    </td>

                    <td className="right">
                      <button
                        type="button"
                        className={
                          isUserActive(user)
                            ? "rowAction danger"
                            : "rowAction success"
                        }
                        disabled={
                          updatingUserId === String(getUserId(user)) ||
                          String(getUserId(user)) === currentUserId
                        }
                        onClick={() => handleToggleStatus(user)}
                        title="Status changes preserve user history and audit links."
                      >
                        {updatingUserId === String(getUserId(user))
                          ? "Updating..."
                          : isUserActive(user)
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={createOpen}
        title="Create User"
        description="Create an account, assign role, branch, and initial account status."
        onClose={closeCreateModal}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button variant="primary" onClick={handleCreateUser} disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </>
        }
      >
        <div className="formGrid">
          {createError && <div className="modalError">{createError}</div>}

          <Input
            label="Full Name"
            name="full_name"
            value={form.full_name}
            required
            onChange={(event) => updateForm("full_name", event.target.value)}
            placeholder="e.g. Juan Dela Cruz"
          />

          <Input
            label="Username / Email"
            name="username"
            value={form.username}
            required
            onChange={(event) => updateForm("username", event.target.value)}
            placeholder="e.g. juan@example.com"
          />

          <Input
            label="Temporary Password"
            name="password"
            type="password"
            value={form.password}
            required
            onChange={(event) => updateForm("password", event.target.value)}
            placeholder="Minimum 6 characters"
          />

          <Select
            label="Role"
            name="role"
            value={form.role}
            required
            onChange={(event) => updateForm("role", event.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>

          <Select
            label="Branch"
            name="branch_id"
            value={form.branch_id}
            required
            onChange={(event) => updateForm("branch_id", event.target.value)}
          >
            <option value="1">Marikina</option>
            <option value="2">Pateros</option>
          </Select>

          <Select
            label="Initial Status"
            name="is_active"
            value={form.is_active ? "true" : "false"}
            required
            onChange={(event) =>
              updateForm("is_active", event.target.value === "true")
            }
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </Modal>

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

        .headerActions > :global(button),
        .headerActions > :global(a) {
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

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 190px 170px;
          gap: 12px;
          align-items: end;
        }

        .userCell {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .userCell strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .userCell span {
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .rowAction.success {
          color: var(--color-success);
          border-color: var(--color-success-border);
          background: var(--color-surface);
        }

        .rowAction.success:hover {
          background: var(--color-success-bg);
        }

        .rowAction.danger {
          color: var(--color-danger);
          border-color: var(--color-danger-border);
          background: var(--color-surface);
        }

        .rowAction.danger:hover {
          background: var(--color-danger-bg);
        }

        .rowAction:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .formGrid {
          display: grid;
          gap: 14px;
        }

        .modalError {
          border: 1px solid var(--color-danger-border);
          border-radius: var(--radius-md);
          background: var(--color-danger-bg);
          color: var(--color-danger);
          padding: 11px 12px;
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1.45;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.usersTable table) {
          min-width: 860px;
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
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

          .headerActions :global(.branchSelect),
          .headerActions > :global(button),
          .headerActions > :global(a) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
          }
        }

        @media (max-width: 520px) {
          .statsRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function RoleBadge({ role }) {
  const normalizedRole = normalizeRoleName(role);

  return (
    <Badge variant={normalizedRole === "Administrator" ? "brand" : "info"} size="sm">
      {normalizedRole || "Unassigned"}
    </Badge>
  );
}

function UserStatusBadge({ user }) {
  const active = isUserActive(user);

  return (
    <Badge variant={active ? "success" : "danger"} size="sm">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function isUserActive(user) {
  if (!user) return false;

  if (typeof user.is_active === "boolean") return user.is_active;
  if (typeof user.active === "boolean") return user.active;

  const status = String(user.status || user.account_status || "")
    .trim()
    .toLowerCase();

  if (!status) return true;

  return !["inactive", "disabled", "deactivated", "suspended"].includes(status);
}

function getUserId(user) {
  return user?.user_id || user?.id || user?.account_id || user?.username;
}

function getUserRole(user) {
  return normalizeRoleName(user?.role || user?.role_name || "Unassigned");
}

function normalizeRoleName(role) {
  const value = String(role || "").trim();

  if (!value) return "Unassigned";

  const normalized = value.toLowerCase();

  if (
    normalized === "technical staff" ||
    normalized === "technician" ||
    normalized === "lab technician" ||
    normalized === "laboratory technician"
  ) {
    return "Lab Technician";
  }

  if (
    normalized === "qa staff" ||
    normalized === "qa engineer" ||
    normalized === "quality assurance" ||
    normalized === "quality assurance engineer"
  ) {
    return "QA Engineer";
  }

  if (
    normalized === "senior technician" ||
    normalized === "senior tech" ||
    normalized === "senior engineer"
  ) {
    return "Senior Technician";
  }

  if (
    normalized === "accounting staff" ||
    normalized === "accounting" ||
    normalized === "accountant"
  ) {
    return "Accounting Staff";
  }

  if (
    normalized === "administrator" ||
    normalized === "admin" ||
    normalized === "system administrator"
  ) {
    return "Administrator";
  }

  return value;
}

function getUserDisplayName(user) {
  return (
    user?.full_name ||
    user?.name ||
    user?.display_name ||
    user?.username ||
    user?.email ||
    `User ${user?.user_id || user?.id || ""}`.trim()
  );
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterItemsByBranchView(items, branchFilter, userBranchId) {
  if (!Array.isArray(items)) return [];

  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return items;

  return items.filter((item) => {
    const branchId =
      item.branch_id ||
      item.metadata?.branch_id ||
      item.details?.branch_id ||
      item.sample_branch_id;

    return Number(branchId) === Number(resolvedBranch);
  });
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