/**
 * Helper utilities to generate and resolve slugs across all components.
 */

// Employee / User slug
export function getEmployeeSlug(emp) {
  if (!emp) return '';
  if (emp.slug) return emp.slug;
  const baseName = (emp.name || emp.username || (emp.email ? emp.email.split('@')[0] : '') || 'user')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `${baseName}-${emp.id}`;
}

export function findEmployeeBySlug(employees, slug) {
  if (!employees || !slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase();
  return employees.find(emp => {
    if (!emp) return false;
    const empSlug = getEmployeeSlug(emp).toLowerCase();
    return empSlug === decoded || String(emp.id) === slug || (emp.email && emp.email.toLowerCase() === decoded);
  }) || null;
}

// Department slug
export function getDepartmentSlug(dept) {
  if (!dept) return '';
  const name = typeof dept === 'string' ? dept : (dept.name || dept.department || '');
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function findDepartmentBySlug(departments, slug) {
  if (!departments || !slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase();
  return departments.find(d => {
    if (!d) return false;
    const deptSlug = getDepartmentSlug(d).toLowerCase();
    const deptName = (typeof d === 'string' ? d : d.name || '').toLowerCase();
    return deptSlug === decoded || deptName === decoded || String(d.id) === slug;
  }) || null;
}

// Hardware System slug
export function getSystemSlug(sys) {
  if (!sys) return '';
  const num = sys.systemNumber || sys.id || 'system';
  return String(num)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function findSystemBySlug(systems, slug) {
  if (!systems || !slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase();
  return systems.find(s => {
    if (!s) return false;
    const sysSlug = getSystemSlug(s).toLowerCase();
    return sysSlug === decoded || String(s.systemNumber).toLowerCase() === decoded || String(s.id) === slug;
  }) || null;
}

// Task slug
export function getTaskSlug(task) {
  if (!task) return '';
  const title = (task.title || 'task')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `${title}-${task.id}`;
}

export function findTaskBySlug(tasks, slug) {
  if (!tasks || !slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase();
  return tasks.find(t => {
    if (!t) return false;
    const taskSlug = getTaskSlug(t).toLowerCase();
    return taskSlug === decoded || String(t.id) === slug;
  }) || null;
}


