"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "phosphor-react";

export default function AccessSelectPage() {
  const router = useRouter();

  return (
    <>
      <main className="accessPage">
        <section className="authCard">
          <div className="brandBlock">
            <div className="logoBox">M</div>

            <h1 className="brandName">Matriq</h1>
            <p className="brandSub">LABORATORY TERMINAL</p>
          </div>

          <section className="accessBlock">
            <p className="sectionLabel">SELECT ACCESS PROTOCOL</p>

            <button
              type="button"
              className="accessButton"
              onClick={() => router.push("/auth/employee-login")}
            >
              <span>Employee Access</span>
              <ArrowRight size={18} weight="regular" />
            </button>

            <button
              type="button"
              className="accessButton"
              onClick={() => router.push("/auth/admin-login")}
            >
              <span>Admin Access</span>
              <ArrowRight size={18} weight="regular" />
            </button>
          </section>
        </section>
      </main>

      <style jsx>{`
        .accessPage {
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
          width: 100%;
          max-width: 420px;
          min-height: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 44px 42px;
          border-radius: 28px;
          background: rgba(18, 0, 68, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .brandBlock {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 48px;
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
          margin-bottom: 12px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
        }

        .brandName {
          margin: 0;
          color: #ffbb00 !important;
          font-size: 38px;
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.04em;
          text-align: center;
        }

        .brandSub {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.58) !important;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-align: center;
        }

        .accessBlock {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .sectionLabel {
          margin: 0 0 2px;
          color: #ffffff !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-align: left;
        }

        .accessButton {
          width: 100%;
          height: 36px;
          border: 0;
          outline: 0;
          background: transparent !important;
          color: #ffffff !important;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 22px;
          align-items: center;
          gap: 14px;
          padding: 0 0 0 42px;
          text-align: left;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          font-family: inherit;
          transition:
            transform 0.18s ease,
            opacity 0.18s ease,
            color 0.18s ease;
        }

        .accessButton span {
          color: #ffffff !important;
          min-width: 0;
        }

        .accessButton svg {
          color: #ffffff !important;
        }

        .accessButton:hover {
          transform: translateX(4px);
          opacity: 0.88;
        }

        .accessButton:hover span,
        .accessButton:hover svg {
          color: #ffbb00 !important;
        }

        .accessButton:active {
          transform: translateX(2px);
          opacity: 0.72;
        }

        @media (max-width: 520px) {
          .accessPage {
            padding: 20px;
          }

          .authCard {
            max-width: 340px;
            min-height: 460px;
            padding: 36px 28px;
            border-radius: 24px;
          }

          .brandBlock {
            margin-bottom: 44px;
          }

          .logoBox {
            width: 58px;
            height: 58px;
            font-size: 30px;
          }

          .brandName {
            font-size: 34px;
          }

          .accessButton {
            padding-left: 32px;
          }
        }
      `}</style>
    </>
  );
}