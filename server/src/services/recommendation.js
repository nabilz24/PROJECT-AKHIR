// Recommendation Engine — rule-based dari skill gap (TASK-080, PRD Recommendation).
//
// Aturan: tiap gap non-no-gap menghasilkan rekomendasi sesuai klasifikasi:
//   small    -> 1 course (low)
//   medium   -> 1 course + 1 practice-project (medium)
//   large    -> 1 certification + 1 mentor (high)
//   critical -> 1 workshop + 1 mentor (high)
//
// [ASSUMPTION]: durasi estimasi & sumber generik di bawah adalah placeholder.
// Katalog kurasi (judul kursus nyata + link) menunggu keputusan konten
// ([NEEDS DECISION] PRD item 4: rule-based manual vs AI/ML lanjutan —
// engine ini rule-based manual sesuai AGENTS.md aturan 6).
const RULES = {
  small: [
    { type: 'course', priority: 'low', duration: '1–2 minggu', source: 'Platform kursus online (Coursera, Udemy, Dicoding)' },
  ],
  medium: [
    { type: 'course', priority: 'medium', duration: '3–4 minggu', source: 'Platform kursus online (Coursera, Udemy, Dicoding)' },
    { type: 'practice-project', priority: 'medium', duration: '2–3 minggu', source: 'Project mini internal / micro-project kampus' },
  ],
  large: [
    { type: 'certification', priority: 'high', duration: '1–3 bulan', source: 'Lembaga sertifikasi industri' },
    { type: 'mentor', priority: 'high', duration: '4 sesi bimbingan', source: 'Dosen/mentor kampus' },
  ],
  critical: [
    { type: 'workshop', priority: 'high', duration: '1–2 minggu intensif', source: 'Workshop internal kampus / eksternal' },
    { type: 'mentor', priority: 'high', duration: '4 sesi bimbingan', source: 'Dosen/mentor kampus' },
  ],
};

function titleFor(type, skillName) {
  const titles = {
    course: `Course: ${skillName}`,
    workshop: `Workshop intensif: ${skillName}`,
    certification: `Sertifikasi: ${skillName}`,
    'practice-project': `Practice project: ${skillName}`,
    mentor: `Mentor: ${skillName}`,
  };
  return titles[type] || `${type}: ${skillName}`;
}

// Input: gaps ala analyzeGaps (abaikan classification 'no-gap').
// Output: [{ skill_id, type, title, description, priority, source }]
function buildRecommendations(gaps) {
  const out = [];
  for (const g of gaps) {
    if (!g || g.classification === 'no-gap') continue;
    const rules = RULES[g.classification] || [];
    for (const r of rules) {
      out.push({
        skill_id: g.skill_id,
        type: r.type,
        title: titleFor(r.type, g.name),
        description: `Menutup gap ${g.gap_value} poin (${g.classification}) pada skill ${g.name}. Estimasi ${r.duration}.`,
        priority: r.priority,
        source: r.source,
      });
    }
  }
  return out;
}

module.exports = { RULES, titleFor, buildRecommendations };
