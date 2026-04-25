"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

const PAYMENT_STATUSES = {
  UNPAID: "Unpaid",
  DOWNPAYMENT: "Downpayment Paid",
  PO: "PO Submitted",
  FULLY_PAID: "Fully Paid",
};

const PAYMENT_ACTIONS = [
  {
    label: "Record 50% Downpayment",
    adminLabel: "Correct to Downpayment Paid",
    status: PAYMENT_STATUSES.DOWNPAYMENT,
    description:
      "Allows the sample to proceed toward QA pre-testing and laboratory testing, but does not clear report release.",
  },
  {
    label: "Record PO Submitted",
    adminLabel: "Correct to PO Submitted",
    status: PAYMENT_STATUSES.PO,
    description:
      "Allows the sample to proceed based on purchase order documentation, but does not clear report release.",
  },
  {
    label: "Mark Fully Paid",
    adminLabel: "Correct to Fully Paid",
    status: PAYMENT_STATUSES.FULLY_PAID,
    description:
      "Financially clears the sample for QA official report release once technical requirements are satisfied.",
  },
];

export default function BillingPage() {
  const user = getStoredUser();
  const isAdmin = user?.role === "Administrator";

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [activeUpdate, setActiveUpdate] = useState(null);
  const [savingSampleId, setSavingSampleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getSamples();
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }

  function getDraft(sampleId) {
    return (
      paymentDrafts[sampleId] || {
        amount_paid: "",
        balance: "",
        billing_notes: "",
        confirmation_note: "",
      }
    );
  }

  function updateDraft(sampleId, field, value) {
    setPaymentDrafts((current) => ({
      ...current,
      [sampleId]: {
        ...(current[sampleId] || {
          amount_paid: "",
          balance: "",
          billing_notes: "",
          confirmation_note: "",
        }),
        [field]: value,
      },
    }));
  }

  function openPaymentUpdate(sampleId, status, currentStatus) {
    setActiveUpdate({
      sampleId,
      status,
      currentStatus,
    });

    setPaymentDrafts((current) => ({
      ...current,
      [sampleId]: {
        ...(current[sampleId] || {
          amount_paid: "",
          balance: "",
          billing_notes: "",
          confirmation_note: "",
        }),
        billing_notes:
          current[sampleId]?.billing_notes ||
          defaultBillingNote(status, isAdmin),
      },
    }));
  }

  function closePaymentUpdate() {
    setActiveUpdate(null);
  }

  async function confirmPaymentUpdate(sampleId, status) {
    const draft = getDraft(sampleId);

    if (status === PAYMENT_STATUSES.FULLY_PAID) {
      if (!draft.confirmation_note || draft.confirmation_note.trim().length < 8) {
        alert(
          "Please enter a confirmation note before marking this sample as Fully Paid.",
        );
        return;
      }
    }

    if (isAdmin) {
      const requiresAdminReason =
        activeUpdate?.currentStatus === PAYMENT_STATUSES.FULLY_PAID ||
        status !== activeUpdate?.currentStatus;

      if (requiresAdminReason && draft.billing_notes.trim().length < 10) {
        alert(
          "Please enter an administrator correction note with at least 10 characters.",
        );
        return;
      }
    }

    setSavingSampleId(sampleId);

    try {
      await apiClient.updateSamplePayment(sampleId, {
        payment_status: status,
        amount_paid: draft.amount_paid === "" ? null : Number(draft.amount_paid),
        balance: draft.balance === "" ? null : Number(draft.balance),
        billing_notes: draft.billing_notes,
        confirmation_note: draft.confirmation_note,
      });

      setActiveUpdate(null);

      setPaymentDrafts((current) => ({
        ...current,
        [sampleId]: {
          amount_paid: "",
          balance: "",
          billing_notes: "",
          confirmation_note: "",
        },
      }));

      await loadData();
    } catch (err) {
      alert(err.message || "Payment update failed");
    } finally {
      setSavingSampleId("");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const payment = item.device_metadata?.payment || {};
      const paymentStatus = payment.payment_status || PAYMENT_STATUSES.UNPAID;

      const matchesSearch =
        !q ||
        item.sample_id?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.project_reference?.toLowerCase().includes(q) ||
        item.material_type?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const payment = item.device_metadata?.payment || {};
        const status = payment.payment_status || PAYMENT_STATUSES.UNPAID;

        if (status === PAYMENT_STATUSES.UNPAID) acc.unpaid += 1;
        if (status === PAYMENT_STATUSES.DOWNPAYMENT) acc.downpayment += 1;
        if (status === PAYMENT_STATUSES.PO) acc.po += 1;
        if (status === PAYMENT_STATUSES.FULLY_PAID) acc.fullyPaid += 1;

        return acc;
      },
      {
        unpaid: 0,
        downpayment: 0,
        po: 0,
        fullyPaid: 0,
      },
    );
  }, [items]);

  return (
    <div className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Accounting Module</p>
          <h1>{isAdmin ? "Billing Oversight" : "Payment Management"}</h1>
          <p className="subtitle">
            {isAdmin
              ? "Review payment records and perform controlled administrator billing corrections when necessary."
              : "Manage payment eligibility before laboratory testing and official report release."}
          </p>
        </div>

        <button className="refreshBtn" onClick={loadData}>
          Refresh
        </button>
      </div>

      {isAdmin && (
        <div className="adminNotice">
          <strong>Administrator Billing Correction Mode</strong>
          <p>
            Admin can view all billing records and correct payment metadata when
            necessary. Routine payment updates should still be handled by
            Accounting Staff. Admin corrections should include clear billing
            notes for audit traceability.
          </p>
        </div>
      )}

      <div className="stats">
        <StatCard label="Unpaid" value={stats.unpaid} />
        <StatCard label="Downpayment Paid" value={stats.downpayment} />
        <StatCard label="PO Submitted" value={stats.po} />
        <StatCard label="Fully Paid" value={stats.fullyPaid} />
      </div>

      <div className="notice">
        Accounting controls financial eligibility only. Downpayment or PO may
        allow testing to proceed, while Fully Paid is required before QA can
        release the official report.
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
          <option value="All">All Payment Statuses</option>
          <option value={PAYMENT_STATUSES.UNPAID}>Unpaid</option>
          <option value={PAYMENT_STATUSES.DOWNPAYMENT}>Downpayment Paid</option>
          <option value={PAYMENT_STATUSES.PO}>PO Submitted</option>
          <option value={PAYMENT_STATUSES.FULLY_PAID}>Fully Paid</option>
        </select>
      </div>

      {loading && <div className="card">Loading billing data...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="list">
          {visibleItems.length === 0 && (
            <div className="card">No samples found.</div>
          )}

          {visibleItems.map((item) => {
            const metadata = item.device_metadata || {};
            const payment = metadata.payment || {};
            const testData = metadata.test_data || null;

            const paymentStatus =
              payment.payment_status || PAYMENT_STATUSES.UNPAID;

            const isFinalized =
              item.current_state === "Released" ||
              item.current_state === "Archived" ||
              item.is_immutable;

            const canStartTesting = [
              PAYMENT_STATUSES.DOWNPAYMENT,
              PAYMENT_STATUSES.PO,
              PAYMENT_STATUSES.FULLY_PAID,
            ].includes(paymentStatus);

            const readyForReportRelease =
              item.current_state === "For Review" &&
              paymentStatus === PAYMENT_STATUSES.FULLY_PAID &&
              Boolean(testData);

            const activeForThisCard =
              activeUpdate?.sampleId === item.sample_id ? activeUpdate : null;

            const draft = getDraft(item.sample_id);

            const canEditPayment = !isFinalized || isAdmin;

            return (
              <div key={item.sample_id} className="card">
                <div className="row">
                  <div>
                    <div className="label">Sample ID</div>
                    <strong className="sampleId">{item.sample_id}</strong>
                  </div>

                  <div className="badgeGroup">
                    <PaymentBadge status={paymentStatus} />
                    <LifecycleBadge status={item.current_state} />
                    {isAdmin && <span className="adminBadge">Admin View</span>}
                  </div>
                </div>

                <div className="grid">
                  <Info label="Client" value={item.client_name} />
                  <Info label="Project" value={item.project_reference} />
                  <Info label="Material" value={item.material_type} />
                  <Info
                    label="Payment Method"
                    value={payment.payment_requirement || "-"}
                  />
                  <Info
                    label="Test Result"
                    value={getFinalResult(testData) || "No Result Yet"}
                  />
                  <Info
                    label="Report Eligibility"
                    value={
                      readyForReportRelease
                        ? "Financially Cleared for QA Release"
                        : "Not Yet Eligible"
                    }
                  />
                  <Info
                    label="Last Payment Update"
                    value={formatDate(payment.payment_updated_at)}
                  />
                  <Info
                    label="Updated By"
                    value={payment.payment_updated_by || "-"}
                  />
                  <Info
                    label="Billing Notes"
                    value={payment.billing_notes || "-"}
                  />
                </div>

                <div className="eligibilityBox">
                  {isFinalized && !isAdmin ? (
                    <span className="blocked">
                      This sample is already released or archived. Payment
                      metadata is finalized and can only be corrected by an
                      Administrator.
                    </span>
                  ) : isFinalized && isAdmin ? (
                    <span className="adminText">
                      This sample is released or archived. Any billing change
                      will be treated as an Administrator correction and should
                      include a clear correction note.
                    </span>
                  ) : paymentStatus === PAYMENT_STATUSES.FULLY_PAID ? (
                    <span className="eligible">
                      Fully paid. This sample is financially cleared for report
                      release once QA requirements are satisfied.
                    </span>
                  ) : canStartTesting ? (
                    <span className="partial">
                      Initial payment requirement satisfied. Testing may proceed
                      if QA pre-testing review is complete, but official report
                      release still requires full payment.
                    </span>
                  ) : (
                    <span className="blocked">
                      Payment is still unpaid. Testing and report release may be
                      restricted by workflow rules.
                    </span>
                  )}
                </div>

                <div className="actions">
                  {PAYMENT_ACTIONS.map((action) => {
                    const disabled =
                      !canEditPayment ||
                      (paymentStatus === PAYMENT_STATUSES.FULLY_PAID &&
                        action.status !== PAYMENT_STATUSES.FULLY_PAID &&
                        !isAdmin);

                    return (
                      <button
                        key={action.status}
                        disabled={disabled}
                        className={[
                          paymentStatus === action.status ? "active" : "",
                          action.status === PAYMENT_STATUSES.FULLY_PAID
                            ? "full"
                            : "",
                          isAdmin ? "adminAction" : "",
                        ].join(" ")}
                        onClick={() =>
                          openPaymentUpdate(
                            item.sample_id,
                            action.status,
                            paymentStatus,
                          )
                        }
                      >
                        {isAdmin ? action.adminLabel : action.label}
                      </button>
                    );
                  })}

                  <Link
                    className="viewBtn"
                    href={`/technical/tracking/${item.sample_id}`}
                  >
                    View Billing Reference →
                  </Link>
                </div>

                {activeForThisCard && (
                  <div
                    className={
                      isAdmin ? "confirmBox adminConfirmBox" : "confirmBox"
                    }
                  >
                    <div className="confirmHeader">
                      <div>
                        <p className="confirmEyebrow">
                          {isAdmin
                            ? "Administrator Billing Correction"
                            : "Payment Status Update"}
                        </p>
                        <h2>{activeForThisCard.status}</h2>
                        <p>
                          {
                            PAYMENT_ACTIONS.find(
                              (action) =>
                                action.status === activeForThisCard.status,
                            )?.description
                          }
                        </p>
                      </div>

                      <button className="closeBtn" onClick={closePaymentUpdate}>
                        Cancel
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="warningBox adminWarning">
                        You are performing an Administrator correction. This
                        should only be used to correct billing metadata and
                        should include a clear note for audit traceability.
                      </div>
                    )}

                    {activeForThisCard.status ===
                      PAYMENT_STATUSES.FULLY_PAID && (
                      <div className="warningBox">
                        Marking this sample as Fully Paid will financially clear
                        it for QA official report release once technical review
                        requirements are satisfied.
                      </div>
                    )}

                    <div className="formGrid">
                      <div>
                        <label>Amount Paid</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.amount_paid}
                          onChange={(e) =>
                            updateDraft(
                              item.sample_id,
                              "amount_paid",
                              e.target.value,
                            )
                          }
                          placeholder="Example: 2500"
                        />
                      </div>

                      <div>
                        <label>Balance</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.balance}
                          onChange={(e) =>
                            updateDraft(
                              item.sample_id,
                              "balance",
                              e.target.value,
                            )
                          }
                          placeholder="Example: 0"
                        />
                      </div>

                      <div className="wide">
                        <label>
                          {isAdmin
                            ? "Administrator Correction Note"
                            : "Billing Notes"}
                        </label>
                        <textarea
                          value={draft.billing_notes}
                          onChange={(e) =>
                            updateDraft(
                              item.sample_id,
                              "billing_notes",
                              e.target.value,
                            )
                          }
                          placeholder={
                            isAdmin
                              ? "Example: Corrected payment status after verifying official receipt and previous encoding error."
                              : "Add receipt, PO reference, or accounting remarks."
                          }
                        />
                      </div>

                      {activeForThisCard.status ===
                        PAYMENT_STATUSES.FULLY_PAID && (
                        <div className="wide">
                          <label>Fully Paid Confirmation Note</label>
                          <textarea
                            value={draft.confirmation_note}
                            onChange={(e) =>
                              updateDraft(
                                item.sample_id,
                                "confirmation_note",
                                e.target.value,
                              )
                            }
                            placeholder="Example: Official receipt verified and full balance settled."
                          />
                        </div>
                      )}
                    </div>

                    <div className="confirmActions">
                      <button
                        className="cancelAction"
                        onClick={closePaymentUpdate}
                      >
                        Cancel
                      </button>

                      <button
                        className={
                          isAdmin
                            ? "confirmAction adminConfirmAction"
                            : "confirmAction"
                        }
                        disabled={savingSampleId === item.sample_id}
                        onClick={() =>
                          confirmPaymentUpdate(
                            item.sample_id,
                            activeForThisCard.status,
                          )
                        }
                      >
                        {savingSampleId === item.sample_id
                          ? "Saving..."
                          : isAdmin
                            ? "Confirm Admin Correction"
                            : "Confirm Payment Update"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .eyebrow,
        .confirmEyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 900;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0;
          color: #111827;
          font-size: 26px;
        }

        .subtitle {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
        }

        .refreshBtn,
        button,
        .viewBtn {
          background: #080026;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 800;
          text-decoration: none;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .adminNotice {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fed7aa;
        }

        .adminNotice strong {
          display: block;
          margin-bottom: 4px;
          color: #7c2d12;
          font-size: 13px;
        }

        .adminNotice p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 14px;
        }

        .notice {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
          margin-bottom: 16px;
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
          background: transparent;
        }

        select {
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 0 12px;
          background: white;
          color: #111827;
          font-weight: 700;
        }

        .list {
          display: grid;
          gap: 14px;
        }

        .card,
        .statCard {
          background: white;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .statCard {
          display: grid;
          gap: 6px;
        }

        .statCard span {
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .statCard strong {
          font-size: 28px;
          color: #111827;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
        }

        .sampleId {
          font-size: 18px;
          color: #111827;
        }

        .badgeGroup {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
        }

        .eligibilityBox {
          margin-top: 14px;
          padding: 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .eligible {
          color: #166534;
        }

        .partial {
          color: #92400e;
        }

        .blocked {
          color: #991b1b;
        }

        .adminText {
          color: #9a3412;
        }

        .actions {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        button {
          background: #312e81;
        }

        button.active {
          outline: 3px solid rgba(79, 70, 229, 0.25);
        }

        .full {
          background: #16a34a;
        }

        .adminAction {
          background: #7c3aed;
        }

        .viewBtn {
          background: #f4f1ff;
          color: #14003a;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .confirmBox {
          margin-top: 16px;
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          border-radius: 18px;
          padding: 16px;
        }

        .adminConfirmBox {
          border-color: #fed7aa;
          background: #fffaf5;
        }

        .confirmHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .confirmHeader h2 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .confirmHeader p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .closeBtn,
        .cancelAction {
          background: #f1f5f9;
          color: #334155;
        }

        .warningBox {
          margin-bottom: 14px;
          padding: 12px;
          border-radius: 14px;
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fed7aa;
          font-size: 13px;
          line-height: 1.5;
        }

        .adminWarning {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .formGrid .wide {
          grid-column: 1 / -1;
        }

        label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 11px 12px;
          background: #ffffff;
          color: #111827;
          font-size: 13px;
        }

        textarea {
          min-height: 88px;
          resize: vertical;
        }

        .confirmActions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .confirmAction {
          background: #16a34a;
        }

        .adminConfirmAction {
          background: #dc2626;
        }

        .badge,
        .adminBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .adminBadge {
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fed7aa;
        }

        .payment-unpaid {
          background: #fee2e2;
          color: #991b1b;
        }

        .payment-partial {
          background: #fef3c7;
          color: #92400e;
        }

        .payment-po {
          background: #e0e7ff;
          color: #3730a3;
        }

        .payment-paid {
          background: #dcfce7;
          color: #166534;
        }

        .life-registered {
          background: #eef2ff;
          color: #3730a3;
        }

        .life-testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .life-review {
          background: #fff7ed;
          color: #c2410c;
        }

        .life-released {
          background: #dcfce7;
          color: #166534;
        }

        .life-archived {
          background: #f1f5f9;
          color: #475569;
        }

        .life-default {
          background: #f1f5f9;
          color: #475569;
        }

        @media (max-width: 820px) {
          .header,
          .row,
          .confirmHeader {
            flex-direction: column;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .grid,
          .formGrid {
            grid-template-columns: 1fr;
          }

          .badgeGroup {
            justify-content: flex-start;
          }

          .formGrid .wide {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
}

function defaultBillingNote(status, isAdmin = false) {
  if (isAdmin) {
    return `Administrator correction: payment status corrected to ${status}.`;
  }

  if (status === PAYMENT_STATUSES.DOWNPAYMENT) {
    return "Initial downpayment recorded by Accounting.";
  }

  if (status === PAYMENT_STATUSES.PO) {
    return "Purchase order submitted and recorded by Accounting.";
  }

  if (status === PAYMENT_STATUSES.FULLY_PAID) {
    return "Full payment recorded by Accounting.";
  }

  return "";
}

function getFinalResult(testData) {
  if (!testData) return null;
  return testData.qa_final_result || testData.result || null;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="label">{label}</div>
      <p className="value">
        {value === null || value === undefined || value === "" ? "-" : value}
      </p>

      <style jsx>{`
        .label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
        }

        .value {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function PaymentBadge({ status }) {
  const cls =
    status === "Fully Paid"
      ? "payment-paid"
      : status === "PO Submitted"
        ? "payment-po"
        : status === "Downpayment Paid"
          ? "payment-partial"
          : "payment-unpaid";

  return <span className={`badge ${cls}`}>{status || "Unpaid"}</span>;
}

function LifecycleBadge({ status }) {
  const cls =
    status === "Registered"
      ? "life-registered"
      : status === "In Testing"
        ? "life-testing"
        : status === "For Review"
          ? "life-review"
          : status === "Released"
            ? "life-released"
            : status === "Archived"
              ? "life-archived"
              : "life-default";

  return <span className={`badge ${cls}`}>{status || "-"}</span>;
}