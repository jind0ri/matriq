"use client";

export default function RegistryPage() {
  return (
    <>
      <div className="page">
        <div className="titleRow">
          <h1>SAMPLE TRACKING</h1>
          <p>Monitor and manage registered samples across the system</p>
        </div>

        <div className="tablePlaceholder">
          Table will go here
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .titleRow h1 {
          margin: 0;
          font-size: 26px;
        }

        .titleRow p {
          margin: 4px 0 0;
          color: #8b8b8b;
          font-size: 14px;
        }

        .tablePlaceholder {
          height: 300px;
          border-radius: 18px;
          border: 1px dashed #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }
      `}</style>
    </>
  );
}