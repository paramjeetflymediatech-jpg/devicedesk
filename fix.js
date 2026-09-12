const fs = require("fs");
const path = "d:/devicedesk/app/portal/leader/[slug]/page.js";
let lines = fs.readFileSync(path, "utf-8").split("\n");

lines[65] = "      const res = await fetch(`/api/work-submissions/${selectedSub.id}`, {";
lines[184] = "                      href={`/portal/employee/${memSlug}`}";
lines.splice(194, 4, "                      title=\"View Member\"");
lines[199] = "                  <span className=\"role-badge\" style={{ fontSize: \"0.7rem\" }}>";
lines[252] = "                          <span className=\"status-badge\">";

fs.writeFileSync(path, lines.join("\n"));
