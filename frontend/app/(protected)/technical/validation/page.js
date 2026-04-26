"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import { apiClient } from "@/services/apiClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ValidationPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getReviews();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load validation review records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  const pendingItems = useMemo(() => {
    return items.filter((item) => item.status !== "Completed");
  }, [items]);

  const stats = useMemo(() => {
    return pendingItems.reduce(
      (acc, item) => {
        acc.total += 1;

        if (item.status === "Mandatory Override") {
          acc.mandatory += 1;
        } else {
          acc.manual += 1;
        }

        if (
          typeof item.confidence_score === "number" &&
          item.confidence_score < 0.7
        ) {
          acc.lowConfidence += 1;
        }

        return acc;
      },
      {
        total: 0,
        manual: 0,
        mandatory: 0,
        lowConfidence: 0,
      },
    );
  }, [pendingItems]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Validation Review</h1>
          <p>
            Review AI classification cases that require Senior Technician
            validation context.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadReviews}>
          Refresh
        </Button>
      </header>

      <section className="notice">
        <strong>Workflow ownership</strong>
        <span>
          Validation decisions are handled in the Workflow Monitor. This page is
          for reviewing AI confidence, predicted material, sample image, and
          validation context.
        </span>
      </section>

      {loading && <Loader label="Loading validation records..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="stats">
            <StatCard label="Review Cases" value={stats.total} />
            <StatCard label="Manual Review" value={stats.manual} />
            <StatCard label="Mandatory Override" value={stats.mandatory} />
            <StatCard label="Low Confidence" value={stats.lowConfidence} />
          </section>

          {pendingItems.length === 0 ? (
            <Card>
              <EmptyState
                title="No validation cases found"
                description="AI classification review cases will appear here when manual validation is needed."
              />
            </Card>
          ) : (
            <section className="grid">
              {pendingItems.map((item) => (
                <ValidationCard key={item.sample_id} item={item} />
              ))}
            </section>
          )}
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
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        h1 {
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

        .notice {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border: 1px solid var(--color-info-border);
          border-radius: var(--radius-md);
          background: var(--color-info-bg);
          color: var(--color-info);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice strong {
          color: var(--color-info);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          padding: 4px 0 2px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 16px;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .header {
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ValidationCard({ item }) {
  const confidence =
    typeof item.confidence_score === "number"
      ? Math.round(item.confidence_score * 100)
      : null;

  return (
    <Card>
      <article className="validationCard">
        <div className="cardTop">
          <div>
            <span>Sample ID</span>
            <strong>{item.sample_id}</strong>
          </div>

          <StatusBadge status={item.status} />
        </div>

        <div className="materialBlock">
          <span>Predicted Material</span>
          <strong>{normalizeMaterialName(item.predicted_label)}</strong>
        </div>

        <div className="infoGrid">
          <Info label="Client" value={item.client_name} />
          <Info label="Project" value={item.project_id} />
          <Info
            label="Confidence"
            value={confidence !== null ? `${confidence}%` : "-"}
          />
          <Info label="Decision" value={formatLabel(item.decision)} />
          <Info label="Model Version" value={item.model_version} />
          <Info label="Review Type" value={item.status || "Review"} />
        </div>

        <SampleImage sampleId={item.sample_id} />

        <div className="footer">
          <p>
            Approve, reject, or correct the AI classification from the Workflow
            Monitor.
          </p>

          <Link href="/technical/workflow" className="workflowLink">
            Open Workflow
          </Link>
        </div>
      </article>

      <style jsx>{`
        .validationCard {
          display: grid;
          gap: 15px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .cardTop div,
        .materialBlock {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .cardTop span,
        .materialBlock span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cardTop strong {
          color: var(--color-text-primary);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.25;
        }

        .materialBlock strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          line-height: 1.35;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--color-border-soft);
        }

        .footer p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        :global(.workflowLink) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 13px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.workflowLink:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        @media (max-width: 640px) {
          .infoGrid {
            grid-template-columns: 1fr;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </Card>
  );
}

function SampleImage({ sampleId }) {
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");

  async function fetchImage() {
    if (imgSrc) return;

    setImgLoading(true);
    setImgError("");

    try {
      const res = await fetch(`${API_BASE}/api/samples/${sampleId}/image`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to load image (${res.status})`);

      const blob = await res.blob();
      setImgSrc(URL.createObjectURL(blob));
    } catch (err) {
      setImgError(err.message || "Could not load image.");
    } finally {
      setImgLoading(false);
    }
  }

  function toggle() {
    const next = !open;

    setOpen(next);

    if (next) {
      fetchImage();
    }
  }

  return (
    <div className="sampleImage">
      <button className="toggleButton" onClick={toggle} type="button">
        <span>{open ? "Hide Sample Image" : "View Sample Image"}</span>
        <small>{open ? "Collapse" : "Expand"}</small>
      </button>

      {open && (
        <div className="imageBox">
          {imgLoading && <div className="imageStatus">Loading image...</div>}
          {imgError && <div className="imageStatus error">{imgError}</div>}
          {imgSrc && !imgLoading && (
            <img src={imgSrc} alt={`Sample ${sampleId}`} />
          )}
        </div>
      )}

      <style jsx>{`
        .sampleImage {
          display: grid;
          gap: 10px;
        }

        .toggleButton {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          cursor: pointer;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        .toggleButton:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
        }

        .toggleButton span {
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .toggleButton small {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
        }

        .imageBox {
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-overlay);
          min-height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .imageStatus {
          padding: 16px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .imageStatus.error {
          color: var(--color-danger);
        }

        img {
          width: 100%;
          height: auto;
          display: block;
          max-height: 420px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .statCard {
          display: grid;
          gap: 8px;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .info {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const variant = status === "Mandatory Override" ? "danger" : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status || "Review"}
    </Badge>
  );
}

function normalizeMaterialName(value) {
  if (!value) return "-";

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "rsb" ||
    normalized === "rebar" ||
    normalized === "reinforcing steel" ||
    normalized === "reinforcing steel bar" ||
    normalized === "steel bar" ||
    normalized === "metal" ||
    normalized.includes("rsb") ||
    normalized.includes("rebar") ||
    normalized.includes("reinforcing") ||
    normalized.includes("steel") ||
    normalized.includes("metal")
  ) {
    return "Reinforcing Steel Bar";
  }

  if (
    normalized === "soil aggregates" ||
    normalized === "soil aggregate" ||
    normalized === "soil_aggregates" ||
    normalized === "soil-aggregates" ||
    normalized === "aggregate" ||
    normalized === "aggregates" ||
    normalized.includes("soil") ||
    normalized.includes("aggregate")
  ) {
    return "Soil Aggregates";
  }

  if (
    normalized === "concrete" ||
    normalized === "cement concrete" ||
    normalized.includes("concrete") ||
    normalized.includes("cement")
  ) {
    return "Concrete";
  }

  return formatLabel(value);
}

function formatLabel(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}