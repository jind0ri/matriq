"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import { MOCK_USERS } from "@/lib/mockUsers";
import { getRedirectByRole } from "@/lib/roleRedirect";

export default function AdminLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();

    const user = MOCK_USERS.find(
      (item) =>
        item.email.toLowerCase() === form.email.toLowerCase() &&
        item.password === form.password &&
        item.role === "admin",
    );

    if (!user) {
      setError("Invalid admin credentials.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    router.push(getRedirectByRole(user.role));
  }

  return (
    <>
      <div className="page">
        <div className="card">
          <button
            type="button"
            className="backButton"
            onClick={() => router.push("/auth/access-select")}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="header">
            <div className="logoBox">M</div>
            <h1>Admin Login</h1>
            <p>Sign in using your administrator account.</p>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@matriq.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="submitButton">
              Login
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #080026;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
        }

        .backButton {
          border: none;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: #555555;
          padding: 0;
          margin-bottom: 18px;
        }

        .header {
          margin-bottom: 22px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .logoBox {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(15, 0, 67, 0.9);
          color: #ffbb00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 24px;
          color: #333333;
        }

        p {
          margin: 0;
          color: #666666;
          font-size: 14px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 13px;
          font-weight: 600;
          color: #444444;
        }

        input {
          height: 48px;
          border: 1px solid #d8d8d8;
          border-radius: 14px;
          padding: 0 14px;
          font-size: 14px;
          outline: none;
          color: #222222; /* darker text */
          background: #ffffff;
        }

        input::placeholder {
          color: #9ca3af; /* softer gray for placeholder */
        }

        input:hover {
          border-color: #a0a0a0;
        }

        input:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.15);
        }

        .error {
          color: #dc2626;
          font-size: 12px;
        }

        .submitButton {
          height: 50px;
          border: none;
          border-radius: 14px;
          background: #080026;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
        }

        .submitButton:hover {
          background: #14004a; /* slightly lighter */
          transform: translateY(-1px);
        }

        .submitButton:active {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
