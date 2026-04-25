"use client";

export default function Table({
  columns = [],
  data = [],
  emptyText = "No records found.",
  renderRow,
  className = "",
  density = "comfortable",
}) {
  return (
    <>
      <div className={["tableShell", density, className].join(" ")}>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key || column.label}
                    className={column.align === "right" ? "right" : ""}
                  >
                    {column.label}
                  </th>
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
                        <td
                          key={column.key}
                          className={column.align === "right" ? "right" : ""}
                        >
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
          box-shadow: var(--shadow-xs);
          overflow: hidden;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        .tableWrap::-webkit-scrollbar {
          height: 10px;
        }

        .tableWrap::-webkit-scrollbar-track {
          background: var(--color-overlay);
        }

        .tableWrap::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: var(--radius-full);
          border: 2px solid var(--color-overlay);
        }

        table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          table-layout: auto;
        }

        th {
          text-align: left;
          padding: 15px 18px;
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
          padding: 18px;
          border-bottom: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 650;
          line-height: 1.5;
          vertical-align: middle;
        }

        .comfortable td {
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .compact td {
          padding-top: 12px;
          padding-bottom: 12px;
        }

        .spacious td {
          padding-top: 22px;
          padding-bottom: 22px;
        }

        tbody tr {
          background: var(--color-surface);
          transition:
            background-color var(--transition-base),
            box-shadow var(--transition-base);
        }

        tbody tr:hover {
          background: var(--color-overlay);
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .right {
          text-align: right;
        }

        .emptyCell {
          text-align: center;
          color: var(--color-text-secondary);
          padding: 34px 18px;
          font-size: var(--text-sm);
          font-weight: 750;
        }

        @media (max-width: 760px) {
          table {
            min-width: 680px;
          }

          th {
            padding: 13px 14px;
          }

          td {
            padding: 15px 14px;
          }
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