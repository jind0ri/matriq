"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import mockSamples from "@/mocks/samples.json";
import {
  ArrowLeft,
  ListBullets,
  SquaresFour,
  DownloadSimple,
  MagnifyingGlass,
  FadersHorizontal,
  CaretDown,
} from "phosphor-react";

function getStatusClass(status) {
  if (status === "Released") return "released";
  if (status === "In Test") return "testing";
  return "registered";
}

export default function RegistryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  const filteredSamples = useMemo(() => {
    return mockSamples.filter((sample) => {
      const matchesQuery =
        sample.id.toLowerCase().includes(query.toLowerCase()) ||
        sample.client.toLowerCase().includes(query.toLowerCase()) ||
        sample.material.toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || sample.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  return (
    <>
      <div className="page">
        <div className="topRow">
          <div className="titleBlock">
            <button className="backButton" type="button" aria-label="Go back">
              <ArrowLeft size={28} weight="regular" />
            </button>

            <div className="header">
              <h1>GLOBAL REGISTRY</h1>
              <p>Real-time traceability across the laboratory network.</p>
            </div>
          </div>

          <div className="viewControls">
            <button
              className={
                viewMode === "list" ? "iconButton active" : "iconButton"
              }
              type="button"
              aria-label="List view"
              onClick={() => setViewMode("list")}
            >
              <ListBullets size={20} weight="bold" />
            </button>

            <button
              className={
                viewMode === "grid" ? "iconButton active" : "iconButton"
              }
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
            >
              <SquaresFour size={18} weight="regular" />
            </button>

            <button className="exportButton" type="button">
              <DownloadSimple size={16} weight="regular" />
              <span>EXPORT LOGS</span>
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="searchWrap">
            <MagnifyingGlass size={18} weight="regular" />

            <input
              type="text"
              placeholder="Search by ID, Material, Client or Project Reference..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="searchInput"
            />
          </div>

          <div className="filterWrap">
            <button
              type="button"
              className="filterButton"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <span className="filterLabelWrap">
                <FadersHorizontal size={14} weight="regular" />
                <span>
                  {statusFilter === "All"
                    ? "ALL STATUSES"
                    : statusFilter.toUpperCase()}
                </span>
              </span>

              <CaretDown
                size={14}
                weight="bold"
                className={isFilterOpen ? "caret rotated" : "caret"}
              />
            </button>

            {isFilterOpen && (
              <div className="filterMenu">
                {["All", "Registered", "In Test", "Released", "Archived"].map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      className={
                        statusFilter === status
                          ? "filterOption activeOption"
                          : "filterOption"
                      }
                      onClick={() => {
                        setStatusFilter(status);
                        setIsFilterOpen(false);
                      }}
                    >
                      {status === "All" ? "ALL STATUSES" : status.toUpperCase()}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            <div className="listHeader">
              <div>MATERIAL IDENTIFICATION</div>
              <div>LIFECYCLE STATE</div>
              <div>CLIENT/PROJECT</div>
              <div>REGISTRY INTEL</div>
              <div>ACCESS</div>
            </div>

            <div className="list">
              {filteredSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="listRow"
                  onClick={() =>
                    router.push(`/technical/tracking/${sample.id}`)
                  }
                >
                  <div className="col material">
                    <span className="sampleId">{sample.id}</span>
                    <span className="materialName">{sample.material}</span>
                  </div>

                  <div
                    className={`col status ${getStatusClass(sample.status)}`}
                  >
                    {sample.status.toUpperCase()}
                  </div>

                  <div className="col client">
                    {sample.client.toUpperCase()}
                  </div>

                  <div className="col registry">
                    <span>{sample.date}</span>
                    <span className="branch">{sample.branch}</span>
                  </div>

                  <div className="col arrow">→</div>
                </div>
              ))}

              {filteredSamples.length === 0 && (
                <div className="emptyState">
                  No samples matched your search.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="gridView">
            {filteredSamples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className="sampleCard"
                onClick={() => router.push(`/technical/tracking/${sample.id}`)}
              >
                <div className={`cardStatus ${getStatusClass(sample.status)}`}>
                  {sample.status.toUpperCase()}
                </div>

                <div className="cardContent">
                  <span className="sampleId">{sample.id}</span>
                  <h3>{sample.material}</h3>
                  <p>{sample.client.toUpperCase()}</p>

                  <div className="cardFooter">
                    <span>{sample.date}</span>
                    <span>{sample.branch}</span>
                  </div>
                </div>
              </button>
            ))}

            {filteredSamples.length === 0 && (
              <div className="emptyState">No samples matched your search.</div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .topRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .titleBlock {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .backButton {
          border: none;
          background: transparent;
          padding: 0;
          margin-top: 2px;
          color: #8a8a8a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .backButton:hover {
          color: #4b4b4b;
        }

        .header h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: 1px;
          color: #333333;
          font-weight: 700;
        }

        .header p {
          margin: 4px 0 0;
          color: #404040;
          font-size: 14px;
        }

        .viewControls {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .iconButton {
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #8a8a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .iconButton.active {
          background: #080026;
          color: #ffffff;
        }

        .exportButton {
          border: none;
          background: transparent;
          color: #4b4b4b;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          padding: 0;
        }

        .toolbar {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .searchWrap {
          flex: 1;
          height: 52px;
          background: #efefef;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          color: #9a9a9a;
        }

        .searchWrap :global(svg) {
          color: #9a9a9a;
        }

        .searchInput {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          outline: none;
          color: #2d2d2d;
        }

        .searchInput::placeholder {
          color: #9a9a9a;
        }

        .filterWrap {
          position: relative;
          min-width: 190px;
        }

        .filterButton {
          width: 100%;
          height: 52px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 6px;
          color: #2d2d2d;
          cursor: pointer;
        }

        .filterLabelWrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .caret {
          color: #6b7280;
          transition: transform 0.2s ease;
        }

        .rotated {
          transform: rotate(180deg);
        }

        .filterMenu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
          padding: 8px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filterOption {
          border: none;
          background: transparent;
          text-align: left;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #2d2d2d;
          cursor: pointer;
        }

        .filterOption:hover {
          background: #f3f4f6;
        }

        .activeOption {
          background: #e5e7eb;
        }

        .listHeader {
          display: grid;
          grid-template-columns: 1.7fr 0.9fr 1.5fr 1fr 0.2fr;
          align-items: center;
          padding: 0 0 10px;
          border-bottom: 1px solid transparent;
        }

        .listHeader div {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #4b4b4b;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .listRow {
          display: grid;
          grid-template-columns: 1.7fr 0.9fr 1.5fr 1fr 0.2fr;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #eeeeee;
          cursor: pointer;
          transition:
            opacity 0.2s ease,
            transform 0.2s ease;
        }

        .listRow:hover {
          opacity: 0.75;
          transform: translateX(2px);
        }

        .col {
          font-size: 13px;
          color: #2d2d2d;
        }

        .material {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sampleId {
          font-size: 10px;
          color: #8a8a8a;
          letter-spacing: 0.3px;
        }

        .materialName {
          font-size: 13px;
          font-weight: 700;
          color: #333333;
          line-height: 1.25;
        }

        .status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.6px;
        }

        .released {
          color: #0f8a28;
        }

        .testing {
          color: #c58a00;
        }

        .registered {
          color: #1f2937;
        }

        .client {
          font-size: 12px;
          color: #404040;
          line-height: 1.35;
        }

        .registry {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          color: #6b7280;
        }

        .branch {
          font-size: 10px;
          color: #9a9a9a;
        }

        .arrow {
          font-size: 20px;
          color: #9a9a9a;
          text-align: right;
        }

        .gridView {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .sampleCard {
          border: none;
          background: #d9d9d9;
          border-radius: 22px;
          padding: 22px;
          min-height: 210px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
        }

        .sampleCard:hover {
          opacity: 0.9;
        }

        .cardStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 92px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
        }

        .cardStatus.released {
          background: #0f8a28;
        }

        .cardStatus.testing {
          background: #c58a00;
        }

        .cardStatus.registered {
          background: #080026;
        }

        .cardContent {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cardContent h3 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
          color: #333333;
        }

        .cardContent p {
          margin: 0;
          font-size: 13px;
          color: #7a7a7a;
          line-height: 1.4;
        }

        .cardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          color: #8a8a8a;
          margin-top: 8px;
        }

        .emptyState {
          text-align: center;
          color: #8b8b8b;
          padding: 28px;
        }

        @media (max-width: 900px) {
          .topRow {
            flex-direction: column;
            align-items: stretch;
          }

          .viewControls {
            justify-content: flex-start;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .gridView {
            grid-template-columns: 1fr;
          }

          .listHeader {
            display: none;
          }

          .listRow {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 16px 0;
          }

          .arrow {
            text-align: left;
          }
        }
      `}</style>
    </>
  );
}
