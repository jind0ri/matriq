"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

const INITIAL_FORM = {
  testType: "",
  remarks: "",

  // Concrete Compression
  specimenDiameter: "",
  specimenHeight: "",
  maxLoad: "",
  requiredStrength: "",

  // Concrete Slump
  slump: "",
  minSlump: "",
  maxSlump: "",
  slumpType: "true",

  // Concrete Flexural
  flexuralStrength: "",
  requiredFlexural: "",
  beamWidth: "",
  beamDepth: "",
  spanLength: "",
  flexuralMaxLoad: "",

  // RSB Tensile
  yieldStrength: "",
  tensileStrength: "",
  elongation: "",
  requiredYield: "",
  requiredTensile: "",
  requiredElongation: "",

  // RSB Bend
  bendObservation: "",

  // Soil
  wetMass: "",
  dryMass: "",
  moistureContent: "",
  maxMoisture: "",
  uscsClass: "",

  // Aggregate Sieve
  percentPassing: "",
  minPassing: "",
  maxPassing: "",
  absorption: "",

  // Aggregate Abrasion
  abrasionLoss: "",
  maxAbrasionLoss: "",

  // Aggregate Soundness
  soundnessLoss: "",
  maxSoundnessLoss: "",
  saltType: "",
  cyclesCompleted: "",

  // Aggregate Organic Impurities
  colorComparison: "",
};

const TEST_OPTIONS = {
  Concrete: [
    {
      key: "concrete_compression",
      label: "Compressive Strength Test",
      standard: "ASTM C39/C39M",
    },
    {
      key: "concrete_slump",
      label: "Slump Test",
      standard: "ASTM C143/C143M",
    },
    {
      key: "concrete_flexural",
      label: "Flexural Strength Test",
      standard: "ASTM C78/C78M",
    },
  ],
  "Reinforcing Steel Bar": [
    {
      key: "rsb_tensile",
      label: "Tensile Test",
      standard: "ASTM A370 / ASTM A615",
    },
    {
      key: "rsb_bend",
      label: "Bend Test",
      standard: "ASTM A370 / ASTM A615",
    },
  ],
  "Soil Aggregates": [
    {
      key: "soil_moisture",
      label: "Moisture Content Test",
      standard: "ASTM D2216",
    },
    {
      key: "soil_classification",
      label: "USCS Soil Classification",
      standard: "ASTM D2487",
    },
    {
      key: "aggregate_sieve",
      label: "Sieve Analysis",
      standard: "ASTM C136/C136M",
    },
    {
      key: "aggregate_abrasion",
      label: "Los Angeles Abrasion Test",
      standard: "ASTM C131/C131M / ASTM C535",
    },
    {
      key: "aggregate_soundness",
      label: "Aggregate Soundness Test",
      standard: "ASTM C88/C88M",
    },
    {
      key: "aggregate_organic_impurities",
      label: "Organic Impurities Test",
      standard: "ASTM C40/C40M",
    },
  ],
};

