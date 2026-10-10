
const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080'


// ============================================================
// CLEAN COMPLAINT ID
// ============================================================

function cleanComplaintId(id) {
  return String(id || '')
    .trim()
    .replace(/[.,;:!?]+$/g, '')
    .trim()
}


// ============================================================
// GENERIC JSON REQUEST
// ============================================================

async function jsonRequest(
  path,
  options = {}
) {

  const response = await fetch(
    `${BASE}${path}`,
    options
  )


  // Try to read JSON response
  const data =
    await response
      .json()
      .catch(() => ({}))


  if (!response.ok) {

    let message =
      data?.message ||
      data?.error ||
      data?.detail


    // Better messages for common errors

    if (!message) {

      if (response.status === 404) {

        message =
          'Complaint not found. Please check the complaint ID.'

      } else if (
        response.status === 400
      ) {

        message =
          'Invalid request. Please check the entered information.'

      } else if (
        response.status === 401
      ) {

        message =
          'Unauthorized request.'

      } else if (
        response.status === 403
      ) {

        message =
          'Access denied.'

      } else if (
        response.status >= 500
      ) {

        message =
          'Server error. Please try again.'

      } else {

        message =
          `Request failed: ${response.status}`
      }
    }


    throw new Error(message)
  }


  return data
}


// ============================================================
// API
// ============================================================

export const api = {

  // ----------------------------------------------------------
  // BASE URL
  // ----------------------------------------------------------

  base: BASE,


  // ----------------------------------------------------------
  // USER LOGIN
  // ----------------------------------------------------------

  userLogin: (pin) =>
    jsonRequest(
      '/api/auth/user',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          pin: String(pin).trim()
        })
      }
    ),


  // ----------------------------------------------------------
  // ADMIN LOGIN
  // ----------------------------------------------------------

  adminLogin: (password) =>
    jsonRequest(
      '/api/auth/admin',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          password:
            String(password).trim()
        })
      }
    ),


  // ----------------------------------------------------------
  // CREATE COMPLAINT
  // ----------------------------------------------------------

  createComplaint: (form) =>
    jsonRequest(
      '/api/complaints',
      {
        method: 'POST',

        /*
         * DO NOT manually set Content-Type here.
         *
         * Browser automatically creates:
         * multipart/form-data
         * with the correct boundary.
         */
        body: form
      }
    ),


  // ----------------------------------------------------------
  // GET ALL COMPLAINTS
  // ----------------------------------------------------------

  allComplaints: () =>
    jsonRequest(
      '/api/complaints'
    ),


  // ----------------------------------------------------------
  // GET ONE COMPLAINT
  // ----------------------------------------------------------

  getComplaint: (id) => {

    const cleanId =
      cleanComplaintId(id)


    if (!cleanId) {

      return Promise.reject(
        new Error(
          'Please enter a complaint ID.'
        )
      )
    }


    return jsonRequest(
      `/api/complaints/${encodeURIComponent(
        cleanId
      )}`
    )
  },


  // ----------------------------------------------------------
  // UPDATE COMPLAINT
  // ----------------------------------------------------------

  updateComplaint: (
    id,
    body
  ) => {

    const cleanId =
      cleanComplaintId(id)


    if (!cleanId) {

      return Promise.reject(
        new Error(
          'Invalid complaint ID.'
        )
      )
    }


    return jsonRequest(
      `/api/complaints/${encodeURIComponent(
        cleanId
      )}`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify(
          body
        )
      }
    )
  },


  // ----------------------------------------------------------
  // PROOF IMAGE URL
  // ----------------------------------------------------------

  proofUrl: (id) => {

    const cleanId =
      cleanComplaintId(id)


    return (
      `${BASE}/api/complaints/` +
      `${encodeURIComponent(cleanId)}` +
      `/proof`
    )
  }

}
