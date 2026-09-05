// Unit tests — password helpers (TASK-010, G_DESIGN security).
const { meetsPasswordPolicy, hashPassword, comparePassword } = require('../../server/src/utils/password');

describe('meetsPasswordPolicy', () => {
  test('menerima password kuat (huruf+angka+spesial, ≥8)', () => {
    expect(meetsPasswordPolicy('S3cret!pass')).toBe(true);
  });

  test('menolak password pendek / tanpa angka / tanpa spesial', () => {
    expect(meetsPasswordPolicy('Ab1!')).toBe(false);
    expect(meetsPasswordPolicy('Password!x')).toBe(false);
    expect(meetsPasswordPolicy('Password12')).toBe(false);
    expect(meetsPasswordPolicy('12345678!')).toBe(false);
  });
});

describe('hashPassword & comparePassword', () => {
  test('hash terverifikasi benar, salah ditolak', async () => {
    const hash = await hashPassword('S3cret!pass');
    expect(hash).not.toBe('S3cret!pass');
    expect(await comparePassword('S3cret!pass', hash)).toBe(true);
    expect(await comparePassword('Wr0ng!pass', hash)).toBe(false);
  });
});
