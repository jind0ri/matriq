"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeSlash } from "phosphor-react";
import {
  apiClient,
  clearAuthSession,
  isInactivePayload,
  saveAuthSession,
} from "@/services/apiClient";

export default function AdminLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);

    try {
      const payload = await apiClient.login(form.email, form.password);

      if (isInactivePayload(payload)) {
        clearAuthSession();
        setError(
          "This administrator account has been deactivated. Please contact the system administrator.",
        );
        return;
      }

      if (payload.role !== "Administrator") {
        clearAuthSession();
        setError("This login is for administrators only.");
        return;
      }

      saveAuthSession(payload);
      router.push("/admin");
    } catch (err) {
      clearAuthSession();
      setError(err.message || "Invalid admin credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="loginPage">
        <section className="authCard">
          <button
            type="button"
            className="backButton"
            onClick={() => router.push("/auth/access-select")}
          >
            <ArrowLeft size={17} weight="regular" />
            <span>Back</span>
          </button>

          <div className="logoBox">M</div>

          <section className="loginBlock">
            <div className="heading">
              <p className="sectionLabel">ADMIN ACCESS</p>
              <h1>Sign in to admin</h1>
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
                  required
                />
              </div>

              <div className="field">
                <div className="labelRow">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="forgotButton"
                    onClick={() => router.push("/auth/forgot-password")}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="passwordWrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />

                  <button
                    type="button"
                    className="passwordToggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlash size={18} weight="regular" />
                    ) : (
                      <Eye size={18} weight="regular" />
                    )}
                  </button>
                </div>
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
          </section>
        </section>
      </main>

      <style jsx>{`
        .loginPage {
          min-height: 100vh;
          width: 100%;
          background: #090021 !important;
          color: #ffffff !important;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family:
            Montserrat,
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .authCard {
          position: relative;
          width: 100%;
          max-width: 410px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 34px 38px 38px;
          border-radius: 28px;
          background: rgba(18, 0, 68, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .backButton {
          align-self: flex-start;
          border: 0;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.74) !important;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0;
          margin-bottom: 24px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition:
            color 0.18s ease,
            transform 0.18s ease,
            opacity 0.18s ease;
        }

        .backButton:hover {
          color: #ffbb00 !important;
          transform: translateX(-3px);
        }

        .logoBox {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          background: #120044 !important;
          color: #ffbb00 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 28px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
        }

        .loginBlock {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .heading {
          display: grid;
          gap: 8px;
          margin-bottom: 2px;
        }

        .sectionLabel {
          margin: 0;
          color: #ffffff !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-align: left;
        }

        h1 {
          margin: 0;
          color: #ffffff !important;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.035em;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .labelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        label {
          color: rgba(255, 255, 255, 0.86);
          font-size: 11px;
          font-weight: 700;
        }

        .forgotButton {
          border: 0;
          background: transparent !important;
          color: rgba(255, 187, 0, 0.86) !important;
          padding: 0;
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .forgotButton:hover {
          color: #ffbb00 !important;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        input {
          width: 100%;
          height: 45px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff !important;
          padding: 0 13px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          outline: none;
          transition:
            border-color 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.34);
        }

        input:focus {
          border-color: rgba(255, 187, 0, 0.56);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(255, 187, 0, 0.1);
        }

        .passwordWrap {
          position: relative;
          width: 100%;
        }

        .passwordWrap input {
          padding-right: 46px;
        }

        .passwordToggle {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border: 0;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.56) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition:
            color 0.18s ease,
            opacity 0.18s ease;
        }

        .passwordToggle:hover {
          color: #ffbb00 !important;
        }

        .error {
          margin: 0;
          color: #ff8f8f !important;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
        }

        .submitButton {
          width: 100%;
          height: 45px;
          border: 0;
          border-radius: 12px;
          background: #ffbb00 !important;
          color: #090021 !important;
          font-size: 13px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            opacity 0.18s ease,
            background-color 0.18s ease;
        }

        .submitButton:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #ffd15a !important;
        }

        .submitButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .loginPage {
            padding: 20px;
          }

          .authCard {
            max-width: 340px;
            padding: 30px 28px 34px;
            border-radius: 24px;
          }

          .backButton {
            margin-bottom: 24px;
          }

          .logoBox {
            width: 58px;
            height: 58px;
            font-size: 30px;
            margin-bottom: 26px;
          }

          h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  );
}