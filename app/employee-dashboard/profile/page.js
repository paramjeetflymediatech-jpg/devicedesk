"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import { getEmployees, getSystems, getTickets, removeEmployee } from "../../store";
import { FiUser } from "react-icons/fi";

export default function MyProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const refreshData = () => {
    setEmployees(getEmployees());
    setSystems(getSystems());
    setTickets(getTickets());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

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
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
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
              padding: "24px",
              width: "100%",
              maxWidth: "420px",
              textAlign: "center"
            }}
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
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  removeEmployee(user.id);
                  logout();
                  router.push("/login");
                }}
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
    </div>
  );
}
