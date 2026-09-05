// Talent Match Score — rule-based formula (TASK-060, PRD Talent Matching).
//
//   Match Score = Skill 50% + Experience 20% + Portfolio 10% + Certification 10% + Availability 10%
//
// [NEEDS DECISION] (PRD item 1): bobot di atas adalah proposal MVP. Sistem
// menyimpan bobot sebagai konstanta bernama agar mudah di-tunable admin di
// masa depan; setiap respons menyertakan `weights` yang dipakai.
const MATCH_WEIGHTS = {
  skill: 0.5,
  experience: 0.2,
  portfolio: 0.1,
  certification: 0.1,
  availability: 0.1,
};

// Ambang status per-skill untuk breakdown (TASK-062: kuat/close/lemah).
// [ASSUMPTION]: close bila level >= 60% requirement; warna hijau/kuning/merah
// dirender di frontend Phase 10, API mengembalikan status string.
const CLOSE_RATIO = 0.6;

// [ASSUMPTION] definisi availability (PRD [NEEDS DECISION] item 6):
// mahasiswa aktif dengan <= 2 aplikasi pending/accepted = tersedia penuh.
function availabilityScore(activeApplications) {
  if (activeApplications <= 2) return 100;
  if (activeApplications <= 4) return 60;
  return 20;
}

function backingSource(studentSkillsById, skillId, source) {
  const s = studentSkillsById.get(skillId);
  return !!s && s.source === source;
}

// Input:
//   requiredSkills: [{ skill_id, name, level_required }]
//   studentSkills:  [{ skill_id, proficiency_level, source }]
//   portfolioUrl: string|null (dari application saat mendaftar)
//   portfolioCount: jumlah item portfolios (tabel opsional, forward-compat)
//   activeApplications: jumlah aplikasi pending/accepted mahasiswa
// Output: { score 0–100, components, breakdown[], weights }
function calculateMatchScore({ requiredSkills = [], studentSkills = [], portfolioUrl = null, portfolioCount = 0, activeApplications = 0 }) {
  const byId = new Map(studentSkills.map((s) => [s.skill_id, s]));

  const breakdown = requiredSkills.map((r) => {
    const mine = byId.get(r.skill_id);
    const current = mine ? mine.proficiency_level : 0;
    const ratio = r.level_required > 0 ? current / r.level_required : 1;
    const status = ratio >= 1 ? 'kuat' : ratio >= CLOSE_RATIO ? 'close' : 'lemah';
    return {
      skill_id: r.skill_id,
      name: r.name,
      required: r.level_required,
      current,
      gap: Math.max(0, r.level_required - current), // QA: current > required -> gap 0
      ratio: Math.round(Math.min(ratio, 1) * 100) / 100,
      status,
    };
  });

  // Skill Match: rata-rata min(S/R, 1) — over-qualified dihitung penuh.
  // Tanpa requirement: 100 (vacuous match).
  const skill =
    requiredSkills.length === 0
      ? 100
      : (breakdown.reduce((sum, b) => sum + Math.min(b.required > 0 ? b.current / b.required : 1, 1), 0) / requiredSkills.length) * 100;

  // Experience: proporsi requirement yang didukung source 'experience'.
  const experience =
    requiredSkills.length === 0
      ? 0
      : (requiredSkills.filter((r) => backingSource(byId, r.skill_id, 'experience')).length / requiredSkills.length) * 100;

  // Portfolio: URL saat apply = 100; item portfolio = 70; tanpa keduanya = 0.
  const portfolio = portfolioUrl ? 100 : portfolioCount > 0 ? 70 : 0;

  // Certification: proporsi requirement yang didukung source 'certification'.
  const certification =
    requiredSkills.length === 0
      ? 0
      : (requiredSkills.filter((r) => backingSource(byId, r.skill_id, 'certification')).length / requiredSkills.length) * 100;

  const availability = availabilityScore(activeApplications);

  const raw = {
    skill,
    experience,
    portfolio,
    certification,
    availability,
  };
  const score = Math.round(
    raw.skill * MATCH_WEIGHTS.skill +
      raw.experience * MATCH_WEIGHTS.experience +
      raw.portfolio * MATCH_WEIGHTS.portfolio +
      raw.certification * MATCH_WEIGHTS.certification +
      raw.availability * MATCH_WEIGHTS.availability
  );
  const components = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round(v)]));

  return { score, components, breakdown, weights: { ...MATCH_WEIGHTS } };
}

module.exports = { MATCH_WEIGHTS, CLOSE_RATIO, availabilityScore, calculateMatchScore };
