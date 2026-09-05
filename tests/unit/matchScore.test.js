// Unit tests — matchScore service murni (TASK-060).
const { MATCH_WEIGHTS, availabilityScore, calculateMatchScore } = require('../../server/src/services/matchScore');

describe('MATCH_WEIGHTS', () => {
  test('bobot proposal 50/20/10/10/10 berjumlah 1', () => {
    expect(MATCH_WEIGHTS).toEqual({ skill: 0.5, experience: 0.2, portfolio: 0.1, certification: 0.1, availability: 0.1 });
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });
});

describe('availabilityScore', () => {
  test('0–2 aktif → 100; 3–4 → 60; 5+ → 20', () => {
    expect(availabilityScore(0)).toBe(100);
    expect(availabilityScore(2)).toBe(100);
    expect(availabilityScore(3)).toBe(60);
    expect(availabilityScore(5)).toBe(20);
  });
});

describe('calculateMatchScore', () => {
  const required = [
    { skill_id: 1, name: 'React', level_required: 80 },
    { skill_id: 2, name: 'Node.js', level_required: 60 },
  ];

  test('kandidat kuat: skill penuh + experience + portfolio + tersedia = 80', () => {
    const result = calculateMatchScore({
      requiredSkills: required,
      studentSkills: [
        { skill_id: 1, proficiency_level: 90, source: 'course' },
        { skill_id: 2, proficiency_level: 70, source: 'experience' },
      ],
      portfolioUrl: 'https://github.com/x/demo',
      activeApplications: 0,
    });
    expect(result.score).toBe(80);
    expect(result.components).toEqual({ skill: 100, experience: 50, portfolio: 100, certification: 0, availability: 100 });
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].status).toBe('kuat');
  });

  test('over-qualified di-cap penuh; missing skill gap = required, status lemah', () => {
    const result = calculateMatchScore({
      requiredSkills: required,
      studentSkills: [{ skill_id: 1, proficiency_level: 100, source: 'course' }],
      activeApplications: 0,
    });
    expect(result.components.skill).toBe(50); // avg(1, 0)
    const missing = result.breakdown.find((b) => b.skill_id === 2);
    expect(missing.current).toBe(0);
    expect(missing.gap).toBe(60);
    expect(missing.status).toBe('lemah');
  });

  test('current > required → gap 0 (No Gap)', () => {
    const result = calculateMatchScore({
      requiredSkills: [{ skill_id: 1, name: 'React', level_required: 50 }],
      studentSkills: [{ skill_id: 1, proficiency_level: 90, source: 'course' }],
      activeApplications: 0,
    });
    expect(result.breakdown[0].gap).toBe(0);
    expect(result.breakdown[0].status).toBe('kuat');
  });

  test('status close pada 60–99% requirement', () => {
    const result = calculateMatchScore({
      requiredSkills: [{ skill_id: 1, name: 'React', level_required: 100 }],
      studentSkills: [{ skill_id: 1, proficiency_level: 70, source: 'course' }],
      activeApplications: 0,
    });
    expect(result.breakdown[0].status).toBe('close');
    expect(result.breakdown[0].ratio).toBe(0.7);
  });

  test('tanpa requirement: skill 100, skor dari komponen lain', () => {
    const result = calculateMatchScore({ requiredSkills: [], studentSkills: [], activeApplications: 0 });
    expect(result.components.skill).toBe(100);
    expect(result.score).toBe(60); // 50 + 0 + 0 + 0 + 10
  });

  test('skor selalu 0–100 dan menyertakan weights', () => {
    const result = calculateMatchScore({
      requiredSkills: required,
      studentSkills: [],
      activeApplications: 9,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weights).toEqual(MATCH_WEIGHTS);
  });
});
