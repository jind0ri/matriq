"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "phosphor-react";

export default function AccessSelectPage() {
  const router = useRouter();

  return (
    <>
      <div className="page">
        <div className="logoBlock">
          <div className="logoBox">M</div>
          <h1>Matriq</h1>
          <p>LABORATORY TERMINAL</p>
        </div>

        <div className="accessSection">
          <span className="sectionLabel">SELECT ACCESS PROTOCOL</span>

          <button
            type="button"
            className="accessButton"
            onClick={() => router.push("/auth/employee-login")}
          >
            <span>Employee Access</span>
            <ArrowRight size={22} weight="regular" />
          </button>

          <button
            type="button"
            className="accessButton"
            onClick={() => router.push("/auth/admin-login")}
          >
            <span>Admin Access</span>
            <ArrowRight size={22} weight="regular" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #080026;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .logoBlock {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 46px;
        }

        .logoBox {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(15, 0, 67, 0.7);
          color: #ffbb00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        h1 {
          margin: 0;
          color: #ffbb00;
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
        }

        p {
          margin: 8px 0 0;
          font-size: 9px;
          letter-spacing: 0.6px;
          color: #a8a8b8;
        }

        .accessSection {
          width: 100%;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .sectionLabel {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: #f0f0f0;
          text-align: left;
        }

        .accessButton {
          width: 100%;
          border: none;
          background: transparent;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 4px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .accessButton:hover {
          opacity: 0.85;
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
}