export default function RegistryPage() {
  const user = getStoredUser();

  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  function getMetadata(item) {
    return item?.device_metadata || {};
  }

  function getTestResult(item) {
    return getMetadata(item)?.test_data?.result || null;
  }

  function getQueueLabel(item) {
    const metadata = getMetadata(item);
    const payment = metadata.payment || {};
    const qa = metadata.qa || {};

    if (
      item.current_state === "Registered" &&
      ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
        payment.payment_status,
      ) &&
      qa.pre_testing_reviewed
    ) {
      return { label: "Ready for Testing", type: "ready" };
    }

    if (
      item.current_state === "Registered" &&
      ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
        payment.payment_status,
      ) &&
      !qa.pre_testing_reviewed
    ) {
      return { label: "QA Pre-Testing", type: "qa" };
    }

    if (item.decision === "Manual-Review") {
      return { label: "AI Review", type: "review" };
    }

    if (
      item.current_state === "For Review" &&
      payment.payment_status === "Fully Paid"
    ) {
      return { label: "QA Release", type: "release" };
    }

    if (item.current_state === "For Review") {
      return { label: "For Review", type: "review" };
    }

    if (item.current_state === "Released") {
      return { label: "Archive", type: "archive" };
    }

    if (item.current_state === "In Testing") {
      return { label: "Testing", type: "testing" };
    }

    return { label: "General", type: "default" };
  }

  function filterByRole(data) {
    if (user?.role === "Lab Technician") {
      return data.filter((item) => {
        const metadata = getMetadata(item);
        const payment = metadata.payment || {};
        const qa = metadata.qa || {};

        return (
          (item.current_state === "Registered" &&
            ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
              payment.payment_status,
            ) &&
            qa.pre_testing_reviewed) ||
          item.current_state === "In Testing"
        );
      });
    }

    if (user?.role === "Senior Technician") {
      return data.filter(
        (item) =>
          item.decision === "Manual-Review" &&
          item.current_state !== "Released" &&
          item.current_state !== "Archived",
      );
    }

    if (user?.role === "QA Engineer") {
      return data.filter((item) => {
        const metadata = getMetadata(item);
        const payment = metadata.payment || {};
        const qa = metadata.qa || {};

        const pre =
          item.current_state === "Registered" &&
          ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
            payment.payment_status,
          ) &&
          !qa.pre_testing_reviewed;

        const release =
          item.current_state === "For Review" &&
          payment.payment_status === "Fully Paid";

        const archive = item.current_state === "Released";

        return pre || release || archive;
      });
    }

    return data;
  }

  async function loadSamples() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getSamples();
      setItems(filterByRole(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message || "Failed to load registry.");
    } finally {
      setLoading(false);
    }
  }

  async function startTesting(sampleId) {
    try {
      await apiClient.updateSampleStatus(sampleId, { status: "In Testing" });
      await loadSamples();
    } catch (err) {
      alert(err.message || "Failed to start testing.");
    }
  }

  async function submitTestData() {
    if (!selectedSample?.sample_id) {
      alert("No sample selected.");
      return;
    }

    const payload = {
      test_type: form.testType,
      remarks: form.remarks,
    };

    if (form.testType === "concrete_compression") {
      payload.specimen_diameter_mm = form.specimenDiameter;
      payload.specimen_height_mm = form.specimenHeight;
      payload.max_load_kn = form.maxLoad;
      payload.required_strength_mpa = form.requiredStrength;
    }

    if (form.testType === "concrete_slump") {
      payload.slump_mm = form.slump;
      payload.min_slump_mm = form.minSlump;
      payload.max_slump_mm = form.maxSlump;
      payload.slump_type = form.slumpType;
    }

    if (form.testType === "concrete_flexural") {
      payload.flexural_strength_mpa = form.flexuralStrength;
      payload.required_strength_mpa = form.requiredFlexural;
      payload.beam_width_mm = form.beamWidth;
      payload.beam_depth_mm = form.beamDepth;
      payload.span_length_mm = form.spanLength;
      payload.max_load_kn = form.flexuralMaxLoad;
    }

    if (form.testType === "rsb_tensile") {
      payload.yield_strength_mpa = form.yieldStrength;
      payload.tensile_strength_mpa = form.tensileStrength;
      payload.elongation_percent = form.elongation;
      payload.required_yield_mpa = form.requiredYield;
      payload.required_tensile_mpa = form.requiredTensile;
      payload.required_elongation_percent = form.requiredElongation;
    }

    if (form.testType === "rsb_bend") {
      payload.bend_observation = form.bendObservation;
    }

    if (form.testType === "soil_moisture") {
      payload.wet_mass_g = form.wetMass;
      payload.dry_mass_g = form.dryMass;
      payload.moisture_content = form.moistureContent;
      payload.max_moisture = form.maxMoisture;
      payload.uscs_classification = form.uscsClass;
    }

    if (form.testType === "soil_classification") {
      payload.uscs_classification = form.uscsClass;
    }

    if (form.testType === "aggregate_sieve") {
      payload.percent_passing = form.percentPassing;
      payload.min_passing = form.minPassing;
      payload.max_passing = form.maxPassing;
      payload.absorption_percent = form.absorption;
    }

    if (form.testType === "aggregate_abrasion") {
      payload.abrasion_loss_percent = form.abrasionLoss;
      payload.max_abrasion_loss_percent = form.maxAbrasionLoss;
    }

    if (form.testType === "aggregate_soundness") {
      payload.soundness_loss_percent = form.soundnessLoss;
      payload.max_soundness_loss_percent = form.maxSoundnessLoss;
      payload.salt_type = form.saltType;
      payload.cycles_completed = form.cyclesCompleted;
    }

    if (form.testType === "aggregate_organic_impurities") {
      payload.color_comparison = form.colorComparison;
    }

    try {
      await apiClient.updateSampleTestData(selectedSample.sample_id, payload);
      setShowModal(false);
      setSelectedSample(null);
      setForm(INITIAL_FORM);
      await loadSamples();

      alert(
        "Test data saved. The system computed the result and moved the sample to For Review.",
      );
    } catch (err) {
      alert(err.message || "Failed to save test data.");
    }
  }

  function openTestModal(item) {
    setSelectedSample(item);
    setForm(INITIAL_FORM);
    setShowModal(true);
  }

  useEffect(() => {
    loadSamples();
  }, []);

  const visibleItems = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.sample_id?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.project_reference?.toLowerCase().includes(q) ||
        item.material_type?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || item.current_state === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const selectedTest = (TEST_OPTIONS[selectedSample?.material_type] || []).find(
    (t) => t.key === form.testType,
  );

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <p className="eyebrow">Technical Module</p>
            <h1>Sample Registry</h1>
            <p className="subtitle">
              Role-based sample records, testing actions, and lifecycle
              monitoring.
            </p>
          </div>

          <button className="refreshBtn" onClick={loadSamples}>
            Refresh
          </button>
        </div>

        <div className="toolbar">
          <div className="searchBox">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample ID, client, project, or material..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Queues</option>

            {user?.role === "Lab Technician" && (
              <>
                <option value="Registered">Ready for Testing</option>
                <option value="In Testing">In Testing</option>
              </>
            )}

            {user?.role === "Senior Technician" && (
              <option value="For Review">Manual Review</option>
            )}

            {user?.role === "QA Engineer" && (
              <>
                <option value="Registered">QA Pre-Test</option>
                <option value="For Review">QA Release</option>
                <option value="Released">Archive</option>
              </>
            )}

            {user?.role === "Administrator" && (
              <>
                <option value="Registered">Registered</option>
                <option value="In Testing">In Testing</option>
                <option value="For Review">For Review</option>
                <option value="Released">Released</option>
                <option value="Archived">Archived</option>
              </>
            )}
          </select>

          <div className="viewToggle">
            <button
              className={
                viewMode === "list" ? "iconToggle active" : "iconToggle"
              }
              onClick={() => setViewMode("list")}
              type="button"
              title="List view"
            >
              ☷
            </button>

            <button
              className={
                viewMode === "grid" ? "iconToggle active" : "iconToggle"
              }
              onClick={() => setViewMode("grid")}
              type="button"
              title="Grid view"
            >
              ▦
            </button>
          </div>
        </div>

        {loading && <div className="emptyCard">Loading samples...</div>}
        {!loading && error && <div className="emptyCard error">{error}</div>}

        {!loading && !error && viewMode === "list" && (
          <div className="tableCard">
            <table>
              <thead>
                <tr>
                  <th>Sample</th>
                  <th>Lifecycle Status</th>
                  <th>Test Result</th>
                  <th>Queue</th>
                  <th>Client / Project</th>
                  <th>Material</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleItems.map((item) => {
                  const queue = getQueueLabel(item);
                  const testResult = getTestResult(item);

                  return (
                    <tr key={item.sample_id}>
                      <td>
                        <div className="sampleCell">
                          <strong>{item.sample_id}</strong>
                          <small>
                            {item.branch_id === 2
                              ? "Pateros Branch"
                              : "Marikina Branch"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={item.current_state} />
                      </td>

                      <td>
                        <ResultBadge result={testResult} />
                      </td>

                      <td>
                        <QueueBadge queue={queue} />
                      </td>

                      <td>
                        <div className="stack">
                          <strong>{item.client_name || "-"}</strong>
                          <small>
                            {item.project_reference || item.project_id || "-"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {item.material_type || item.ai_predicted_label || "-"}
                        </strong>
                      </td>

                      <td>
                        <ActionButtons
                          item={item}
                          user={user}
                          startTesting={startTesting}
                          openTestModal={openTestModal}
                        />
                      </td>
                    </tr>
                  );
                })}

                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="emptyRow">
                      No samples found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && viewMode === "grid" && (
          <div className="grid">
            {visibleItems.map((item) => {
              const queue = getQueueLabel(item);
              const testResult = getTestResult(item);

              return (
                <div className="sampleCard" key={item.sample_id}>
                  <div className="cardTop">
                    <StatusBadge status={item.current_state} />
                    <QueueBadge queue={queue} />
                  </div>

                  <h3>{item.sample_id}</h3>
                  <p>{item.material_type || item.ai_predicted_label || "-"}</p>

                  <div className="meta">
                    <span>Test Result</span>
                    <ResultBadge result={testResult} />
                  </div>

                  <div className="meta">
                    <span>Client</span>
                    <strong>{item.client_name || "-"}</strong>
                  </div>

                  <div className="meta">
                    <span>Project</span>
                    <strong>
                      {item.project_reference || item.project_id || "-"}
                    </strong>
                  </div>

                  <div className="cardActions">
                    <ActionButtons
                      item={item}
                      user={user}
                      startTesting={startTesting}
                      openTestModal={openTestModal}
                    />
                  </div>
                </div>
              );
            })}

            {visibleItems.length === 0 && (
              <div className="emptyCard">No samples found.</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modalCard">
            <div className="modalHeader">
              <div>
                <h2>Test Data Entry</h2>
                <p>{selectedSample?.sample_id}</p>
              </div>
              <button className="closeBtn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <label>Test Performed</label>
            <select
              value={form.testType}
              onChange={(e) => setForm({ ...form, testType: e.target.value })}
            >
              <option value="">Select test performed</option>
              {(TEST_OPTIONS[selectedSample?.material_type] || []).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>

            {selectedTest && (
              <div className="standardBox">
                <span>Auto-applied standard</span>
                <strong>{selectedTest.standard}</strong>
              </div>
            )}

            {form.testType === "concrete_compression" && (
              <>
                <Input
                  label="Specimen Diameter (mm)"
                  value={form.specimenDiameter}
                  onChange={(v) => setForm({ ...form, specimenDiameter: v })}
                />
                <Input
                  label="Specimen Height (mm)"
                  value={form.specimenHeight}
                  onChange={(v) => setForm({ ...form, specimenHeight: v })}
                />
                <Input
                  label="Maximum Load (kN)"
                  value={form.maxLoad}
                  onChange={(v) => setForm({ ...form, maxLoad: v })}
                />
                <Input
                  label="Required Strength (MPa)"
                  value={form.requiredStrength}
                  onChange={(v) => setForm({ ...form, requiredStrength: v })}
                />
              </>
            )}

            {form.testType === "concrete_slump" && (
              <>
                <Input
                  label="Slump (mm)"
                  value={form.slump}
                  onChange={(v) => setForm({ ...form, slump: v })}
                />
                <Input
                  label="Minimum Slump (mm)"
                  value={form.minSlump}
                  onChange={(v) => setForm({ ...form, minSlump: v })}
                />
                <Input
                  label="Maximum Slump (mm)"
                  value={form.maxSlump}
                  onChange={(v) => setForm({ ...form, maxSlump: v })}
                />

                <label>Slump Type</label>
                <select
                  value={form.slumpType}
                  onChange={(e) =>
                    setForm({ ...form, slumpType: e.target.value })
                  }
                >
                  <option value="true">True Slump</option>
                  <option value="shear">Shear Slump</option>
                  <option value="collapse">Collapse Slump</option>
                </select>
              </>
            )}

            {form.testType === "concrete_flexural" && (
              <>
                <Input
                  label="Flexural Strength (MPa)"
                  value={form.flexuralStrength}
                  onChange={(v) => setForm({ ...form, flexuralStrength: v })}
                />
                <Input
                  label="Required Flexural Strength (MPa)"
                  value={form.requiredFlexural}
                  onChange={(v) => setForm({ ...form, requiredFlexural: v })}
                />

                <div className="noteBox">
                  Optional: leave Flexural Strength blank and enter beam values
                  below so the system computes the modulus of rupture.
                </div>

                <Input
                  label="Beam Width (mm)"
                  value={form.beamWidth}
                  onChange={(v) => setForm({ ...form, beamWidth: v })}
                />
                <Input
                  label="Beam Depth (mm)"
                  value={form.beamDepth}
                  onChange={(v) => setForm({ ...form, beamDepth: v })}
                />
                <Input
                  label="Span Length (mm)"
                  value={form.spanLength}
                  onChange={(v) => setForm({ ...form, spanLength: v })}
                />
                <Input
                  label="Maximum Load (kN)"
                  value={form.flexuralMaxLoad}
                  onChange={(v) => setForm({ ...form, flexuralMaxLoad: v })}
                />
              </>
            )}

            {form.testType === "rsb_tensile" && (
              <>
                <Input
                  label="Yield Strength (MPa)"
                  value={form.yieldStrength}
                  onChange={(v) => setForm({ ...form, yieldStrength: v })}
                />
                <Input
                  label="Tensile Strength (MPa)"
                  value={form.tensileStrength}
                  onChange={(v) => setForm({ ...form, tensileStrength: v })}
                />
                <Input
                  label="Elongation (%)"
                  value={form.elongation}
                  onChange={(v) => setForm({ ...form, elongation: v })}
                />
                <Input
                  label="Required Yield Strength (MPa)"
                  value={form.requiredYield}
                  onChange={(v) => setForm({ ...form, requiredYield: v })}
                />
                <Input
                  label="Required Tensile Strength (MPa)"
                  value={form.requiredTensile}
                  onChange={(v) => setForm({ ...form, requiredTensile: v })}
                />
                <Input
                  label="Required Elongation (%)"
                  value={form.requiredElongation}
                  onChange={(v) =>
                    setForm({ ...form, requiredElongation: v })
                  }
                />

                <p className="autoNote">
                  Result will be automatically computed based on the provided
                  minimum requirements.
                </p>
              </>
            )}

            {form.testType === "rsb_bend" && (
              <>
                <label>Bend Observation</label>
                <select
                  value={form.bendObservation}
                  onChange={(e) =>
                    setForm({ ...form, bendObservation: e.target.value })
                  }
                >
                  <option value="">Select observed condition</option>
                  <option value="no_crack">No Crack / No Fracture</option>
                  <option value="crack">Visible Crack</option>
                  <option value="fracture">Fracture</option>
                  <option value="broken">Broken</option>
                </select>

                <p className="autoNote">
                  Technician records only the physical observation. The system
                  computes PASS or FAIL.
                </p>
              </>
            )}

            {form.testType === "soil_moisture" && (
              <>
                <Input
                  label="Wet Mass (g)"
                  value={form.wetMass}
                  onChange={(v) => setForm({ ...form, wetMass: v })}
                />
                <Input
                  label="Dry Mass (g)"
                  value={form.dryMass}
                  onChange={(v) => setForm({ ...form, dryMass: v })}
                />
                <Input
                  label="Moisture Content (%)"
                  value={form.moistureContent}
                  onChange={(v) => setForm({ ...form, moistureContent: v })}
                />
                <Input
                  label="Maximum Allowed Moisture (%)"
                  value={form.maxMoisture}
                  onChange={(v) => setForm({ ...form, maxMoisture: v })}
                />
                <Input
                  label="USCS Classification"
                  value={form.uscsClass}
                  onChange={(v) => setForm({ ...form, uscsClass: v })}
                />
              </>
            )}

            {form.testType === "soil_classification" && (
              <>
                <Input
                  label="USCS Classification"
                  value={form.uscsClass}
                  onChange={(v) => setForm({ ...form, uscsClass: v })}
                />
              </>
            )}

            {form.testType === "aggregate_sieve" && (
              <>
                <Input
                  label="Percent Passing (%)"
                  value={form.percentPassing}
                  onChange={(v) => setForm({ ...form, percentPassing: v })}
                />
                <Input
                  label="Minimum Passing (%)"
                  value={form.minPassing}
                  onChange={(v) => setForm({ ...form, minPassing: v })}
                />
                <Input
                  label="Maximum Passing (%)"
                  value={form.maxPassing}
                  onChange={(v) => setForm({ ...form, maxPassing: v })}
                />
                <Input
                  label="Absorption (%)"
                  value={form.absorption}
                  onChange={(v) => setForm({ ...form, absorption: v })}
                />
              </>
            )}

            {form.testType === "aggregate_abrasion" && (
              <>
                <Input
                  label="Abrasion Loss (%)"
                  value={form.abrasionLoss}
                  onChange={(v) => setForm({ ...form, abrasionLoss: v })}
                />
                <Input
                  label="Maximum Abrasion Loss (%)"
                  value={form.maxAbrasionLoss}
                  onChange={(v) => setForm({ ...form, maxAbrasionLoss: v })}
                />
              </>
            )}

            {form.testType === "aggregate_soundness" && (
              <>
                <Input
                  label="Soundness Loss (%)"
                  value={form.soundnessLoss}
                  onChange={(v) => setForm({ ...form, soundnessLoss: v })}
                />
                <Input
                  label="Maximum Soundness Loss (%)"
                  value={form.maxSoundnessLoss}
                  onChange={(v) => setForm({ ...form, maxSoundnessLoss: v })}
                />
                <Input
                  label="Salt Type"
                  value={form.saltType}
                  onChange={(v) => setForm({ ...form, saltType: v })}
                />
                <Input
                  label="Cycles Completed"
                  value={form.cyclesCompleted}
                  onChange={(v) => setForm({ ...form, cyclesCompleted: v })}
                />
              </>
            )}

            {form.testType === "aggregate_organic_impurities" && (
              <>
                <label>Color Comparison</label>
                <select
                  value={form.colorComparison}
                  onChange={(e) =>
                    setForm({ ...form, colorComparison: e.target.value })
                  }
                >
                  <option value="">Select color comparison</option>
                  <option value="lighter_than_standard">
                    Lighter Than Standard
                  </option>
                  <option value="equal_to_standard">Equal To Standard</option>
                  <option value="darker_than_standard">
                    Darker Than Standard
                  </option>
                </select>
              </>
            )}

            <label>Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional remarks..."
            />

            <div className="modalActions">
              <button
                className="saveBtn"
                disabled={!form.testType}
                onClick={submitTestData}
              >
                Save Test Data
              </button>
              <button className="cancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .eyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 800;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        .subtitle {
          margin: 6px 0 0;
          color: #333;
          font-size: 14px;
        }

        .refreshBtn,
        .saveBtn {
          border: none;
          background: #14003a;
          color: white;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 100;
          cursor: pointer;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 190px auto;
          gap: 12px;
          margin-bottom: 18px;
        }

        .searchBox {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 0 14px;
        }

        .searchBox input {
          width: 100%;
          border: none;
          outline: none;
          padding: 13px 0;
        }

        select,
        input,
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 11px 12px;
          color: #111827;
          background: white;
          font-size: 14px;
        }

        label {
          font-size: 12px;
          font-weight: 800;
          color: #374151;
          text-transform: uppercase;
        }

        .viewToggle {
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }

        .iconToggle {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 19px;
          font-weight: 900;
          cursor: pointer;
        }

        .iconToggle.active {
          background: #14003a;
          color: white;
          box-shadow: 0 8px 18px rgba(20, 0, 58, 0.22);
        }

        .tableCard,
        .emptyCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .emptyCard {
          padding: 22px;
          color: #334155;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        th {
          text-align: left;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: #f8fafc;
          padding: 14px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          color: #111827;
          font-size: 14px;
          padding: 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafafa;
        }

        .sampleCell,
        .stack {
          display: grid;
          gap: 4px;
        }

        small {
          color: #64748b;
        }

        .actions,
        .cardActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .primaryAction {
          border: none;
          background: #14003a;
          color: white;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .viewAction {
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 900;
          background: #f4f1ff;
          color: #14003a;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .sampleCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
        }

        .sampleCard h3 {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
        }

        .sampleCard p {
          margin: 5px 0 16px;
          color: #475569;
        }

        .meta {
          display: grid;
          gap: 4px;
          margin-bottom: 10px;
        }

        .meta span {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
        }

        .modalCard {
          background: white;
          border-radius: 22px;
          padding: 22px;
          width: min(520px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          display: grid;
          gap: 12px;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .modalHeader h2 {
          margin: 0;
          color: #0f172a;
        }

        .modalHeader p {
          margin: 4px 0 0;
          color: #64748b;
        }

        .closeBtn {
          border: none;
          background: #f1f5f9;
          color: #0f172a;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          font-size: 22px;
          cursor: pointer;
        }

        .standardBox,
        .noteBox {
          display: grid;
          gap: 3px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          color: #475569;
          font-size: 13px;
        }

        .standardBox span {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .autoNote {
          margin: 0;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          color: #475569;
          font-size: 13px;
        }

        textarea {
          min-height: 90px;
          resize: vertical;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }

        .saveBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancelBtn {
          border: none;
          background: #e5e7eb;
          color: #111827;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        @media (max-width: 760px) {
          .header,
          .toolbar {
            grid-template-columns: 1fr;
            display: grid;
          }

          .tableCard {
            overflow-x: auto;
          }

          table {
            min-width: 980px;
          }
        }
      `}</style>

      <style jsx global>{`
        .badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-registered {
          background: #eef2ff;
          color: #3730a3;
        }

        .status-testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .status-review {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-released {
          background: #dcfce7;
          color: #166534;
        }

        .status-archived {
          background: #f1f5f9;
          color: #475569;
        }

        .ready {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .qa {
          background: #fef3c7;
          color: #92400e;
        }

        .review {
          background: #fde68a;
          color: #78350f;
        }

        .release {
          background: #dcfce7;
          color: #166534;
        }

        .archive {
          background: #e0e7ff;
          color: #3730a3;
        }

        .testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .default {
          background: #f1f5f9;
          color: #475569;
        }

        .result-pass {
          background: #dcfce7;
          color: #166534;
        }

        .result-fail {
          background: #fee2e2;
          color: #991b1b;
        }

        .result-recorded {
          background: #e0e7ff;
          color: #3730a3;
        }

        .result-empty {
          background: #f1f5f9;
          color: #64748b;
        }
      `}</style>
    </>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "Registered"
      ? "status-registered"
      : status === "In Testing"
        ? "status-testing"
        : status === "For Review"
          ? "status-review"
          : status === "Released"
            ? "status-released"
            : status === "Archived"
              ? "status-archived"
              : "default";

  return <span className={`badge ${cls}`}>{status || "-"}</span>;
}

function ResultBadge({ result }) {
  const cls =
    result === "PASS"
      ? "result-pass"
      : result === "FAIL"
        ? "result-fail"
        : result === "RECORDED"
          ? "result-recorded"
          : "result-empty";

  return <span className={`badge ${cls}`}>{result || "No Result"}</span>;
}

function QueueBadge({ queue }) {
  return <span className={`badge ${queue.type}`}>{queue.label}</span>;
}

function ActionButtons({ item, user, startTesting, openTestModal }) {
  return (
    <div className="actions">
      {user?.role === "Lab Technician" &&
        item.current_state === "Registered" && (
          <button
            className="primaryAction"
            onClick={() => startTesting(item.sample_id)}
          >
            Start Testing
          </button>
        )}

      {user?.role === "Lab Technician" &&
        item.current_state === "In Testing" && (
          <button className="primaryAction" onClick={() => openTestModal(item)}>
            Enter Data
          </button>
        )}

      <Link
        className="viewAction"
        href={`/technical/tracking/${item.sample_id}`}
      >
        View →
      </Link>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <>
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}