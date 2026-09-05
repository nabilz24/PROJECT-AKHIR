// Proficiency level helpers (TASK-031).
// API menerima level numerik 0–100 ATAU kategori (beginner/intermediate/advanced).
// [ASSUMPTION]: pemetaan kategori -> level default (beginner=25, intermediate=55,
// advanced=85) dan level -> kategori (0–33/34–66/67–100). Validasi final oleh
// product owner (PRD [NEEDS DECISION] no. 2 tentang skala proficiency).
const CATEGORY_TO_LEVEL = { beginner: 25, intermediate: 55, advanced: 85 };
const VALID_CATEGORIES = Object.keys(CATEGORY_TO_LEVEL);

function levelToCategory(level) {
  if (level <= 33) return 'beginner';
  if (level <= 66) return 'intermediate';
  return 'advanced';
}

function resolveLevel({ proficiency_level, proficiency_category }) {
  if (proficiency_level !== undefined && proficiency_level !== null) {
    return proficiency_level;
  }
  return CATEGORY_TO_LEVEL[String(proficiency_category).toLowerCase()];
}

module.exports = { VALID_CATEGORIES, levelToCategory, resolveLevel };
