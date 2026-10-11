import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from './api';
import './styles.css';
const USER_PIN = '1234';

function LocationMap({ value, onChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [detecting, setDetecting] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const redIcon = L.divIcon({
    className: 'custom-location-marker',
    html: `
      <div style="
        width:24px;
        height:24px;
        background:#ef4444;
        border:4px solid white;
        border-radius:50%;
        box-shadow:0 4px 14px rgba(239,68,68,.55);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        return '';
      }

      const data = await response.json();
      return data.display_name || '';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return '';
    }
  };

  const updateLocation = async (latitude, longitude, automatic = false) => {
    if (!mapInstanceRef.current) {
      return;
    }

    const map = mapInstanceRef.current;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    markerRef.current = L.marker(
      [latitude, longitude],
      { icon: redIcon }
    )
      .addTo(map)
      .bindPopup('Complaint Location')
      .openPopup();

    map.setView([latitude, longitude], 16);

    const address = await reverseGeocode(latitude, longitude);

    onChange({
      latitude,
      longitude,
      address,
    });

    setLocationMessage(
      automatic
        ? 'Your current location has been detected.'
        : 'Complaint location selected.'
    );
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Geolocation is not supported by this browser.'
      );
      return;
    }

    setDetecting(true);
    setLocationMessage('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          true
        );

        setDetecting(false);
      },
      (error) => {
        console.error('Location error:', error);

        setDetecting(false);

        setLocationMessage(
          'Unable to detect location. Please allow location permission.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: [
        value?.latitude || 17.385,
        value?.longitude || 78.4867,
      ],
      zoom: value?.latitude ? 16 : 12,
    });

    mapInstanceRef.current = map;

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; OpenStreetMap contributors',
      }
    ).addTo(map);

    map.on('click', async (event) => {
      await updateLocation(
        event.latlng.lat,
        event.latlng.lng,
        false
      );
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      value?.latitude != null &&
      value?.longitude != null &&
      mapInstanceRef.current
    ) {
      const map = mapInstanceRef.current;

      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      markerRef.current = L.marker(
        [value.latitude, value.longitude],
        { icon: redIcon }
      ).addTo(map);

      map.setView(
        [value.latitude, value.longitude],
        16
      );
    }
  }, [value?.latitude, value?.longitude]);

  return (
    <div className="location-wrapper">

      <div className="location-toolbar">
        <div>
          <strong>Complaint Location</strong>

          <div className="location-help">
            Click on the map or use your current location.
          </div>
        </div>

        <button
          type="button"
          className="location-button"
          onClick={locateUser}
          disabled={detecting}
        >
          {detecting
            ? 'DETECTING...'
            : '📍 USE MY LOCATION'}
        </button>
      </div>

      <div
        ref={mapRef}
        className="complaint-map"
      />

      {locationMessage && (
        <div className="location-message">
          {locationMessage}
        </div>
      )}

      {value?.latitude != null &&
        value?.longitude != null && (
          <div className="coordinates">
            <span>
              Latitude: {Number(value.latitude).toFixed(6)}
            </span>

            <span>
              Longitude: {Number(value.longitude).toFixed(6)}
            </span>
          </div>
        )}

      {value?.address && (
        <div className="address-box">
          <strong>Address:</strong>
          <br />
          {value.address}
        </div>
      )}
    </div>
  );
}

function App() {
  const [page, setPage] = useState('login');
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const [userPin, setUserPin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [message, setMessage] = useState('');

  const [proof, setProof] = useState(null);
  const [proofPreview, setProofPreview] = useState('');

  const [location, setLocation] = useState({});

  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [loading, setLoading] = useState(false);

  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('ALL');

  const [staffName, setStaffName] = useState('');

  const getUserId = () => {
    let userId = localStorage.getItem(
      'smartComplaintUserId'
    );

    if (!userId) {
      userId =
        `USER-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      localStorage.setItem(
        'smartComplaintUserId',
        userId
      );
    }

    return userId;
  };

  const loadMyComplaints = async () => {
    try {
      setLoading(true);

      const userId = getUserId();

      const data = await api.myComplaints(userId);

      setComplaints(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          'Unable to load your complaints.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAllComplaints = async () => {
    try {
      setLoading(true);

      const data = await api.allComplaints();

      setComplaints(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          'Unable to load complaints.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = (event) => {
    event.preventDefault();
    setMessage('');

    if (userPin !== USER_PIN) {
      setMessage(
        'Invalid user PIN. Please try again.'
      );
      return;
    }

    getUserId();

    setUserLoggedIn(true);
    setUserPin('');
    setPage('user');
    loadMyComplaints();
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      setLoading(true);

      await api.adminLogin(adminPassword);

      setAdminLoggedIn(true);
      setAdminPassword('');
      setPage('admin');

      await loadAllComplaints();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          'Invalid admin password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserLoggedIn(false);
    setAdminLoggedIn(false);
    setPage('login');
    setMessage('');
    setComplaints([]);
  };

  const handleProofChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setProof(null);
      setProofPreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage(
        'Please select an image file.'
      );

      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(
        'Proof image must be smaller than 10 MB.'
      );

      event.target.value = '';
      return;
    }

    setProof(file);
    setProofPreview(
      URL.createObjectURL(file)
    );

    setMessage('');
  };

  const submit = async (event) => {
  event.preventDefault();
  setMessage('');

  // IMPORTANT: save the form element before any await
  const formElement = event.currentTarget;

  try {
    const form = new FormData(formElement);

    let userId = localStorage.getItem('smartComplaintUserId');

    if (!userId) {
      userId = `USER-${crypto.randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;

      localStorage.setItem(
        'smartComplaintUserId',
        userId
      );
    }

    form.set('userId', userId);

    const type = String(
      form.get('type') || ''
    ).trim();

    const description = String(
      form.get('description') || ''
    ).trim();

    if (!type) {
      setMessage('Please select a complaint type.');
      return;
    }

    if (!description) {
      setMessage(
        'Please enter a complaint description.'
      );
      return;
    }

    form.set('type', type);
    form.set('description', description);

    if (proof instanceof File) {
      form.set('proof', proof);
    }

    if (
      location &&
      location.latitude != null &&
      location.longitude != null
    ) {
      form.set(
        'latitude',
        String(location.latitude)
      );

      form.set(
        'longitude',
        String(location.longitude)
      );

      form.set(
        'address',
        location.address || ''
      );
    }

    const response =
      await api.createComplaint(form);

    if (!response?.complaintId) {
      throw new Error(
        'Complaint was not created. Please try again.'
      );
    }

    setMessage(
      `Complaint submitted successfully! Your Complaint ID is ${response.complaintId}`
    );

    // Reset using the saved reference
    if (formElement) {
      formElement.reset();
    }

    setProof(null);
    setLocation({});

    if (
      typeof loadMyComplaints === 'function'
    ) {
      await loadMyComplaints();
    }

  } catch (error) {
    console.error(
      'Complaint submission error:',
      error
    );

    setMessage(
      error.message ||
        'Unable to submit complaint. Please try again.'
    );
  }
};

  const trackComplaint = async (complaintId) => {
    try {
      setLoading(true);

      const data =
        await api.getComplaint(
          complaintId
        );

      setSelectedComplaint(data);

    } catch (error) {
      setMessage(
        error.message ||
          'Unable to find complaint.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateComplaint = async (
    complaintId,
    status,
    assignedStaff
  ) => {
    try {
      setLoading(true);

      await api.updateComplaint(
        complaintId,
        {
          status,
          assignedStaff,
        }
      );

      setMessage(
        'Complaint updated successfully.'
      );

      await loadAllComplaints();

    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          'Unable to update complaint.'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredAdminComplaints =
    complaints.filter((complaint) => {
      const search =
        adminSearch.toLowerCase();

      const matchesSearch =
        !search ||
        complaint.complaintId
          ?.toLowerCase()
          .includes(search) ||
        complaint.type
          ?.toLowerCase()
          .includes(search) ||
        complaint.description
          ?.toLowerCase()
          .includes(search) ||
        complaint.contact
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        adminFilter === 'ALL' ||
        complaint.status === adminFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  const totalComplaints =
    complaints.length;

  const pendingComplaints =
    complaints.filter(
      (c) => c.status === 'PENDING'
    ).length;

  const progressComplaints =
    complaints.filter(
      (c) => c.status === 'IN_PROGRESS'
    ).length;

  const resolvedComplaints =
    complaints.filter(
      (c) => c.status === 'RESOLVED'
    ).length;

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(
          proofPreview
        );
      }
    };
  }, [proofPreview]);

  if (page === 'login') {
    return (
      <div className="app-shell login-shell">

        <div className="floating-orb orb-one" />
        <div className="floating-orb orb-two" />
        <div className="floating-orb orb-three" />

        <div className="login-card">

          <div className="brand-icon">
            🛡️
          </div>

          <div className="brand-title">
            SMART COMPLAINT
          </div>

          <div className="brand-subtitle">
            MANAGEMENT SYSTEM
          </div>

          <p className="login-description">
            Register, track and manage public
            complaints with complete transparency.
          </p>

          {message && (
            <div className="message error-message">
              {message}
            </div>
          )}

          <form
            onSubmit={handleUserLogin}
            className="login-form"
          >

            <label>
              USER PIN
            </label>

            <input
              type="password"
              maxLength="4"
              value={userPin}
              onChange={(event) =>
                setUserPin(
                  event.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="Enter 4-digit PIN"
            />

            <button
              className="primary-button"
              type="submit"
            >
              ENTER USER PORTAL →
            </button>

          </form>

          <div className="login-divider">
            OR
          </div>

          <button
            className="secondary-button"
            onClick={() => {
              setMessage('');
              setPage('adminLogin');
            }}
          >
            👨‍💼 ADMIN PORTAL
          </button>

          <div className="demo-info">
            User demo PIN: <strong>1234</strong>
          </div>

        </div>
      </div>
    );
  }

  if (page === 'adminLogin') {
    return (
      <div className="app-shell admin-login-shell">

        <div className="glass-login-card">

          <div className="admin-logo">
            👨‍💼
          </div>

          <h1>
            ADMIN CONSOLE
          </h1>

          <p>
            Secure complaint management portal
          </p>

          {message && (
            <div className="message error-message">
              {message}
            </div>
          )}

          <form
            onSubmit={handleAdminLogin}
            className="login-form"
          >

            <label>
              ADMIN PASSWORD
            </label>

            <input
              type="password"
              value={adminPassword}
              onChange={(event) =>
                setAdminPassword(
                  event.target.value
                )
              }
              placeholder="Enter admin password"
            />

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'AUTHENTICATING...'
                : 'ACCESS ADMIN CONSOLE →'}
            </button>

          </form>

          <button
            className="back-button"
            onClick={() => {
              setMessage('');
              setPage('login');
            }}
          >
            ← BACK TO LOGIN
          </button>

        </div>
      </div>
    );
  }

  if (
    page === 'user' &&
    userLoggedIn
  ) {
    return (
      <div className="app-shell">

        <header className="top-header">

          <div>
            <div className="header-brand">
              SMART COMPLAINT
            </div>

            <div className="header-small">
              CITIZEN PORTAL
            </div>
          </div>

          <div className="header-actions">

            <button
              onClick={() => {
                setPage('user');
                loadMyComplaints();
              }}
            >
              MY COMPLAINTS
            </button>

            <button
              onClick={() => {
                setMessage('');
                setPage('submit');
              }}
            >
              + NEW COMPLAINT
            </button>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              LOGOUT
            </button>

          </div>

        </header>

        <main className="user-dashboard">

          <section className="hero-section">

            <div>
              <div className="eyebrow">
                CITIZEN SERVICES
              </div>

              <h1>
                Your voice.
                <br />
                Your complaint.
                <br />
                Your city.
              </h1>

              <p>
                Submit public complaints, attach
                proof, share your location and
                track every update.
              </p>

              <button
                className="big-action-button"
                onClick={() => {
                  setMessage('');
                  setPage('submit');
                }}
              >
                FILE A COMPLAINT →
              </button>
            </div>

            <div className="hero-card">
              <div className="hero-card-number">
                {totalComplaints}
              </div>

              <div>
                TOTAL COMPLAINTS
              </div>

              <div className="hero-card-line" />

              <div className="hero-status">
                <span>
                  PENDING
                  <strong>
                    {pendingComplaints}
                  </strong>
                </span>

                <span>
                  IN PROGRESS
                  <strong>
                    {progressComplaints}
                  </strong>
                </span>

                <span>
                  RESOLVED
                  <strong>
                    {resolvedComplaints}
                  </strong>
                </span>
              </div>
            </div>

          </section>

          {message && (
            <div className="message success-message">
              {message}
            </div>
          )}

          <section className="complaints-section">

            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  HISTORY
                </div>

                <h2>
                  MY COMPLAINTS
                </h2>
              </div>

              <button
                className="refresh-button"
                onClick={loadMyComplaints}
              >
                ↻ REFRESH
              </button>
            </div>

            {loading ? (
              <div className="empty-card">
                Loading complaints...
              </div>
            ) : complaints.length === 0 ? (
              <div className="empty-card">
                <div className="empty-icon">
                  📋
                </div>

                <h3>
                  No complaints yet
                </h3>

                <p>
                  Your submitted complaints
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="complaint-grid">

                {complaints.map(
                  (complaint) => (
                    <div
                      className="complaint-card"
                      key={
                        complaint.complaintId
                      }
                    >

                      <div className="complaint-card-top">

                        <span className="complaint-id">
                          {complaint.complaintId}
                        </span>

                        <span
                          className={`status-badge status-${String(
                            complaint.status ||
                              'PENDING'
                          ).toLowerCase()}`}
                        >
                          {complaint.status ||
                            'PENDING'}
                        </span>

                      </div>

                      <h3>
                        {complaint.type}
                      </h3>

                      <p>
                        {complaint.description}
                      </p>

                      <div className="complaint-meta">

                        <span>
                          📅{' '}
                          {complaint.createdAt
                            ? new Date(
                                complaint.createdAt
                              ).toLocaleString()
                            : 'N/A'}
                        </span>

                        {complaint.address && (
                          <span>
                            📍{' '}
                            {complaint.address}
                          </span>
                        )}

                      </div>

                      <button
                        className="track-button"
                        onClick={() =>
                          trackComplaint(
                            complaint.complaintId
                          )
                        }
                      >
                        TRACK COMPLAINT →
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

        </main>

        {selectedComplaint && (
          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedComplaint(null)
            }
          >
            <div
              className="modal-card"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedComplaint(null)
                }
              >
                ×
              </button>

              <div className="eyebrow">
                COMPLAINT TRACKING
              </div>

              <h2>
                {selectedComplaint.complaintId}
              </h2>

              <div className="tracking-status">
                <span
                  className={`status-badge status-${String(
                    selectedComplaint.status
                  ).toLowerCase()}`}
                >
                  {selectedComplaint.status}
                </span>
              </div>

              <div className="detail-row">
                <strong>Type</strong>
                <span>
                  {selectedComplaint.type}
                </span>
              </div>

              <div className="detail-row">
                <strong>Description</strong>
                <span>
                  {selectedComplaint.description}
                </span>
              </div>

              <div className="detail-row">
                <strong>Contact</strong>
                <span>
                  {selectedComplaint.contact ||
                    'Not provided'}
                </span>
              </div>

              <div className="detail-row">
                <strong>Assigned Staff</strong>
                <span>
                  {selectedComplaint.assignedStaff ||
                    'Not assigned'}
                </span>
              </div>

              {selectedComplaint.address && (
                <div className="detail-row">
                  <strong>Location</strong>
                  <span>
                    {selectedComplaint.address}
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    );
  }

  if (
    page === 'submit' &&
    userLoggedIn
  ) {
    return (
      <div className="app-shell">

        <header className="top-header">

          <div>
            <div className="header-brand">
              SMART COMPLAINT
            </div>

            <div className="header-small">
              FILE NEW COMPLAINT
            </div>
          </div>

          <button
            className="logout-button"
            onClick={() => setPage('user')}
          >
            ← MY DASHBOARD
          </button>

        </header>

        <main className="form-page">

          <div className="form-heading">
            <div className="eyebrow">
              CITIZEN REPORT
            </div>

            <h1>
              File a complaint
            </h1>

            <p>
              Provide accurate details and,
              if possible, attach photographic
              proof and your location.
            </p>
          </div>

          {message && (
            <div className="message success-message">
              {message}
            </div>
          )}

          <form
            onSubmit={submit}
            className="complaint-form"
          >

            <div className="form-section">

              <div className="section-number">
                01
              </div>

              <div className="form-section-content">

                <h2>
                  Complaint Details
                </h2>

                <div className="form-grid">

                  <div className="field">

                    <label>
                      COMPLAINT TYPE *
                    </label>

                    <select name="type">
                      <option value="">
                        Select complaint type
                      </option>

                      <option value="Garbage">
                        Garbage
                      </option>

                      <option value="Road Damage">
                        Road Damage
                      </option>

                      <option value="Street Light">
                        Street Light
                      </option>

                      <option value="Water Supply">
                        Water Supply
                      </option>

                      <option value="Drainage">
                        Drainage
                      </option>

                      <option value="Public Safety">
                        Public Safety
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                  </div>

                  <div className="field">

                    <label>
                      CONTACT INFORMATION
                    </label>

                    <input
                      name="contact"
                      type="text"
                      placeholder="Phone number or email"
                    />

                  </div>

                </div>

                <div className="field">

                  <label>
                    DESCRIPTION *
                  </label>

                  <textarea
                    name="description"
                    rows="6"
                    placeholder="Describe the problem clearly..."
                  />

                </div>

              </div>
            </div>

            <div className="form-section">

              <div className="section-number">
                02
              </div>

              <div className="form-section-content">

                <h2>
                  Proof / Evidence
                </h2>

                <p className="section-help">
                  Upload a photograph showing
                  the problem. Maximum size: 10 MB.
                </p>

                <div className="upload-area">

                  <input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                  />

                  <label htmlFor="proof">
                    📷
                    <strong>
                      CLICK TO UPLOAD PROOF
                    </strong>
                    <span>
                      JPG, PNG, WEBP — Maximum 10 MB
                    </span>
                  </label>

                </div>

                {proofPreview && (
                  <div className="proof-preview">

                    <img
                      src={proofPreview}
                      alt="Complaint proof preview"
                    />

                    <div>
                      <strong>
                        {proof?.name}
                      </strong>

                      <button
                        type="button"
                        onClick={() => {
                          setProof(null);
                          setProofPreview('');
                        }}
                      >
                        REMOVE
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>

            <div className="form-section">

              <div className="section-number">
                03
              </div>

              <div className="form-section-content">

                <h2>
                  Complaint Location
                </h2>

                <p className="section-help">
                  Mark the exact location of the
                  complaint on the map.
                </p>

                <LocationMap
                  value={location}
                  onChange={setLocation}
                />

              </div>
            </div>

            <div className="submit-area">

              <button
                className="submit-complaint-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'SUBMITTING...'
                  : 'SUBMIT COMPLAINT →'}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setPage('user');
                  setMessage('');
                }}
              >
                CANCEL
              </button>

            </div>

          </form>

        </main>

      </div>
    );
  }

  if (
    page === 'admin' &&
    adminLoggedIn
  ) {
    return (
      <div className="admin-shell">

        <header className="admin-header">

          <div>
            <div className="admin-brand">
              SMART COMPLAINT
            </div>

            <div className="admin-subtitle">
              ADMIN CONTROL CENTER
            </div>
          </div>

          <button
            className="admin-logout"
            onClick={handleLogout}
          >
            LOGOUT
          </button>

        </header>

        <main className="admin-content">

          <section className="admin-welcome">

            <div>
              <div className="eyebrow">
                ADMINISTRATOR
              </div>

              <h1>
                Complaint Control Center
              </h1>

              <p>
                Verify, assign, update and resolve
                citizen complaints.
              </p>
            </div>

            <button
              className="refresh-button"
              onClick={loadAllComplaints}
            >
              ↻ REFRESH DATA
            </button>

          </section>

          {message && (
            <div className="message success-message">
              {message}
            </div>
          )}

          <section className="admin-stats">

            <div className="stat-card">
              <span>TOTAL CASES</span>
              <strong>
                {totalComplaints}
              </strong>
            </div>

            <div className="stat-card">
              <span>PENDING</span>
              <strong>
                {pendingComplaints}
              </strong>
            </div>

            <div className="stat-card">
              <span>IN PROGRESS</span>
              <strong>
                {progressComplaints}
              </strong>
            </div>

            <div className="stat-card">
              <span>RESOLVED</span>
              <strong>
                {resolvedComplaints}
              </strong>
            </div>

          </section>

          <section className="admin-panel">

            <div className="admin-toolbar">

              <input
                type="search"
                placeholder="Search complaint ID, type, description..."
                value={adminSearch}
                onChange={(event) =>
                  setAdminSearch(
                    event.target.value
                  )
                }
              />

              <select
                value={adminFilter}
                onChange={(event) =>
                  setAdminFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  ALL STATUS
                </option>

                <option value="PENDING">
                  PENDING
                </option>

                <option value="IN_PROGRESS">
                  IN PROGRESS
                </option>

                <option value="RESOLVED">
                  RESOLVED
                </option>

                <option value="REJECTED">
                  REJECTED
                </option>

              </select>

            </div>

            <div className="admin-table-wrapper">

              <table className="admin-table">

                <thead>
                  <tr>
                    <th>COMPLAINT ID</th>
                    <th>TYPE</th>
                    <th>DESCRIPTION</th>
                    <th>LOCATION</th>
                    <th>PROOF</th>
                    <th>STATUS</th>
                    <th>STAFF</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredAdminComplaints.length === 0 ? (

                    <tr>
                      <td
                        colSpan="8"
                        className="no-data"
                      >
                        No complaints found.
                      </td>
                    </tr>

                  ) : (

                    filteredAdminComplaints.map(
                      (complaint) => (
                        <AdminComplaintRow
                          key={
                            complaint.complaintId
                          }
                          complaint={
                            complaint
                          }
                          updateComplaint={
                            updateComplaint
                          }
                        />
                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </main>

      </div>
    );
  }

  return null;
}

function AdminComplaintRow({
  complaint,
  updateComplaint,
}) {
  const [status, setStatus] =
    useState(
      complaint.status || 'PENDING'
    );

  const [staff, setStaff] =
    useState(
      complaint.assignedStaff || ''
    );

  const [showProof, setShowProof] =
    useState(false);

  const saveChanges = () => {
    updateComplaint(
      complaint.complaintId,
      status,
      staff
    );
  };

  return (
    <>
      <tr>

        <td>
          <strong className="table-id">
            {complaint.complaintId}
          </strong>
        </td>

        <td>
          <span className="type-tag">
            {complaint.type}
          </span>
        </td>

        <td>
          <div className="table-description">
            {complaint.description}
          </div>
        </td>

        <td>
          {complaint.latitude != null &&
          complaint.longitude != null ? (
            <div className="mini-location">
              <span>📍 Location available</span>

              {complaint.address && (
                <small>
                  {complaint.address}
                </small>
              )}
            </div>
          ) : (
            <span className="muted">
              Not provided
            </span>
          )}
        </td>

        <td>

          {complaint.proofFileName ? (

            <button
              className="proof-button"
              onClick={() =>
                setShowProof(true)
              }
            >
              🖼 VIEW PROOF
            </button>

          ) : (
            <span className="muted">
              No proof
            </span>
          )}

        </td>

        <td>

          <select
            className="status-select"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
          >

            <option value="PENDING">
              PENDING
            </option>

            <option value="IN_PROGRESS">
              IN PROGRESS
            </option>

            <option value="RESOLVED">
              RESOLVED
            </option>

            <option value="REJECTED">
              REJECTED
            </option>

          </select>

        </td>

        <td>

          <input
            className="staff-input"
            value={staff}
            onChange={(event) =>
              setStaff(
                event.target.value
              )
            }
            placeholder="Assign staff"
          />

        </td>

        <td>

          <button
            className="save-button"
            onClick={saveChanges}
          >
            SAVE
          </button>

        </td>

      </tr>

      {showProof && (
        <tr>
          <td
            colSpan="8"
            className="proof-expanded"
          >

            <div className="proof-viewer">

              <div className="proof-viewer-header">

                <strong>
                  Complaint Proof —
                  {' '}
                  {complaint.complaintId}
                </strong>

                <button
                  onClick={() =>
                    setShowProof(false)
                  }
                >
                  CLOSE ×
                </button>

              </div>

              <img
                src={api.proofUrl(
                  complaint.complaintId
                )}
                alt="Complaint proof"
              />

            </div>

          </td>
        </tr>
      )}

    </>
  );
}

export default App;