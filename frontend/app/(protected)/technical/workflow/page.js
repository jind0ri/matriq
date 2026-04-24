"use client";

import { useEffect, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function WorkflowPage() {
  const user = getStoredUser();
  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [dashData, reviewData] = await Promise.all([
        apiClient.getDashboard(),
        apiClient.getReviews(),
      ]);

      setDashboard(dashData);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
    } catch (err) {
      setError(err.message || "Failed to load workflow.");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidation(sample_id, decision) {
    try {
      await apiClient.validate({
        sample_id,
        corrected_label: "Concrete",
        justification: "Validated by Senior Technician",
        decision,
      });

      await loadData();
    } catch (err) {
      alert(err.message || "Validation failed");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Workflow Monitor</h1>
            <p>Monitor AI routing and review pipeline activity.</p>
          </div>
          <button onClick={loadData}>Refresh</button>
        </div>

        {loading && <div className="card">Loading workflow data...</div>}
        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && dashboard && (
          <>
            <div className="stats">
              <div className="statCard">
                <span>Registered</span>
                <strong>{dashboard.registered ?? 0}</strong>
              </div>
              <div className="statCard">
                <span>Manual Review</span>
                <strong>{dashboard.manual_review ?? 0}</strong>
              </div>
              <div className="statCard">
                <span>Mandatory Override</span>
                <strong>{dashboard.mandatory_override ?? 0}</strong>
              </div>
              <div className="statCard">
                <span>Completed Reviews</span>
                <strong>{dashboard.completed_reviews ?? 0}</strong>
              </div>
            </div>

            <div className="section">
              <h2>Recent Review Cases</h2>

              <div className="list">
                {reviews.length === 0 && (
                  <div className="card">No review cases found.</div>
                )}

                {reviews.map((item) => (
                  <div className="card" key={item.sample_id}>
                    <div className="row">
                      <div>
                        <div className="label">Sample ID</div>
                        <div className="value">{item.sample_id}</div>
                      </div>

                      <div
                        className={`pill ${
                          item.status === "Mandatory Override" ? "danger" : "warn"
                        }`}
                      >
                        {item.status}
                      </div>
                    </div>

                    <div className="grid">
                      <div>
                        <div className="label">Client</div>
                        <div className="value">{item.client_name || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Project</div>
                        <div className="value">{item.project_id || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Predicted</div>
                        <div className="value">{item.predicted_label || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Confidence</div>
                        <div className="value">
                          {typeof item.confidence_score === "number"
                            ? `${Math.round(item.confidence_score * 100)}%`
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {user?.role === "Senior Technician" && (
                      <div className="actions">
                        <button
                          className="approveButton"
                          onClick={() =>
                            handleValidation(item.sample_id, "approve")
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="rejectButton"
                          onClick={() =>
                            handleValidation(item.sample_id, "reject")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          padding: 24px;
          background: #f7f7fb;
          min-height: 100vh;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #000000;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 20px;
          color: #000000;
        }

        p {
          margin: 0;
          color: #000000;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          background: #14003a;
          color: #fff;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .statCard,
        .card {
          background: #fff;
          border: 1px solid #e7e7ef;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .statCard span {
          display: block;
          color: #000000;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 30px;
          color: #000000;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .section {
          margin-top: 10px;
        }

        .list {
          display: grid;
          gap: 14px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .label {
          font-size: 12px;
          color: #000000;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .value {
          font-size: 15px;
          font-weight: 600;
          color: #000000;
        }

        .pill {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .warn {
          background: #fff7ed;
          color: #c2410c;
        }

        .danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .actions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
        }

        .approveButton {
          background: #16a34a;
        }

        .rejectButton {
          background: #dc2626;
        }
      `}</style>
    </>
  );
}