"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import {
  apiClient,
  clearAuthSession,
  isInactivePayload,
  saveAuthSession,
} from "@/services/apiClient";

export default function Page() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = await apiClient.login(form.email, form.password);

      if (isInactivePayload(payload)) {
        clearAuthSession();
        setError(
          "This account has been deactivated. Please contact the administrator.",
        );
        return;
      }

      saveAuthSession(payload);

      if (payload.role === "Accounting Staff") {
        router.push("/accounting");
        return;
      }

      if (
        payload.role === "Lab Technician" ||
        payload.role === "Senior Technician" ||
        payload.role === "QA Engineer"
      ) {
        router.push("/technical");
        return;
      }

      if (payload.role === "Administrator") {
        router.push("/admin");
        return;
      }

      router.push("/auth/access-select");
    } catch (err) {
      clearAuthSession();
      setError(err.message || "Invalid credentials.");
    } finally {
      setSubmitting(false);
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
            <p>Sign in using your laboratory account.</p>
          </div>

          <form className="form" onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="employee@matriq.com"
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Enter password"
                required
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button
              type="submit"
              className="submitButton"
              disabled={submitting}
            >
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="demoBox">
            <strong>Demo Accounts</strong>
            <span>jon@matriq.com / tech123</span>
            <span>senior@matriq.com / senior123</span>
            <span>qa@matriq.com / qa123</span>
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
          background: #fff;
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
          color: #555;
          margin-bottom: 18px;
        }

        .header {
          margin-bottom: 22px;
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
          color: #333;
        }

        p {
          margin: 0;
          color: #666;
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
          gap: 6px;
        }

        label {
          font-size: 13px;
          font-weight: 600;
          color: #444;
        }

        input {
          height: 48px;
          border: 1px solid #d8d8d8;
          border-radius: 14px;
          padding: 0 14px;
          font-size: 14px;
        }

        .error {
          color: #dc2626;
          font-size: 12px;
          line-height: 1.45;
        }

        .submitButton {
          height: 50px;
          border: none;
          border-radius: 14px;
          background: #080026;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .submitButton:disabled {
          opacity: 0.65;
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
          color: #555;
        }
      `}</style>
    </>
  );
}