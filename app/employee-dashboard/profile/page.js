"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import { getEmployees, getSystems, getTickets, removeEmployee } from "../../store";
import {
  FiUser,
  FiFolder,
  FiPlus,
  FiDownload,
  FiTrash2,
  FiEye,
  FiX,
  FiCheck,
  FiUploadCloud,
  FiFileText
} from "react-icons/fi";

const DOCUMENT_CATEGORIES = [
  "Resume / CV",
  "Government ID Proof",
  "Address Proof",
  "Offer / Appointment Letter",
  "Academic / Degree Certificate",
  "Experience / Relieving Letter",
  "Bank / Salary Slip Document",
  "Other Document"
];

export default function MyProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    type: "Resume / CV",
    name: "",
    file: null
  });
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchMyDocs = async () => {
    if (!user?.id) return;
    try {
      setLoadingDocs(true);
      const res = await fetch(`/api/employees/${user.id}/documents`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error("Error fetching my documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const refreshData = () => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setTickets(getTickets());
    fetchMyDocs();
  };

  const handleOpenAddDocModal = (presetCategory = "Resume / CV") => {
    setDocForm({
      type: presetCategory,
      name: presetCategory.split(" / ")[0],
      file: null
    });
    setShowDocModal(true);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docForm.file) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please select a file to upload.",
        background: "#161b22",
        color: "#f0f6fc"
      });
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", docForm.file);
      formData.append("type", docForm.type);
      formData.append("name", docForm.name.trim() || docForm.file.name);
      formData.append("uploadedBy", user?.name || "Employee");

      const res = await fetch(`/api/employees/${user.id}/documents`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Document Uploaded",
          text: `"${docForm.name || docForm.file.name}" has been uploaded successfully!`,
          timer: 2000,
          showConfirmButton: false,
          background: "#161b22",
          color: "#f0f6fc"
        });
        setDocuments(data.documents || []);
        setShowDocModal(false);
        setDocForm({ type: "Resume / CV", name: "", file: null });
      } else {
        Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text: data.error || "Failed to upload document",
          background: "#161b22",
          color: "#f0f6fc"
        });
      }
    } catch (err) {
      console.error("Document upload error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to upload document.",
        background: "#161b22",
        color: "#f0f6fc"
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteMyDoc = (doc) => {
    Swal.fire({
      title: "Remove Document?",
      text: `Are you sure you want to delete "${doc.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6e7881",
      background: "#161b22",
      color: "#f0f6fc"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/employees/${user.id}/documents?docId=${doc.id}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setDocuments(data.documents || []);
            Swal.fire({
              icon: "success",
              title: "Deleted",
              text: "Document removed successfully.",
              timer: 1500,
              showConfirmButton: false,
              background: "#161b22",
              color: "#f0f6fc"
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: data.error || "Failed to delete document",
              background: "#161b22",
              color: "#f0f6fc"
            });
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message,
            background: "#161b22",
            color: "#f0f6fc"
          });
        }
      }
    });
  };

  const getCategoryBadgeClass = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("resume") || t.includes("cv")) return "badge-progress";
    if (t.includes("id proof") || t.includes("government")) return "badge-resolved";
    if (t.includes("offer") || t.includes("appointment")) return "badge-open";
    if (t.includes("address")) return "badge-progress";
    return "badge-open";
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    refreshData();
  }, [user?.id]);

  // Listen for database changes to keep sync
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener("devicedesk_db_synced", handleSync);
    return () => window.removeEventListener("devicedesk_db_synced", handleSync);
  }, []);

  if (!mounted || !user) return null;

  const empDetails = employees.find((e) => e.id === user.id) || user;
  const mySystems = systems.filter((s) => s.assignedTo === user.id);
  const ticketLimit = empDetails.ticketLimit || 5;
  const totalRaised = tickets.filter((t) => t.employeeId === user.id).length;

  const cropAndUploadImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          Swal.fire({
            title: "Adjust Profile Picture",
            html: `
              <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin: 10px 0;">
                <div style="position:relative; width:180px; height:180px; border-radius:50%; overflow:hidden; border:3px solid var(--accent-cyan); background:#000; ">
                  <canvas id="crop-canvas" width="180" height="180" style="cursor:move; display:block;"></canvas>
                </div>
                <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:200px; margin-top:8px;">
                  <span style="font-size:12px;">➖</span>
                  <input type="range" id="crop-zoom" min="1" max="4" step="0.05" value="1" style="flex-grow:1; accent-color:var(--accent-cyan); cursor:pointer;" />
                  <span style="font-size:12px;">➕</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Drag to adjust position • Use slider to zoom</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Apply & Upload",
            cancelButtonText: "Cancel",
            confirmButtonColor: "var(--accent-cyan)",
            cancelButtonColor: "#6e7881",
            background: "#161b22",
            color: "#f0f6fc",
            didOpen: (popup) => {
              const canvas = popup.querySelector("#crop-canvas");
              const ctx = canvas.getContext("2d");
              const zoomInput = popup.querySelector("#crop-zoom");

              let zoom = 1;
              let offsetX = 0;
              let offsetY = 0;
              let isDragging = false;
              let startX = 0;
              let startY = 0;

              const draw = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const minScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const scale = minScale * zoom;
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (canvas.width - w) / 2 + offsetX;
                const y = (canvas.height - h) / 2 + offsetY;
                ctx.drawImage(img, x, y, w, h);
              };

              draw();

              zoomInput.oninput = (e) => {
                zoom = parseFloat(e.target.value);
                draw();
              };

              canvas.onmousedown = (e) => {
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
              };

              window.onmousemove = (e) => {
                if (!isDragging) return;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                draw();
              };

              window.onmouseup = () => {
                isDragging = false;
              };

              canvas.ontouchstart = (e) => {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX - offsetX;
                startY = touch.clientY - offsetY;
              };

              canvas.ontouchmove = (e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                offsetX = touch.clientX - startX;
                offsetY = touch.clientY - startY;
                draw();
              };

              canvas.ontouchend = () => {
                isDragging = false;
              };
            },
            preConfirm: () => {
              const canvas = document.getElementById("crop-canvas");
              return new Promise((res) => {
                canvas.toBlob((blob) => {
                  res(blob);
                }, "image/jpeg", 0.9);
              });
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              resolve(result.value);
            } else {
              reject(new Error("Cancelled"));
            }
          });
        };
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePictureUpload = async () => {
    const hasAvatar = !!empDetails?.avatarUrl;

    if (hasAvatar) {
      const choice = await Swal.fire({
        title: "Profile Picture Options",
        text: "Would you like to upload a new photo or remove the current one?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Upload New",
        denyButtonText: "Remove Current",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--accent-cyan)",
        denyButtonColor: "var(--status-critical)",
        cancelButtonColor: "#6e7881",
        background: "#161b22",
        color: "#f0f6fc"
      });

      if (choice.isDenied) {
        Swal.fire({
          title: "Removing...",
          text: "Please wait.",
          allowOutsideClick: false,
          background: "#161b22",
          color: "#f0f6fc",
          didOpen: () => {
            Swal.showLoading();
          }
        });
        try {
          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateProfilePicture", avatarUrl: null })
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: "Profile picture removed successfully!",
              background: "#161b22",
              color: "#f0f6fc"
            });
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
            }
            refreshData();
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: saveData.error || "Failed to remove profile picture",
              background: "#161b22",
              color: "#f0f6fc"
            });
          }
        } catch (err) {
          console.error("Remove profile picture error:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Network error. Failed to remove profile picture.",
            background: "#161b22",
            color: "#f0f6fc"
          });
        }
        return;
      }

      if (!choice.isConfirmed) {
        return;
      }
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const croppedBlob = await cropAndUploadImage(file);

        Swal.fire({
          title: "Uploading...",
          text: "Please wait while we upload your profile picture.",
          allowOutsideClick: false,
          background: "#161b22",
          color: "#f0f6fc",
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const formData = new FormData();
        formData.append("file", croppedBlob, "profile.jpg");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Upload failed");
        }

        const avatarUrl = uploadData.fileUrls[0];

        const saveRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateProfilePicture",
            avatarUrl
          })
        });

        const saveData = await saveRes.json();
        if (saveRes.ok && saveData.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: "Profile picture updated successfully!",
            background: "#161b22",
            color: "#f0f6fc"
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
          }
          refreshData();
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: saveData.error || "Failed to save profile picture to database",
            background: "#161b22",
            color: "#f0f6fc"
          });
        }
      } catch (err) {
        if (err.message !== "Cancelled") {
          console.error("Profile picture upload error:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "Failed to upload profile picture.",
            background: "#161b22",
            color: "#f0f6fc"
          });
        }
      }
    };
    input.click();
  };

  const renderProfileAvatar = (emp, size = "60px") => {
    const getInitials = (name) => {
      if (!name) return "";
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    };

    if (emp?.avatarUrl) {
      return (
        <img
          src={emp.avatarUrl}
          alt={emp.name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover"
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: "1.4rem",
          color: "#000"
        }}
      >
        {getInitials(emp?.name || "")}
      </div>
    );
  };

  return (
    <div className="page-container emp-container" style={{ overflowY: "auto" }}>
      <div className="container-card">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent-cyan)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <FiUser /> My Profile Details
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginBottom: "2rem" }}>
          {/* User card info */}
          <div
            style={{
              flex: "1 1 300px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div onClick={handleProfilePictureUpload} style={{ position: "relative", cursor: "pointer" }} title="Change Profile Picture">
                {renderProfileAvatar(empDetails, "60px")}
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    background: "var(--accent-cyan)",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    color: "#000",
                    border: "2px solid var(--bg-tertiary)"
                  }}
                >
                  📷
                </div>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>{empDetails.name}</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>{empDetails.role}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Email:</span>
                <span>{empDetails.email || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Department:</span>
                <span>{empDetails.department || "Operations"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Ticket Limit Status:</span>
                <span>
                  {totalRaised} / {ticketLimit} complaints used
                </span>
              </div>
            </div>
          </div>

          {/* Account Actions card */}
          <div
            style={{
              flex: "1 1 300px",
              background: "rgba(239, 68, 68, 0.03)",
              border: "1px dashed rgba(239, 68, 68, 0.3)",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center"
            }}
          >
            <h4 style={{ color: "var(--status-critical)", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.75rem" }}>
              ⚠️ Permanent Account Deletion
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              Deleting your account will permanently remove your login credentials, raised tickets, and unassign any active computer systems
              assigned to you. This action is irreversible.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger"
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "700",
                cursor: "pointer",
                border: "none",
                backgroundColor: "var(--status-critical)",
                color: "#fff",
                alignSelf: "flex-start"
              }}
            >
              Delete My Account
            </button>
          </div>
        </div>

        {/* My Documents & Records Section */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiFolder style={{ fontSize: "1.3rem" }} /> My Documents & Verification Records
              </h3>
              <span className="timer-badge" style={{ color: "var(--accent-cyan)", borderColor: "rgba(6, 182, 212, 0.4)" }}>
                {documents.length} File{documents.length === 1 ? "" : "s"}
              </span>
            </div>

            <button
              onClick={() => handleOpenAddDocModal("Resume / CV")}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 16px" }}
            >
              <FiPlus /> Upload Document
            </button>
          </div>

          {/* Quick Document Status Checklist */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              padding: "1rem 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            {(() => {
              const hasResume = documents.some(d => (d.type || "").toLowerCase().includes("resume") || (d.type || "").toLowerCase().includes("cv"));
              const hasIdProof = documents.some(d => (d.type || "").toLowerCase().includes("id proof") || (d.type || "").toLowerCase().includes("government"));
              const hasAddressProof = documents.some(d => (d.type || "").toLowerCase().includes("address"));
              const hasOfferLetter = documents.some(d => (d.type || "").toLowerCase().includes("offer") || (d.type || "").toLowerCase().includes("appointment"));

              const resumeDoc = documents.find(d => (d.type || "").toLowerCase().includes("resume") || (d.type || "").toLowerCase().includes("cv"));
              const idDoc = documents.find(d => (d.type || "").toLowerCase().includes("id proof") || (d.type || "").toLowerCase().includes("government"));
              const addressDoc = documents.find(d => (d.type || "").toLowerCase().includes("address"));
              const offerDoc = documents.find(d => (d.type || "").toLowerCase().includes("offer") || (d.type || "").toLowerCase().includes("appointment"));

              return (
                <>
                  {hasResume ? (
                    <button
                      onClick={() => setPreviewDoc(resumeDoc)}
                      className="status-badge badge-resolved"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                      title="Click to view attached Resume"
                    >
                      <FiCheck /> Resume Attached
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAddDocModal("Resume / CV")}
                      style={{
                        background: "rgba(239, 68, 68, 0.06)",
                        border: "1px dashed rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FiPlus /> Add Resume
                    </button>
                  )}

                  {hasIdProof ? (
                    <button
                      onClick={() => setPreviewDoc(idDoc)}
                      className="status-badge badge-resolved"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                      title="Click to view attached ID Proof"
                    >
                      <FiCheck /> ID Proof Verified
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAddDocModal("Government ID Proof")}
                      style={{
                        background: "rgba(239, 68, 68, 0.06)",
                        border: "1px dashed rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FiPlus /> Add ID Proof
                    </button>
                  )}

                  {hasAddressProof ? (
                    <button
                      onClick={() => setPreviewDoc(addressDoc)}
                      className="status-badge badge-resolved"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                      title="Click to view Address Proof"
                    >
                      <FiCheck /> Address Proof Attached
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAddDocModal("Address Proof")}
                      style={{
                        background: "rgba(148, 163, 184, 0.1)",
                        border: "1px dashed rgba(148, 163, 184, 0.3)",
                        color: "var(--text-secondary)",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FiPlus /> Add Address Proof
                    </button>
                  )}

                  {hasOfferLetter ? (
                    <button
                      onClick={() => setPreviewDoc(offerDoc)}
                      className="status-badge badge-resolved"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                      title="Click to view Offer Letter"
                    >
                      <FiCheck /> Offer Letter Attached
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAddDocModal("Offer / Appointment Letter")}
                      style={{
                        background: "rgba(148, 163, 184, 0.1)",
                        border: "1px dashed rgba(148, 163, 184, 0.3)",
                        color: "var(--text-secondary)",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FiPlus /> Add Offer Letter
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Documents Table */}
          <div className="table-wrapper" style={{ marginTop: "1rem" }}>
            {loadingDocs ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                Loading your documents...
              </div>
            ) : documents.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1.5rem",
                  background: "rgba(255, 255, 255, 0.01)",
                  borderRadius: "12px",
                  border: "1px dashed var(--glass-border)"
                }}
              >
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: "rgba(6, 182, 212, 0.1)",
                    color: "var(--accent-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    margin: "0 auto 0.75rem auto"
                  }}
                >
                  <FiFolder />
                </div>
                <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)", fontSize: "1.05rem" }}>
                  No Documents Attached
                </h4>
                <p style={{ margin: "0 0 1.25rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Upload your resume, official ID proof, or educational certificates to your profile.
                </p>
                <button
                  onClick={() => handleOpenAddDocModal("Resume / CV")}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "8px 16px" }}
                >
                  <FiUploadCloud /> Upload Your First Document
                </button>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>File Details</th>
                    <th>Uploaded Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const isPdf = (doc.fileName || doc.fileUrl || "").toLowerCase().endsWith(".pdf");
                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileName || doc.fileUrl || "");

                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: isPdf ? "rgba(239, 68, 68, 0.15)" : isImg ? "rgba(139, 92, 246, 0.15)" : "rgba(6, 182, 212, 0.15)",
                                color: isPdf ? "#ef4444" : isImg ? "#8b5cf6" : "#06b6d4",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1rem",
                                flexShrink: 0
                              }}
                            >
                              <FiFileText />
                            </span>
                            <div>
                              <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                                {doc.name || "Untitled"}
                              </strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {doc.fileName || "file"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getCategoryBadgeClass(doc.type)}`}>
                            {doc.type || "Document"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {doc.fileSize || "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          }) : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="btn-action"
                              style={{ padding: "6px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              title="Preview Document"
                            >
                              <FiEye /> View
                            </button>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="btn-action"
                              style={{ padding: "6px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                              title="Download Document"
                            >
                              <FiDownload /> Download
                            </a>
                            <button
                              onClick={() => handleDeleteMyDoc(doc)}
                              className="btn-action resolve"
                              style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                              title="Delete Document"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Hardware Specifications */}
        <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--accent-cyan)", marginBottom: "1rem" }}>
          🖥️ My Assigned Hardware Specs
        </h3>
        {mySystems.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--glass-border)",
              borderRadius: "12px",
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.9rem"
            }}
          >
            No hardware inventory assigned to you.
          </div>
        ) : (
          mySystems.map((sys) => (
            <div
              key={sys.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "1.5rem"
              }}
            >
              <h4 style={{ margin: "0 0 1rem 0", color: "var(--text-primary)", fontSize: "1.05rem" }}>
                System ID: <span style={{ color: "var(--accent-cyan)" }}>{sys.systemNumber}</span> ({sys.model || "Standard Desktop"})
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1rem"
                }}
              >
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Processor (CPU)</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.cpu || "N/A"}</p>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Graphics Card (GPU)</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.gpu || "Integrated"}</p>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Memory (RAM)</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.ram || "N/A"}</p>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Storage Specs</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.storage || "N/A"}</p>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Operating System</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", fontWeight: "600" }}>{sys.os || "N/A"}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="modal-overlay active"
          onClick={() => setShowDeleteConfirm(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: "420px",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: "3px solid var(--status-critical)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 1rem auto"
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Are you sure?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              You will not be able to revert this account deletion! All assignments and tickets will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                style={{ padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  removeEmployee(user.id);
                  logout();
                  router.push("/login");
                }}
                className="btn-danger"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "none",
                  background: "var(--status-critical)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Yes, delete it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPLOAD MY DOCUMENT ================= */}
      {showDocModal && (
        <div
          className="modal-overlay active"
          onClick={() => setShowDocModal(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "540px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FiUploadCloud style={{ color: "var(--accent-cyan)" }} /> Upload My Document
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDocModal(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Document Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={docForm.type}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setDocForm(prev => ({
                      ...prev,
                      type: cat,
                      name: prev.name && prev.name !== prev.type ? prev.name : cat.split(" / ")[0]
                    }));
                  }}
                  className="form-control"
                  style={{ width: "100%" }}
                  required
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Document Title / Label <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resume, Aadhaar Card, Degree Certificate"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  className="form-control"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Select File <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div
                  style={{
                    border: "2px dashed var(--glass-border)",
                    borderRadius: "12px",
                    padding: "1.5rem 1rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: docForm.file ? "rgba(6, 182, 212, 0.05)" : "rgba(255, 255, 255, 0.01)"
                  }}
                  onClick={() => document.getElementById("emp-self-doc-file-input")?.click()}
                >
                  <input
                    id="emp-self-doc-file-input"
                    type="file"
                    style={{ display: "none" }}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocForm(prev => ({
                          ...prev,
                          file,
                          name: prev.name.trim() ? prev.name : file.name.replace(/\.[^/.]+$/, "")
                        }));
                      }
                    }}
                  />
                  {docForm.file ? (
                    <div>
                      <div style={{ fontSize: "1.8rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                        <FiFileText />
                      </div>
                      <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "0.9rem", wordBreak: "break-all" }}>
                        {docForm.file.name}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {(docForm.file.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "2rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                        <FiUploadCloud />
                      </div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        Click to select or drag file here
                      </p>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Supported formats: PDF, PNG, JPG, DOC, DOCX, ZIP (Max 100MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="btn-primary"
                  style={{
                    flex: "1 1 180px",
                    padding: "11px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: uploadingDoc ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {uploadingDoc ? (
                    <>
                      <span className="spinner" style={{ width: "16px", height: "16px" }} /> Uploading...
                    </>
                  ) : (
                    <>
                      <FiUploadCloud /> Upload Document
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="btn-secondary"
                  style={{ flex: "1 1 100px", padding: "11px", borderRadius: "8px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PREVIEW MY DOCUMENT ================= */}
      {previewDoc && (
        <div
          className="modal-overlay active"
          onClick={() => setPreviewDoc(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card doc-preview-card"
            style={{
              maxWidth: "920px",
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid var(--glass-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                background: "var(--bg-secondary)"
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <h4
                  style={{
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  title={previewDoc.name}
                >
                  {previewDoc.name}
                </h4>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{previewDoc.type}</span>
                  {previewDoc.fileName && (
                    <>
                      <span>•</span>
                      <span style={{ opacity: 0.9 }}>{previewDoc.fileName}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.82rem",
                      padding: "6px 12px",
                      textDecoration: "none",
                      borderRadius: "8px"
                    }}
                  >
                    <FiDownload /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="modal-close"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--text-primary)"
                  }}
                  title="Close preview"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div
              style={{
                flex: 1,
                padding: "1rem",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "300px",
                maxHeight: "calc(92vh - 75px)",
                background: "var(--bg-card)"
              }}
            >
              {previewDoc.fileUrl && previewDoc.fileUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.fileUrl}
                  style={{
                    width: "100%",
                    height: "min(70vh, 600px)",
                    minHeight: "350px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#ffffff"
                  }}
                  title={previewDoc.name}
                />
              ) : previewDoc.fileUrl && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(previewDoc.fileUrl) ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}>
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "min(70vh, 550px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 1rem", maxWidth: "460px", margin: "0 auto" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "16px",
                      background: "rgba(6, 182, 212, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.25rem auto",
                      color: "var(--accent-cyan)",
                      fontSize: "2rem"
                    }}
                  >
                    <FiFileText />
                  </div>
                  <h5
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem"
                    }}
                  >
                    {previewDoc.name}
                  </h5>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      lineHeight: "1.5",
                      marginBottom: "1.5rem"
                    }}
                  >
                    This document format ({previewDoc.type || "file"}) cannot be previewed directly in the inline viewer. Please download the file to inspect its full contents.
                  </p>
                  {previewDoc.fileUrl && (
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="btn-primary"
                      style={{
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        fontSize: "0.9rem"
                      }}
                    >
                      <FiDownload /> Download Document File
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
