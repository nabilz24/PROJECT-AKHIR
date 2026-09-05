// Role-based dashboard mapping (TASK-021).
// Frontend mengarahkan user setelah login ke URL ini (lihat DESIGN.md IA).
const DASHBOARD_URLS = {
  mahasiswa: '/dashboard/student',
  perusahaan: '/dashboard/company',
  kampus: '/dashboard/campus',
  dosen: '/dashboard/mentor', // TASK-021: dashboard standar dengan opsi bimbingan
};

function getDashboardUrl(role) {
  return DASHBOARD_URLS[role] || '/dashboard';
}

module.exports = { DASHBOARD_URLS, getDashboardUrl };
