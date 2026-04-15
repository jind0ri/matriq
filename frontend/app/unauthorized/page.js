"use client";

export default function UnauthorizedPage() {
  return (
    <>
      <div className="page">
        <h1>403 - Unauthorized</h1>
        <p>You do not have permission to access this page.</p>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 24px;
        }

        h1 {
          margin-bottom: 10px;
        }

        p {
          color: #64748b;
        }
      `}</style>
    </>
  );
}