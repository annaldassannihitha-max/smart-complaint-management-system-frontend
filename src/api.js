const BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed: ${response.status}`
    );
  }

  return data;
}

export const api = {
  base: BASE,

  // =====================================================
  // USER LOGIN
  // =====================================================

  userLogin: (pin) =>
    jsonRequest('/api/auth/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin,
      }),
    }),

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  adminLogin: (password) =>
    jsonRequest('/api/auth/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
      }),
    }),

  // =====================================================
  // CREATE COMPLAINT
  // =====================================================

  createComplaint: (form) =>
    jsonRequest('/api/complaints', {
      method: 'POST',
      body: form,
    }),

  // =====================================================
  // ALL COMPLAINTS - ADMIN
  // =====================================================

  allComplaints: () =>
    jsonRequest('/api/complaints'),

  // =====================================================
  // USER'S COMPLAINTS
  // =====================================================

  myComplaints: (userId) =>
    jsonRequest(
      `/api/complaints/user/${encodeURIComponent(userId)}`
    ),

  // =====================================================
  // SINGLE COMPLAINT
  // =====================================================

  getComplaint: (complaintId) =>
    jsonRequest(
      `/api/complaints/${encodeURIComponent(complaintId)}`
    ),

  // =====================================================
  // UPDATE COMPLAINT
  // =====================================================

  updateComplaint: (complaintId, body) =>
    jsonRequest(
      `/api/complaints/${encodeURIComponent(complaintId)}`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(body),
      }
    ),

  // =====================================================
  // PROOF IMAGE URL
  // =====================================================

  proofUrl: (complaintId) =>
    `${BASE}/api/complaints/${encodeURIComponent(
      complaintId
    )}/proof`,
};