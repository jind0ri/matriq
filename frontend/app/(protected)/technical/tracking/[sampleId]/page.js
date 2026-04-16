"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import mockSamples from "@/mocks/samples.json";
import {
  ArrowLeft,
  FileText,
  Wrench,
  Clock,
  Gear,
  CalendarBlank,
  Stack,
  CheckSquare,
} from "phosphor-react";

export default function TrackingDetailPage() {
  const router = useRouter();
  const { sampleId } = useParams();
  const [activeTab, setActiveTab] = useState("encoding");

  const baseSample = mockSamples.find((s) => s.id === sampleId);

  const [localStatus, setLocalStatus] = useState(baseSample?.status || "");

  if (!baseSample) {
    return <div style={{ padding: 40 }}>Sample not found.</div>;
  }

  const sample = {
    ...baseSample,
    status: localStatus,
  };

  const isConcrete = sample.type === "concrete";
  const isCement = sample.type === "cement";
  const isInTest = sample.status === "In Test";

  const [measurements, setMeasurements] = useState({
    specimenDiameter: sample.measurements?.specimenDiameter || "",
    specimenHeight: sample.measurements?.specimenHeight || "",
    maximumLoad: sample.measurements?.maximumLoad || "",
    cubeArea: sample.measurements?.cubeArea || "",
    ageOfSpecimen: sample.measurements?.ageOfSpecimen || "",
    temperature: sample.measurements?.temperature || "",
  });

  const [errors, setErrors] = useState({});

  function handleMeasurementChange(e) {
    const { name, value } = e.target;

    setMeasurements((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  function handleInitializeTest() {
    setLocalStatus("In Test");
  }

  function handleFinalize() {
    const nextErrors = {};

    if (isConcrete) {
      if (!measurements.specimenDiameter.trim()) {
        nextErrors.specimenDiameter = "Required";
      }
      if (!measurements.specimenHeight.trim()) {
        nextErrors.specimenHeight = "Required";
      }
      if (!measurements.maximumLoad.trim()) {
        nextErrors.maximumLoad = "Required";
      }
    }

    if (isCement) {
      if (!measurements.cubeArea.trim()) {
        nextErrors.cubeArea = "Required";
      }
      if (!measurements.ageOfSpecimen.trim()) {
        nextErrors.ageOfSpecimen = "Required";
      }
      if (!measurements.maximumLoad.trim()) {
        nextErrors.maximumLoad = "Required";
      }
      if (!measurements.temperature.trim()) {
        nextErrors.temperature = "Required";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    alert("Protocol validated successfully (mock).");
  }

  return (
    <>
      <div className="page">
        <div className="topRow">
          <div className="leftHeader">
            <button className="backBtn" onClick={() => router.back()}>
              <ArrowLeft size={24} />
            </button>

            <div>
              <h1>{sample.material}</h1>
              <p>TRF: {sample.id}</p>
            </div>

            <span
              className={`status ${sample.status
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {sample.status.toUpperCase()}
            </span>
          </div>

          {sample.status === "For Review" && (
            <button className="primaryBtn" type="button" onClick={handleInitializeTest}>
              <Wrench size={16} />
              INITIALIZE TEST
            </button>
          )}

          {sample.status === "Released" && (
            <button className="primaryBtn" type="button">
              <FileText size={16} />
              GENERATE BRS REPORT
            </button>
          )}
        </div>

        <div className="tabs">
          <button
            className={activeTab === "encoding" ? "tab active" : "tab"}
            onClick={() => setActiveTab("encoding")}
          >
            <Wrench size={16} />
            TEST ENCODING
          </button>

          <button
            className={activeTab === "audit" ? "tab active" : "tab"}
            onClick={() => setActiveTab("audit")}
          >
            <Clock size={16} />
            AUDIT TRAIL
          </button>
        </div>

        {activeTab === "encoding" ? (
          <div className="encodingLayout">
            <div className="metaBlock">
              <div className="metaTitle">MATERIAL ORIGIN</div>

              <div className="metaRow">
                <span>PROJECT</span>
                <strong>{sample.project}</strong>
              </div>

              <div className="metaRow">
                <span>CLIENT</span>
                <strong>{sample.client}</strong>
              </div>

              <div className="metaRow">
                <span>LAB BRANCH</span>
                <strong>{sample.branch}</strong>
              </div>

              <div className="metaRow">
                <span>PERSONNEL</span>
                <strong>{sample.personnel}</strong>
              </div>
            </div>

            <div className="encodingContent">
              <div className="topInputs">
                <div className="field">
                  <label>
                    <Gear size={14} />
                    Equipment ID/Calibration Ref
                  </label>
                  <div className="inputPill">{sample.equipmentId}</div>
                </div>

                <div className="field">
                  <label>
                    <CalendarBlank size={14} />
                    Date of Testing
                  </label>
                  <div className="inputPill">{sample.testDate}</div>
                </div>
              </div>

              {isConcrete && (
                <>
                  <div className="sectionTitle">
                    <Stack size={16} />
                    <span>RAW TEST MEASUREMENTS (CONCRETE)</span>
                  </div>

                  <div className="measurementGrid">
                    <div className="field">
                      <label>Specimen Diameter</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="specimenDiameter"
                            value={measurements.specimenDiameter}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.specimenDiameter}
                          </div>
                        )}
                        <span>MM</span>
                      </div>
                      {errors.specimenDiameter && (
                        <span className="fieldError">
                          {errors.specimenDiameter}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Specimen Height</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="specimenHeight"
                            value={measurements.specimenHeight}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.specimenHeight}
                          </div>
                        )}
                        <span>MM</span>
                      </div>
                      {errors.specimenHeight && (
                        <span className="fieldError">
                          {errors.specimenHeight}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Maximum Load</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="maximumLoad"
                            value={measurements.maximumLoad}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.maximumLoad}
                          </div>
                        )}
                        <span>KN</span>
                      </div>
                      {errors.maximumLoad && (
                        <span className="fieldError">
                          {errors.maximumLoad}
                        </span>
                      )}
                    </div>
                  </div>

                  {sample.status === "Released" && (
                    <div className="complianceCard">
                      <div className="complianceIcon">
                        <CheckSquare size={34} weight="bold" />
                      </div>

                      <div className="complianceText">
                        <h3>COMPLIANCE PASSED</h3>
                        <p>Verified against PNS 49 / ASTM A615</p>
                        <span>
                          Material conforms to DPWH Standard Specifications for
                          Highways and Bridges
                        </span>
                      </div>
                    </div>
                  )}

                  {sample.status === "For Review" && (
                    <div className="reviewCard">
                      <div className="reviewText">
                        <h3>AWAITING REVIEW</h3>
                        <p>
                          Technical measurements are locked pending laboratory
                          verification.
                        </p>
                        <span>
                          Initialize test to unlock encoding and continue the
                          validation workflow.
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isCement && (
                <>
                  <div className="sectionTitle">
                    <Stack size={16} />
                    <span>TECHNICAL DATA ENCODING (CEMENT: READY-MIX)</span>
                  </div>

                  <div className="measurementGrid">
                    <div className="field">
                      <label>Cube Area</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="cubeArea"
                            value={measurements.cubeArea}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.cubeArea}
                          </div>
                        )}
                        <span>MM²</span>
                      </div>
                      {errors.cubeArea && (
                        <span className="fieldError">{errors.cubeArea}</span>
                      )}
                    </div>

                    <div className="field">
                      <label>Age of Specimen</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="ageOfSpecimen"
                            value={measurements.ageOfSpecimen}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.ageOfSpecimen}
                          </div>
                        )}
                        <span>DAYS</span>
                      </div>
                      {errors.ageOfSpecimen && (
                        <span className="fieldError">
                          {errors.ageOfSpecimen}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Maximum Load</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="maximumLoad"
                            value={measurements.maximumLoad}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.maximumLoad}
                          </div>
                        )}
                        <span>KN</span>
                      </div>
                      {errors.maximumLoad && (
                        <span className="fieldError">
                          {errors.maximumLoad}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Temperature</label>
                      <div className="inputRow">
                        {isInTest ? (
                          <input
                            className="measurementInput"
                            name="temperature"
                            value={measurements.temperature}
                            onChange={handleMeasurementChange}
                          />
                        ) : (
                          <div className="inputPill readonlyPill">
                            {measurements.temperature}
                          </div>
                        )}
                        <span>°C</span>
                      </div>
                      {errors.temperature && (
                        <span className="fieldError">{errors.temperature}</span>
                      )}
                    </div>
                  </div>

                  {sample.status === "Released" && (
                    <div className="complianceCard">
                      <div className="complianceIcon">
                        <CheckSquare size={34} weight="bold" />
                      </div>

                      <div className="complianceText">
                        <h3>COMPLIANCE PASSED</h3>
                        <p>Validated against laboratory cement testing protocol</p>
                        <span>
                          Test results have been reviewed and approved for final
                          report generation.
                        </span>
                      </div>
                    </div>
                  )}

                  {sample.status === "For Review" && (
                    <div className="reviewCard">
                      <div className="reviewText">
                        <h3>AWAITING REVIEW</h3>
                        <p>
                          Captured test values are currently under laboratory
                          review.
                        </p>
                        <span>
                          Initialize test to unlock this sample and proceed with
                          active encoding.
                        </span>
                      </div>
                    </div>
                  )}

                  {sample.status === "In Test" && (
                    <div className="actionRow">
                      <button
                        className="finalizeBtn"
                        type="button"
                        onClick={handleFinalize}
                      >
                        <FileText size={16} />
                        VALIDATE AND FINALIZE PROTOCOL
                      </button>
                    </div>
                  )}

                  {sample.status === "For Review" && (
                    <div className="actionRow">
                      <button
                        className="finalizeBtn disabled"
                        type="button"
                        disabled
                      >
                        <FileText size={16} />
                        VALIDATE AND FINALIZE PROTOCOL
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="auditLayout">
            <div className="metaBlock">
              <div className="metaTitle">MATERIAL ORIGIN</div>

              <div className="metaRow">
                <span>PROJECT</span>
                <strong>{sample.project}</strong>
              </div>

              <div className="metaRow">
                <span>CLIENT</span>
                <strong>{sample.client}</strong>
              </div>

              <div className="metaRow">
                <span>LAB BRANCH</span>
                <strong>{sample.branch}</strong>
              </div>

              <div className="metaRow">
                <span>PERSONNEL</span>
                <strong>{sample.personnel}</strong>
              </div>
            </div>

            <div className="auditContent">
              <div className="timeline">
                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>2/15/2026, 11:58:11 AM</span>
                  </div>

                  <div className="auditCard">
                    <h4>Intake</h4>
                    <p>
                      {isConcrete
                        ? "AI flagging low confidence, awaiting employee verification."
                        : "Batch 2025-RMX received."}
                    </p>
                    <span>Staff: {sample.personnel}</span>
                  </div>
                </div>

                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>2/15/2026, 1:32:44 PM</span>
                  </div>

                  <div className="auditCard">
                    <h4>Status Update</h4>
                    <p>
                      {sample.status === "Released"
                        ? "Sample marked as released and ready for report generation."
                        : sample.status === "In Test"
                        ? "Testing protocol initialized and technical encoding is in progress."
                        : "Sample awaiting initialization and laboratory review."}
                    </p>
                    <span>Staff: {sample.personnel}</span>
                  </div>
                </div>

                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>2/16/2026, 9:10:02 AM</span>
                  </div>

                  <div className="auditCard">
                    <h4>Branch Sync</h4>
                    <p>
                      Registry intelligence updated and synchronized across the
                      laboratory network.
                    </p>
                    <span>Branch: {sample.branch}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .leftHeader {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .backBtn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          color: #333333;
        }

        p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .status {
          font-size: 11px;
          font-weight: 700;
          margin-left: 12px;
          letter-spacing: 0.4px;
        }

        .released {
          color: #0f8a28;
        }

        .in-test {
          color: #c58a00;
        }

        .for-review {
          color: #0072f5;
        }

        .primaryBtn {
          background: #080026;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .tabs {
          display: flex;
          gap: 24px;
          border-bottom: 1px solid #e5e7eb;
          justify-content: flex-start;
        }

        .tab {
          background: transparent;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 0;
          font-size: 12px;
          color: #9a9a9a;
          cursor: pointer;
        }

        .tab.active {
          color: #333333;
          border-bottom: 2px solid #333333;
        }

        .encodingLayout,
        .auditLayout {
          display: grid;
          grid-template-columns: 0.85fr 1.65fr;
          gap: 48px;
          align-items: start;
        }

        .metaBlock {
          padding-top: 40px;
        }

        .metaTitle {
          font-size: 11px;
          font-weight: 700;
          color: #8a8a8a;
          margin-bottom: 18px;
          letter-spacing: 0.4px;
        }

        .metaRow {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: 18px;
          margin-bottom: 12px;
          align-items: start;
        }

        .metaRow span {
          font-size: 10px;
          color: #a0a0a0;
          font-weight: 600;
        }

        .metaRow strong {
          font-size: 11px;
          color: #333333;
          font-weight: 700;
          line-height: 1.35;
        }

        .encodingContent,
        .auditContent {
          display: flex;
          flex-direction: column;
          gap: 28px;
          max-width: 720px;
        }

        .topInputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #9a9a9a;
          font-weight: 600;
        }

        .inputPill {
          min-height: 38px;
          border-radius: 10px;
          background: #d9d9d9;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 700;
          color: #333333;
        }

        .readonlyPill {
          width: 100%;
          background: #e5e5e5;
          color: #2f2f2f;
          border: 1px solid #d0d0d0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }

        .sectionTitle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: 0.2px;
        }

        .measurementGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px 36px;
        }

        .inputRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .inputRow span {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          min-width: 28px;
        }

        .measurementInput {
          width: 100%;
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid #d8d8d8;
          background: #ffffff;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
          padding: 0 14px;
          font-size: 11px;
          font-weight: 700;
          color: #333333;
          outline: none;
        }

        .measurementInput:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        .fieldError {
          font-size: 10px;
          color: #dc2626;
          margin-top: -2px;
        }

        .complianceCard {
          border: 2px solid #188b2a;
          border-radius: 18px;
          padding: 28px 26px;
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 620px;
        }

        .complianceIcon {
          width: 52px;
          height: 52px;
          border: 2px solid #188b2a;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #188b2a;
          flex-shrink: 0;
        }

        .complianceText h3 {
          margin: 0 0 4px;
          font-size: 12px;
          color: #188b2a;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .complianceText p {
          margin: 0 0 6px;
          font-size: 11px;
          color: #333333;
          font-weight: 600;
        }

        .complianceText span {
          display: block;
          font-size: 11px;
          color: #4b5563;
          line-height: 1.4;
        }

        .reviewCard {
          border: 2px solid #0072f5;
          border-radius: 18px;
          padding: 24px 22px;
          max-width: 620px;
          background: #f8fbff;
        }

        .reviewText h3 {
          margin: 0 0 6px;
          font-size: 12px;
          color: #0072f5;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .reviewText p {
          margin: 0 0 6px;
          font-size: 11px;
          color: #333333;
          font-weight: 600;
        }

        .reviewText span {
          display: block;
          font-size: 11px;
          color: #4b5563;
          line-height: 1.4;
        }

        .actionRow {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .finalizeBtn {
          background: #d9d9d9;
          color: #4b4b4b;
          border: none;
          padding: 14px 18px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .finalizeBtn.disabled {
          background: #d9d9d9;
          color: #9a9a9a;
          cursor: not-allowed;
          opacity: 0.8;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .timelineItem {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timelineStamp {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #8a8a8a;
        }

        .auditDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0072f5;
          display: inline-block;
        }

        .auditCard {
          max-width: 520px;
          background: #d9d9d9;
          border-radius: 10px;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
          padding: 18px 18px 16px;
        }

        .auditCard h4 {
          margin: 0 0 10px;
          font-size: 11px;
          color: #333333;
        }

        .auditCard p {
          margin: 0 0 10px;
          font-size: 11px;
          color: #333333;
          line-height: 1.45;
        }

        .auditCard span {
          font-size: 11px;
          color: #8a8a8a;
        }

        @media (max-width: 980px) {
          .topRow {
            flex-direction: column;
            align-items: flex-start;
          }

          .encodingLayout,
          .auditLayout {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .metaBlock {
            padding-top: 0;
          }

          .topInputs,
          .measurementGrid {
            grid-template-columns: 1fr;
          }

          .complianceCard,
          .reviewCard {
            max-width: 100%;
          }

          .actionRow {
            justify-content: stretch;
          }

          .primaryBtn,
          .finalizeBtn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}