const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'devicedesk', 'app', 'page.js');
let code = fs.readFileSync(file, 'utf8');

// The replacement for Desktop Sidebar
const desktopSidebarReplacement = `              <>
                {/* 1. Core Workspace */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Core Workspace")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                    Core Workspace
                    {openMenu === "Core Workspace" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Core Workspace" && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li className={\`nav-item \${currentView === "dashboard" ? "active" : ""}\`}>
                        <button onClick={() => setCurrentView("dashboard")}><span className="nav-icon"><FiGrid /></span> Dashboard</button>
                      </li>
                      {!isITSupport && (
                        <li className={\`nav-item \${currentView === "chat" ? "active" : ""}\`}>
                          <button onClick={() => setCurrentView("chat")}>
                            <span className="nav-icon"><FiMessageSquare /></span> Chat Workspace
                            {isMounted && unreadChatCount > 0 && (
                              <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700", marginLeft: "8px" }}>
                                {unreadChatCount}
                              </span>
                            )}
                          </button>
                        </li>
                      )}
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/tasks"}><span className="nav-icon"><FiCheckSquare /></span> Task Board</button>
                      </li>
                      {!isITSupport && (
                        <li className={\`nav-item \${currentView === "screenshots" ? "active" : ""}\`}>
                          <button onClick={() => setCurrentView("screenshots")}><span className="nav-icon"><FiEye /></span> Activity Screenshots</button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* 2. Client Management */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Client Management")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                    Client Management
                    {openMenu === "Client Management" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Client Management" && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/client"}><span className="nav-icon"><FiUsers /></span> Client Records</button>
                      </li>
                      {!isITSupport && (
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/domains"}><span className="nav-icon"><FiGlobe /></span> Domain Portfolio</button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* 3. Marketing */}
                {!isITSupport && (
                  <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => toggleMenu("Marketing")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                      Marketing
                      {openMenu === "Marketing" ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    {openMenu === "Marketing" && (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/marketing"}><span className="nav-icon"><FiTrendingUp /></span> Marketing Hub</button>
                        </li>
                      </ul>
                    )}
                  </div>
                )}

                {/* 4. Operations & Projects */}
                {!isITSupport && (
                  <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => toggleMenu("Operations & Projects")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                      Operations & Projects
                      {openMenu === "Operations & Projects" ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    {openMenu === "Operations & Projects" && (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/projects"}><span className="nav-icon"><FiFolder /></span> Projects</button>
                        </li>
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/submissions"}><span className="nav-icon"><FiFileText /></span> Work Submissions</button>
                        </li>
                      </ul>
                    )}
                  </div>
                )}

                {/* 5. Organization & HR */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Organization & HR")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                    Organization & HR
                    {openMenu === "Organization & HR" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Organization & HR" && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/users"}><span className="nav-icon"><FiUser /></span> Team Directory</button>
                      </li>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/departments"}><span className="nav-icon"><FiBriefcase /></span> Departments</button>
                      </li>
                      {!isITSupport && (
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/attendance"}><span className="nav-icon"><FiClock /></span> Attendance</button>
                        </li>
                      )}
                      {!isITSupport && (
                        <li className="nav-item">
                          <button onClick={() => window.location.href = "/admin/leaves"}><span className="nav-icon"><FiCalendar /></span> Leave Requests</button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* 6. IT & Infrastructure */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("IT & Infrastructure")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                    IT & Infrastructure
                    {openMenu === "IT & Infrastructure" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "IT & Infrastructure" && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/systems"}><span className="nav-icon"><FiServer /></span> Systems Inventory</button>
                      </li>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/tickets"}><span className="nav-icon"><FiTag /></span> Raise Records</button>
                      </li>
                    </ul>
                  )}
                </div>

                {/* 7. Security & Auditing */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Security & Auditing")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" }}>
                    Security & Auditing
                    {openMenu === "Security & Auditing" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Security & Auditing" && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li className="nav-item">
                        <button onClick={() => window.location.href = "/admin/audit-logs"}><span className="nav-icon"><FiFileText /></span> System Logs & Audit</button>
                      </li>
                      {isMounted && user?.dbRole === 'Admin' && (
                        <li className={\`nav-item \${currentView === "danger-zone" ? "active" : ""}\`}>
                          <button onClick={() => setCurrentView("danger-zone")} style={{ color: 'var(--status-critical)' }}><span className="nav-icon"><FiAlertTriangle /></span> Danger Zone</button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>`;

