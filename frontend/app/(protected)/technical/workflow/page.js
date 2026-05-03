"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

const INITIAL_FORM = {
  testType: "",
  remarks: "",

  specimenDiameter: "",
  specimenHeight: "",
  maxLoad: "",
  requiredStrength: "",

  slump: "",
  minSlump: "",
  maxSlump: "",
  slumpType: "true",

  flexuralStrength: "",
  requiredFlexural: "",
  beamWidth: "",
  beamDepth: "",
  spanLength: "",
  flexuralMaxLoad: "",

  yieldStrength: "",
  tensileStrength: "",
  elongation: "",
  requiredYield: "",
  requiredTensile: "",
  requiredElongation: "",

  bendObservation: "",

  wetMass: "",
  dryMass: "",
  moistureContent: "",
  maxMoisture: "",
  uscsClass: "",

  percentPassing: "",
  minPassing: "",
  maxPassing: "",
  absorption: "",

  abrasionLoss: "",
  maxAbrasionLoss: "",

  soundnessLoss: "",
  maxSoundnessLoss: "",
  saltType: "",
  cyclesCompleted: "",

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

const TEST_REQUIRED_FIELDS = {
  concrete_compression: [
    ["specimenDiameter", "Specimen Diameter"],
    ["specimenHeight", "Specimen Height"],
    ["maxLoad", "Maximum Load"],
    ["requiredStrength", "Required Strength"],
  ],

  concrete_slump: [
    ["slump", "Slump"],
    ["minSlump", "Minimum Slump"],
    ["maxSlump", "Maximum Slump"],
    ["slumpType", "Slump Type"],
  ],

  concrete_flexural: [["requiredFlexural", "Required Flexural Strength"]],

  rsb_tensile: [
    ["yieldStrength", "Yield Strength"],
    ["tensileStrength", "Tensile Strength"],
    ["elongation", "Elongation"],
    ["requiredYield", "Required Yield Strength"],
    ["requiredTensile", "Required Tensile Strength"],
    ["requiredElongation", "Required Elongation"],
  ],

  rsb_bend: [["bendObservation", "Bend Observation"]],

  soil_moisture: [
    ["wetMass", "Wet Mass"],
    ["dryMass", "Dry Mass"],
    ["moistureContent", "Moisture Content"],
  ],

  soil_classification: [["uscsClass", "USCS Classification"]],

  aggregate_sieve: [
    ["percentPassing", "Percent Passing"],
    ["minPassing", "Minimum Passing"],
    ["maxPassing", "Maximum Passing"],
  ],

  aggregate_abrasion: [
    ["abrasionLoss", "Abrasion Loss"],
    ["maxAbrasionLoss", "Maximum Abrasion Loss"],
  ],

  aggregate_soundness: [
    ["soundnessLoss", "Soundness Loss"],
    ["maxSoundnessLoss", "Maximum Soundness Loss"],
    ["saltType", "Salt Type"],
    ["cyclesCompleted", "Cycles Completed"],
  ],

  aggregate_organic_impurities: [["colorComparison", "Color Comparison"]],
};

export default function WorkflowPage() {
  const user = getStoredUser();

  const isSeniorTech = user?.role === "Senior Technician";
  const isQa = user?.role === "QA Engineer";
  const isLabTech = user?.role === "Lab Technician";
  const isAdmin = user?.role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qaPreTesting, setQaPreTesting] = useState([]);
  const [qaRelease, setQaRelease] = useState([]);
  const [labTechQueue, setLabTechQueue] = useState({
    ready_for_testing: [],
    in_testing: [],
  });

  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");

  const [overrideDrafts, setOverrideDrafts] = useState({});
  const [selectedSample, setSelectedSample] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [savingTestData, setSavingTestData] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // "approve" or "reject"
  const [modalSample, setModalSample] = useState(null);

  const canViewLabTechQueue = isLabTech || isAdmin;
  const canActAsLabTech = isLabTech || isAdmin;

  const canViewSeniorQueue = isSeniorTech || isAdmin;
  const canActAsSeniorTech = isSeniorTech || isAdmin;

  const canViewQaQueue = isQa || isAdmin;
  const canActAsQa = isQa || isAdmin;

  const selectedMaterial = normalizeMaterialName(
    selectedSample?.material_type || selectedSample?.ai_predicted_label,
  );

  const selectedTest = (TEST_OPTIONS[selectedMaterial] || []).find(
    (test) => test.key === form.testType,
  );

  const missingRequiredFields = getMissingRequiredFields(form.testType, form);

  const branchOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { label: "All Branches", value: "All" },
        { label: "Marikina", value: "1" },
        { label: "Pateros", value: "2" },
      ];
    }

    const otherBranch =
      Number(userBranchId) === 1
        ? { label: "Pateros", value: "2" }
        : { label: "Marikina", value: "1" };

    return [
      { label: "All Branches", value: "All" },
      { label: "My Branch", value: "My" },
      otherBranch,
    ];
  }, [isAdmin, userBranchId]);

  const branchViewLabel = getBranchViewLabel(branchFilter, userBranchId);
  const isCloudMonitoring = !isAdmin && branchFilter === "All";
  const isOtherBranchView =
    !isAdmin &&
    branchFilter !== "All" &&
    branchFilter !== "My" &&
    Number(resolveBranchFilter(branchFilter, userBranchId)) !==
      Number(userBranchId);

  const visibleReadyForTesting = useMemo(() => {
    return filterItemsByBranchView(
      labTechQueue.ready_for_testing || [],
      branchFilter,
      userBranchId,
    );
  }, [labTechQueue.ready_for_testing, branchFilter, userBranchId]);

  const visibleInTesting = useMemo(() => {
    return filterItemsByBranchView(
      labTechQueue.in_testing || [],
      branchFilter,
      userBranchId,
    );
  }, [labTechQueue.in_testing, branchFilter, userBranchId]);

  const visibleReviews = useMemo(() => {
    return filterItemsByBranchView(reviews, branchFilter, userBranchId);
  }, [reviews, branchFilter, userBranchId]);

  const visibleQaPreTesting = useMemo(() => {
    return filterItemsByBranchView(qaPreTesting, branchFilter, userBranchId);
  }, [qaPreTesting, branchFilter, userBranchId]);

  const visibleQaRelease = useMemo(() => {
    return filterItemsByBranchView(qaRelease, branchFilter, userBranchId);
  }, [qaRelease, branchFilter, userBranchId]);

  const stats = useMemo(() => {
    if (isLabTech) {
      return [
        { label: "Ready", value: visibleReadyForTesting.length },
        { label: "In Testing", value: visibleInTesting.length },
        {
          label: "Total Queue",
          value: visibleReadyForTesting.length + visibleInTesting.length,
        },
        { label: "Branch View", value: branchViewLabel },
      ];
    }

    if (isSeniorTech) {
      return [
        { label: "AI Review", value: visibleReviews.length },
        {
          label: "Manual Review",
          value: dashboard?.manual_review ?? visibleReviews.length,
        },
        {
          label: "Mandatory Override",
          value: dashboard?.mandatory_override ?? 0,
        },
        { label: "Branch View", value: branchViewLabel },
      ];
    }

    if (isQa) {
      return [
        { label: "Pre-Testing", value: visibleQaPreTesting.length },
        { label: "QA Release", value: visibleQaRelease.length },
        {
          label: "Total Queue",
          value: visibleQaPreTesting.length + visibleQaRelease.length,
        },
        { label: "Branch View", value: branchViewLabel },
      ];
    }

    return [
      { label: "Ready", value: visibleReadyForTesting.length },
      { label: "AI Review", value: visibleReviews.length },
      {
        label: "QA Queue",
        value: visibleQaPreTesting.length + visibleQaRelease.length,
      },
      { label: "Branch View", value: branchViewLabel },
    ];
  }, [
    isLabTech,
    isSeniorTech,
    isQa,
    visibleReadyForTesting.length,
    visibleInTesting.length,
    visibleReviews.length,
    visibleQaPreTesting.length,
    visibleQaRelease.length,
    branchViewLabel,
    dashboard,
  ]);

  function canActOnItem(item) {
    if (isAdmin) return true;
    return Number(item?.branch_id) === userBranchId;
  }

  function getBranchLockNote(item, actionLabel = "action") {
    if (canActOnItem(item)) return null;

    return `Read-only · ${formatBranch(item?.branch_id)} record. Your assigned branch is ${formatBranch(
      userBranchId,
    )}, so ${actionLabel} is locked.`;
  }

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

  async function loadData() {
    setLoading(true);
    setError("");
    setActionError("");

    try {
      const promises = [apiClient.getDashboard()];

      if (canViewSeniorQueue) {
        promises.push(apiClient.getReviews());
      } else {
        promises.push(Promise.resolve([]));
      }

      if (canViewQaQueue) {
        promises.push(apiClient.getQaPreTestingQueue());
        promises.push(apiClient.getQaReleaseQueue());
      } else {
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
      }

      if (canViewLabTechQueue) {
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

  async function runAction(sampleId, callback) {
    setWorkingId(sampleId);
    setActionError("");

    try {
      await callback();
      await loadData();
    } catch (err) {
      setActionError(err.message || "Workflow action failed.");
    } finally {
      setWorkingId("");
    }
  }

  async function confirmAndValidate(item, decision) {
    // Optional: ensure role
    if (!canActAsSeniorTech) {
      setActionError(
        "Only Senior Technicians can approve or reject AI classification review cases.",
      );
      return;
    }

    // Show browser confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to ${decision.toUpperCase()} the AI classification for sample ${item.sample_id}? This action cannot be undone.`,
    );

    if (!confirmed) return; // stop if user cancels

    // Call existing validation function
    await handleValidation(item, decision);
  }

  async function handleValidation(item, decision) {
    if (!canActAsSeniorTech) {
      setActionError(
        "Only Senior Technicians can approve or reject AI classification review cases.",
      );
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "AI classification review"));
      return;
    }

    await runAction(item.sample_id, async () => {
      await apiClient.validate({
        sample_id: item.sample_id,
        corrected_label: normalizeMaterialName(item.predicted_label),
        justification: "Validated by Senior Technician",
        decision,
      });
    });
  }

  async function handleQaPreTesting(item) {
    if (!canActAsQa) {
      setActionError("Only QA Engineers can approve samples for testing.");
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "QA pre-testing approval"));
      return;
    }

    await runAction(item.sample_id, async () => {
      await apiClient.qaApprovePreTesting(item.sample_id);
    });
  }

  async function handleQaRelease(item) {
    if (!canActAsQa) {
      setActionError("Only QA Engineers can release official reports.");
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "official report release"));
      return;
    }

    await runAction(item.sample_id, async () => {
      await apiClient.qaApproveRelease(item.sample_id);
    });
  }

  async function handleQaResultOverride(item) {
    if (!canActAsQa) {
      setActionError(
        "Only QA Engineers can review or override the final report result.",
      );
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "QA result review"));
      return;
    }

    const draft = getOverrideDraft(item.sample_id);

    if (!draft.result) {
      setActionError("Please select the QA final result.");
      return;
    }

    if (!draft.reason || draft.reason.trim().length < 10) {
      setActionError(
        "Please provide an override or review reason with at least 10 characters.",
      );
      return;
    }

    await runAction(item.sample_id, async () => {
      await apiClient.qaOverrideTestResult(item.sample_id, {
        result: draft.result,
        reason: draft.reason,
      });

      setOverrideDrafts((current) => ({
        ...current,
        [item.sample_id]: {
          result: "",
          reason: "",
        },
      }));
    });
  }

  async function handleStartTesting(item) {
    if (!canActAsLabTech) {
      setActionError("Only Lab Technicians can start laboratory testing.");
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "start testing"));
      return;
    }

    await runAction(item.sample_id, async () => {
      await apiClient.updateSampleStatus(item.sample_id, {
        status: "In Testing",
      });
    });
  }

  function openTestModal(item) {
    if (!canActAsLabTech) {
      setActionError("Only Lab Technicians can enter laboratory test data.");
      return;
    }

    if (!canActOnItem(item)) {
      setActionError(getBranchLockNote(item, "test data entry"));
      return;
    }

    setSelectedSample(item);
    setForm(INITIAL_FORM);
    setFormError("");
    setTestModalOpen(true);
  }

  function closeTestModal() {
    if (savingTestData) return;

    setTestModalOpen(false);
    setSelectedSample(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function submitTestData() {
    if (!selectedSample?.sample_id) {
      setFormError("No sample selected.");
      return;
    }

    if (!form.testType) {
      setFormError("Please select the test performed.");
      return;
    }

    if (!canActOnItem(selectedSample)) {
      setFormError(getBranchLockNote(selectedSample, "test data entry"));
      return;
    }

    const missingFields = getMissingRequiredFields(form.testType, form);

    if (missingFields.length > 0) {
      setFormError(
        `Please complete required fields: ${missingFields.join(", ")}.`,
      );
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

    setSavingTestData(true);
    setFormError("");

    try {
      await apiClient.updateSampleTestData(selectedSample.sample_id, payload);

      setTestModalOpen(false);
      setSelectedSample(null);
      setForm(INITIAL_FORM);

      await loadData();
    } catch (err) {
      setFormError(err.message || "Failed to save test data.");
    } finally {
      setSavingTestData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isAdmin && branchFilter !== "All" && branchFilter !== "My") {
      const resolved = resolveBranchFilter(branchFilter, userBranchId);
      const isOwnBranch = Number(resolved) === Number(userBranchId);

      if (isOwnBranch) {
        setBranchFilter("My");
      }
    }
  }, [branchFilter, isAdmin, userBranchId]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Workflow Monitor</h1>
          <p>
            Role-based task queues for sample testing, QA review, and official
            report release for <strong>{branchViewLabel}</strong>.
          </p>
        </div>

        <div className="headerControls">
          <Select
            name="branchFilter"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </header>

      <section className="notice">
        <strong>
          {isAdmin ? "Administrator Oversight Mode" : "Cloud-Synced Monitoring"}
        </strong>
        <span>
          {isAdmin
            ? "You can view and act on all workflow queues across branches."
            : isCloudMonitoring
              ? `You are viewing all cloud-synced branch records. Actions remain locked to your assigned branch: ${formatBranch(
                  userBranchId,
                )}.`
              : isOtherBranchView
                ? `You are viewing ${branchViewLabel} records for monitoring. Actions remain locked to your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`
                : `You are viewing your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`}
        </span>
      </section>

      {loading && <Loader label="Loading workflow data..." />}

      {!loading && error && <div className="errorBox">{error}</div>}

      {!loading && actionError && <div className="errorBox">{actionError}</div>}

      {!loading && !error && dashboard && (
        <>
          <section className="stats">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </section>

          {canViewLabTechQueue && (
            <>
              <QueueSection
                title="Ready for Testing"
                subtitle="Samples cleared by Accounting and QA for laboratory testing."
                emptyText="No samples ready for testing."
              >
                {visibleReadyForTesting.map((item) => (
                  <SampleQueueCard
                    key={item.sample_id}
                    item={item}
                    badge={<Badge variant="info">Ready</Badge>}
                    actions={
                      canActAsLabTech && canActOnItem(item) ? (
                        <Button
                          size="sm"
                          onClick={() => handleStartTesting(item)}
                          disabled={workingId === item.sample_id}
                        >
                          {workingId === item.sample_id
                            ? "Starting..."
                            : "Start Testing"}
                        </Button>
                      ) : (
                        <OversightNote
                          text={
                            canActAsLabTech
                              ? getBranchLockNote(item, "start testing")
                              : "Lab Technician action required to start laboratory testing."
                          }
                        />
                      )
                    }
                  />
                ))}
              </QueueSection>

              <QueueSection
                title="In Testing"
                subtitle="Samples currently undergoing laboratory testing and ready for test data entry."
                emptyText="No samples currently in testing."
              >
                {visibleInTesting.map((item) => (
                  <SampleQueueCard
                    key={item.sample_id}
                    item={item}
                    badge={<Badge variant="warning">In Testing</Badge>}
                    actions={
                      canActAsLabTech && canActOnItem(item) ? (
                        <Button
                          size="sm"
                          onClick={() => openTestModal(item)}
                          disabled={savingTestData}
                        >
                          Enter Data
                        </Button>
                      ) : (
                        <OversightNote
                          text={
                            canActAsLabTech
                              ? getBranchLockNote(item, "test data entry")
                              : "Lab Technician action required for laboratory test data entry."
                          }
                        />
                      )
                    }
                  />
                ))}
              </QueueSection>
            </>
          )}

          {canViewSeniorQueue && (
            <QueueSection
              title="AI Classification Review Queue"
              subtitle="Low-confidence AI classifications requiring Senior Technician manual review."
              emptyText="No AI classification review cases."
            >
              {visibleReviews.map((item) => (
                <Card key={item.sample_id}>
                  <div className="cardTop">
                    <div>
                      <span className="miniLabel">Sample ID</span>
                      <strong>{item.sample_id}</strong>
                    </div>

                    <Badge
                      variant={
                        item.status === "Mandatory Override"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {item.status || "Review"}
                    </Badge>
                  </div>

                  <div className="infoGrid">
                    <Info label="Client" value={item.client_name} />
                    <Info label="Project" value={item.project_id} />
                    <Info label="Branch" value={formatBranch(item.branch_id)} />
                    <Info
                      label="Predicted"
                      value={normalizeMaterialName(item.predicted_label)}
                    />
                    <Info
                      label="Confidence"
                      value={
                        typeof item.confidence_score === "number"
                          ? `${Math.round(item.confidence_score * 100)}%`
                          : "-"
                      }
                    />
                  </div>

                  {canActAsSeniorTech && canActOnItem(item) ? (
                    <div className="actions">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          setModalAction("approve");
                          setModalSample(item);
                          setShowConfirmModal(true);
                        }}
                      >
                        Approve Classification
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setModalAction("reject");
                          setModalSample(item);
                          setShowConfirmModal(true);
                        }}
                      >
                        Reject Classification
                      </Button>
                    </div>
                  ) : (
                    <OversightNote
                      text={
                        canActAsSeniorTech
                          ? getBranchLockNote(item, "AI classification review")
                          : "Senior Technician action required for AI classification review."
                      }
                    />
                  )}
                </Card>
              ))}

              {showConfirmModal && modalSample && (
                <div className="modalOverlay">
                  <div className="modalContent">
                    <h3>
                      Confirm{" "}
                      {modalAction === "approve" ? "Approval" : "Rejection"}
                    </h3>
                    <p>
                      Are you sure you want to {modalAction.toUpperCase()} the
                      AI classification for sample {modalSample.sample_id}? This
                      action cannot be undone.
                    </p>
                    <div className="modalButtons">
                      <Button
                        variant="secondary"
                        onClick={() => setShowConfirmModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={async () => {
                          await handleValidation(modalSample, modalAction);
                          setShowConfirmModal(false);
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </QueueSection>
          )}

          {canViewQaQueue && (
            <>
              <QueueSection
                title="QA Pre-Testing Queue"
                subtitle="Registered samples waiting for QA approval before testing."
                emptyText="No samples waiting for QA pre-testing review."
              >
                {visibleQaPreTesting.map((item) => {
                  const payment = getPayment(item);

                  return (
                    <SampleQueueCard
                      key={item.sample_id}
                      item={item}
                      badge={<Badge variant="info">Pre-Testing Review</Badge>}
                      extra={
                        <Info
                          label="Payment"
                          value={payment.payment_status || "Unpaid"}
                        />
                      }
                      actions={
                        canActAsQa && canActOnItem(item) ? (
                          <Button
                            size="sm"
                            onClick={() => handleQaPreTesting(item)}
                            disabled={workingId === item.sample_id}
                          >
                            {workingId === item.sample_id
                              ? "Approving..."
                              : "Approve for Testing"}
                          </Button>
                        ) : (
                          <OversightNote
                            text={
                              canActAsQa
                                ? getBranchLockNote(
                                    item,
                                    "QA pre-testing approval",
                                  )
                                : "QA Engineer action required for pre-testing approval."
                            }
                          />
                        )
                      }
                    />
                  );
                })}
              </QueueSection>

              <section className="releaseSection">
                <div className="releaseHeader">
                  <div>
                    <h2>QA Release Queue</h2>
                    <p>
                      Review official laboratory report details before release.
                      QA release confirms report authorization and record
                      finalization, not material acceptance.
                    </p>
                  </div>
                </div>

                {visibleQaRelease.length === 0 ? (
                  <EmptyState
                    title="No samples waiting for QA release"
                    description="Released reports will appear here once samples are ready for QA authorization."
                  />
                ) : (
                  <div className="releaseList">
                    {visibleQaRelease.map((item) => {
                      const payment = getPayment(item);
                      const testData = getTestData(item);
                      const testValues = getTestValues(item);

                      const systemResult = getSystemResult(testData);
                      const finalResult = getFinalResult(testData);
                      const specificationStatus =
                        getSpecificationStatus(finalResult);
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
                              <h3>{item.sample_id}</h3>
                              <p>
                                {item.client_name || "No client"} ·{" "}
                                {item.project_reference || "No project"} ·{" "}
                                {formatBranch(item.branch_id)}
                              </p>
                            </div>

                            <div className="reportBadges">
                              <ResultBadge result={finalResult} />
                              <Badge variant="neutral">For QA Release</Badge>
                            </div>
                          </div>

                          <ResultNotice result={finalResult} />

                          <div className="reportBody">
                            <ReportSection title="Client and Sample Information">
                              <div className="reportGrid">
                                <ReportInfo
                                  label="Client"
                                  value={item.client_name}
                                />
                                <ReportInfo
                                  label="Project"
                                  value={item.project_reference}
                                />
                                <ReportInfo
                                  label="Branch"
                                  value={formatBranch(item.branch_id)}
                                />
                                <ReportInfo
                                  label="Material"
                                  value={normalizeMaterialName(
                                    item.material_type,
                                  )}
                                />
                                <ReportInfo
                                  label="Lifecycle Status"
                                  value={item.current_state}
                                />
                              </div>
                            </ReportSection>

                            <ReportSection title="Payment and Release Eligibility">
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
                            </ReportSection>

                            <ReportSection title="Test Result Summary">
                              <div className="resultCompareGrid">
                                <ResultPanel
                                  label="System Result"
                                  result={systemResult}
                                />

                                <ResultPanel
                                  label="QA Final Result"
                                  result={finalResult}
                                  caption={specificationStatus}
                                  featured
                                />
                              </div>

                              <div className="specificationBox">
                                <span>Specification Status</span>
                                <strong>{specificationStatus}</strong>
                              </div>

                              {qaOverride?.is_overridden && (
                                <div className="softNotice warningNotice">
                                  <strong>QA Override Applied</strong>
                                  <p>
                                    Original system result was{" "}
                                    <b>{qaOverride.system_result}</b>. QA final
                                    result is{" "}
                                    <b>{qaOverride.override_result}</b>.
                                  </p>
                                  <p>
                                    <b>Reason:</b> {qaOverride.override_reason}
                                  </p>
                                </div>
                              )}

                              {qaOverride && !qaOverride.is_overridden && (
                                <div className="softNotice infoNotice">
                                  <strong>QA Result Reviewed</strong>
                                  <p>
                                    QA reviewed the system result and kept the
                                    final report result as <b>{finalResult}</b>.
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
                                  value={
                                    testValues?.test_name ||
                                    formatLabel(testType)
                                  }
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
                            </ReportSection>

                            <ReportSection title="Remarks">
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
                            </ReportSection>

                            {testValues &&
                              Object.keys(testValues).length > 0 && (
                                <details className="valuesDetails">
                                  <summary>
                                    View recorded and computed values
                                  </summary>

                                  <div className="valuesGrid">
                                    {Object.entries(testValues).map(
                                      ([key, value]) => (
                                        <ReportInfo
                                          key={key}
                                          label={formatLabel(key)}
                                          value={formatValue(value)}
                                        />
                                      ),
                                    )}
                                  </div>
                                </details>
                              )}
                          </div>

                          {canActAsQa && canActOnItem(item) ? (
                            <>
                              <div className="overrideBox">
                                <div>
                                  <h4>QA Result Review / Override</h4>
                                  <p>
                                    Keep the system-computed result or override
                                    the final report result with a required
                                    justification before release.
                                  </p>
                                </div>

                                <div className="overrideGrid">
                                  <Select
                                    label="QA Final Result"
                                    name={`qa-result-${item.sample_id}`}
                                    value={overrideDraft.result}
                                    required
                                    onChange={(event) =>
                                      updateOverrideDraft(
                                        item.sample_id,
                                        "result",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="">
                                      Select final result
                                    </option>
                                    <option value="PASS">PASS</option>
                                    <option value="FAIL">FAIL</option>
                                    <option value="RECORDED">RECORDED</option>
                                  </Select>

                                  <Textarea
                                    label="Override / Review Justification"
                                    name={`qa-reason-${item.sample_id}`}
                                    value={overrideDraft.reason}
                                    required
                                    onChange={(event) =>
                                      updateOverrideDraft(
                                        item.sample_id,
                                        "reason",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Example: Physical test slip confirms no fracture; technician selected the wrong observation."
                                    rows={4}
                                  />
                                </div>

                                <div className="overrideActions">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleQaResultOverride(item)}
                                    disabled={workingId === item.sample_id}
                                  >
                                    Save QA Final Result
                                  </Button>
                                </div>
                              </div>

                              <div className="releaseFooter">
                                <div>
                                  <strong>QA Authorization</strong>
                                  <p>
                                    Once released, this report becomes a
                                    finalized official record for the sample.
                                  </p>
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() => handleQaRelease(item)}
                                  disabled={workingId === item.sample_id}
                                >
                                  {workingId === item.sample_id
                                    ? "Releasing..."
                                    : "Release Official Report"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="releaseFooter">
                              <div>
                                <strong>
                                  {canActAsQa
                                    ? "Read-only Branch Monitoring"
                                    : "Administrator Oversight"}
                                </strong>
                                <p>
                                  {canActAsQa
                                    ? getBranchLockNote(
                                        item,
                                        "QA result review and report release",
                                      )
                                    : "QA Engineer action is required to review, override, or release this official report."}
                                </p>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      <Modal
        open={testModalOpen}
        title="Test Data Entry"
        description={
          selectedSample?.sample_id || "Enter test data for this sample."
        }
        onClose={closeTestModal}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeTestModal}
              disabled={savingTestData}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              disabled={
                !form.testType ||
                savingTestData ||
                missingRequiredFields.length > 0
              }
              onClick={submitTestData}
            >
              {savingTestData ? "Saving..." : "Save Test Data"}
            </Button>
          </>
        }
      >
        <div className="testForm">
          {formError && <div className="formError">{formError}</div>}

          <Select
            label="Test Performed"
            name="testType"
            value={form.testType}
            required
            onChange={(event) =>
              setForm({ ...INITIAL_FORM, testType: event.target.value })
            }
          >
            <option value="">Select test performed</option>

            {(TEST_OPTIONS[selectedMaterial] || []).map((test) => (
              <option key={test.key} value={test.key}>
                {test.label}
              </option>
            ))}
          </Select>

          {selectedTest && (
            <div className="standardBox">
              <span>Auto-applied standard</span>
              <strong>{selectedTest.standard}</strong>
            </div>
          )}

          <TestFields form={form} setForm={setForm} />

          <Textarea
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={(event) =>
              setForm({ ...form, remarks: event.target.value })
            }
            placeholder="Optional remarks..."
            rows={3}
          />
        </div>
      </Modal>

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

        .headerControls {
          display: grid;
          grid-template-columns: 180px auto;
          gap: 10px;
          align-items: start;
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

        .header p strong {
          color: var(--color-text-primary);
          font-weight: 500;
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

        .errorBox,
        .formError {
          padding: 12px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-danger-border);
          background: var(--color-danger-bg);
          color: var(--color-danger);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1.45;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          padding: 4px 0 2px;
        }

        .releaseSection {
          display: grid;
          gap: 12px;
        }

        .releaseHeader h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .releaseHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .releaseList {
          display: grid;
          gap: 14px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .miniLabel {
          display: block;
          margin-bottom: 4px;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cardTop strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .infoGrid,
        .reportGrid,
        .valuesGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .reportCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: none;
        }

        .reportTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--color-border-soft);
        }

        .reportTop h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .reportTop p {
          margin: 5px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .reportBadges {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .reportBody {
          padding: 18px 20px;
          display: grid;
          gap: 18px;
        }

        .resultCompareGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .specificationBox {
          display: grid;
          gap: 4px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
        }

        .specificationBox span,
        .remarksBox span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .specificationBox strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .softNotice {
          display: grid;
          gap: 4px;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .softNotice strong {
          font-weight: 600;
        }

        .softNotice p {
          margin: 0;
        }

        .warningNotice {
          background: var(--color-warning-bg);
          border: 1px solid var(--color-warning-border);
          color: var(--color-warning);
        }

        .infoNotice {
          background: var(--color-info-bg);
          border: 1px solid var(--color-info-border);
          color: var(--color-info);
        }

        .remarksBox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .remarksBox div {
          display: grid;
          gap: 6px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
        }

        .remarksBox p {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.5;
        }

        .valuesDetails {
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          padding: 12px;
          background: var(--color-surface);
        }

        .valuesDetails summary {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .valuesGrid {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border-soft);
        }

        .overrideBox {
          display: grid;
          gap: 14px;
          margin: 0 20px 18px;
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-soft);
          background: var(--color-surface);
        }

        .overrideBox h4 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        .overrideBox p {
          margin: 6px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .overrideGrid {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .overrideActions {
          display: flex;
          justify-content: flex-end;
        }

        .releaseFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding: 16px 20px;
          background: color-mix(
            in srgb,
            var(--color-overlay) 60%,
            var(--color-surface)
          );
          border-top: 1px solid var(--color-border-soft);
        }

        .releaseFooter strong {
          display: block;
          margin-bottom: 4px;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .releaseFooter p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .testForm {
          display: grid;
          gap: 14px;
        }

        .standardBox {
          display: grid;
          gap: 4px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 12px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .standardBox span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .standardBox strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .overrideGrid,
          .resultCompareGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .header,
          .reportTop,
          .releaseFooter {
            flex-direction: column;
            align-items: flex-start;
          }

          .headerControls {
            width: 100%;
            grid-template-columns: 1fr;
          }

          .stats,
          .infoGrid,
          .reportGrid,
          .valuesGrid,
          .remarksBox {
            grid-template-columns: 1fr;
          }

          .reportBadges {
            justify-content: flex-start;
          }
        }

        .modalOverlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(
            0,
            0,
            0,
            0.35
          ); /* slightly lighter background for soft shadow */
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modalContent {
          background: #fff;
          padding: 24px 28px;
          border-radius: 12px;
          width: 440px;
          max-width: 90%;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); /* deeper shadow for elevation */
          display: flex;
          flex-direction: column;
        }

        .modalTitle {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 14px;
          color: #111;
        }

        .modalMessage {
          font-size: 1rem;
          margin-bottom: 22px;
          line-height: 1.5;
          color: #333;
        }

        .modalButtons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .modalButtons .secondary {
          background: #f5f5f5;
          color: #333;
        }

        .modalButtons .primary {
          background: #4f46e5; /* deep purple like screenshot */
          color: #fff;
        }
      `}</style>
    </div>
  );
}

function QueueSection({ title, subtitle, emptyText, children }) {
  const hasChildren = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);

  return (
    <section className="section">
      <div className="sectionHeader">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {!hasChildren ? (
        <EmptyState
          title={emptyText}
          description="No action is needed right now."
        />
      ) : (
        <div className="list">{children}</div>
      )}

      <style jsx>{`
        .section {
          display: grid;
          gap: 12px;
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .sectionHeader h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .sectionHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .list {
          display: grid;
          gap: 14px;
        }
      `}</style>
    </section>
  );
}

function SampleQueueCard({ item, badge, extra, actions }) {
  return (
    <Card>
      <div className="queueLayout">
        <div className="queueMain">
          <div className="cardTop">
            <div>
              <span className="miniLabel">Sample ID</span>

              <div className="sampleLine">
                <strong>{item.sample_id}</strong>
                {badge}
              </div>
            </div>
          </div>

          <div className="infoGrid">
            <Info label="Client" value={item.client_name} />
            <Info label="Project" value={item.project_reference} />
            <Info
              label="Material"
              value={normalizeMaterialName(item.material_type)}
            />
            <Info label="Branch" value={formatBranch(item.branch_id)} />
            {extra}
          </div>
        </div>

        <div className="actions">
          {actions ? actions : <div className="actionSpacer" />}
        </div>
      </div>

      <style jsx>{`
        .queueLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 190px;
          gap: 20px;
          align-items: center;
        }

        .queueMain {
          min-width: 0;
        }

        .cardTop {
          margin-bottom: 16px;
        }

        .miniLabel {
          display: block;
          margin-bottom: 6px;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sampleLine {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .sampleLine strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          line-height: 1.2;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
        }

        .actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 40px;
          width: 100%;
        }

        .actionSpacer {
          width: 120px;
          height: 36px;
          visibility: hidden;
        }

        @media (max-width: 1000px) {
          .queueLayout {
            grid-template-columns: 1fr;
            gap: 16px;
            align-items: stretch;
          }

          .infoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .actions {
            justify-content: flex-start;
          }

          .actionSpacer {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .infoGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Card>
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

function OversightNote({ text }) {
  return (
    <div className="oversightNote">
      {text}

      <style jsx>{`
        .oversightNote {
          width: 100%;
          padding: 11px 12px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}

function ResultBadge({ result }) {
  const variant =
    result === "PASS"
      ? "success"
      : result === "FAIL"
        ? "danger"
        : result === "RECORDED"
          ? "info"
          : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {result ? `Result: ${result}` : "No Result"}
    </Badge>
  );
}

function ResultPanel({ label, result, caption, featured = false }) {
  return (
    <div className={featured ? "resultPanel featured" : "resultPanel"}>
      <div>
        <span>{label}</span>
        <strong>{result || "No Result"}</strong>
        {caption && <small>{caption}</small>}
      </div>

      <ResultBadge result={result} />

      <style jsx>{`
        .resultPanel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
        }

        .resultPanel.featured {
          background: var(--color-info-bg);
          border-color: var(--color-info-border);
        }

        span {
          display: block;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          display: block;
          margin-top: 4px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        small {
          display: block;
          margin-top: 4px;
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.35;
        }

        @media (max-width: 760px) {
          .resultPanel {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function ResultNotice({ result }) {
  const className =
    result === "FAIL"
      ? "resultNotice fail"
      : result === "PASS"
        ? "resultNotice pass"
        : result === "RECORDED"
          ? "resultNotice recorded"
          : "resultNotice";

  const text =
    result === "FAIL"
      ? "This report contains a failed laboratory result. Releasing it documents the actual test outcome and does not imply that the material passed or was accepted for use."
      : result === "PASS"
        ? "This report contains a passing laboratory result and is ready for QA report authorization."
        : result === "RECORDED"
          ? "This report contains a recorded result without a project-specific pass/fail threshold."
          : "No computed result is available. Verify test data before release.";

  return (
    <div className={className}>
      {text}

      <style jsx>{`
        .resultNotice {
          margin: 16px 20px 0;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .resultNotice.fail {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-color: var(--color-danger-border);
        }

        .resultNotice.pass {
          background: var(--color-success-bg);
          color: var(--color-success);
          border-color: var(--color-success-border);
        }

        .resultNotice.recorded {
          background: var(--color-info-bg);
          color: var(--color-info);
          border-color: var(--color-info-border);
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

function ReportSection({ title, children }) {
  return (
    <section className="reportSection">
      <h4>{title}</h4>
      {children}

      <style jsx>{`
        .reportSection {
          display: grid;
          gap: 12px;
        }

        h4 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }
      `}</style>
    </section>
  );
}

function ReportInfo({ label, value }) {
  return (
    <div className="reportInfo">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>

      <style jsx>{`
        .reportInfo {
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

function TestFields({ form, setForm }) {
  // Concrete Tests
  if (form.testType === "concrete_compression") {
    return (
      <>
        <InputField
          label="Specimen Diameter (mm)"
          value={form.specimenDiameter}
          required
          onChange={(value) => setForm({ ...form, specimenDiameter: value })}
        />
        <InputField
          label="Specimen Height (mm)"
          value={form.specimenHeight}
          required
          onChange={(value) => setForm({ ...form, specimenHeight: value })}
        />
        <InputField
          label="Mass (kg)"
          value={form.mass}
          required
          onChange={(value) => setForm({ ...form, mass: value })}
        />
        <InputField
          label="Maximum Applied Load (kN)"
          value={form.maxLoad}
          required
          onChange={(value) => setForm({ ...form, maxLoad: value })}
        />
        <InputField
          label="Computed Compressive Strength (MPa / psi)"
          value={form.requiredStrength}
          required
          onChange={(value) => setForm({ ...form, requiredStrength: value })}
        />
        <InputField
          label="Fracture Type"
          value={form.fractureType}
          onChange={(value) => setForm({ ...form, fractureType: value })}
        />
        <Select
          label="Pass / Fail"
          value={form.passFail}
          onChange={(e) => setForm({ ...form, passFail: e.target.value })}
        >
          <option value="">Select result</option>
          <option value="Pass">Pass</option>
          <option value="Fail">Fail</option>
        </Select>
      </>
    );
  }

  if (form.testType === "concrete_slump") {
    return (
      <>
        <InputField
          label="Slump (mm)"
          value={form.slump}
          required
          onChange={(value) => setForm({ ...form, slump: value })}
        />
        <InputField
          label="Minimum Slump (mm)"
          value={form.minSlump}
          onChange={(value) => setForm({ ...form, minSlump: value })}
        />
        <InputField
          label="Maximum Slump (mm)"
          value={form.maxSlump}
          onChange={(value) => setForm({ ...form, maxSlump: value })}
        />
        <Select
          label="Slump Type"
          value={form.slumpType}
          onChange={(e) => setForm({ ...form, slumpType: e.target.value })}
        >
          <option value="true">True Slump</option>
          <option value="shear">Shear Slump</option>
          <option value="collapse">Collapse Slump</option>
        </Select>
        <InputField
          label="Ambient Temperature (°C)"
          value={form.ambientTemp}
          onChange={(value) => setForm({ ...form, ambientTemp: value })}
        />
      </>
    );
  }

  if (form.testType === "concrete_flexural") {
    return (
      <>
        <InputField
          label="Beam Width (mm)"
          value={form.beamWidth}
          onChange={(value) => setForm({ ...form, beamWidth: value })}
        />
        <InputField
          label="Beam Depth (mm)"
          value={form.beamDepth}
          onChange={(value) => setForm({ ...form, beamDepth: value })}
        />
        <InputField
          label="Span Length (mm)"
          value={form.spanLength}
          onChange={(value) => setForm({ ...form, spanLength: value })}
        />
        <InputField
          label="Maximum Load (kN)"
          value={form.flexuralMaxLoad}
          onChange={(value) => setForm({ ...form, flexuralMaxLoad: value })}
        />
        <InputField
          label="Flexural Strength (MPa)"
          value={form.flexuralStrength}
          onChange={(value) => setForm({ ...form, flexuralStrength: value })}
        />
        <InputField
          label="Required Flexural Strength (MPa)"
          value={form.requiredFlexural}
          required
          onChange={(value) => setForm({ ...form, requiredFlexural: value })}
        />
      </>
    );
  }

  // RSB Tests
  if (form.testType === "rsb_tensile") {
    return (
      <>
        <InputField
          label="Yield Strength (MPa)"
          value={form.yieldStrength}
          required
          onChange={(value) => setForm({ ...form, yieldStrength: value })}
        />
        <InputField
          label="Tensile Strength (MPa)"
          value={form.tensileStrength}
          required
          onChange={(value) => setForm({ ...form, tensileStrength: value })}
        />
        <InputField
          label="Elongation (%)"
          value={form.elongation}
          required
          onChange={(value) => setForm({ ...form, elongation: value })}
        />
        <InputField
          label="Required Yield Strength (MPa)"
          value={form.requiredYield}
          required
          onChange={(value) => setForm({ ...form, requiredYield: value })}
        />
        <InputField
          label="Required Tensile Strength (MPa)"
          value={form.requiredTensile}
          required
          onChange={(value) => setForm({ ...form, requiredTensile: value })}
        />
        <InputField
          label="Required Elongation (%)"
          value={form.requiredElongation}
          required
          onChange={(value) => setForm({ ...form, requiredElongation: value })}
        />
      </>
    );
  }

  if (form.testType === "rsb_bend") {
    return (
      <Select
        label="Bend Observation"
        value={form.bendObservation}
        required
        onChange={(event) =>
          setForm({ ...form, bendObservation: event.target.value })
        }
      >
        <option value="">Select observed condition</option>
        <option value="no_crack">No Crack / No Fracture</option>
        <option value="crack">Visible Crack</option>
        <option value="fracture">Fracture</option>
        <option value="broken">Broken</option>
      </Select>
    );
  }

  // Soil / Aggregates Tests
  if (form.testType === "soil_moisture") {
    return (
      <>
        <InputField
          label="Wet Mass (g)"
          value={form.wetMass}
          required
          onChange={(value) => setForm({ ...form, wetMass: value })}
        />
        <InputField
          label="Dry Mass (g)"
          value={form.dryMass}
          required
          onChange={(value) => setForm({ ...form, dryMass: value })}
        />
        <InputField
          label="Moisture Content (%)"
          value={form.moistureContent}
          required
          onChange={(value) => setForm({ ...form, moistureContent: value })}
        />
        <InputField
          label="Maximum Allowed Moisture (%)"
          value={form.maxMoisture}
          onChange={(value) => setForm({ ...form, maxMoisture: value })}
        />
        <InputField
          label="USCS Classification"
          value={form.uscsClass}
          onChange={(value) => setForm({ ...form, uscsClass: value })}
        />
      </>
    );
  }

  if (form.testType === "soil_classification") {
    return (
      <InputField
        label="USCS Classification"
        value={form.uscsClass}
        required
        onChange={(value) => setForm({ ...form, uscsClass: value })}
      />
    );
  }

  if (form.testType === "aggregate_sieve") {
    return (
      <>
        <InputField
          label="Percent Passing (%)"
          value={form.percentPassing}
          required
          onChange={(value) => setForm({ ...form, percentPassing: value })}
        />
        <InputField
          label="Minimum Passing (%)"
          value={form.minPassing}
          required
          onChange={(value) => setForm({ ...form, minPassing: value })}
        />
        <InputField
          label="Maximum Passing (%)"
          value={form.maxPassing}
          required
          onChange={(value) => setForm({ ...form, maxPassing: value })}
        />
        <InputField
          label="Absorption (%)"
          value={form.absorption}
          onChange={(value) => setForm({ ...form, absorption: value })}
        />
      </>
    );
  }

  if (form.testType === "aggregate_abrasion") {
    return (
      <>
        <InputField
          label="Abrasion Loss (%)"
          value={form.abrasionLoss}
          required
          onChange={(value) => setForm({ ...form, abrasionLoss: value })}
        />
        <InputField
          label="Maximum Abrasion Loss (%)"
          value={form.maxAbrasionLoss}
          required
          onChange={(value) => setForm({ ...form, maxAbrasionLoss: value })}
        />
      </>
    );
  }

  if (form.testType === "aggregate_soundness") {
    return (
      <>
        <InputField
          label="Soundness Loss (%)"
          value={form.soundnessLoss}
          required
          onChange={(value) => setForm({ ...form, soundnessLoss: value })}
        />
        <InputField
          label="Maximum Soundness Loss (%)"
          value={form.maxSoundnessLoss}
          required
          onChange={(value) => setForm({ ...form, maxSoundnessLoss: value })}
        />
        <InputField
          label="Salt Type"
          value={form.saltType}
          required
          onChange={(value) => setForm({ ...form, saltType: value })}
        />
        <InputField
          label="Cycles Completed"
          value={form.cyclesCompleted}
          required
          onChange={(value) => setForm({ ...form, cyclesCompleted: value })}
        />
      </>
    );
  }

  if (form.testType === "aggregate_organic_impurities") {
    return (
      <Select
        label="Color Comparison"
        value={form.colorComparison}
        required
        onChange={(event) =>
          setForm({ ...form, colorComparison: event.target.value })
        }
      >
        <option value="">Select color comparison</option>
        <option value="lighter_than_standard">Lighter Than Standard</option>
        <option value="equal_to_standard">Equal To Standard</option>
        <option value="darker_than_standard">Darker Than Standard</option>
      </Select>
    );
  }

  return null;
}

function InputField({ label, value, onChange, required = false }) {
  return (
    <Input
      label={label}
      name={label}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NoteBox({ children }) {
  return (
    <p className="noteBox">
      {children}

      <style jsx>{`
        .noteBox {
          margin: 0;
          padding: 12px;
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }
      `}</style>
    </p>
  );
}

function getMissingRequiredFields(testType, form) {
  const requiredFields = TEST_REQUIRED_FIELDS[testType] || [];

  return requiredFields
    .filter(([field]) => {
      const value = form[field];
      return (
        value === null || value === undefined || String(value).trim() === ""
      );
    })
    .map(([, label]) => label);
}

function getSpecificationStatus(result) {
  if (result === "PASS") return "Meets Specified Requirement";
  if (result === "FAIL") return "Below Specified Requirement";
  if (result === "RECORDED") return "Recorded Only";
  return "Pending Test Result";
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterItemsByBranchView(items, branchFilter, userBranchId) {
  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return Array.isArray(items) ? items : [];

  return (Array.isArray(items) ? items : []).filter(
    (item) => Number(item?.branch_id) === Number(resolvedBranch),
  );
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
}

function normalizeMaterialName(value) {
  if (!value) return "-";

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "rsb" ||
    normalized === "rebar" ||
    normalized === "reinforcing steel bar" ||
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
    normalized.includes("soil") ||
    normalized.includes("aggregate")
  ) {
    return "Soil Aggregates";
  }

  if (normalized.includes("concrete") || normalized.includes("cement")) {
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

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}
