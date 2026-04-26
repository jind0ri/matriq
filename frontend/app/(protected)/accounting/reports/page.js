"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import MetricStrip from "@/components/ui/MetricStrip";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const SUMMARY_COLUMNS = [
  { key: "status", label: "Status" },
  { key: "count", label: "Count", align: "right" },
  { key: "amount", label: "Total Amount", align: "right" },
];

const RECENT_INVOICE_COLUMNS = [
  { key: "invoice_id", label: "Invoice ID", width: "125px" },
  { key: "sample_id", label: "Sample ID", width: "125px" },
  { key: "client_name", label: "Client", width: "155px" },
  { key: "branch_id", label: "Branch", width: "115px" },
  { key: "created_by", label: "Created By", width: "150px" },
  { key: "amount", label: "Amount", align: "right", width: "115px" },
  { key: "status", label: "Status", width: "120px" },
];

export default function AccountingReportsPage() {
  const user = getStoredUser();

  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "Administrator";
  const branchLabel = isAdmin ? "All Branches" : formatBranch(user?.branch_id);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, invoiceData] = await Promise.all([
        apiClient.getAccountingDashboard(),
        apiClient.getAccountingInvoices(),
      ]);

      setDashboard(dashboardData || null);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (err) {
      setError(err.message || "Failed to load accounting reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const paidInvoices = useMemo(() => {
    return invoices.filter((item) => item.status === "Paid");
  }, [invoices]);

  const pendingInvoices = useMemo(() => {
    return invoices.filter((item) => item.status === "Pending");
  }, [invoices]);

  const cancelledInvoices = useMemo(() => {
    return invoices.filter((item) => item.status === "Cancelled");
  }, [invoices]);

  const totalRevenue = useMemo(() => {
    return paidInvoices.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
  }, [paidInvoices]);

  const outstanding = useMemo(() => {
    return pendingInvoices.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
  }, [pendingInvoices]);

  const cancelledValue = useMemo(() => {
    return cancelledInvoices.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
  }, [cancelledInvoices]);

  const totalInvoiceValue = useMemo(() => {
    return invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [invoices]);

  const summaryRows = [
    {
      status: "Paid",
      count: paidInvoices.length,
      amount: totalRevenue,
    },
    {
      status: "Pending",
      count: pendingInvoices.length,
      amount: outstanding,
    },
    {
      status: "Cancelled",
      count: cancelledInvoices.length,
      amount: cancelledValue,
    },
  ];

  const recentInvoices = invoices.slice(0, 8);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Accounting Reports</h1>
          <p>
            Billing activity, revenue, and outstanding balances for{" "}
            <strong>{branchLabel}</strong>.
          </p>
        </div>

        <div className="headerActions">
          <Link href="/accounting/invoices" className="textLink">
            View Invoices
          </Link>

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </header>

      <section className="notice">
        <strong>Read-only report</strong>
        <span>
          This page summarizes invoice and payment activity. Payment and invoice
          updates should be handled in Billing and Invoices.
        </span>
      </section>

      {loading && <Loader label="Loading accounting reports..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(totalRevenue)}
              note="Paid invoice value"
              variant="success"
            />

            <StatCard
              label="Outstanding"
              value={formatCurrency(outstanding)}
              note="Pending invoice value"
              variant="danger"
            />

            <StatCard
              label="Pending Invoices"
              value={pendingInvoices.length}
              note="Awaiting payment"
              variant="warning"
            />

            <StatCard
              label="Paid Invoices"
              value={paidInvoices.length}
              note="Completed billing records"
              variant="brand"
            />
          </section>

          <MetricStrip
            items={[
              {
                label: "Total Invoices",
                value: invoices.length,
              },
              {
                label: "Cancelled",
                value: cancelledInvoices.length,
              },
              {
                label: "Total Invoice Value",
                value: formatCurrency(totalInvoiceValue),
              },
              {
                label: "Branch Scope",
                value: branchLabel,
              },
            ]}
          />

          {dashboard && (
            <section className="dashboardStrip">
              <ReportMetric
                label="Unpaid Samples"
                value={dashboard.unpaid_samples ?? 0}
              />

              <ReportMetric
                label="Downpayment"
                value={dashboard.downpayment_samples ?? 0}
              />

              <ReportMetric
                label="PO Submitted"
                value={dashboard.po_submitted_samples ?? 0}
              />

              <ReportMetric
                label="Fully Paid Samples"
                value={dashboard.fully_paid_samples ?? 0}
              />
            </section>
          )}

          <section className="contentGrid">
            <Card
              title="Invoice Status Summary"
              subtitle="Amount totals grouped by invoice status."
            >
              <Table
                columns={SUMMARY_COLUMNS}
                data={summaryRows}
                emptyText="No invoice summary available."
                density="comfortable"
                variant="minimal"
                renderRow={(item) => (
                  <tr key={item.status}>
                    <td>
                      <InvoiceStatusBadge status={item.status} />
                    </td>
                    <td className="right">{item.count}</td>
                    <td className="right">{formatCurrency(item.amount)}</td>
                  </tr>
                )}
              />
            </Card>

            <Card
              title="Recent Invoice Activity"
              subtitle="Latest invoice records in the selected branch scope."
              actions={
                <Link href="/accounting/invoices" className="textLink">
                  View All
                </Link>
              }
            >
              {recentInvoices.length === 0 ? (
                <EmptyState
                  title="No invoice activity yet"
                  description="Created invoices will appear here."
                />
              ) : (
                <Table
                  columns={RECENT_INVOICE_COLUMNS}
                  data={recentInvoices}
                  emptyText="No invoices found."
                  density="comfortable"
                  variant="minimal"
                  className="recentInvoiceTable"
                  renderRow={(item) => (
                    <tr key={item.invoice_id}>
                      <td>{item.invoice_id}</td>
                      <td>{item.sample_id}</td>
                      <td>{item.client_name || "-"}</td>
                      <td>{formatBranch(item.branch_id)}</td>
                      <td>
                        {item.created_by_name ||
                          item.created_by_display ||
                          item.created_by_full_name ||
                          formatUser(item.created_by)}
                      </td>
                      <td className="right">{formatCurrency(item.amount)}</td>
                      <td>
                        <InvoiceStatusBadge status={item.status} />
                      </td>
                    </tr>
                  )}
                />
              )}
            </Card>
          </section>
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
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
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

        :global(.textLink) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 118px;
          min-width: 118px;
          min-height: 34px;
          padding: 0 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md) !important;
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: none;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.textLink:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        .headerActions :global(button),
        .headerActions :global(a) {
          width: 118px;
          min-width: 118px;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
        }

        .notice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border-soft);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .dashboardStrip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 18px;
          align-items: start;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.recentInvoiceTable table) {
          min-width: 940px;
        }

        @media (max-width: 1100px) {
          .statsRow,
          .dashboardStrip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .headerActions :global(button),
          .headerActions :global(a) {
            width: 100%;
            min-width: 0;
          }

          .statsRow,
          .dashboardStrip {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="reportMetric">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .reportMetric {
          display: grid;
          gap: 6px;
          min-width: 0;
          text-align: center;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.35;
        }

        strong {
          color: var(--color-text-primary);
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.25;
        }
      `}</style>
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const variant =
    status === "Paid"
      ? "success"
      : status === "Cancelled"
        ? "danger"
        : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status || "Pending"}
    </Badge>
  );
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

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}