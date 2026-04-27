"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeSlash } from "phosphor-react";
import { apiClient } from "@/services/apiClient";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setStatus("");
  }

  async function submit(event) {
    event.preventDefault();

    setError("");
    setStatus("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset link.");
      return;
    }

    if (!form.password || !form.confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.resetPassword({
        token,
        password: form.password,
      });

      setStatus(
        "Password has been reset successfully. Redirecting to login...",
      );

      setTimeout(() => {
        router.push("/auth/employee-login");
      }, 1400);
    } catch (err) {
      setError(err.message || "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="resetPage">
        <section className="authCard">
          <button
            type="button"
            className="backButton"
            onClick={() => router.push("/auth/forgot-password")}
          >
            <ArrowLeft size={17} weight="regular" />
            <span>Back</span>
          </button>

          <div className="logoBox">M</div>

          <section className="resetBlock">
            <div className="heading">
              <p className="sectionLabel">PASSWORD RESET</p>
              <h1>Create new password</h1>
              <p className="description">
                Enter your new password below. After resetting, you can sign in
                again using your updated credentials.
              </p>
            </div>

            <form className="form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="password">New Password</label>

                <div className="passwordWrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                  />

                  <button
                    type="button"
                    className="passwordToggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeSlash size={18} weight="regular" />
                    ) : (
                      <Eye size={18} weight="regular" />
                    )}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirm Password</label>

                <div className="passwordWrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    required
                  />

                  <button
                    type="button"
                    className="passwordToggle"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeSlash size={18} weight="regular" />
                    ) : (
                      <Eye size={18} weight="regular" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="error">{error}</p>}
              {status && <p className="success">{status}</p>}

              <button
                type="submit"
                className="submitButton"
                disabled={submitting}
              >
                {submitting ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="secondaryButton"
                onClick={() => router.push("/auth/employee-login")}
              >
                Return to Login
              </button>
            </form>
          </section>
        </section>
      </main>

      <style jsx>{`
        .resetPage {
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

        .resetBlock {
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

        .description {
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          font-weight: 500;
          line-height: 1.6;
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

        label {
          color: rgba(255, 255, 255, 0.86);
          font-size: 11px;
          font-weight: 700;
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

        .error,
        .success {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
        }

        .error {
          color: #ff8f8f !important;
        }

        .success {
          color: #8ef0b0 !important;
        }

        .submitButton,
        .secondaryButton {
          width: 100%;
          height: 45px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            opacity 0.18s ease,
            background-color 0.18s ease,
            border-color 0.18s ease;
        }

        .submitButton {
          border: 0;
          background: #ffbb00 !important;
          color: #090021 !important;
        }

        .submitButton:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #ffd15a !important;
        }

        .submitButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondaryButton {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: transparent !important;
          color: rgba(255, 255, 255, 0.84) !important;
        }

        .secondaryButton:hover {
          border-color: rgba(255, 187, 0, 0.38);
          color: #ffbb00 !important;
          transform: translateY(-1px);
        }

        @media (max-width: 520px) {
          .resetPage {
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
