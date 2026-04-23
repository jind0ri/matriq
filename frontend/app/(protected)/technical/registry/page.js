"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/ui/Dropdown";
import {
  ArrowClockwise,
  Eye,
  FadersHorizontal,
  MagnifyingGlass,
  WarningCircle,
} from "phosphor-react";

const API_BASE_URL = "http://localhost:8000";

function getStatusTone(status) {
  switch (status) {
    case "Registered":
      return "registered";
    case "Up-To-Standard":
      return "standard";
    case "In Testing":
      return "testing";
    case "For Review":
      return "review";
    case "Released":
      return "released";
    case "Archived":
      return "archived";
    default:
      return "registered";
  }
}

function normalizeBranch(branchId) {
  if (branchId === "1" || branchId === 1) return "Marikina";
  if (branchId === "2" || branchId === 2) return "Pateros";
  return "Unassigned";
}

export default function TechnicalRegistryPage() {
  const router = useRouter();

  const [samples, setSamples] = useState([]);
  const [filteredSamples, setFilteredSamples] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const isLabTechnician = currentUser?.role === "technician";
  const isSeniorTechnician = currentUser?.role === "senior_technician";
  const isQAEngineer = currentUser?.role === "qa_engineer";

  async function fetchSamples(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true);
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(`${API_BASE_URL}/api/samples`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to fetch samples."
        );
      }

      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch samples:", err);
      setError(err.message || "Failed to load registry.");
      setSamples([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSamples();
  }, []);

  useEffect(() => {
    let next = [...samples];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      next = next.filter((sample) => {
        return (
          sample.sample_id?.toLowerCase().includes(q) ||
          sample.client_name?.toLowerCase().includes(q) ||
          sample.project_id?.toLowerCase().includes(q) ||
          sample.material_type?.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== "all") {
      next = next.filter((sample) => sample.current_state === statusFilter);
    }

    if (branchFilter !== "all") {
      next = next.filter(
        (sample) => normalizeBranch(sample.branch_id).toLowerCase() === branchFilter
      );
    }

    setFilteredSamples(next);
  }, [samples, query, statusFilter, branchFilter]);

  const summary = useMemo(() => {
    return {
      total: samples.length,
      registered: samples.filter((item) => item.current_state === "Registered")
        .length,
      upToStandard: samples.filter(
        (item) => item.current_state === "Up-To-Standard"
      ).length,
      inTesting: samples.filter((item) => item.current_state === "In Testing")
        .length,
      forReview: samples.filter((item) => item.current_state === "For Review")
        .length,
      released: samples.filter((item) => item.current_state === "Released")
        .length,
    };
  }, [samples]);

  function handleViewDetails(sampleId) {
    router.push(`/technical/tracking/${sampleId}`);
  }

  function handleOpenWorkflow() {
    router.push("/technical/workflow");
  }

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Sample Registry</h1>
            <p>
              Review registered samples, search records, and open the next workflow
              stage for technical processing.
            </p>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={() => fetchSamples(true)}
              disabled={refreshing}
            >
              <ArrowClockwise size={16} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="primaryButton"
              onClick={handleOpenWorkflow}
            >
              Open Workflow
            </button>
          </div>
        </div>

        <div className="statsGrid">
          <div className="statCard">
            <span>Total Samples</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="statCard">
            <span>Registered</span>
            <strong>{summary.registered}</strong>
          </div>
          <div className="statCard">
            <span>Up-To-Standard</span>
            <strong>{summary.upToStandard}</strong>
          </div>
          <div className="statCard">
            <span>In Testing</span>
            <strong>{summary.inTesting}</strong>
          </div>
          <div className="statCard">
            <span>For Review</span>
            <strong>{summary.forReview}</strong>
          </div>
          <div className="statCard">
            <span>Released</span>
            <strong>{summary.released}</strong>
          </div>
        </div>

        <div className="toolbar">
          <div className="searchBox">
            <MagnifyingGlass size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by sample ID, client, project, or material"
            />
          </div>

          <div className="filterGroup">
            <div className="filterLabel">
              <FadersHorizontal size={16} />
              <span>Filters</span>
            </div>

            <Dropdown
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Registered", value: "Registered" },
                { label: "Up-To-Standard", value: "Up-To-Standard" },
                { label: "In Testing", value: "In Testing" },
                { label: "For Review", value: "For Review" },
                { label: "Released", value: "Released" },
                { label: "Archived", value: "Archived" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <Dropdown
              options={[
                { label: "All Branches", value: "all" },
                { label: "Marikina", value: "marikina" },
                { label: "Pateros", value: "pateros" },
              ]}
              value={branchFilter}
              onChange={setBranchFilter}
            />
          </div>
        </div>

        {error && (
          <div className="errorCard">
            <WarningCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="tablePanel">
          <div className="panelHeader">
            <h3>Registered Sample Records</h3>
            <span>{filteredSamples.length} visible</span>
          </div>

          {loading ? (
            <div className="emptyState">Loading registry data...</div>
          ) : filteredSamples.length === 0 ? (
            <div className="emptyState">
              No samples matched your current search and filters.
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Client</th>
                    <th>Project</th>
                    <th>Material Type</th>
                    <th>Branch</th>
                    <th>State</th>
                    <th>Decision</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSamples.map((sample) => (
                    <tr key={sample.id}>
                      <td>
                        <div className="primaryCell">
                          <strong>{sample.sample_id}</strong>
                        </div>
                      </td>

                      <td>{sample.client_name}</td>
                      <td>{sample.project_id}</td>
                      <td>{sample.material_type}</td>
                      <td>{normalizeBranch(sample.branch_id)}</td>

                      <td>
                        <span
                          className={`statusBadge ${getStatusTone(
                            sample.current_state
                          )}`}
                        >
                          {sample.current_state}
                        </span>
                      </td>

                      <td>{sample.decision || "Pending"}</td>

                      <td>
                        <button
                          type="button"
                          className="actionButton"
                          onClick={() => handleViewDetails(sample.sample_id)}
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(isSeniorTechnician || isQAEngineer || isLabTechnician) && (
          <div className="infoNote">
            Registry content is now loaded from the backend using your authenticated
            access token.
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          color: #1f2937;
        }

        p {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.45;
        }

        h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
        }

        .primaryButton,
        .secondaryButton,
        .actionButton {
          height: 42px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .primaryButton {
          border: none;
          background: #080026;
          color: #ffffff;
        }

        .primaryButton:hover {
          background: #14004a;
        }

        .secondaryButton {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #1f2937;
        }

        .secondaryButton:hover {
          border-color: #9ca3af;
          background: #f9fafb;
        }

        .secondaryButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .actionButton {
          height: 36px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #1f2937;
          padding: 0 12px;
        }

        .actionButton:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
        }

        .statCard span {
          display: block;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .statCard strong {
          font-size: 24px;
          color: #111827;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
          align-items: center;
        }

        .searchBox {
          height: 46px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          color: #6b7280;
        }

        .searchBox input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 13px;
          color: #1f2937;
          background: transparent;
        }

        .searchBox input::placeholder {
          color: #9ca3af;
        }

        .filterGroup {
          display: grid;
          grid-template-columns: auto 1fr 1fr;
          gap: 10px;
          align-items: center;
        }

        .filterLabel {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #374151;
          font-size: 12px;
          font-weight: 700;
        }

        .errorCard {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 13px;
          font-weight: 600;
        }

        .tablePanel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .panelHeader span {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead th {
          text-align: left;
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
          padding: 12px 10px;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        tbody td {
          padding: 14px 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #1f2937;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .primaryCell strong {
          color: #111827;
          font-size: 13px;
        }

        .statusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 108px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusBadge.registered {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .statusBadge.standard {
          background: #ede9fe;
          color: #6d28d9;
        }

        .statusBadge.testing {
          background: #fef3c7;
          color: #b45309;
        }

        .statusBadge.review {
          background: #e0f2fe;
          color: #0369a1;
        }

        .statusBadge.released {
          background: #ecfdf5;
          color: #047857;
        }

        .statusBadge.archived {
          background: #f3f4f6;
          color: #6b7280;
        }

        .emptyState {
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
          background: #fafafa;
        }

        .infoNote {
          font-size: 12px;
          color: #6b7280;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 14px;
        }

        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .filterGroup {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}