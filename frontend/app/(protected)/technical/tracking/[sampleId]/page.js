"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function TrackingDetailPage() {
  const params = useParams();
  const sampleId = params?.sampleId;
  const user = getStoredUser();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadSample() {
    if (!sampleId) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getSample(sampleId);
      setItem(data);
    } catch (err) {
      setError(err.message || "Failed to load sample detail.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    const paymentStatus = item?.device_metadata?.payment?.payment_status;

    if (paymentStatus !== "Fully Paid" && user?.role !== "Administrator") {
      alert("Cannot release sample. Payment must be fully paid first.");
      return;
    }

    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "Released",
      });

      await loadSample();
    } catch (err) {
      alert(err.message || "Release failed");
    }
  }

  async function handleArchive() {
    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "Archived",
      });

      await loadSample();
    } catch (err) {
      alert(err.message || "Archive failed");
    }
  }

  useEffect(() => {
    loadSample();
  }, [sampleId]);

  const metadata = item?.device_metadata || {};
  const trf = metadata.trf || {};
  const payment = metadata.payment || {};
  const testSlip = metadata.test_slip || {};

  const paymentStatus = item?.device_metadata?.payment?.payment_status;

  const canStartTesting =
    item &&
    item.current_state === "Registered" &&
    (user?.role === "Lab Technician" || user?.role === "Administrator");

  const canSubmitForReview =
    item &&
    item.current_state === "In Testing" &&
    (user?.role === "Senior Technician" || user?.role === "Administrator");

  const canRelease =
    item &&
    item.current_state === "For Review" &&
    (user?.role === "QA Engineer" || user?.role === "Administrator");

  const canArchive =
    item &&
    item.current_state === "Released" &&
    (user?.role === "QA Engineer" || user?.role === "Administrator");

  const isReadOnly = item?.is_immutable || item?.current_state === "Archived";

  async function handleStartTesting() {
    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "In Testing",
      });
      await loadSample();
    } catch (err) {
      alert(err.message || "Failed to start testing");
    }
  }

  async function handleSubmitForReview() {
    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "For Review",
      });
      await loadSample();
    } catch (err) {
      alert(err.message || "Failed to submit for review");
    }
  }

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <Link href="/technical/registry" className="backLink">
              ← Back to Registry
            </Link>
            <h1>Sample Tracking Detail</h1>
            <p>Detailed view of sample, TRF, payment, and test slip data.</p>
          </div>
        </div>

        {loading && <div className="card">Loading sample...</div>}

        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && item && (
          <div className="stack">
            <div className="card">
              <div className="top">
                <div>
                  <div className="label">Sample ID</div>
                  <div className="value big">{item.sample_id}</div>
                </div>

                <div className="pill">{item.current_state || "Unknown"}</div>
              </div>

              {isReadOnly && (
                <div className="readOnlyBox">
                  This sample is read-only because it is immutable or archived.
                </div>
              )}

              <div className="grid">
                <Info label="Client" value={item.client_name} />
                <Info label="Project" value={item.project_reference} />
                <Info label="Material Type" value={item.material_type} />
                <Info
                  label="AI Predicted Label"
                  value={item.ai_predicted_label}
                />
                <Info
                  label="Confidence"
                  value={
                    typeof item.ai_confidence_score === "number"
                      ? `${Math.round(item.ai_confidence_score * 100)}%`
                      : "-"
                  }
                />
                <Info label="Decision" value={item.decision} />
                <Info label="Model Version" value={item.model_version} />
                <Info label="Branch ID" value={item.branch_id} />
                <Info label="Registered By" value={item.registered_by} />
                <Info label="Immutable" value={String(item.is_immutable)} />
                <Info label="Image Path" value={item.image_path} />
                <Info
                  label="Timestamp"
                  value={item.intake_timestamp || item.inference_timestamp}
                />
              </div>
            </div>

            <Section title="Test Request Form / TRF">
              <Info
                label="Client Name"
                value={trf.client_name || item.client_name}
              />
              <Info label="Client Address" value={trf.client_address} />
              <Info
                label="Project Identifier"
                value={trf.project_identifier || item.project_reference}
              />
              <Info
                label="Structure / Design Details"
                value={trf.structure_details}
              />
              <Info
                label="Requested Test Type"
                value={trf.requested_test_type}
              />
              <Info label="Registry Branch" value={trf.registry_branch} />
              <Info label="Terminal Staff" value={trf.terminal_staff} />
            </Section>

            <Section title="Payment Information">
              <Info
                label="Payment Method"
                value={payment.payment_requirement}
              />
              <Info label="Payment Status" value={payment.payment_status} />
              <Info label="Amount Paid" value={payment.amount_paid} />
              <Info label="Balance" value={payment.balance} />
              <Info label="Billing Notes" value={payment.billing_notes} />
            </Section>

            <Section title="Lab Tech Test Slip">
              <Info
                label="Actual Sample Checked"
                value={testSlip.actual_sample_checked ? "Yes" : "No"}
              />
              <Info label="Voids / Cracks" value={testSlip.voids_cracks} />
              <Info label="Weight" value={testSlip.weight} />
              <Info label="Diameter" value={testSlip.diameter} />
              <Info
                label="Reference Test IDs"
                value={testSlip.reference_test_ids}
              />
              <Info label="Condition Notes" value={testSlip.condition_notes} />
            </Section>

            <div className="card metadata">
              <div className="label">Raw Device Metadata</div>
              <pre>{JSON.stringify(metadata, null, 2)}</pre>
            </div>

            {(canStartTesting ||
              canSubmitForReview ||
              canRelease ||
              canArchive) && (
              <div className="actions">
                {canStartTesting && (
                  <button onClick={handleStartTesting}>Start Testing</button>
                )}

                {canSubmitForReview && (
                  <button onClick={handleSubmitForReview}>
                    Submit for QA Review
                  </button>
                )}

                {canRelease && (
                  <button className="releaseButton" onClick={handleRelease}>
                    Release
                  </button>
                )}

                {canArchive && (
                  <button className="archiveButton" onClick={handleArchive}>
                    Archive
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          padding: 24px;
          background: #f7f7fb;
          min-height: 100vh;
        }

        .header {
          margin-bottom: 20px;
        }

        .backLink {
          display: inline-block;
          margin-bottom: 12px;
          color: #14003a;
          font-weight: 700;
          text-decoration: none;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #000000;
        }

        p {
          margin: 0;
          color: #000000;
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card {
          background: #fff;
          border: 1px solid #e7e7ef;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .pill {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          background: #eef2ff;
          color: #3730a3;
        }

        .readOnlyBox {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-weight: 700;
          font-size: 13px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px 18px;
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
          word-break: break-word;
        }

        .big {
          font-size: 18px;
        }

        .metadata pre {
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          overflow: auto;
          font-size: 12px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          color: #fff;
        }

        .releaseButton {
          background: #2563eb;
        }

        .forceButton {
          background: #9333ea;
        }

        .archiveButton {
          background: #64748b;
        }

        @media (max-width: 760px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .top {
            align-items: flex-start;
            flex-direction: column;
          }
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
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="grid">{children}</div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #e7e7ef;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        h2 {
          margin: 0 0 16px;
          font-size: 18px;
          color: #000;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px 18px;
        }

        @media (max-width: 760px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
