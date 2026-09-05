// Project helpers (Phase 4).

function fetchProjectFull(db, projectId) {
  const project = db
    .prepare(
      `SELECT p.*, c.nama_perusahaan, c.industri AS company_industri, c.logo AS company_logo
       FROM projects p JOIN companies c ON c.id = p.company_id
       WHERE p.id = ? AND p.deleted_at IS NULL`
    )
    .get(projectId);
  if (!project) return null;
  const skills = db
    .prepare(
      `SELECT ps.skill_id, s.name, s.category, ps.level_required
       FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
       WHERE ps.project_id = ? ORDER BY s.name`
    )
    .all(projectId);
  const { nama_perusahaan, company_industri, company_logo, ...rest } = project;
  return {
    ...rest,
    company: { id: project.company_id, nama_perusahaan, industri: company_industri, logo: company_logo },
    skills,
  };
}

module.exports = { fetchProjectFull };
