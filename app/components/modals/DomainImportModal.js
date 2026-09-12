"use client";

import React from "react";
import { FiUpload, FiDownload, FiCheckCircle, FiAlertTriangle, FiX } from "react-icons/fi";

export default function DomainImportModal({
  showImportModal,
  setShowImportModal,
  importStatus,
  setImportStatus,
  importFile,
  setImportFile,
  importParsed,
  setImportParsed,
  importResult,
  setImportResult,
  handleDownloadTemplate,
  handleImportFileChange,
  handleConfirmImport
}) {
  if (!showImportModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary, #1e293b)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.15))",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflowY: "auto",
          color: "var(--text-primary, #f8fafc)"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FiUpload style={{ color: "var(--accent-cyan, #06b6d4)" }} /> Bulk Import Domains
            </h2>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.85rem", marginTop: "4px" }}>
              Upload an Excel (.xlsx, .xls) or CSV file to add multiple domains to your tracking inventory at once.
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(false)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--glass-border, rgba(255,255,255,0.1))",
              color: "var(--text-primary, #f8fafc)",
              borderRadius: "8px",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <FiX /> Close
          </button>
        </div>

        {/* Template Download */}
        <div
          style={{
            background: "rgba(6, 182, 212, 0.08)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap"
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>📋</span>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <p style={{ margin: 0, fontWeight: "600", fontSize: "0.92rem", color: "var(--text-primary, #f8fafc)" }}>
              Download Standard Import Template
            </p>
            <p style={{ margin: "2px 0 0", color: "var(--text-secondary, #94a3b8)", fontSize: "0.8rem" }}>
              Pre-formatted with required headers (Domain Name, Client, Expiry Date, Registrar, Renewal Cost, etc.)
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              fontSize: "0.85rem",
              borderRadius: "8px"
            }}
          >
            <FiDownload /> Download Template (.csv)
          </button>
        </div>

        {/* File Dropzone */}
        {importStatus !== "done" && (
          <div
            style={{
              border: "2px dashed var(--glass-border, rgba(255,255,255,0.2))",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              marginBottom: "20px",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer"
            }}
            onClick={() => document.getElementById("domain-bulk-file-input")?.click()}
          >
            <FiUpload style={{ fontSize: "2rem", color: "var(--accent-cyan, #06b6d4)", marginBottom: "8px" }} />
            <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "0.95rem" }}>
              {importFile ? `Selected: ${importFile.name}` : "Click or drag to choose Excel or CSV file"}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
              Supports .xlsx, .xls, and .csv formats
            </p>
            <input
              id="domain-bulk-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleImportFileChange}
            />
          </div>
        )}

        {/* Preview Table */}
        {importStatus === "preview" && importParsed && importParsed.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--accent-cyan, #06b6d4)" }}>
                Rows detected: {importParsed.length}
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary, #94a3b8)" }}>
                Review before finalizing import
              </span>
            </div>

            <div
              style={{
                maxHeight: "240px",
                overflowY: "auto",
                border: "1px solid var(--glass-border, rgba(255,255,255,0.1))",
                borderRadius: "10px",
                marginBottom: "20px"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", position: "sticky", top: 0 }}>
                    <th style={{ padding: "8px 12px" }}>#</th>
                    <th style={{ padding: "8px 12px" }}>Domain Name</th>
                    <th style={{ padding: "8px 12px" }}>Client</th>
                    <th style={{ padding: "8px 12px" }}>Registrar</th>
                    <th style={{ padding: "8px 12px" }}>Expiry Date</th>
                    <th style={{ padding: "8px 12px" }}>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {importParsed.slice(0, 50).map((row, idx) => {
                    const dName = row["Domain Name"] || row["domain_name"] || row["Domain"] || row["domain"] || row["Website"] || "—";
                    const cName = row["Client Name"] || row["client_name"] || row["Client"] || "—";
                    const reg = row["Registrar"] || row["registrar"] || "GoDaddy";
                    const exp = row["Expiry Date"] || row["expiry_date"] || row["Expiration Date"] || "Auto (1 Yr)";
                    const cost = row["Renewal Cost"] || row["renewal_cost"] || "$15.99";

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary, #94a3b8)" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{String(dName)}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary, #94a3b8)" }}>{String(cName)}</td>
                        <td style={{ padding: "8px 12px" }}>{String(reg)}</td>
                        <td style={{ padding: "8px 12px" }}>{String(exp)}</td>
                        <td style={{ padding: "8px 12px" }}>{String(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleConfirmImport}
                className="btn-primary"
                style={{ flex: 1, padding: "12px", borderRadius: "8px", fontWeight: 600 }}
              >
                Confirm & Import {importParsed.length} Domains
              </button>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportParsed([]);
                  setImportStatus(null);
                }}
                className="btn-secondary"
                style={{ padding: "12px 20px", borderRadius: "8px" }}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner State */}
        {importStatus === "loading" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <p style={{ color: "var(--accent-cyan, #06b6d4)", fontWeight: 600 }}>
              Importing domains and calculating expiry cycles...
            </p>
          </div>
        )}

        {/* Done / Result Summary */}
        {importStatus === "done" && importResult && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px"
              }}
            >
              <FiCheckCircle style={{ fontSize: "2.5rem", color: "#10b981", marginBottom: "8px" }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#10b981", fontSize: "1.2rem" }}>
                Import Complete!
              </h3>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                Successfully added <strong>{importResult.imported || 0}</strong> new domains to your portfolio.
              </p>
            </div>

            {importResult.duplicates && importResult.duplicates.length > 0 && (
              <div
                style={{
                  background: "rgba(234, 179, 8, 0.1)",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#eab308", fontWeight: 600, fontSize: "0.85rem", marginBottom: "4px" }}>
                  <FiAlertTriangle /> Skipped {importResult.duplicates.length} duplicate domains already in database:
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", maxHeight: "80px", overflowY: "auto" }}>
                  {importResult.duplicates.join(", ")}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowImportModal(false);
                setImportStatus(null);
                setImportFile(null);
                setImportParsed([]);
                setImportResult(null);
              }}
              className="btn-primary"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", fontWeight: 600 }}
            >
              Done & View Updated Registry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
