"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function AdminBranchesPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const branches = useMemo(() => {
    const map = new Map();

    users.forEach((user) => {
      const branchId = user.branch_id || "Unassigned";

      if (!map.has(branchId)) {
        map.set(branchId, {
          branch_id: branchId,
          name: branchId === 1 ? "Main Laboratory - Marikina" : `Branch ${branchId}`,
          users: [],
        });
      }

      map.get(branchId).users.push(user);
    });

    return Array.from(map.values());
  }, [users]);

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Branch Management</h1>
          <p>View branch assignments and user distribution.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading branches...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="grid">
          {branches.map((branch) => (
            <div className="card" key={branch.branch_id}>
              <div className="row">
                <div>
                  <span className="label">Branch</span>
                  <h2>{branch.name}</h2>
                </div>

                <span className="pill active">Active</span>
              </div>

              <div className="stats">
                <div>
                  <span>Total Users</span>
                  <strong>{branch.users.length}</strong>
                </div>

                <div>
                  <span>Branch ID</span>
                  <strong>{branch.branch_id}</strong>
                </div>
              </div>

              <div className="roles">
                {Array.from(new Set(branch.users.map((u) => u.role))).map((role) => (
                  <span key={role}>{role}</span>
                ))}
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="card">No branches found.</div>
          )}
        </div>
      )}

      <style jsx>{`
        .page {
          padding: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
        }

        h2 {
          margin: 4px 0 0;
          font-size: 18px;
        }

        p {
          margin: 4px 0 0;
          color: #555;
        }

        button {
          background: #080026;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .card {
          background: white;
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 16px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .label {
          font-size: 12px;
          color: #666;
        }

        .pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          height: fit-content;
        }

        .active {
          background: #ecfdf5;
          color: #047857;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 18px;
        }

        .stats span {
          font-size: 12px;
          color: #666;
        }

        .stats strong {
          display: block;
          margin-top: 6px;
          font-size: 22px;
        }

        .roles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .roles span {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .error {
          color: red;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}