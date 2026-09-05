// Unit tests — gapAnalysis service murni (TASK-070, QA SKILL-001..004).
const { classifyGap, analyzeGaps } = require('../../server/src/services/gapAnalysis');

describe('classifyGap', () => {
  test.each([
    [0, 'no-gap'],
    [1, 'small'],
    [20, 'small'],
    [21, 'medium'],
    [40, 'medium'],
    [41, 'large'],
    [60, 'large'],
    [61, 'critical'],
    [100, 'critical'],
  ])('gap %i → %s', (value, expected) => {
    expect(classifyGap(value)).toBe(expected);
  });
});

describe('analyzeGaps', () => {
  test('SKILL-001: required > student → gap positif + klasifikasi + rekomendasi', () => {
    const { gaps, summary } = analyzeGaps({
      requiredSkills: [{ skill_id: 1, name: 'React', level_required: 80 }],
      studentSkills: [{ skill_id: 1, proficiency_level: 55 }],
    });
    expect(gaps[0].gap_value).toBe(25);
    expect(gaps[0].classification).toBe('medium');
    expect(gaps[0].recommendation.type).toBe('course');
    expect(gaps[0].recommendation.title).toMatch(/React/);
    expect(summary.total).toBe(1);
    expect(summary.counts.medium).toBe(1);
  });

  test('SKILL-002/003: equal & surplus → gap 0 no-gap', () => {
    const { gaps } = analyzeGaps({
      requiredSkills: [
        { skill_id: 1, name: 'A', level_required: 60 },
        { skill_id: 2, name: 'B', level_required: 50 },
      ],
      studentSkills: [
        { skill_id: 1, proficiency_level: 60 },
        { skill_id: 2, proficiency_level: 90 },
      ],
    });
    expect(gaps.every((g) => g.gap_value === 0 && g.classification === 'no-gap')).toBe(true);
  });

  test('SKILL-004: skill tak dimiliki → gap = required + rekomendasi dasar', () => {
    const { gaps } = analyzeGaps({
      requiredSkills: [{ skill_id: 9, name: 'Python', level_required: 90 }],
      studentSkills: [],
    });
    expect(gaps[0].current).toBe(0);
    expect(gaps[0].gap_value).toBe(90);
    expect(gaps[0].classification).toBe('critical');
  });

  test('summary: counts + avg_gap + worst terurut', () => {
    const { summary } = analyzeGaps({
      requiredSkills: [
        { skill_id: 1, name: 'A', level_required: 80 },
        { skill_id: 2, name: 'B', level_required: 50 },
        { skill_id: 3, name: 'C', level_required: 30 },
      ],
      studentSkills: [
        { skill_id: 1, proficiency_level: 55 },
        { skill_id: 2, proficiency_level: 50 },
        { skill_id: 3, proficiency_level: 0 },
      ],
    });
    expect(summary.counts).toEqual({ 'no-gap': 1, small: 0, medium: 2, large: 0, critical: 0 });
    expect(summary.avg_gap).toBe(18.3);
    expect(summary.worst[0].name).toBe('C');
  });
});
