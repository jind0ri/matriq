"use client";

import { useEffect, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function WorkflowPage() {
  const user = getStoredUser();

  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qaPreTesting, setQaPreTesting] = useState([]);
  const [qaRelease, setQaRelease] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const promises = [apiClient.getDashboard()];

      if (user?.role === "Senior Technician" || user?.role === "Administrator") {
        promises.push(apiClient.getReviews());
      } else {
        promises.push(Promise.resolve([]));
      }

      if (user?.role === "QA Engineer" || user?.role === "Administrator") {
        promises.push(apiClient.getQaPreTestingQueue());
        promises.push(apiClient.getQaReleaseQueue());
      } else {
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
      }

      const [dashData, reviewData, preTestingData, releaseData] =
        await Promise.all(promises);

      setDashboard(dashData);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      setQaPreTesting(Array.isArray(preTestingData) ? preTestingData : []);
      setQaRelease(Array.isArray(releaseData) ? releaseData : []);
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

  async function handleQaPreTesting(sampleId) {
    try {
      await apiClient.qaApprovePreTesting(sampleId);
      await loadData();
    } catch (err) {
      alert(err.message || "QA pre-testing review failed");
    }
  }

  async function handleQaRelease(sampleId) {
    try {
      await apiClient.qaApproveRelease(sampleId);
      await loadData();
    } catch (err) {
      alert(err.message || "QA release failed");
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
            <p>Role-based review queues for Senior Technician and QA Engineer.</p>
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

            {(user?.role === "Senior Technician" ||
              user?.role === "Administrator") && (
              <section className="section">
                <h2>Senior Technician Queue</h2>
                <p className="sectionText">
                  Low-confidence samples requiring AI classification review.
                </p>

                <div className="list">
                  {reviews.length === 0 && (
                    <div className="card">No senior technician review cases.</div>
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
                            item.status === "Mandatory Override"
                              ? "danger"
                              : "warn"
                          }`}
                        >
                          {item.status}
                        </div>
                      </div>

                      <div className="grid">
                        <Info label="Client" value={item.client_name} />
                        <Info label="Project" value={item.project_id} />
                        <Info label="Predicted" value={item.predicted_label} />
                        <Info
                          label="Confidence"
                          value={
                            typeof item.confidence_score === "number"
                              ? `${Math.round(item.confidence_score * 100)}%`
                              : "-"
                          }
                        />
                      </div>

                      <div className="actions">
                        <button
                          className="approveButton"
                          onClick={() =>
                            handleValidation(item.sample_id, "approve")
                          }
                        >
                          Approve Classification
                        </button>

                        <button
                          className="rejectButton"
                          onClick={() =>
                            handleValidation(item.sample_id, "reject")
                          }
                        >
                          Reject Classification
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(user?.role === "QA Engineer" || user?.role === "Administrator") && (
              <>
                <section className="section">
                  <h2>QA Pre-Testing Queue</h2>
                  <p className="sectionText">
                    Paid or PO-submitted registered samples waiting for QA approval
                    before testing.
                  </p>

                  <div className="list">
                    {qaPreTesting.length === 0 && (
                      <div className="card">
                        No samples waiting for QA pre-testing review.
                      </div>
                    )}

                    {qaPreTesting.map((item) => {
                      const payment = item.device_metadata?.payment || {};

                      return (
                        <div className="card" key={item.sample_id}>
                          <div className="row">
                            <div>
                              <div className="label">Sample ID</div>
                              <div className="value">{item.sample_id}</div>
                            </div>

                            <div className="pill ready">Pre-Testing Review</div>
                          </div>

                          <div className="grid">
                            <Info label="Client" value={item.client_name} />
                            <Info label="Project" value={item.project_reference} />
                            <Info label="Material" value={item.material_type} />
                            <Info
                              label="Payment"
                              value={payment.payment_status || "Unpaid"}
                            />
                          </div>

                          <div className="actions">
                            <button
                              className="approveButton"
                              onClick={() => handleQaPreTesting(item.sample_id)}
                            >
                              Approve for Testing
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="section">
                  <h2>QA Release Queue</h2>
                  <p className="sectionText">
                    Fully paid samples waiting for QA final release.
                  </p>

                  <div className="list">
                    {qaRelease.length === 0 && (
                      <div className="card">
                        No samples waiting for QA release.
                      </div>
                    )}

                    {qaRelease.map((item) => {
                      const payment = item.device_metadata?.payment || {};

                      return (
                        <div className="card" key={item.sample_id}>
                          <div className="row">
                            <div>
                              <div className="label">Sample ID</div>
                              <div className="value">{item.sample_id}</div>
                            </div>

                            <div className="pill release">Ready for Release</div>
                          </div>

                          <div className="grid">
                            <Info label="Client" value={item.client_name} />
                            <Info label="Project" value={item.project_reference} />
                            <Info label="Material" value={item.material_type} />
                            <Info
                              label="Payment"
                              value={payment.payment_status || "-"}
                            />
                          </div>

                          <div className="actions">
                            <button
                              className="releaseButton"
                              onClick={() => handleQaRelease(item.sample_id)}
                            >
                              Release Official Report
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
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
          margin: 0 0 6px;
          font-size: 20px;
          color: #000000;
        }

        p {
          margin: 0;
          color: #000000;
        }

        .sectionText {
          margin-bottom: 12px;
          font-size: 13px;
          color: #475569;
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
          margin-top: 22px;
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

        .ready {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .release {
          background: #ecfdf5;
          color: #047857;
        }

        .actions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .approveButton {
          background: #16a34a;
        }

        .rejectButton {
          background: #dc2626;
        }

        .releaseButton {
          background: #2563eb;
        }
      `}</style>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="value">{value || "-"}</div>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}