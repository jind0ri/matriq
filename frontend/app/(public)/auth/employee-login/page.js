"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";

const API_BASE_URL = "http://localhost:8000";

function getRedirectByBackendRole(role) {
  switch (role) {
    case "Administrator":
      return "/admin";
    case "Lab Technician":
      return "/technical";
    case "Senior Technician":
      return "/technical/workflow";
    case "QA Engineer":
      return "/technical/workflow";
    case "Accounting Staff":
      return "/accounting";
    default:
      return "/auth/access-select";
  }
}

function mapBackendUserToFrontendUser(data, passwordInput) {
  let frontendRole = "";

  switch (data.role) {
    case "Administrator":
      frontendRole = "admin";
      break;
    case "Lab Technician":
      frontendRole = "technician";
      break;
    case "Senior Technician":
      frontendRole = "senior_technician";
      break;
    case "QA Engineer":
      frontendRole = "qa_engineer";
      break;
    case "Accounting Staff":
      frontendRole = "accounting";
      break;
    default:
      frontendRole = "";
  }

  return {
    name: data.full_name,
    full_name: data.full_name,
    email: data.username,
    username: data.username,
    password: passwordInput,
    role: frontendRole,
    rawRole: data.role,
    branch_id: data.branch_id,
  };
}

export default function EmployeeLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Invalid credentials.");
      }

      if (data.role === "Administrator") {
        setError("Please use Admin Access for this account.");
        setIsSubmitting(false);
        return;
      }

      const frontendUser = mapBackendUserToFrontendUser(data, form.password);

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      localStorage.setItem("full_name", data.full_name);
      localStorage.setItem("branch_id", String(data.branch_id ?? ""));
      localStorage.setItem("user", JSON.stringify(frontendUser));

      router.push(getRedirectByBackendRole(data.role));
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
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
            <h1>Employee Login</h1>
            <p>Sign in using your employee account credentials.</p>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email / Username</label>
              <input
                id="email"
                name="email"
                type="text"
                value={form.email}
                onChange={handleChange}
                placeholder="jon@matriq.com"
                required
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
                required
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="submitButton" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="demoBox">
            <strong>Demo Accounts</strong>
            <span>qa@matriq.com / qa123</span>
            <span>jon@matriq.com / tech123</span>
            <span>senior@matriq.com / senior123</span>
            <span>acct@matriq.com / acct123</span>
          </div>
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
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .backButton:hover {
          color: #111827;
          transform: translateX(-1px);
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
          color: #222222;
          background: #ffffff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        input::placeholder {
          color: #9ca3af;
        }

        input:hover {
          border-color: #a0a0a0;
        }

        input:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.15);
          transform: translateY(-1px);
        }

        .error {
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
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
          transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }

        .submitButton:hover:not(:disabled) {
          background: #14004a;
          transform: translateY(-1px);
        }

        .submitButton:active:not(:disabled) {
          transform: translateY(0);
        }

        .submitButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .demoBox {
          margin-top: 20px;
          padding: 14px;
          border-radius: 14px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #555555;
        }

        .demoBox strong {
          color: #222222;
        }
      `}</style>
    </>
  );
}