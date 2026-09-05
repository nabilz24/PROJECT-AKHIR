// Unit tests — recommendation engine murni (TASK-080).
const { buildRecommendations } = require('../../server/src/services/recommendation');

describe('buildRecommendations', () => {
  test('no-gap tidak menghasilkan rekomendasi', () => {
    const out = buildRecommendations([{ skill_id: 1, name: 'SQL', gap_value: 0, classification: 'no-gap' }]);
    expect(out).toHaveLength(0);
  });

  test('small → 1 course prioritas low', () => {
    const out = buildRecommendations([{ skill_id: 1, name: 'Git', gap_value: 10, classification: 'small' }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'course', priority: 'low' });
    expect(out[0].title).toMatch(/Git/);
    expect(out[0].description).toMatch(/10/);
  });

  test('medium → course + practice-project (medium)', () => {
    const out = buildRecommendations([{ skill_id: 1, name: 'React', gap_value: 25, classification: 'medium' }]);
    expect(out.map((r) => r.type).sort()).toEqual(['course', 'practice-project']);
    expect(new Set(out.map((r) => r.priority))).toEqual(new Set(['medium']));
  });

  test('large → certification + mentor (high); critical → workshop + mentor (high)', () => {
    const large = buildRecommendations([{ skill_id: 1, name: 'A', gap_value: 50, classification: 'large' }]);
    expect(large.map((r) => r.type).sort()).toEqual(['certification', 'mentor']);
    const critical = buildRecommendations([{ skill_id: 2, name: 'B', gap_value: 90, classification: 'critical' }]);
    expect(critical.map((r) => r.type).sort()).toEqual(['mentor', 'workshop']);
    expect(new Set([...large, ...critical].map((r) => r.priority))).toEqual(new Set(['high']));
  });

  test('setiap rekomendasi punya field lengkap + skill target', () => {
    const out = buildRecommendations([{ skill_id: 7, name: 'Docker', gap_value: 45, classification: 'large' }]);
    for (const r of out) {
      expect(r.skill_id).toBe(7);
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.source).toBeTruthy();
    }
  });
});
