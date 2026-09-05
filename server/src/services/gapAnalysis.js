// Skill Gap Analysis — pure functions (TASK-070, PRD Skill Gap Analysis).
//
//   gap = max(0, required_level - student_level)
//   Klasifikasi: 0 = no-gap, 1–20 = small, 21–40 = medium, 41–60 = large, >60 = critical
//
// [NEEDS DECISION] (PRD item 3): batas klasifikasi mengikuti angka TASK-070/071.
// Rekomendasi aksi per klasifikasi mengikuti tabel PRD; engine rekomendasi penuh
// (katalog course/workshop nyata) dibangun di Phase 8 (TASK-080).
const GAP_CLASSIFICATION = [
  { max: 0, key: 'no-gap' },
  { max: 20, key: 'small' },
  { max: 40, key: 'medium' },
  { max: 60, key: 'large' },
  { max: 100, key: 'critical' },
];

const ACTION_BY_CLASSIFICATION = {
  'no-gap': { type: 'practice-project', title: (s) => `Lanjutkan ke project langsung — ${s} sudah kompeten` },
  small: { type: 'course', title: (s) => `Course/workshop pendek: ${s}` },
  medium: { type: 'course', title: (s) => `Course + practice project: ${s}` },
  large: { type: 'certification', title: (s) => `Sertifikasi + mentor: ${s}` },
  critical: { type: 'workshop', title: (s) => `Intensive training: ${s}` },
};

function classifyGap(gapValue) {
  const v = Math.max(0, Math.min(100, Math.round(gapValue)));
  return GAP_CLASSIFICATION.find((c) => v <= c.max).key;
}

// Input:
//   requiredSkills: [{ skill_id, name, level_required }]
//   studentSkills:  [{ skill_id, proficiency_level }]
// Output: { gaps: [{skill_id, name, required, current, gap_value, classification, recommendation}], summary }
function analyzeGaps({ requiredSkills = [], studentSkills = [] }) {
  const byId = new Map(studentSkills.map((s) => [s.skill_id, s.proficiency_level]));
  const gaps = requiredSkills.map((r) => {
    const current = byId.has(r.skill_id) ? byId.get(r.skill_id) : 0;
    const gapValue = Math.max(0, r.level_required - current); // QA SKILL-003: negatif -> 0
    const classification = classifyGap(gapValue);
    const action = ACTION_BY_CLASSIFICATION[classification];
    return {
      skill_id: r.skill_id,
      name: r.name,
      required: r.level_required,
      current,
      gap_value: gapValue,
      classification,
      recommendation: { type: action.type, title: action.title(r.name), source: null },
    };
  });
  const counts = { 'no-gap': 0, small: 0, medium: 0, large: 0, critical: 0 };
  for (const g of gaps) {
    counts[g.classification] += 1;
  }
  const summary = {
    total: gaps.length,
    counts,
    avg_gap: gaps.length === 0 ? 0 : Math.round((gaps.reduce((s, g) => s + g.gap_value, 0) / gaps.length) * 10) / 10,
    worst: [...gaps].sort((a, b) => b.gap_value - a.gap_value).slice(0, 3),
  };
  return { gaps, summary };
}

module.exports = { GAP_CLASSIFICATION, ACTION_BY_CLASSIFICATION, classifyGap, analyzeGaps };