const mobileSidebarReplacement = `              <>
                {/* 1. Core Workspace */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Core Workspace")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Core Workspace
                    {openMenu === "Core Workspace" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Core Workspace" && (
                    <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <button className={\`mobile-drawer-item \${currentView === "dashboard" ? "active" : ""}\`} onClick={() => { setCurrentView("dashboard"); setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiGrid /></span> Dashboard</button>
                      {!isITSupport && (
                        <button className={\`mobile-drawer-item \${currentView === "chat" ? "active" : ""}\`} onClick={() => { setCurrentView("chat"); setMobileMenuOpen(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ display: "inline-flex" }}><FiMessageSquare /></span> Chat Workspace</span>
                          {unreadChatCount > 0 && (
                            <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700" }}>{unreadChatCount}</span>
                          )}
                        </button>
                      )}
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/tasks"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiCheckSquare /></span> Task Board</button>
                      {!isITSupport && (
                        <button className={\`mobile-drawer-item \${currentView === "screenshots" ? "active" : ""}\`} onClick={() => { setCurrentView("screenshots"); setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiEye /></span> Activity Screenshots</button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Client Management */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Client Management")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Client Management
                    {openMenu === "Client Management" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Client Management" && (
                    <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/client"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiUsers /></span> Client Records</button>
                      {!isITSupport && (
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/domains"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiGlobe /></span> Domain Portfolio</button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Marketing */}
                {!isITSupport && (
                  <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => toggleMenu("Marketing")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Marketing
                      {openMenu === "Marketing" ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    {openMenu === "Marketing" && (
                      <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/marketing"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiTrendingUp /></span> Marketing Hub</button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Operations & Projects */}
                {!isITSupport && (
                  <div style={{ marginBottom: "12px" }}>
                    <button onClick={() => toggleMenu("Operations & Projects")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Operations & Projects
                      {openMenu === "Operations & Projects" ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    {openMenu === "Operations & Projects" && (
                      <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/projects"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiFolder /></span> Projects</button>
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/submissions"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiFileText /></span> Work Submissions</button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Organization & HR */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Organization & HR")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Organization & HR
                    {openMenu === "Organization & HR" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Organization & HR" && (
                    <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/users"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiUser /></span> Team Directory</button>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/departments"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiBriefcase /></span> Departments</button>
                      {!isITSupport && (
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/attendance"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiClock /></span> Attendance</button>
                      )}
                      {!isITSupport && (
                        <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/leaves"; setMobileMenuOpen(false); }}>
                          <span style={{ display: "inline-flex" }}><FiCalendar /></span> Leave Requests
                          {leaveRequests.filter(r => r.status === 'Pending').length > 0 && (
                            <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700", marginLeft: "8px" }}>{leaveRequests.filter(r => r.status === 'Pending').length}</span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. IT & Infrastructure */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("IT & Infrastructure")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    IT & Infrastructure
                    {openMenu === "IT & Infrastructure" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "IT & Infrastructure" && (
                    <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/systems"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiServer /></span> Systems Inventory</button>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/tickets"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiTag /></span> Raise Records</button>
                    </div>
                  )}
                </div>

                {/* 7. Security & Auditing */}
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={() => toggleMenu("Security & Auditing")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Security & Auditing
                    {openMenu === "Security & Auditing" ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openMenu === "Security & Auditing" && (
                    <div style={{ paddingLeft: "10px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <button className="mobile-drawer-item" onClick={() => { window.location.href = "/admin/audit-logs"; setMobileMenuOpen(false); }}><span style={{ display: "inline-flex" }}><FiActivity /></span> System Logs & Audit</button>
                    </div>
                  )}
                </div>`;

const desktopRegex = /(?<=<ul className="nav-links">[\s\S]*?\{.*\.includes\(\(userRole \|\| ''\)\.toLowerCase\(\)\) && \([\s\S]*?)(<>[\s\S]*?<\/>)(?=\s*\)\}\s*\{userRole === "employee")/m;
const mobileRegex = /(?<=<nav className="mobile-drawer-nav">[\s\S]*?\{.*\.includes\(\(userRole \|\| ''\)\.toLowerCase\(\)\) && \([\s\S]*?)(<>[\s\S]*?<\/>)(?=\s*\)\}\s*<\/nav>)/m;

code = code.replace(desktopRegex, desktopSidebarReplacement);
code = code.replace(mobileRegex, mobileSidebarReplacement);

fs.writeFileSync(file, code);
console.log('Done!');
