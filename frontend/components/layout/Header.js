"use client";

export default function Header({ user }) {
  function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "/auth/login";
  }

  return (
    <>
      <header className="header">
        <div>
          <h1>Matriq</h1>
          <p>Welcome{user?.role ? `, ${user.role.replaceAll("_", " ")}` : ""}</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <style jsx>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }

        h1 {
          margin: 0 0 4px;
          font-size: 24px;
          color: #0f172a;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
          text-transform: capitalize;
        }

        button {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          background: #dc2626;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        button:hover {
          background: #b91c1c;
        }
      `}</style>
    </>
  );
}