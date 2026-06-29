export const roleLabel = (role?: string) => {
  const labels: Record<string, string> = {
    PATIENT: 'Pasien',
    DOCTOR: 'Dokter',
    ADMIN: 'Admin',
    AUDITOR: 'Auditor',
  };
  return role ? labels[role] || role : '-';
};

export const statusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    active: 'Aktif',
    ACTIVE: 'Aktif',
    limited: 'Dibatasi',
    LIMITED: 'Dibatasi',
    revoked: 'Dicabut',
    REVOKED: 'Dicabut',
    expired: 'Kedaluwarsa',
    EXPIRED: 'Kedaluwarsa',
    allowed: 'Diizinkan',
    ALLOWED: 'Diizinkan',
    denied: 'Ditolak',
    DENIED: 'Ditolak',
    pending: 'Menunggu',
    PENDING: 'Menunggu',
    completed: 'Selesai',
    COMPLETED: 'Selesai',
    verified: 'Terverifikasi',
    VERIFIED: 'Terverifikasi',
    failed: 'Gagal',
    FAILED: 'Gagal',
    ENROLLED: 'Terdaftar',
  };
  return status ? labels[status] || status.replace('_', ' ') : '-';
};

export const purposeLabel = (purpose?: string) => {
  const labels: Record<string, string> = {
    treatment: 'Perawatan',
    consultation: 'Konsultasi',
    follow_up: 'Kontrol lanjutan',
  };
  return purpose ? labels[purpose] || purpose.replace('_', ' ') : '-';
};

export const scopeLabel = (scope?: string) => {
  const labels: Record<string, string> = {
    full_ehr: 'Rekam medis lengkap',
    diagnosis: 'Diagnosis saja',
    lab_results: 'Hasil lab',
  };
  return scope ? labels[scope] || scope.replace('_', ' ') : '-';
};

export const actionLabel = (action?: string) => {
  const labels: Record<string, string> = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    GRANT_CONSENT: 'Memberi persetujuan',
    LIMIT_CONSENT: 'Membatasi persetujuan',
    REVOKE_CONSENT: 'Mencabut persetujuan',
    ACCESS_EHR: 'Akses rekam medis',
    CREATE_USER: 'Membuat user',
    UPDATE_USER: 'Mengubah user',
    DELETE_USER: 'Menghapus user',
    CREATE_EHR: 'Membuat rekam medis',
    UPDATE_EHR: 'Mengubah rekam medis',
  };
  return action ? labels[action] || action.replace('_', ' ') : '-';
};

export const serviceLabel = (value?: string) => {
  const labels: Record<string, string> = {
    ok: 'normal',
    connected: 'terhubung',
    disconnected: 'terputus',
    unavailable: 'tidak tersedia',
  };
  return value ? labels[value] || value : '-';
};
