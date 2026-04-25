"use client";

import { useEffect, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function WorkflowPage() {
  const user = getStoredUser();

  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qaPreTesting, setQaPreTesting] = useState([]);
  const [qaRelease, setQaRelease] = useState([]);
  const [labTechQueue, setLabTechQueue] = useState({
    ready_for_testing: [],
    in_testing: [],
  });
  const [overrideDrafts, setOverrideDrafts] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function getMetadata(item) {
    return item?.device_metadata || {};
  }

  function getPayment(item) {
    return getMetadata(item)?.payment || {};
  }

  function getTestData(item) {
    return getMetadata(item)?.test_data || null;
  }

  function getTestValues(item) {
    return getTestData(item)?.values || {};
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

  function getOverrideDraft(sampleId) {
    return (
      overrideDrafts[sampleId] || {
        result: "",
        reason: "",
      }
    );
  }

  function updateOverrideDraft(sampleId, field, value) {
    setOverrideDrafts((current) => ({
      ...current,
      [sampleId]: {
        ...(current[sampleId] || { result: "", reason: "" }),
        [field]: value,
      },
    }));
  }

  function formatLabel(value) {
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

      if (user?.role === "Lab Technician" || user?.role === "Administrator") {
        promises.push(apiClient.getLabTechWorkflow());
      } else {
        promises.push(
          Promise.resolve({
            ready_for_testing: [],
            in_testing: [],
          }),
        );
      }

      const [dashData, reviewData, preTestingData, releaseData, labTechData] =
        await Promise.all(promises);

      setDashboard(dashData);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      setQaPreTesting(Array.isArray(preTestingData) ? preTestingData : []);
      setQaRelease(Array.isArray(releaseData) ? releaseData : []);
      setLabTechQueue(
        labTechData || {
          ready_for_testing: [],
          in_testing: [],
        },
      );
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

  async function handleQaResultOverride(sampleId) {
    const draft = getOverrideDraft(sampleId);

    if (!draft.result) {
      alert("Please select the QA final result.");
      return;
    }

    if (!draft.reason || draft.reason.trim().length < 10) {
      alert("Please provide an override/review reason with at least 10 characters.");
      return;
    }

    try {
      await apiClient.qaOverrideTestResult(sampleId, {
        result: draft.result,
        reason: draft.reason,
      });

      setOverrideDrafts((current) => ({
        ...current,
        [sampleId]: {
          result: "",
          reason: "",
        },
      }));

      await loadData();
    } catch (err) {
      alert(err.message || "QA result override failed");
    }
  }

  async function handleStartTesting(sampleId) {
    try {
      await apiClient.updateSampleStatus(sampleId, {
        status: "In Testing",
      });

      await loadData();
    } catch (err) {
      alert(err.message || "Failed to start testing");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const isSeniorTech = user?.role === "Senior Technician";
  const isQa = user?.role === "QA Engineer";
  const isLabTech = user?.role === "Lab Technician";
  const isAdmin = user?.role === "Administrator";

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <p className="eyebrow">Workflow Module</p>
            <h1>Workflow Monitor</h1>
            <p className="subtitle">
              Role-based task queues for sample testing, QA review, and official report release.
            </p>
          </div>

          <button className="refreshButton" onClick={loadData}>
            Refresh
          </button>
        </div>

        {loading && <div className="card">Loading workflow data...</div>}
        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && dashboard && (
          <>
            <div className="stats">
              <StatCard label="Registered" value={dashboard.registered ?? 0} />
              <StatCard label="Manual Review" value={dashboard.manual_review ?? 0} />
              <StatCard
                label="Mandatory Override"
                value={dashboard.mandatory_override ?? 0}
              />
              <StatCard
                label="Completed Reviews"
                value={dashboard.completed_reviews ?? 0}
              />
            </div>

            {(isLabTech || isAdmin) && (
              <>
                <section className="section">
                  <div className="sectionHeader">
                    <div>
                      <h2>Ready for Testing</h2>
                      <p className="sectionText">
                        Samples cleared by Accounting and QA for laboratory testing.
                      </p>
                    </div>
                  </div>

                  <div className="list">
                    {labTechQueue.ready_for_testing.length === 0 && (
                      <div className="card empty">No samples ready for testing.</div>
                    )}

                    {labTechQueue.ready_for_testing.map((item) => (
                      <div className="card" key={item.sample_id}>
                        <div className="row">
                          <div>
                            <div className="label">Sample ID</div>
                            <div className="value">{item.sample_id}</div>
                          </div>

                          <div className="pill ready">Ready</div>
                        </div>

                        <div className="grid">
                          <Info label="Client" value={item.client_name} />
                          <Info label="Project" value={item.project_reference} />
                          <Info label="Material" value={item.material_type} />
                          <Info label="Status" value={item.current_state} />
                        </div>

                        <div className="actions">
                          <button
                            className="approveButton"
                            onClick={() => handleStartTesting(item.sample_id)}
                          >
                            Start Testing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="section">
                  <div className="sectionHeader">
                    <div>
                      <h2>In Testing</h2>
                      <p className="sectionText">
                        Samples currently undergoing laboratory testing.
                      </p>
                    </div>
                  </div>

                  <div className="list">
                    {labTechQueue.in_testing.length === 0 && (
                      <div className="card empty">No samples currently in testing.</div>
                    )}

                    {labTechQueue.in_testing.map((item) => (
                      <div className="card" key={item.sample_id}>
                        <div className="row">
                          <div>
                            <div className="label">Sample ID</div>
                            <div className="value">{item.sample_id}</div>
                          </div>

                          <div className="pill testing">In Testing</div>
                        </div>

                        <div className="grid">
                          <Info label="Client" value={item.client_name} />
                          <Info label="Project" value={item.project_reference} />
                          <Info label="Material" value={item.material_type} />
                          <Info label="Status" value={item.current_state} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {(isSeniorTech || isAdmin) && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <h2>Senior Technician Queue</h2>
                    <p className="sectionText">
                      Low-confidence AI classifications requiring manual review.
                    </p>
                  </div>
                </div>

                <div className="list">
                  {reviews.length === 0 && (
                    <div className="card empty">No senior technician review cases.</div>
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
                          onClick={() => handleValidation(item.sample_id, "approve")}
                        >
                          Approve Classification
                        </button>

                        <button
                          className="rejectButton"
                          onClick={() => handleValidation(item.sample_id, "reject")}
                        >
                          Reject Classification
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(isQa || isAdmin) && (
              <>
                <section className="section">
                  <div className="sectionHeader">
                    <div>
                      <h2>QA Pre-Testing Queue</h2>
                      <p className="sectionText">
                        Registered samples waiting for QA approval before testing.
                      </p>
                    </div>
                  </div>

                  <div className="list">
                    {qaPreTesting.length === 0 && (
                      <div className="card empty">
                        No samples waiting for QA pre-testing review.
                      </div>
                    )}

                    {qaPreTesting.map((item) => {
                      const payment = getPayment(item);

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
                  <div className="sectionHeader">
                    <div>
                      <h2>QA Release Queue</h2>
                      <p className="sectionText">
                        Review the official laboratory report details before release. QA release confirms report authorization and record finalization, not material acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="releaseList">
                    {qaRelease.length === 0 && (
                      <div className="card empty">
                        No samples waiting for QA release.
                      </div>
                    )}

                    {qaRelease.map((item) => {
                      const payment = getPayment(item);
                      const testData = getTestData(item);
                      const testValues = getTestValues(item);

                      const systemResult = getSystemResult(testData);
                      const finalResult = getFinalResult(testData);
                      const qaOverride = testData?.qa_override || null;
                      const overrideDraft = getOverrideDraft(item.sample_id);

                      const testType = testData?.test_type;
                      const standard = testValues?.standard;
                      const systemRemarks = testData?.system_remarks;
                      const technicianRemarks = testData?.remarks;

                      return (
                        <article className="reportCard" key={item.sample_id}>
                          <div className="reportTop">
                            <div>
                              <p className="reportEyebrow">Official Report Review</p>
                              <h3>{item.sample_id}</h3>
                              <p className="reportSubtext">
                                {item.client_name || "No client"} •{" "}
                                {item.project_reference || "No project"}
                              </p>
                            </div>

                            <div className="reportBadges">
                              <ResultBadge result={finalResult} />
                              <span className="statusPill">For QA Release</span>
                            </div>
                          </div>

                          <div className="reportNotice">
                            {finalResult === "FAIL" && (
                              <p className="noticeText failText">
                                This report contains a failed laboratory result. Releasing
                                it documents the actual test outcome and does not imply
                                that the material passed or was accepted for use.
                              </p>
                            )}

                            {finalResult === "PASS" && (
                              <p className="noticeText passText">
                                This report contains a passing laboratory result and is
                                ready for QA report authorization.
                              </p>
                            )}

                            {finalResult === "RECORDED" && (
                              <p className="noticeText recordedText">
                                This report contains a recorded result without a
                                project-specific pass/fail threshold.
                              </p>
                            )}

                            {!finalResult && (
                              <p className="noticeText defaultText">
                                No computed result is available. Verify test data before
                                release.
                              </p>
                            )}
                          </div>

                          <div className="reportBody">
                            <div className="reportSection">
                              <h4>Client and Sample Information</h4>

                              <div className="reportGrid">
                                <ReportInfo label="Client" value={item.client_name} />
                                <ReportInfo
                                  label="Project"
                                  value={item.project_reference}
                                />
                                <ReportInfo
                                  label="Material"
                                  value={item.material_type}
                                />
                                <ReportInfo
                                  label="Lifecycle Status"
                                  value={item.current_state}
                                />
                              </div>
                            </div>

                            <div className="reportSection">
                              <h4>Payment and Release Eligibility</h4>

                              <div className="reportGrid">
                                <ReportInfo
                                  label="Payment Status"
                                  value={payment.payment_status || "-"}
                                />
                                <ReportInfo
                                  label="Release Eligibility"
                                  value={
                                    payment.payment_status === "Fully Paid"
                                      ? "Financially Cleared"
                                      : "Not Cleared"
                                  }
                                />
                              </div>
                            </div>

                            <div className="reportSection">
                              <h4>Test Result Summary</h4>

                              <div className="resultCompareGrid">
                                <div className="resultPanel">
                                  <div>
                                    <span className="miniLabel">System Result</span>
                                    <strong>{systemResult || "No Result"}</strong>
                                  </div>

                                  <ResultBadge result={systemResult} compact />
                                </div>

                                <div className="resultPanel finalPanel">
                                  <div>
                                    <span className="miniLabel">QA Final Result</span>
                                    <strong>{finalResult || "No Result"}</strong>
                                  </div>

                                  <ResultBadge result={finalResult} compact />
                                </div>
                              </div>

                              {qaOverride?.is_overridden && (
                                <div className="overrideNotice">
                                  <strong>QA Override Applied</strong>
                                  <p>
                                    Original system result was{" "}
                                    <b>{qaOverride.system_result}</b>. QA final
                                    result is <b>{qaOverride.override_result}</b>.
                                  </p>
                                  <p>
                                    <b>Reason:</b> {qaOverride.override_reason}
                                  </p>
                                </div>
                              )}

                              {qaOverride && !qaOverride.is_overridden && (
                                <div className="reviewNotice">
                                  <strong>QA Result Reviewed</strong>
                                  <p>
                                    QA reviewed the system result and kept the final
                                    report result as <b>{finalResult}</b>.
                                  </p>
                                  <p>
                                    <b>Reason:</b> {qaOverride.override_reason}
                                  </p>
                                </div>
                              )}

                              <div className="reportGrid">
                                <ReportInfo
                                  label="Test Type"
                                  value={formatLabel(testType)}
                                />
                                <ReportInfo
                                  label="Test Name"
                                  value={testValues?.test_name || formatLabel(testType)}
                                />
                                <ReportInfo
                                  label="Applicable Standard"
                                  value={standard || "-"}
                                />
                                <ReportInfo
                                  label="Entered At"
                                  value={formatDate(testData?.entered_at)}
                                />
                              </div>
                            </div>

                            <div className="reportSection">
                              <h4>Remarks</h4>

                              <div className="remarksBox">
                                <div>
                                  <span>System Remarks</span>
                                  <p>{systemRemarks || "-"}</p>
                                </div>

                                <div>
                                  <span>Technician Remarks</span>
                                  <p>{technicianRemarks || "-"}</p>
                                </div>
                              </div>
                            </div>

                            {testValues && Object.keys(testValues).length > 0 && (
                              <details className="valuesDetails">
                                <summary>View recorded and computed values</summary>

                                <div className="valuesGrid">
                                  {Object.entries(testValues).map(([key, value]) => (
                                    <ReportInfo
                                      key={key}
                                      label={formatLabel(key)}
                                      value={formatValue(value)}
                                    />
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>

                          <div className="overrideBox">
                            <div>
                              <h4>QA Result Review / Override</h4>
                              <p>
                                QA may keep the system-computed result or override the
                                final report result with a required justification before
                                release.
                              </p>
                            </div>

                            <div className="overrideGrid">
                              <div>
                                <label>QA Final Result</label>
                                <select
                                  value={overrideDraft.result}
                                  onChange={(e) =>
                                    updateOverrideDraft(
                                      item.sample_id,
                                      "result",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option value="">Select final result</option>
                                  <option value="PASS">PASS</option>
                                  <option value="FAIL">FAIL</option>
                                  <option value="RECORDED">RECORDED</option>
                                </select>
                              </div>

                              <div>
                                <label>Override / Review Justification</label>
                                <textarea
                                  value={overrideDraft.reason}
                                  onChange={(e) =>
                                    updateOverrideDraft(
                                      item.sample_id,
                                      "reason",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Example: Physical test slip confirms no fracture; technician selected the wrong observation."
                                />
                              </div>
                            </div>

                            <div className="overrideActions">
                              <button
                                className="overrideButton"
                                onClick={() =>
                                  handleQaResultOverride(item.sample_id)
                                }
                              >
                                Save QA Final Result
                              </button>
                            </div>
                          </div>

                          <div className="releaseFooter">
                            <div>
                              <strong>QA Authorization</strong>
                              <p>
                                Once released, this report becomes a finalized official
                                record for the sample.
                              </p>
                            </div>

                            <button
                              className="releaseButton"
                              onClick={() => handleQaRelease(item.sample_id)}
                            >
                              Release Official Report
                            </button>
                          </div>
                        </article>
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
          min-height: 100vh;
          padding: 28px;
          background: #f6f7fb;
          color: #111827;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .eyebrow,
        .reportEyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 800;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0;
          font-size: 26px;
          color: #111827;
        }

        h2 {
          margin: 0 0 6px;
          font-size: 19px;
          color: #111827;
        }

        h3 {
          margin: 0;
          font-size: 22px;
          color: #111827;
        }

        h4 {
          margin: 0 0 14px;
          font-size: 12px;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid #eef2f7;
          padding-bottom: 8px;
        }

        .subtitle,
        .sectionText,
        .reportSubtext {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
        }

        .refreshButton,
        button {
          border: none;
          border-radius: 12px;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
          background: #14003a;
          color: #fff;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
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
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 30px;
          color: #111827;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .empty {
          color: #475569;
        }

        .section {
          margin-top: 26px;
        }

        .sectionHeader {
          margin-bottom: 12px;
        }

        .list,
        .releaseList {
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
          color: #64748b;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
        }

        .value {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }

        .pill,
        .statusPill {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
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

        .testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .statusPill {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
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
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
        }

        .reportCard {
          background: #ffffff;
          border: 1px solid #dbe3ef;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }

        .reportTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 22px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid #e5e7eb;
        }

        .reportBadges {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .reportNotice {
          padding: 0 22px;
          margin-top: 18px;
        }

        .noticeText {
          margin: 0;
          padding: 13px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
          border: 1px solid transparent;
        }

        .failText {
          background: #fff7f7;
          color: #991b1b;
          border-color: #fecaca;
        }

        .passText {
          background: #f0fdf4;
          color: #166534;
          border-color: #bbf7d0;
        }

        .recordedText {
          background: #eef2ff;
          color: #3730a3;
          border-color: #c7d2fe;
        }

        .defaultText {
          background: #f8fafc;
          color: #475569;
          border-color: #e2e8f0;
        }

        .reportBody {
          padding: 22px;
          display: grid;
          gap: 20px;
        }

        .reportSection {
          background: #ffffff;
        }

        .reportGrid,
        .valuesGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px 20px;
        }

        .resultCompareGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .resultPanel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .finalPanel {
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .resultPanel strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          color: #111827;
        }

        .miniLabel {
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .overrideNotice {
          margin-bottom: 14px;
          padding: 13px 14px;
          border-radius: 14px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          font-size: 13px;
          line-height: 1.5;
        }

        .overrideNotice strong {
          display: block;
          margin-bottom: 4px;
          color: #7c2d12;
        }

        .overrideNotice p {
          margin: 4px 0 0;
        }

        .reviewNotice {
          margin-bottom: 14px;
          padding: 13px 14px;
          border-radius: 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          font-size: 13px;
          line-height: 1.5;
        }

        .reviewNotice strong {
          display: block;
          margin-bottom: 4px;
          color: #1d4ed8;
        }

        .reviewNotice p {
          margin: 4px 0 0;
        }

        .remarksBox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .remarksBox div {
          padding: 14px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .remarksBox span {
          display: block;
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .remarksBox p {
          margin: 0;
          color: #111827;
          line-height: 1.5;
          font-size: 14px;
          font-weight: 600;
        }

        .valuesDetails {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px;
        }

        .valuesDetails summary {
          cursor: pointer;
          font-size: 13px;
          font-weight: 900;
          color: #334155;
        }

        .valuesGrid {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
        }

        .overrideBox {
          margin: 0 22px 20px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid #dbe3ef;
          background: #f8fafc;
        }

        .overrideBox h4 {
          margin-bottom: 6px;
          border-bottom: none;
          padding-bottom: 0;
        }

        .overrideBox p {
          margin: 0 0 14px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .overrideGrid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 14px;
        }

        .overrideGrid label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .overrideGrid select,
        .overrideGrid textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 11px 12px;
          background: #ffffff;
          color: #111827;
          font-size: 13px;
        }

        .overrideGrid textarea {
          min-height: 92px;
          resize: vertical;
        }

        .overrideActions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .overrideButton {
          background: #7c3aed;
        }

        .releaseFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding: 20px 22px;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }

        .releaseFooter strong {
          display: block;
          color: #111827;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .releaseFooter p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .resultBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .resultBadge.compact {
          padding: 7px 11px;
          font-size: 11px;
        }

        .resultPass {
          background: #dcfce7;
          color: #166534;
        }

        .resultFail {
          background: #fee2e2;
          color: #991b1b;
        }

        .resultRecorded {
          background: #e0e7ff;
          color: #3730a3;
        }

        .resultEmpty {
          background: #f1f5f9;
          color: #475569;
        }

        @media (max-width: 760px) {
          .header,
          .reportTop,
          .releaseFooter,
          .row,
          .resultPanel {
            flex-direction: column;
            align-items: flex-start;
          }

          .grid,
          .reportGrid,
          .valuesGrid,
          .remarksBox,
          .resultCompareGrid,
          .overrideGrid {
            grid-template-columns: 1fr;
          }

          .reportBadges {
            justify-content: flex-start;
          }

          .releaseButton,
          .overrideButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultBadge({ result, compact = false }) {
  const cls =
    result === "PASS"
      ? "resultPass"
      : result === "FAIL"
        ? "resultFail"
        : result === "RECORDED"
          ? "resultRecorded"
          : "resultEmpty";

  return (
    <div className={`resultBadge ${cls} ${compact ? "compact" : ""}`}>
      {result ? `Result: ${result}` : "No Result"}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="value">
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>

      <style jsx>{`
        .label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
        }

        .value {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function ReportInfo({ label, value }) {
  return (
    <div className="reportInfo">
      <span>{label}</span>
      <strong>
        {value === null || value === undefined || value === "" ? "-" : value}
      </strong>

      <style jsx>{`
        .reportInfo {
          display: grid;
          gap: 4px;
        }

        .reportInfo span {
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .reportInfo strong {
          font-size: 14px;
          color: #111827;
          line-height: 1.45;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}