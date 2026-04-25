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
      await apiClient.updateSampleStatus(sampleId, { status: "Released" });
      await loadSample();
    } catch (err) {
      alert(err.message || "Release failed");
    }
  }

  async function handleArchive() {
    try {
      await apiClient.updateSampleStatus(sampleId, { status: "Archived" });
      await loadSample();
    } catch (err) {
      alert(err.message || "Archive failed");
    }
  }

  async function handleStartTesting() {
    try {
      await apiClient.updateSampleStatus(sampleId, { status: "In Testing" });
      await loadSample();
    } catch (err) {
      alert(err.message || "Failed to start testing");
    }
  }

  async function handleSubmitForReview() {
    try {
      await apiClient.updateSampleStatus(sampleId, { status: "For Review" });
      await loadSample();
    } catch (err) {
      alert(err.message || "Failed to submit for review");
    }
  }

  function handlePrintReport() {
    window.print();
  }

  useEffect(() => {
    loadSample();
  }, [sampleId]);

  const metadata = item?.device_metadata || {};
  const trf = metadata.trf || {};
  const payment = metadata.payment || {};
  const testSlip = metadata.test_slip || {};
  const testData = metadata.test_data || null;
  const testValues = testData?.values || {};
  const qa = metadata.qa || {};
  const finalResult = getFinalResult(testData);
  const specificationStatus = getSpecificationStatus(finalResult);

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

  const isReleased = item?.current_state === "Released";
  const isArchived = item?.current_state === "Archived";
  const isReadOnly = item?.is_immutable || isArchived || isReleased;

  return (
    <div className="admin-container">
      <nav className="breadcrumb-nav no-print">
        <Link href="/technical/registry" className="back-button">
          Back to Registry
        </Link>
      </nav>

      <header className="main-header no-print">
        <div className="title-block">
          <h1>
            Sample Detail <span className="id-sub">#{sampleId}</span>
          </h1>
          <p className="description">
            Comprehensive technical record and workflow management.
          </p>
        </div>

        {!loading && item && (
          <div className="header-meta">
            <div className="status-indicator">
              <span className="dot"></span>
              {item.current_state || "Unknown State"}
            </div>
          </div>
        )}
      </header>

      {loading && (
        <div className="loading-state">Initializing secure data fetch...</div>
      )}

      {!loading && error && <div className="error-notice">{error}</div>}

      {!loading && !error && item && (
        <main className="content-layout">
          <div className="primary-column">
            {isReadOnly && (
              <div className="status-banner info no-print">
                <strong>Read-Only Record:</strong> This record has been
                released, archived, or marked immutable.
              </div>
            )}

            {isReleased && testData && (
              <OfficialReport
                item={item}
                trf={trf}
                payment={payment}
                testData={testData}
                testValues={testValues}
                qa={qa}
                onPrint={handlePrintReport}
              />
            )}

            <section className="data-card no-print">
              <h2 className="card-heading">Core Specifications</h2>

              <div className="data-grid">
                <Info label="Sample ID" value={item.sample_id} emphasis />
                <Info label="Material Type" value={item.material_type} />
                <Info label="Project Ref" value={item.project_reference} />
                <Info label="Client" value={item.client_name} />
                <Info
                  label="AI Prediction"
                  value={item.ai_predicted_label}
                  emphasis
                />
                <Info
                  label="AI Confidence"
                  value={
                    typeof item.ai_confidence_score === "number"
                      ? `${Math.round(item.ai_confidence_score * 100)}%`
                      : "-"
                  }
                />
                <Info label="Decision" value={item.decision} />
                <Info label="Branch ID" value={item.branch_id} />
              </div>
            </section>

            <div className="dual-section no-print">
              <Section title="Test Request Form (TRF)">
                <Info
                  label="Client Name"
                  value={trf.client_name || item.client_name}
                />
                <Info label="Requested Test" value={trf.requested_test_type} />
                <Info
                  label="Project ID"
                  value={trf.project_identifier || item.project_reference}
                />
                <Info label="Branch" value={trf.registry_branch} />
              </Section>

              <Section title="Payment and Billing">
                <Info label="Payment Status" value={payment.payment_status} />
                <Info label="Requirement" value={payment.payment_requirement} />
                <Info label="Amount Paid" value={payment.amount_paid} />
                <Info label="Balance" value={payment.balance} />
              </Section>
            </div>

            <div className="no-print">
              <Section title="Technical Test Slip">
                <Info label="Weight" value={testSlip.weight} />
                <Info label="Diameter" value={testSlip.diameter} />
                <Info label="Condition" value={testSlip.condition_notes} />
                <Info
                  label="Sample Verified"
                  value={testSlip.actual_sample_checked ? "Yes" : "No"}
                />
              </Section>
            </div>

            {testData && (
              <section className="data-card test-result-card no-print">
                <div className="test-result-header">
                  <div>
                    <h2 className="card-heading">
                      Computed and Reviewed Test Result
                    </h2>
                    <p className="result-subtitle">
                      System-generated result with QA-reviewed final report
                      result.
                    </p>
                  </div>

                  <ResultBadge result={finalResult} />
                </div>

                <div className="data-grid">
                  <Info
                    label="Test Type"
                    value={formatFieldLabel(testData.test_type)}
                    emphasis
                  />
                  <Info label="Standard" value={testValues.standard} />
                  <Info label="System Result" value={getSystemResult(testData)} />
                  <Info label="QA Final Result" value={finalResult} emphasis />
                  <Info
                    label="Specification Status"
                    value={specificationStatus}
                    emphasis
                  />
                  <Info
                    label="System Remarks"
                    value={testData.system_remarks || testData.remarks}
                  />
                  <Info label="Technician Remarks" value={testData.remarks} />
                  <Info label="Entered By" value={testData.entered_by} />
                  <Info
                    label="Entered At"
                    value={formatDate(testData.entered_at)}
                  />
                  <Info
                    label="Computed By System"
                    value={
                      testData.computed_by_system === true
                        ? "Yes"
                        : testData.computed_by_system === false
                          ? "No"
                          : "-"
                    }
                  />
                </div>

                {getQaOverride(testData) && (
                  <div className="qa-review-box">
                    <h3>QA Result Review</h3>

                    <div className="data-grid">
                      <Info
                        label="Original System Result"
                        value={getQaOverride(testData).system_result}
                      />
                      <Info
                        label="QA Final Result"
                        value={getQaOverride(testData).override_result}
                        emphasis
                      />
                      <Info
                        label="Specification Status"
                        value={getSpecificationStatus(
                          getQaOverride(testData).override_result,
                        )}
                        emphasis
                      />
                      <Info
                        label="Override Applied"
                        value={
                          getQaOverride(testData).is_overridden ? "Yes" : "No"
                        }
                      />
                      <Info
                        label="Reviewed By"
                        value={getQaOverride(testData).overridden_by}
                      />
                      <Info
                        label="Reviewed At"
                        value={formatDate(getQaOverride(testData).overridden_at)}
                      />
                      <Info
                        label="Review / Override Reason"
                        value={getQaOverride(testData).override_reason}
                      />
                    </div>
                  </div>
                )}

                <div className="computed-values">
                  <h3>Recorded / Computed Values</h3>

                  <div className="computed-grid">
                    {Object.entries(testValues).map(([key, value]) => (
                      <Info
                        key={key}
                        label={formatFieldLabel(key)}
                        value={formatValue(value)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!testData && (
              <section className="data-card muted-card no-print">
                <h2 className="card-heading">Computed Test Result</h2>
                <p className="muted-text">
                  No test data has been entered for this sample yet.
                </p>
              </section>
            )}
          </div>

          <aside className="secondary-column no-print">
            <div className="sidebar-card">
              <h3 className="sidebar-heading">Record Metadata</h3>

              <div className="sidebar-list">
                <div className="list-item">
                  <span className="label">Registered By</span>
                  <span className="value">{item.registered_by || "-"}</span>
                </div>

                <div className="list-item">
                  <span className="label">Last Action</span>
                  <span className="value">
                    {formatDate(
                      item.intake_timestamp || item.inference_timestamp,
                    )}
                  </span>
                </div>

                <div className="list-item">
                  <span className="label">Model Version</span>
                  <span className="value">{item.model_version || "-"}</span>
                </div>
              </div>
            </div>

            {testData && (
              <div className="sidebar-card">
                <h3 className="sidebar-heading">Testing Summary</h3>

                <div className="sidebar-list">
                  <div className="list-item">
                    <span className="label">Test Type</span>
                    <span className="value">
                      {formatFieldLabel(testData.test_type)}
                    </span>
                  </div>

                  <div className="list-item">
                    <span className="label">Standard</span>
                    <span className="value">{testValues.standard || "-"}</span>
                  </div>

                  <div className="list-item">
                    <span className="label">QA Final Result</span>
                    <ResultBadge result={finalResult} small />
                  </div>

                  <div className="list-item">
                    <span className="label">Specification Status</span>
                    <span className="value">{specificationStatus}</span>
                  </div>

                  {getQaOverride(testData)?.is_overridden && (
                    <div className="list-item">
                      <span className="label">Original System Result</span>
                      <ResultBadge result={getSystemResult(testData)} small />
                    </div>
                  )}
                </div>
              </div>
            )}

            {isReleased && (
              <div className="sidebar-card">
                <h3 className="sidebar-heading">Official Report</h3>
                <p className="side-note">
                  This report documents the actual laboratory result. It does
                  not imply material acceptance unless separately certified by
                  authorized personnel.
                </p>
                <button className="btn btn-primary" onClick={handlePrintReport}>
                  Print / Save Report
                </button>
              </div>
            )}

            <div className="sidebar-card raw-meta">
              <details>
                <summary>View System JSON</summary>
                <div className="json-container">
                  <pre>{JSON.stringify(metadata, null, 2)}</pre>
                </div>
              </details>
            </div>

            {(canStartTesting ||
              canSubmitForReview ||
              canRelease ||
              canArchive) && (
              <div className="action-card">
                <h3 className="sidebar-heading">Workflow Actions</h3>

                <div className="action-stack">
                  {canStartTesting && (
                    <button
                      className="btn btn-primary"
                      onClick={handleStartTesting}
                    >
                      Start Laboratory Testing
                    </button>
                  )}

                  {canSubmitForReview && (
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmitForReview}
                    >
                      Submit for QA Review
                    </button>
                  )}

                  {canRelease && (
                    <button className="btn btn-success" onClick={handleRelease}>
                      Release Official Report
                    </button>
                  )}

                  {canArchive && (
                    <button className="btn btn-outline" onClick={handleArchive}>
                      Archive Record
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </main>
      )}

      <style jsx>{`
        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px 100px;
          color: #1a1c21;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .breadcrumb-nav {
          margin-bottom: 24px;
        }

        .back-button {
          text-decoration: none;
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .back-button:hover {
          color: #111827;
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 32px;
          border-bottom: 1px solid #d1d5db;
          margin-bottom: 32px;
          gap: 20px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.01em;
        }

        .id-sub {
          color: #9ca3af;
          font-weight: 500;
          font-size: 20px;
          margin-left: 8px;
        }

        .description {
          color: #6b7280;
          margin: 4px 0 0;
          font-size: 14px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 13px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          white-space: nowrap;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .content-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 32px;
          align-items: start;
        }

        .loading-state {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .error-notice {
          padding: 20px;
          background: #fff7f7;
          color: #b91c1c;
          border-radius: 14px;
          border: 1px solid #fca5a5;
        }

        .data-card {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .card-heading {
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 20px;
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .dual-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .status-banner {
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 13px;
          margin-bottom: 24px;
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }

        .test-result-card {
          border-color: #93c5fd;
          background: #ffffff;
        }

        .test-result-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .test-result-header .card-heading {
          margin-bottom: 4px;
        }

        .result-subtitle {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .qa-review-box {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #d1d5db;
        }

        .qa-review-box h3 {
          margin: 0 0 16px;
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .computed-values {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #d1d5db;
        }

        .computed-values h3 {
          margin: 0 0 16px;
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .computed-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .muted-card {
          background: #ffffff;
        }

        .muted-text {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .sidebar-card {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .sidebar-heading {
          font-size: 11px;
          font-weight: 800;
          color: #6b7280;
          text-transform: uppercase;
          margin: 0 0 16px;
          letter-spacing: 0.05em;
        }

        .sidebar-list {
          display: grid;
          gap: 12px;
        }

        .list-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .list-item .label {
          font-size: 10px;
          color: #9ca3af;
          text-transform: uppercase;
          font-weight: 800;
        }

        .list-item .value {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          word-break: break-word;
        }

        .side-note {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #4b5563;
        }

        .raw-meta {
          padding: 0;
          overflow: hidden;
        }

        .raw-meta summary {
          padding: 12px 20px;
          font-size: 12px;
          color: #4b5563;
          cursor: pointer;
          font-weight: 700;
          background: #f8fafc;
          list-style: none;
        }

        .raw-meta summary:hover {
          background: #f1f5f9;
        }

        .json-container {
          background: #0f172a;
        }

        .raw-meta pre {
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #e2e8f0;
          padding: 20px;
          margin: 0;
          overflow: auto;
          max-height: 500px;
        }

        .action-card {
          background: #fff;
          border: 1px solid #111827;
          border-radius: 18px;
          padding: 20px;
          position: sticky;
          top: 20px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .action-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background-color 180ms ease,
            transform 100ms ease,
            box-shadow 100ms ease;
          border: 1px solid transparent;
        }

        .btn:hover {
          transform: scale(1.01);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .btn-primary {
          background: #111827;
          color: #fff;
        }

        .btn-primary:hover {
          background: #374151;
        }

        .btn-success {
          background: #059669;
          color: #fff;
        }

        .btn-success:hover {
          background: #047857;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .btn-outline:hover {
          background: #f9fafb;
        }

        @media (max-width: 900px) {
          .content-layout {
            grid-template-columns: 1fr;
          }

          .dual-section {
            grid-template-columns: 1fr;
          }

          .data-grid,
          .computed-grid {
            grid-template-columns: 1fr 1fr;
          }

          .action-card {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .admin-container {
            padding: 24px 16px 120px;
          }

          .main-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .data-grid,
          .computed-grid {
            grid-template-columns: 1fr;
          }

          .test-result-header {
            flex-direction: column;
          }
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .official-report,
          .official-report * {
            visibility: visible !important;
          }

          .official-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          .no-print {
            display: none !important;
          }

          .admin-container {
            max-width: none;
            padding: 0;
            margin: 0;
            font-family: Arial, sans-serif;
          }

          .content-layout {
            display: block;
          }

          .primary-column {
            width: 100%;
          }

          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>
    </div>
  );
}

function OfficialReport({
  item,
  trf,
  payment,
  testData,
  testValues,
  qa,
  onPrint,
}) {
  const systemResult = getSystemResult(testData) || "RECORDED";
  const finalResult = getFinalResult(testData) || systemResult;
  const specificationStatus = getSpecificationStatus(finalResult);
  const qaOverride = getQaOverride(testData);
  const result = finalResult;
  const generatedAt = new Date().toLocaleString();
  const reportNumber = `RPT-${item.sample_id}`;

  return (
    <section className="official-report">
      <div className="report-actions no-print">
        <div>
          <p className="actions-eyebrow">Released Official Record</p>
          <h2>Laboratory Test Report Preview</h2>
          <p>Review the finalized report before printing or saving a PDF copy.</p>
        </div>

        <button className="print-btn" onClick={onPrint}>
          Print / Save as PDF
        </button>
      </div>

      <article className="report-sheet">
        <header className="report-header">
          <div>
            <p className="system-name">MATRIQ LIMS</p>
            <h1>Official Laboratory Test Report</h1>
            <p className="subtitle">
              AI-assisted documentation and workflow tracking for construction
              material testing laboratories.
            </p>
          </div>

          <div className="report-meta-box">
            <span>Report No.</span>
            <strong>{reportNumber}</strong>
            <small>Generated: {generatedAt}</small>
          </div>
        </header>

        <section className="report-summary-strip">
          <div>
            <span>Sample ID</span>
            <strong>{item.sample_id}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{item.current_state || "Released"}</strong>
          </div>

          <div>
            <span>Branch</span>
            <strong>
              {item.branch_id === 2 ? "Pateros Branch" : "Marikina Branch"}
            </strong>
          </div>

          <div>
            <span>QA Final Result</span>
            <strong className={`result-word ${result.toLowerCase()}`}>
              {result}
            </strong>
          </div>
        </section>

        <section className="report-warning">
          <strong>Report Scope:</strong> This report documents the recorded
          laboratory test outcome stored in Matriq. QA release confirms report
          authorization and record finalization. This report does not
          independently certify material acceptance.
        </section>

        <section className="result-block">
          <div>
            <span className="block-label">Specification Status</span>
            <strong className={`result-text ${result.toLowerCase()}`}>
              {specificationStatus}
            </strong>
            <p>
              {qaOverride?.is_overridden
                ? `QA reviewed the system-computed result (${systemResult}) and finalized the report result as ${finalResult}.`
                : result === "FAIL"
                  ? "The report records a result below the specified requirement. This does not prevent official report release because the report documents the actual result."
                  : result === "PASS"
                    ? "The report records a result that meets the specified requirement based on encoded test data and QA review."
                    : "The report records test data without a project-specific pass/fail threshold."}
            </p>
          </div>

          <ResultBadge result={result} />
        </section>

        <section className="report-section">
          <h3>1. Client and Sample Information</h3>

          <div className="report-table">
            <ReportRow label="Sample ID" value={item.sample_id} />
            <ReportRow label="Client" value={item.client_name} />
            <ReportRow label="Project Reference" value={item.project_reference} />
            <ReportRow
              label="TRF Client"
              value={trf.client_name || item.client_name}
            />
            <ReportRow label="Requested Test" value={trf.requested_test_type} />
            <ReportRow label="Material Type" value={item.material_type} />
            <ReportRow
              label="Branch"
              value={item.branch_id === 2 ? "Pateros Branch" : "Marikina Branch"}
            />
          </div>
        </section>

        <section className="report-section">
          <h3>2. Test Information</h3>

          <div className="report-table">
            <ReportRow
              label="Test Type"
              value={formatFieldLabel(testData.test_type)}
            />
            <ReportRow
              label="Test Name"
              value={testValues.test_name || formatFieldLabel(testData.test_type)}
            />
            <ReportRow label="Applicable Standard" value={testValues.standard} />
            <ReportRow
              label="Computed by System"
              value={testData.computed_by_system ? "Yes" : "No"}
            />
            <ReportRow label="Encoded By" value={testData.entered_by} />
            <ReportRow label="Encoded At" value={formatDate(testData.entered_at)} />
          </div>
        </section>

        <section className="report-section avoid-break">
          <h3>3. QA Result Review</h3>

          <div className="report-table">
            <ReportRow label="Original System Result" value={systemResult} />
            <ReportRow label="QA Final Result" value={finalResult} />
            <ReportRow
              label="Specification Status"
              value={specificationStatus}
            />
            <ReportRow
              label="QA Override Applied"
              value={qaOverride?.is_overridden ? "Yes" : "No"}
            />
            <ReportRow
              label="QA Review / Override Reason"
              value={qaOverride?.override_reason || "No override recorded."}
            />
            <ReportRow
              label="Reviewed By"
              value={qaOverride?.overridden_by || qa.result_reviewed_by || "-"}
            />
            <ReportRow
              label="Reviewed At"
              value={formatDate(
                qaOverride?.overridden_at || qa.result_reviewed_at,
              )}
            />
          </div>
        </section>

        <section className="report-section avoid-break">
          <h3>4. Recorded and Computed Values</h3>

          <div className="values-table">
            {Object.entries(testValues).map(([key, value]) => (
              <ReportRow
                key={key}
                label={formatFieldLabel(key)}
                value={formatValue(value)}
              />
            ))}
          </div>
        </section>

        <section className="report-section avoid-break">
          <h3>5. Remarks</h3>

          <div className="remarks-table">
            <div>
              <span>System Remarks</span>
              <p>{testData.system_remarks || "-"}</p>
            </div>

            <div>
              <span>Technician Remarks</span>
              <p>{testData.remarks || "-"}</p>
            </div>
          </div>
        </section>

        <section className="report-section avoid-break">
          <h3>6. Release and Payment Information</h3>

          <div className="report-table">
            <ReportRow
              label="Payment Status"
              value={payment.payment_status || "-"}
            />
            <ReportRow label="Report Status" value={item.current_state || "-"} />
            <ReportRow
              label="QA Released By"
              value={qa.release_reviewed_by || "-"}
            />
            <ReportRow
              label="QA Released At"
              value={formatDate(qa.release_reviewed_at)}
            />
          </div>
        </section>

        <footer className="report-footer avoid-break">
          <div className="signature-box">
            <div className="signature-line" />
            <strong>Prepared / Encoded By</strong>
            <span>Laboratory Personnel</span>
          </div>

          <div className="signature-box">
            <div className="signature-line" />
            <strong>Authorized for Release By</strong>
            <span>QA Engineer / Authorized Engineer</span>
          </div>
        </footer>

        <p className="footer-note">
          Generated through Matriq AI-Assisted Laboratory Information Management
          System. Physical testing, quantitative interpretation, and compliance
          certification remain under qualified laboratory personnel and
          authorized engineers.
        </p>
      </article>

      <style jsx>{`
        .official-report {
          margin-bottom: 28px;
        }

        .report-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 18px 20px;
          margin-bottom: 20px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .actions-eyebrow,
        .system-name {
          margin: 0 0 4px;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .report-actions h2 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .report-actions p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .print-btn {
          border: none;
          border-radius: 8px;
          background: #111827;
          color: white;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background-color 180ms ease,
            transform 100ms ease,
            box-shadow 100ms ease;
        }

        .print-btn:hover {
          transform: scale(1.01);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .report-sheet {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 34px;
          box-shadow:
            0 4px 16px rgba(0, 0, 0, 0.07),
            0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
          padding-bottom: 18px;
          border-bottom: 3px solid #111827;
          margin-bottom: 16px;
        }

        .report-header h1 {
          margin: 0;
          color: #111827;
          font-size: 24px;
          line-height: 1.2;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #4b5563;
          font-size: 13px;
          line-height: 1.5;
          max-width: 560px;
        }

        .report-meta-box {
          min-width: 220px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
          text-align: right;
          background: #ffffff;
        }

        .report-meta-box span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .report-meta-box strong {
          display: block;
          margin-top: 4px;
          color: #111827;
          font-size: 16px;
          font-weight: 900;
        }

        .report-meta-box small {
          display: block;
          margin-top: 5px;
          color: #4b5563;
          font-size: 11px;
          font-weight: 700;
        }

        .report-summary-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #d1d5db;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 14px;
        }

        .report-summary-strip div {
          padding: 12px;
          border-right: 1px solid #d1d5db;
          background: #ffffff;
        }

        .report-summary-strip div:last-child {
          border-right: none;
        }

        .report-summary-strip span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .report-summary-strip strong {
          color: #111827;
          font-size: 13px;
          font-weight: 900;
        }

        .result-word.pass {
          color: #166534;
        }

        .result-word.fail {
          color: #991b1b;
        }

        .result-word.recorded {
          color: #3730a3;
        }

        .report-warning {
          padding: 11px 13px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          background: #f8fafc;
          color: #334155;
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 14px;
        }

        .report-warning strong {
          color: #111827;
        }

        .result-block {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 20px;
        }

        .block-label {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .result-text {
          display: block;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .result-text.pass {
          color: #166534;
        }

        .result-text.fail {
          color: #991b1b;
        }

        .result-text.recorded {
          color: #3730a3;
        }

        .result-block p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 12px;
          line-height: 1.5;
        }

        .report-section {
          margin-top: 20px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .report-section h3 {
          margin: 0 0 9px;
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding-bottom: 7px;
          border-bottom: 1px solid #d1d5db;
        }

        .report-table,
        .values-table {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          overflow: hidden;
        }

        .remarks-table {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .remarks-table div {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px;
          background: #ffffff;
        }

        .remarks-table span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .remarks-table p {
          margin: 0;
          color: #111827;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .report-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
          margin-top: 42px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .signature-line {
          border-top: 1px solid #111827;
          margin-bottom: 8px;
          height: 1px;
        }

        .signature-box strong {
          display: block;
          color: #111827;
          font-size: 12px;
        }

        .signature-box span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-top: 2px;
        }

        .footer-note {
          margin: 22px 0 0;
          padding-top: 12px;
          border-top: 1px solid #d1d5db;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        @media print {
          .official-report {
            margin: 0;
          }

          .report-sheet {
            width: 100%;
            box-shadow: none;
            border: none;
            border-radius: 0;
            padding: 0;
          }

          .report-header {
            margin-bottom: 12px;
            padding-bottom: 12px;
          }

          .report-header h1 {
            font-size: 17px;
          }

          .subtitle {
            font-size: 10px;
          }

          .system-name {
            font-size: 9px;
          }

          .report-meta-box {
            min-width: 190px;
            padding: 10px;
          }

          .report-meta-box strong {
            font-size: 12px;
          }

          .report-meta-box small {
            font-size: 9px;
          }

          .report-summary-strip {
            margin-bottom: 10px;
          }

          .report-summary-strip div {
            padding: 8px;
            background: white !important;
          }

          .report-summary-strip span {
            font-size: 8px;
          }

          .report-summary-strip strong {
            font-size: 10px;
          }

          .report-meta-box,
          .report-warning,
          .result-block,
          .report-table,
          .values-table,
          .remarks-table div {
            background: white !important;
          }

          .report-warning {
            padding: 8px 10px;
            margin-bottom: 10px;
            font-size: 9px;
          }

          .result-block {
            padding: 8px 10px;
            margin-bottom: 12px;
          }

          .result-text {
            font-size: 15px;
          }

          .result-block p {
            font-size: 9px;
          }

          .report-section {
            margin-top: 12px;
          }

          .report-section h3 {
            font-size: 9px;
            margin-bottom: 6px;
            padding-bottom: 5px;
          }

          .remarks-table {
            gap: 8px;
          }

          .remarks-table div {
            padding: 8px;
          }

          .remarks-table span {
            font-size: 8px;
          }

          .remarks-table p {
            font-size: 9px;
          }

          .report-footer {
            margin-top: 28px;
          }

          .signature-box strong {
            font-size: 10px;
          }

          .signature-box span {
            font-size: 9px;
          }

          .footer-note {
            font-size: 8.5px;
            margin-top: 14px;
          }

          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
}

function Info({ label, value, emphasis }) {
  return (
    <div className="info-cell">
      <div className="label">{label}</div>
      <div className={`value ${emphasis ? "emphasis" : ""}`}>
        {formatValue(value)}
      </div>

      <style jsx>{`
        .info-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .label {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          word-break: break-word;
        }

        .emphasis {
          color: #2563eb;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

function ReportInfo({ label, value }) {
  return (
    <div className="report-info">
      <div className="report-info-label">{label}</div>
      <div className="report-info-value">{formatValue(value)}</div>

      <style jsx>{`
        .report-info {
          display: grid;
          gap: 4px;
          padding: 10px 0;
        }

        .report-info-label {
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .report-info-value {
          font-size: 14px;
          color: #111827;
          font-weight: 800;
          line-height: 1.45;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="report-row">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .report-row {
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
          gap: 16px;
          padding: 9px 12px;
          border-bottom: 1px solid #d1d5db;
          background: #ffffff;
        }

        .report-row:nth-child(even) {
          background: #f8fafc;
        }

        .report-row:last-child {
          border-bottom: none;
        }

        .report-row span {
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .report-row strong {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
          word-break: break-word;
        }

        @media print {
          .report-row {
            grid-template-columns: 170px minmax(0, 1fr);
            padding: 5px 8px;
          }

          .report-row,
          .report-row:nth-child(even) {
            background: white !important;
          }

          .report-row span {
            font-size: 7.8px;
          }

          .report-row strong {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="data-card-sec">
      <h3 className="card-heading-sec">{title}</h3>
      <div className="section-grid">{children}</div>

      <style jsx>{`
        .data-card-sec {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .card-heading-sec {
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 16px;
          text-transform: uppercase;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 8px;
          letter-spacing: 0.025em;
        }

        .section-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
      `}</style>
    </div>
  );
}

function ResultBadge({ result, small = false }) {
  const normalized = result || "RECORDED";

  const cls =
    normalized === "PASS"
      ? "pass"
      : normalized === "FAIL"
        ? "fail"
        : normalized === "RECORDED"
          ? "recorded"
          : normalized === "INCOMPLETE"
            ? "incomplete"
            : "default";

  return (
    <span className={`result-badge ${cls} ${small ? "small" : ""}`}>
      {normalized}

      <style jsx>{`
        .result-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .result-badge.small {
          padding: 6px 10px;
          font-size: 11px;
        }

        .pass {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .fail {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .recorded {
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #a5b4fc;
        }

        .incomplete {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #facc15;
        }

        .default {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        @media print {
          .result-badge {
            background: white !important;
            color: #111827 !important;
            border: 1px solid #111827 !important;
          }
        }
      `}</style>
    </span>
  );
}

function formatFieldLabel(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getSystemResult(testData) {
  return (
    testData?.system_result ||
    testData?.qa_override?.system_result ||
    testData?.result ||
    null
  );
}

function getFinalResult(testData) {
  return testData?.qa_final_result || testData?.result || null;
}

function getQaOverride(testData) {
  return testData?.qa_override || null;
}

function getSpecificationStatus(result) {
  if (result === "PASS") return "Meets Specified Requirement";
  if (result === "FAIL") return "Below Specified Requirement";
  if (result === "RECORDED") return "Recorded Only";
  return "Pending Test Result";
}