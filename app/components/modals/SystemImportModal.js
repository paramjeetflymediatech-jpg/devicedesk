"use client";

import React from "react";

export default function SystemImportModal({
  showImportModal,
  setShowImportModal,
  importStatus,
  setImportStatus,
  importFile,
  setImportFile,
  importParsed,
  setImportParsed,
  importResult,
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
          background: "var(--bg-secondary)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto"
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
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
              📤 Bulk Import Systems
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "4px" }}>
              Upload an Excel (.xlsx) or CSV file to add multiple systems at once
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(false)}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              borderRadius: "8px",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Template Download */}
        <div
          style={{
            background: "rgba(34,160,90,0.08)",
            border: "1px solid rgba(34,160,90,0.3)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>📋</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: "600", color: "var(--text-primary)", fontSize: "0.88rem" }}>
              Download Import Template
            </p>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.78rem" }}>
              Columns: System Number, Model, OS, CPU, GPU, RAM, Storage, Status,{" "}
              <strong style={{ color: "#22a05a" }}>Assigned To</strong> (employee name or email — optional),
              Remarks
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            style={{
              background: "linear-gradient(135deg,#1a6b3c,#22a05a)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "7px 16px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.82rem",
              whiteSpace: "nowrap"
            }}
          >
            ⬇ Get Template
          </button>
        </div>

        {/* File picker */}
        {importStatus !== "done" && (
          <div
            style={{
              border: "2px dashed var(--glass-border)",
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              marginBottom: "18px",
              background: "var(--bg-tertiary)",
              cursor: "pointer"
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📁</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px" }}>
              {importFile ? `Selected: ${importFile.name}` : "Choose your Excel (.xlsx) or CSV file"}
            </p>
            <label style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFileChange}
                style={{ display: "none" }}
              />
              <span
                style={{
                  background: "var(--accent-cyan)",
                  color: "#0d1117",
                  fontWeight: "700",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Browse File
              </span>
            </label>
          </div>
        )}

        {/* Preview table */}
        {importStatus === "preview" && importParsed.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "8px" }}>
              📊 Preview — <strong style={{ color: "var(--text-primary)" }}>{importParsed.length} rows</strong>{" "}
              detected. Review before importing.
            </p>
            <div
              style={{
                overflowX: "auto",
                maxHeight: "220px",
                overflowY: "auto",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary)", position: "sticky", top: 0 }}>
                    {Object.keys(importParsed[0])
                      .slice(0, 9)
                      .map(h => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 10px",
                            textAlign: "left",
                            color: "var(--accent-cyan)",
                            borderBottom: "1px solid var(--glass-border)",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {importParsed.slice(0, 20).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {Object.values(row)
                        .slice(0, 9)
                        .map((val, j) => (
                          <td
                            key={j}
                            style={{
                              padding: "5px 10px",
                              color: "var(--text-secondary)",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {String(val)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importParsed.length > 20 && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "6px" }}>
                ...and {importParsed.length - 20} more rows
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportParsed([]);
                  setImportStatus(null);
                }}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.85rem"
                }}
              >
                ↩ Change File
              </button>
              <button
                onClick={handleConfirmImport}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg,#1a6b3c,#22a05a)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "0.85rem"
                }}
              >
                ✅ Confirm & Import {importParsed.length} Systems
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {importStatus === "loading" && (
          <div style={{ textAlign: "center", padding: "30px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
            <p style={{ color: "var(--text-secondary)" }}>Importing systems, please wait...</p>
          </div>
        )}

        {/* Result */}
        {importStatus === "done" && importResult && (
          <div>
            <div
              style={{
                background: "rgba(34,160,90,0.1)",
                border: "1px solid rgba(34,160,90,0.4)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "14px"
              }}
            >
              <h3 style={{ color: "#22a05a", margin: "0 0 6px 0", fontSize: "1.05rem" }}>
                ✅ Import Complete!
              </h3>
              <p style={{ color: "var(--text-primary)", margin: 0, fontSize: "0.88rem" }}>
                <strong>{importResult.imported}</strong> systems imported successfully.
              </p>
            </div>

            {importResult.duplicates?.length > 0 && (
              <div
                style={{
                  background: "rgba(255,168,0,0.08)",
                  border: "1px solid rgba(255,168,0,0.35)",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "10px"
                }}
              >
                <p style={{ color: "#ffa800", fontWeight: "700", margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                  ⚠️ {importResult.duplicates.length} Duplicate(s) Skipped
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
                  These System Numbers already exist: <em>{importResult.duplicates.join(", ")}</em>
                </p>
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div
                style={{
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.35)",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "10px"
                }}
              >
                <p style={{ color: "#dc2626", fontWeight: "700", margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                  ❌ {importResult.errors.length} Row(s) Had Errors
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
                  Rows missing a System Number were skipped.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowImportModal(false);
                window.location.reload();
              }}
              style={{
                marginTop: "10px",
                padding: "9px 22px",
                borderRadius: "8px",
                border: "none",
                background: "var(--accent-cyan)",
                color: "#0d1117",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Done — Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
