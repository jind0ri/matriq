"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

const PDF_DOWNLOAD_ROLES = new Set([
  "QA Engineer",
  "Accounting Staff",
  "Administrator",
]);

export default function TrackingDetailPage() {
  const params = useParams();
  const sampleId = params?.sampleId;

  const user = getStoredUser();
  const role = user?.role || "";
  const isAdmin = role === "Administrator";
  const canDownloadOfficialReport = PDF_DOWNLOAD_ROLES.has(role);

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
  const systemResult = getSystemResult(testData);
  const qaOverride = getQaOverride(testData);
  const specificationStatus = getSpecificationStatus(finalResult);

  const lifecycleState = item?.current_state || item?.status;

  const isReleased = lifecycleState === "Released";
  const isArchived = lifecycleState === "Archived";
  const isFinalized = isReleased || isArchived;
  const isReadOnly = item?.is_immutable || isFinalized;

  const canArchiveSample =
    (role === "QA Engineer" || role === "Administrator") &&
    isReleased;

  async function handleDownloadPdfReport() {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    if (!token) {
      setError("Missing login token. Please log in again.");
      return;
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${baseUrl}/api/samples/${sampleId}/report/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Failed to download PDF report.",
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${sampleId}_official_report.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download PDF report.");
    }
  }

  async function handleDownloadExcelReport() {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    if (!token) {
      setError("Missing login token. Please log in again.");
      return;
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${baseUrl}/api/samples/${sampleId}/report/excel`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Failed to download Excel report.",
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${sampleId}-official-report.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download Excel report.");
    }
  }

  async function handleArchiveSample() {
    if (!sampleId) return;

    setError("");

    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "Archived",
        new_state: "Archived",
      });

      await loadSample();
    } catch (err) {
      setError(err.message || "Failed to archive sample.");
    }
  }

  return (
    <div className="page">
      <header className="header no-print">
        <div>
          <h1>Sample Tracking</h1>
          <p>
            Full technical workflow record for <strong>{sampleId}</strong>.
          </p>
        </div>

        {!loading && item && (
          <div className="headerActions">
            <LifecycleBadge status={item.current_state} />

            <Button variant="secondary" size="sm" onClick={loadSample}>
              Refresh
            </Button>

            {canArchiveSample && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleArchiveSample}
              >
                Archive
              </Button>
            )}
          </div>
        )}
      </header>

      {loading && <Loader label="Loading sample detail..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && !item && (
        <EmptyState
          title="Sample not found"
          description="The selected tracking record could not be loaded."
        />
      )}

      {!loading && !error && item && (
        <>
          {isReadOnly && (
            <section className="notice no-print">
              <strong>Read-only record</strong>
              <span>
                This sample has been released, archived, or marked immutable.
                Workflow changes are restricted.
              </span>
            </section>
          )}

          {isFinalized && testData && (
            <OfficialReport
              item={item}
              trf={trf}
              payment={payment}
              testData={testData}
              testValues={testValues}
              qa={qa}
              onPrint={handleDownloadPdfReport}
              onDownloadExcel={handleDownloadExcelReport}
              canDownloadOfficialReport={canDownloadOfficialReport}
            />
          )}

          <main className="contentGrid no-print">
            <section className="mainColumn">
              <Card
                title="Core Specifications"
                subtitle="Sample identity and registration context."
              >
                <div className="detailGrid">
                  <Detail label="Sample ID" value={item.sample_id} />
                  <Detail
                    label="Material Type"
                    value={normalizeMaterialName(
                      item.material_type || item.ai_predicted_label,
                    )}
                  />
                  <Detail
                    label="Project Reference"
                    value={item.project_reference}
                  />
                  <Detail label="Client" value={item.client_name} />
                  <Detail
                    label="AI Prediction"
                    value={normalizeMaterialName(item.ai_predicted_label)}
                  />
                  <Detail
                    label="AI Confidence"
                    value={formatConfidence(item.ai_confidence_score)}
                  />
                  <Detail label="Decision" value={item.decision} />
                  <Detail label="Branch" value={formatBranch(item.branch_id)} />
                </div>
              </Card>

              <section className="dualGrid">
                <Card
                  title="Test Request Form"
                  subtitle="TRF details linked to the sample."
                >
                  <div className="stackDetails">
                    <Detail
                      label="Client Name"
                      value={trf.client_name || item.client_name}
                    />
                    <Detail
                      label="Requested Test"
                      value={trf.requested_test_type}
                    />
                    <Detail
                      label="Project ID"
                      value={trf.project_identifier || item.project_reference}
                    />
                    <Detail
                      label="Branch"
                      value={formatBranch(
                        trf.registry_branch || item.branch_id,
                      )}
                    />
                  </div>
                </Card>

                <Card
                  title="Payment and Billing"
                  subtitle="Financial readiness for testing and release."
                >
                  <div className="stackDetails">
                    <Detail
                      label="Payment Status"
                      value={payment.payment_status || "Unpaid"}
                    />
                    <Detail
                      label="Requirement"
                      value={payment.payment_requirement}
                    />
                    <Detail
                      label="Amount Paid"
                      value={formatCurrency(payment.amount_paid)}
                    />
                    <Detail
                      label="Balance"
                      value={formatCurrency(payment.balance)}
                    />
                    <Detail
                      label="Updated By"
                      value={
                        payment.payment_updated_by_name ||
                        payment.payment_updated_by_display ||
                        payment.payment_updated_by_full_name ||
                        formatUser(payment.payment_updated_by)
                      }
                    />
                  </div>
                </Card>
              </section>

              <Card
                title="Technical Test Slip"
                subtitle="Physical sample verification details."
              >
                <div className="detailGrid">
                  <Detail label="Weight" value={testSlip.weight} />
                  <Detail label="Diameter" value={testSlip.diameter} />
                  <Detail label="Condition" value={testSlip.condition_notes} />
                  <Detail
                    label="Sample Verified"
                    value={testSlip.actual_sample_checked ? "Yes" : "No"}
                  />
                </div>
              </Card>

              {testData ? (
                <Card
                  title="Computed and Reviewed Test Result"
                  subtitle="System-generated result and QA final result."
                >
                  <div className="resultHeader">
                    <div>
                      <span>QA Final Result</span>
                      <strong>{finalResult || "No Result"}</strong>
                    </div>

                    <ResultBadge result={finalResult} />
                  </div>

                  <div className="detailGrid">
                    <Detail
                      label="Test Type"
                      value={formatFieldLabel(testData.test_type)}
                    />
                    <Detail label="Standard" value={testValues.standard} />
                    <Detail label="System Result" value={systemResult} />
                    <Detail label="QA Final Result" value={finalResult} />
                    <Detail
                      label="Specification Status"
                      value={specificationStatus}
                    />
                    <Detail
                      label="System Remarks"
                      value={testData.system_remarks || testData.remarks}
                    />
                    <Detail
                      label="Technician Remarks"
                      value={testData.remarks}
                    />
                    <Detail
                      label="Entered By"
                      value={
                        testData.entered_by_name ||
                        testData.entered_by_display ||
                        testData.entered_by_full_name ||
                        formatUser(testData.entered_by)
                      }
                    />
                    <Detail
                      label="Entered At"
                      value={formatDate(testData.entered_at)}
                    />
                    <Detail
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

                  {qaOverride && (
                    <section className="subSection">
                      <div className="sectionTitle">
                        <h3>QA Result Review</h3>
                        <ResultBadge result={qaOverride.override_result} />
                      </div>

                      <div className="detailGrid">
                        <Detail
                          label="Original System Result"
                          value={qaOverride.system_result}
                        />
                        <Detail
                          label="QA Final Result"
                          value={qaOverride.override_result}
                        />
                        <Detail
                          label="Specification Status"
                          value={getSpecificationStatus(
                            qaOverride.override_result,
                          )}
                        />
                        <Detail
                          label="Override Applied"
                          value={qaOverride.is_overridden ? "Yes" : "No"}
                        />
                        <Detail
                          label="Reviewed By"
                          value={
                            qaOverride.overridden_by_name ||
                            qaOverride.overridden_by_display ||
                            qaOverride.overridden_by_full_name ||
                            formatUser(qaOverride.overridden_by)
                          }
                        />
                        <Detail
                          label="Reviewed At"
                          value={formatDate(qaOverride.overridden_at)}
                        />
                        <Detail
                          label="Review / Override Reason"
                          value={qaOverride.override_reason}
                          wide
                        />
                      </div>
                    </section>
                  )}

                  <section className="subSection">
                    <div className="sectionTitle">
                      <h3>Recorded / Computed Values</h3>
                    </div>

                    {Object.keys(testValues).length === 0 ? (
                      <p className="mutedText">
                        No recorded computed values found.
                      </p>
                    ) : (
                      <div className="computedGrid">
                        {Object.entries(testValues).map(([key, value]) => (
                          <Detail
                            key={key}
                            label={formatFieldLabel(key)}
                            value={formatValue(value)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </Card>
              ) : (
                <Card
                  title="Computed Test Result"
                  subtitle="No test data has been entered yet."
                >
                  <p className="mutedText">
                    Test results will appear here once laboratory data is
                    encoded in the Workflow page.
                  </p>
                </Card>
              )}
            </section>

            <aside className="sideColumn">
              <SampleImagePreview sampleId={item.sample_id} />
              <Card title="Record Metadata">
                <div className="sideList">
                  <SideItem
                    label="Registered By"
                    value={
                      item.registered_by_name ||
                      item.registered_by_display ||
                      item.registered_by_full_name ||
                      formatUser(item.registered_by)
                    }
                  />
                  <SideItem
                    label="Last Action"
                    value={formatDate(
                      item.intake_timestamp ||
                      item.inference_timestamp ||
                      item.updated_at,
                    )}
                  />
                  <SideItem label="Model Version" value={item.model_version} />
                  <SideItem
                    label="Branch"
                    value={formatBranch(item.branch_id)}
                  />
                </div>
              </Card>

              {testData && (
                <Card title="Testing Summary">
                  <div className="sideList">
                    <SideItem
                      label="Test Type"
                      value={formatFieldLabel(testData.test_type)}
                    />
                    <SideItem label="Standard" value={testValues.standard} />
                    <div className="sideBadgeRow">
                      <span>QA Final Result</span>
                      <ResultBadge result={finalResult} />
                    </div>
                    <SideItem
                      label="Specification Status"
                      value={specificationStatus}
                    />
                    {qaOverride?.is_overridden && (
                      <div className="sideBadgeRow">
                        <span>Original System Result</span>
                        <ResultBadge result={systemResult} />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {isFinalized && (
                <Card title="Official Report">
                  <p className="sideNote">
                    This report documents the actual laboratory result. It does
                    not imply material acceptance unless separately certified.
                  </p>

                  {canDownloadOfficialReport ? (
                    <div className="sideActions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadPdfReport}
                      >
                        Print / Save Report
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadExcelReport}
                      >
                        Download Excel
                      </Button>
                    </div>
                  ) : (
                    <p className="sideNote">
                      Official report downloads are restricted to QA Engineers,
                      Accounting Staff, and Administrators.
                    </p>
                  )}
                </Card>
              )}

              {isAdmin && (
                <Card title="System JSON">
                  <details>
                    <summary>View raw metadata</summary>
                    <pre>{JSON.stringify(metadata, null, 2)}</pre>
                  </details>
                </Card>
              )}

              <Card title="Workflow Ownership">
                <p className="sideNote">
                  Workflow actions are now handled in the Workflow Monitor. This
                  tracking page is kept as the full detail, history, and report
                  reference for the sample.
                </p>

                <Link href="/technical/workflow" className="sideLinkButton">
                  Open Workflow
                </Link>
              </Card>
            </aside>
          </main>
        </>
      )}

      <style jsx>{`
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 24px 96px;
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
          padding-bottom: 18px;
          border-bottom: 1px solid var(--color-border-soft);
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
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .notice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-info-border);
          background: var(--color-info-bg);
          color: var(--color-info);
          padding: 12px 14px;
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .notice strong {
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 22px;
          align-items: start;
        }

        .mainColumn,
        .sideColumn {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .imageFrame {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  background: var(--color-overlay);
  padding: 10px;
}

.imageFrame img {
  max-width: 100%;
  max-height: 220px; /* 👈 keeps it SMALL */
  object-fit: contain;
  border-radius: var(--radius-sm);
}

        .dualGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .detailGrid,
        .computedGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .stackDetails {
          display: grid;
          gap: 14px;
        }

        .resultHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 13px 14px;
          margin-bottom: 16px;
        }

        .resultHeader span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .resultHeader strong {
          display: block;
          margin-top: 4px;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
        }

        .subSection {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--color-border-soft);
        }

        .sectionTitle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }

        .sectionTitle h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .mutedText,
        .sideNote {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .sideList {
          display: grid;
          gap: 13px;
        }

        .sideBadgeRow {
          display: grid;
          gap: 5px;
        }

        .sideBadgeRow span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sideActions {
          display: grid;
          gap: 8px;
        }

        :global(.sideLinkButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 34px;
          margin-top: 14px;
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
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.sideLinkButton:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        details {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        summary {
          cursor: pointer;
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        pre {
          width: 100%;
          max-width: 100%;
          max-height: 360px;
          overflow: auto;
          margin: 10px 0 0;
          padding: 12px;
          border-radius: var(--radius-md);
          background: #0f172a;
          color: #e2e8f0;
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          box-sizing: border-box;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        :global(.sideColumn > *) {
          min-width: 0;
        }

        :global(.sideColumn details) {
          min-width: 0;
          max-width: 100%;
        }

        :global(.sideColumn summary) {
          max-width: 100%;
        }

        @media (max-width: 980px) {
          .contentGrid {
            grid-template-columns: 1fr;
          }

          .dualGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 24px 16px 96px;
          }

          .header {
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .detailGrid,
          .computedGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .detailGrid,
          .computedGrid {
            grid-template-columns: 1fr;
          }

          .resultHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media print {
          html,
          body {
            width: 210mm;
            min-height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .page {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          .no-print,
          .contentGrid,
          .notice,
          .header {
            display: none !important;
          }

          .official-report {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .official-report,
          .official-report * {
            visibility: visible !important;
          }

          .official-report :global(section),
          .official-report :global(article),
          .official-report :global(div) {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .official-report :global(.card) {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .official-report :global(.no-print-card-header > .header) {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}

function SampleImagePreview({ sampleId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sampleId) return;

    let objectUrl = "";

    async function loadImage() {
      setFailed(false);
      setImageUrl("");

      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");

      if (!token) {
        setFailed(true);
        return;
      }

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

        const response = await fetch(`${baseUrl}/api/samples/${sampleId}/image`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Image not available");

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        setFailed(true);
      }
    }

    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sampleId]);

  return (
    <Card
      title="Sample Image"
      subtitle="Uploaded image used for AI material identification."
    >
      <div className="imageFrame">
        {imageUrl && !failed ? (
          <img src={imageUrl} alt={`Sample ${sampleId}`} />
        ) : (
          <div className="imageEmpty">No image available.</div>
        )}
      </div>

      <style jsx>{`
        .imageFrame {
          display: grid;
          place-items: center;
          min-height: 150px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 8px;
        }

        .imageFrame img {
          display: block;
          width: 100%;
          max-height: 190px;
          object-fit: contain;
          border-radius: var(--radius-sm);
        }

        .imageEmpty {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
        }
      `}</style>
    </Card>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={wide ? "detail wide" : "detail"}>
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .detail {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .detail.wide {
          grid-column: 1 / -1;
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

function SideItem({ label, value }) {
  return (
    <div className="sideItem">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .sideItem {
          display: grid;
          gap: 4px;
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

function LifecycleBadge({ status }) {
  const variant =
    status === "Released"
      ? "success"
      : status === "In Testing"
        ? "warning"
        : status === "For Review"
          ? "info"
          : status === "Archived"
            ? "neutral"
            : "brand";

  return (
    <Badge variant={variant} size="sm">
      {status || "-"}
    </Badge>
  );
}

function ResultBadge({ result }) {
  const normalized = result || "RECORDED";

  const variant =
    normalized === "PASS"
      ? "success"
      : normalized === "FAIL"
        ? "danger"
        : normalized === "INCOMPLETE"
          ? "warning"
          : normalized === "RECORDED"
            ? "info"
            : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {normalized}
    </Badge>
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
  onDownloadExcel,
  canDownloadOfficialReport,
}) {
  const systemResult = getSystemResult(testData) || "RECORDED";
  const finalResult = getFinalResult(testData) || systemResult;
  const specificationStatus = getSpecificationStatus(finalResult);
  const qaOverride = getQaOverride(testData);
  const reportNumber = `RPT-${item.sample_id}`;
  const generatedAt = new Date().toLocaleString();

  return (
    <section className="official-report">
      <Card
        title="Laboratory Test Report Preview"
        subtitle={
          canDownloadOfficialReport
            ? "Review the finalized report before printing or saving a PDF copy."
            : "Review-only preview of the finalized report."
        }
        className="no-print-card-header"
        actions={
          canDownloadOfficialReport ? (
            <div className="reportActionGroup">
              <Button variant="primary" size="sm" onClick={onPrint}>
                Download PDF
              </Button>

              <Button variant="secondary" size="sm" onClick={onDownloadExcel}>
                Download Excel
              </Button>
            </div>
          ) : null
        }
      >
        <article className="reportSheet">
          <header className="reportHeader">
            <div>
              <p>MATRIQ LIMS</p>
              <h1>Official Laboratory Test Report</h1>
              <span>
                AI-assisted documentation and workflow tracking for construction
                material testing laboratories.
              </span>
            </div>

            <div className="reportMeta">
              <span>Report No.</span>
              <strong>{reportNumber}</strong>
              <small>Generated: {generatedAt}</small>
            </div>
          </header>

          <section className="reportStrip">
            <ReportTile label="Sample ID" value={item.sample_id} />
            <ReportTile
              label="Status"
              value={item.current_state || "Released"}
            />
            <ReportTile label="Branch" value={formatBranch(item.branch_id)} />
            <ReportTile label="QA Final Result" value={finalResult} />
          </section>

          <section className="reportWarning">
            <strong>Report Scope:</strong> This report documents the recorded
            laboratory test outcome stored in Matriq. QA release confirms report
            authorization and record finalization. This report does not
            independently certify material acceptance.
          </section>

          <section className="reportResult">
            <div>
              <span>Specification Status</span>
              <strong>{specificationStatus}</strong>
              <p>
                {qaOverride?.is_overridden
                  ? `QA reviewed the system-computed result (${systemResult}) and finalized the report result as ${finalResult}.`
                  : finalResult === "FAIL"
                    ? "The report records a result below the specified requirement."
                    : finalResult === "PASS"
                      ? "The report records a result that meets the specified requirement."
                      : "The report records test data without a project-specific pass/fail threshold."}
              </p>
            </div>

            <ResultBadge result={finalResult} />
          </section>

          <ReportSection title="1. Client and Sample Information">
            <ReportRow label="Sample ID" value={item.sample_id} />
            <ReportRow label="Client" value={item.client_name} />
            <ReportRow
              label="Project Reference"
              value={item.project_reference}
            />
            <ReportRow
              label="TRF Client"
              value={trf.client_name || item.client_name}
            />
            <ReportRow label="Requested Test" value={trf.requested_test_type} />
            <ReportRow
              label="Material Type"
              value={normalizeMaterialName(item.material_type)}
            />
            <ReportRow label="Branch" value={formatBranch(item.branch_id)} />
          </ReportSection>

          <ReportSection title="2. Test Information">
            <ReportRow
              label="Test Type"
              value={formatFieldLabel(testData.test_type)}
            />
            <ReportRow
              label="Test Name"
              value={
                testValues.test_name || formatFieldLabel(testData.test_type)
              }
            />
            <ReportRow
              label="Applicable Standard"
              value={testValues.standard}
            />
            <ReportRow
              label="Computed by System"
              value={testData.computed_by_system ? "Yes" : "No"}
            />
            <ReportRow
              label="Encoded By"
              value={
                testData.entered_by_name ||
                testData.entered_by_display ||
                testData.entered_by_full_name ||
                formatUser(testData.entered_by)
              }
            />
            <ReportRow
              label="Encoded At"
              value={formatDate(testData.entered_at)}
            />
          </ReportSection>

          <ReportSection title="3. QA Result Review">
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
              value={
                qaOverride?.overridden_by_name ||
                qaOverride?.overridden_by_display ||
                qaOverride?.overridden_by_full_name ||
                qa.result_reviewed_by_name ||
                qa.result_reviewed_by_display ||
                formatUser(qaOverride?.overridden_by || qa.result_reviewed_by)
              }
            />
            <ReportRow
              label="Reviewed At"
              value={formatDate(
                qaOverride?.overridden_at || qa.result_reviewed_at,
              )}
            />
          </ReportSection>

          <ReportSection title="4. Recorded and Computed Values">
            {Object.entries(testValues).map(([key, value]) => (
              <ReportRow
                key={key}
                label={formatFieldLabel(key)}
                value={formatValue(value)}
              />
            ))}
          </ReportSection>

          <ReportSection title="5. Remarks">
            <ReportRow label="System Remarks" value={testData.system_remarks} />
            <ReportRow label="Technician Remarks" value={testData.remarks} />
          </ReportSection>

          <ReportSection title="6. Release and Payment Information">
            <ReportRow label="Payment Status" value={payment.payment_status} />
            <ReportRow label="Report Status" value={item.current_state} />
            <ReportRow
              label="QA Released By"
              value={
                qa.release_reviewed_by_name ||
                qa.release_reviewed_by_display ||
                qa.release_reviewed_by_full_name ||
                formatUser(qa.release_reviewed_by)
              }
            />
            <ReportRow
              label="QA Released At"
              value={formatDate(qa.release_reviewed_at)}
            />
          </ReportSection>

          <footer className="reportFooter">
            <div className="signatureBlock">
              <div className="signatureLine" />
              <strong>Prepared / Encoded By</strong>
              <span>Laboratory Personnel</span>
            </div>

            <div className="signatureBlock">
              <div className="signatureLine" />
              <strong>Authorized for Release By</strong>
              <span>QA Engineer / Authorized Engineer</span>
            </div>
          </footer>

          <p className="footerNote">
            Generated through Matriq AI-Assisted Laboratory Information
            Management System. Physical testing, quantitative interpretation,
            and compliance certification remain under qualified laboratory
            personnel and authorized engineers.
          </p>
        </article>
      </Card>

      <style jsx>{`
        .official-report {
          margin-bottom: 22px;
        }

        .reportSheet {
          display: grid;
          gap: 16px;
        }

        .reportHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding-bottom: 15px;
          border-bottom: 2px solid var(--color-text-primary);
        }

        .reportHeader p {
          margin: 0 0 4px;
          color: var(--color-brand);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .reportHeader h1 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .reportHeader span {
          display: block;
          margin-top: 7px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
          max-width: 560px;
        }

        .reportMeta {
          min-width: 210px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          padding: 13px;
          text-align: right;
        }

        .reportMeta span,
        .reportStrip span,
        .reportResult span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .reportMeta strong {
          display: block;
          margin-top: 4px;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .reportMeta small {
          display: block;
          margin-top: 5px;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
        }

        .reportStrip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .reportWarning {
          padding: 11px 13px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.6;
        }

        .reportWarning strong {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .reportResult {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          padding: 14px;
        }

        .reportResult strong {
          display: block;
          margin-top: 4px;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
        }

        .reportResult p {
          margin: 5px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .reportFooter {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 40px;
          margin-top: 38px;
          align-items: end;
        }

        .reportActionGroup {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .signatureBlock {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 4px;
        }

        .signatureLine {
          width: min(100%, 260px);
          height: 1px;
          border-top: 1px solid var(--color-text-primary);
          margin-bottom: 7px;
        }

        .signatureBlock strong {
          display: block;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .signatureBlock span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 10px;
          margin-top: 1px;
        }

        .footerNote {
          margin: 6px 0 0;
          padding-top: 12px;
          border-top: 1px solid var(--color-border-soft);
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.6;
        }

        @media print {
          .official-report {
            margin: 0 !important;
          }

          .reportSheet {
            gap: 10px;
          }

          .reportHeader {
            gap: 16px;
            padding-bottom: 10px;
            border-bottom-width: 1.5px;
          }

          .reportHeader h1 {
            font-size: 15px;
          }

          .reportHeader p {
            font-size: 8.5px;
          }

          .reportHeader span,
          .reportWarning,
          .reportResult p,
          .footerNote {
            font-size: 8px;
            line-height: 1.35;
          }

          .reportMeta {
            min-width: 165px;
            padding: 9px;
          }

          .reportStrip {
            grid-template-columns: repeat(4, 1fr);
          }

          .reportResult {
            padding: 9px;
          }

          .reportResult strong {
            font-size: 13px;
          }

          .reportFooter {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 26px;
            margin-top: 28px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .signatureLine {
            width: 190px;
            margin-bottom: 6px;
          }

          .signatureBlock strong {
            font-size: 8.5px;
          }

          .signatureBlock span {
            font-size: 7.5px;
          }

          .footerNote {
            padding-top: 8px;
          }
        }

        @media (max-width: 760px) {
          .reportHeader,
          .reportResult {
            flex-direction: column;
          }

          .reportMeta {
            width: 100%;
            text-align: left;
          }

          .reportStrip,
          .reportFooter {
            grid-template-columns: 1fr;
          }

          .signatureBlock {
            justify-items: start;
            text-align: left;
          }

          .signatureLine {
            width: min(100%, 260px);
          }
        }
      `}</style>
    </section>
  );
}

function ReportTile({ label, value }) {
  return (
    <div className="tile">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .tile {
          padding: 11px 12px;
          border-right: 1px solid var(--color-border-soft);
        }

        .tile:last-child {
          border-right: none;
        }

        span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        @media print {
          .tile {
            padding: 7px 8px;
          }

          span {
            font-size: 7.5px;
          }

          strong {
            font-size: 8.5px;
          }
        }

        @media (max-width: 760px) {
          .tile {
            border-right: none;
            border-bottom: 1px solid var(--color-border-soft);
          }

          .tile:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <section className="reportSection">
      <h3>{title}</h3>
      <div>{children}</div>

      <style jsx>{`
        .reportSection {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        h3 {
          margin: 0 0 8px;
          padding-bottom: 7px;
          border-bottom: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        div {
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        @media print {
          h3 {
            margin-bottom: 5px;
            padding-bottom: 4px;
            font-size: 8.8px;
          }
        }
      `}</style>
    </section>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="row">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .row {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 14px;
          padding: 9px 12px;
          border-bottom: 1px solid var(--color-border-soft);
        }

        .row:nth-child(even) {
          background: var(--color-overlay);
        }

        .row:last-child {
          border-bottom: none;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        @media print {
          .row {
            grid-template-columns: 160px minmax(0, 1fr);
            gap: 8px;
            padding: 4px 7px;
          }

          span {
            font-size: 7px;
          }

          strong {
            font-size: 8px;
            line-height: 1.25;
          }
        }

        @media (max-width: 640px) {
          .row {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </div>
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

  return formatFieldLabel(value);
}

function formatFieldLabel(value) {
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

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `₱${Number(value || 0).toLocaleString()}`;
}

function formatConfidence(value) {
  if (typeof value !== "number") return "-";
  return `${Math.round(value * 100)}%`;
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}

function formatUser(userId) {
  if (!userId) return "-";

  const value = String(userId);

  if (Number.isNaN(Number(value))) {
    return value;
  }

  return `User ${value}`;
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
  return (
    testData?.qa_final_result ||
    testData?.final_result ||
    testData?.result ||
    null
  );
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
