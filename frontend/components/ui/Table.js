"use client";

export default function Table({
  columns = [],
  data = [],
  emptyText = "No records found.",
  renderRow,
  className = "",
}) {
  return (
    <>
      <div className={["tableShell", className].join(" ")}>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key || column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.length > 0 &&
                data.map((item, index) =>
                  renderRow ? (
                    renderRow(item, index)
                  ) : (
                    <tr key={item.id || item.sample_id || index}>
                      {columns.map((column) => (
                        <td key={column.key}>
                          {formatCellValue(item[column.key])}
                        </td>
                      ))}
                    </tr>
                  ),
                )}

              {data.length === 0 && (
                <tr>
                  <td className="emptyCell" colSpan={columns.length || 1}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .tableShell {
          width: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px 14px;
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }

        td {
          padding: 14px;
          border-bottom: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 650;
          vertical-align: middle;
        }

        tbody tr {
          transition:
            background-color var(--transition-base),
            transform var(--transition-base);
        }

        tbody tr:hover {
          background: var(--color-overlay);
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .emptyCell {
          text-align: center;
          color: var(--color-text-secondary);
          padding: 28px 14px;
          font-weight: 700;
        }
      `}</style>
    </>
  );
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}