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

  const canRelease =
    item &&
    !item.is_immutable &&
    item.current_state === "For Review" &&
    (user?.role === "QA Engineer" || user?.role === "Administrator");

  const canForceRelease =
    item &&
    !item.is_immutable &&
    item.current_state !== "Released" &&
    item.current_state !== "Archived" &&
    user?.role === "Administrator";

  const canArchive =
    item &&
    item.current_state === "Released" &&
    (user?.role === "QA Engineer" || user?.role === "Administrator");

  const isReadOnly =
    item?.is_immutable || item?.current_state === "Archived";

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <Link href="/technical/registry" className="backLink">
              ← Back to Registry
            </Link>
            <h1>Sample Tracking Detail</h1>
            <p>Detailed view of one classified sample.</p>
          </div>
        </div>

        {loading && <div className="card">Loading sample...</div>}

        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && item && (
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
              <div>
                <div className="label">Client</div>
                <div className="value">{item.client_name || "-"}</div>
              </div>

              <div>
                <div className="label">Project</div>
                <div className="value">{item.project_reference || "-"}</div>
              </div>

              <div>
                <div className="label">Material Type</div>
                <div className="value">{item.material_type || "-"}</div>
              </div>

              <div>
                <div className="label">AI Predicted Label</div>
                <div className="value">{item.ai_predicted_label || "-"}</div>
              </div>

              <div>
                <div className="label">Confidence</div>
                <div className="value">
                  {typeof item.ai_confidence_score === "number"
                    ? `${Math.round(item.ai_confidence_score * 100)}%`
                    : "-"}
                </div>
              </div>

              <div>
                <div className="label">Decision</div>
                <div className="value">{item.decision || "-"}</div>
              </div>

              <div>
                <div className="label">Model Version</div>
                <div className="value">{item.model_version || "-"}</div>
              </div>

              <div>
                <div className="label">Branch ID</div>
                <div className="value">{item.branch_id || "-"}</div>
              </div>

              <div>
                <div className="label">Registered By</div>
                <div className="value">{item.registered_by || "-"}</div>
              </div>

              <div>
                <div className="label">Immutable</div>
                <div className="value">{String(item.is_immutable)}</div>
              </div>

              <div>
                <div className="label">Image Path</div>
                <div className="value">{item.image_path || "-"}</div>
              </div>

              <div>
                <div className="label">Timestamp</div>
                <div className="value">
                  {item.intake_timestamp || item.inference_timestamp || "-"}
                </div>
              </div>
            </div>

            <div className="metadata">
              <div className="label">Device Metadata</div>
              <pre>{JSON.stringify(item.device_metadata || {}, null, 2)}</pre>
            </div>

            {(canRelease || canForceRelease || canArchive) && (
              <div className="actions">
                {canRelease && (
                  <button className="releaseButton" onClick={handleRelease}>
                    Release
                  </button>
                )}

                {canForceRelease && (
                  <button className="forceButton" onClick={handleRelease}>
                    Force Release
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
          margin-bottom: 20px;
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
          margin-top: 20px;
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