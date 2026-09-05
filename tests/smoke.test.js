// Smoke test — Phase 0 (TASK-001/002) verification
// Validates that the test runner and basic environment work

describe('Phase 0 — Repository Foundation Smoke Tests', () => {
  test('Jest test runner executes', () => {
    expect(true).toBe(true);
  });

  test('Node.js version is >= 20', () => {
    const major = parseInt(process.version.slice(1).split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  test('Required dependencies are installed', () => {
    // Core runtime deps
    expect(() => require('express')).not.toThrow();
    expect(() => require('better-sqlite3')).not.toThrow();
    expect(() => require('bcrypt')).not.toThrow();
    expect(() => require('jsonwebtoken')).not.toThrow();
    expect(() => require('express-validator')).not.toThrow();
    expect(() => require('express-rate-limit')).not.toThrow();
    expect(() => require('cors')).not.toThrow();
  });

  test('Package.json has required scripts', () => {
    const pkg = require('../package.json');
    expect(pkg.scripts).toHaveProperty('dev');
    expect(pkg.scripts).toHaveProperty('start');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('db:migrate');
    expect(pkg.scripts).toHaveProperty('db:seed');
    expect(pkg.scripts).toHaveProperty('lint');
  });

  test('All 8 core documentation files exist in root', () => {
    const fs = require('fs');
    const docs = [
      'PRD.md',
      'G_DESIGN.md',
      'DESIGN.md',
      'TASK.md',
      'QA.md',
      'AGENTS.md',
      'database.md',
      'api.md'
    ];
    docs.forEach(doc => {
      expect(fs.existsSync(doc)).toBe(true);
    });
  });

  test('TECH_STACK.md exists (9th doc)', () => {
    const fs = require('fs');
    expect(fs.existsSync('TECH_STACK.md')).toBe(true);
  });

  test('README.md exists', () => {
    const fs = require('fs');
    expect(fs.existsSync('README.md')).toBe(true);
  });

  test('.gitignore exists and ignores node_modules', () => {
    const fs = require('fs');
    expect(fs.existsSync('.gitignore')).toBe(true);
    const content = fs.readFileSync('.gitignore', 'utf8');
    expect(content).toContain('node_modules/');
  });

  test('GitHub Actions CI workflow exists', () => {
    const fs = require('fs');
    expect(fs.existsSync('.github/workflows/ci.yml')).toBe(true);
  });
});