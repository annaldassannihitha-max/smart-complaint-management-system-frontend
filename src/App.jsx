
import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { api } from './api'


// ============================================================
// HELPERS
// ============================================================

const statusLabel = (status = '') =>
  status.replaceAll('_', ' ')

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString()
    : '—'


// ============================================================
// RED LOCATION ICON
// ============================================================

const createRedLocationIcon = () =>
  L.divIcon({
    className: 'user-location-marker',

    html: `
      <div class="user-location-pin">
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
      </div>
    `,

    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  })


// ============================================================
// FLOATING BACKGROUND
// ============================================================

function FloatingOrbs() {
  return (
    <div
      className="ambient"
      aria-hidden="true"
    >
      <span className="orb orb1" />
      <span className="orb orb2" />
      <span className="orb orb3" />

      <span className="gridGlow" />
      <span className="noise" />
    </div>
  )
}


// ============================================================
// BRAND
// ============================================================

function Brand({ admin = false }) {
  return (
    <div className="brand">

      <div className="brandMark">
        {admin ? '⌘' : '✦'}
      </div>

      <div>
        <strong>
          SMART COMPLAINT
        </strong>

        <span>
          {admin
            ? 'Operations Console'
            : 'Citizen Service Portal'}
        </span>
      </div>

    </div>
  )
}


// ============================================================
// TOP BAR
// ============================================================

function Topbar({
  admin,
  onSwitch
}) {
  return (
    <header
      className={
        `topbar ${admin ? 'glassbar' : ''}`
      }
    >

      <Brand admin={admin} />

      <button
        type="button"
        className="switchBtn"
        onClick={onSwitch}
      >
        {admin
          ? '← USER PORTAL'
          : 'ADMIN CONSOLE →'}
      </button>

    </header>
  )
}


// ============================================================
// LOGIN
// ============================================================

function Login({
  mode,
  onSuccess,
  onSwitch
}) {

  const [value, setValue] =
    useState('')

  const [error, setError] =
    useState('')

  const admin = mode === 'admin'


  const submit = async (event) => {

    event.preventDefault()

    setError('')

    try {

      if (admin) {

        await api.adminLogin(value)

      } else {

        await api.userLogin(value)

      }

      onSuccess()

    } catch (err) {

      setError(
        err.message ||
        'Login failed.'
      )

    }
  }


  return (
    <div
      className={
        admin
          ? 'adminShell shell'
          : 'userShell shell'
      }
    >

      <FloatingOrbs />

      <Topbar
        admin={admin}
        onSwitch={onSwitch}
      />

      <main className="loginWrap">

        <section className="heroCopy">

          <div className="eyebrow">
            {admin
              ? 'LIVE OPERATIONS • SECURE ACCESS'
              : 'CITY SERVICES • DIGITAL FIRST'}
          </div>

          <h1>

            {admin ? (
              <>
                Manage every
                <br />
                <em>complaint.</em>
              </>
            ) : (
              <>
                Make the issue
                <br />
                <em>impossible to miss.</em>
              </>
            )}

          </h1>

          <p>

            {admin
              ? 'A focused glass control room for triage, assignment, evidence review and resolution.'
              : 'Report an issue, attach proof, pin the exact location and receive a trackable complaint ID.'}

          </p>

          <div className="heroChips">

            <span>
              01 • REPORT
            </span>

            <span>
              02 • LOCATE
            </span>

            <span>
              03 • RESOLVE
            </span>

          </div>

        </section>


        <form
          className="loginCard glassCard"
          onSubmit={submit}
        >

          <div className="cardIcon">
            {admin ? '⌘' : '✦'}
          </div>

          <span className="miniLabel">
            {admin
              ? 'ADMIN ACCESS'
              : 'USER ACCESS'}
          </span>

          <h2>
            {admin
              ? 'Control room login'
              : 'Welcome back'}
          </h2>

          <p>
            {admin
              ? 'Enter the administrator password.'
              : 'Enter your 4-digit citizen PIN.'}
          </p>

          <input
            autoFocus
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            type="password"
            inputMode={
              admin
                ? 'text'
                : 'numeric'
            }
            maxLength={
              admin
                ? 60
                : 4
            }
            placeholder={
              admin
                ? 'admin123'
                : '1234'
            }
          />

          <button className="primaryBtn">
            {admin
              ? 'OPEN CONSOLE'
              : 'ENTER PORTAL'}

            <span>
              ↗
            </span>
          </button>

          {error && (
            <div className="errorBox">
              ⚠ {error}
            </div>
          )}

          <div className="demoHint">
            Demo {admin
              ? 'password'
              : 'PIN'}:

            <b>
              {admin
                ? 'admin123'
                : '1234'}
            </b>
          </div>

        </form>

      </main>

    </div>
  )
}


// ============================================================
// LOCATION MAP
// ============================================================

function LocationMap({
  onChange
}) {

  const mapContainerRef =
    useRef(null)

  const mapRef =
    useRef(null)

  const markerRef =
    useRef(null)

  const [address, setAddress] =
    useState('')

  const [locating, setLocating] =
    useState(false)


  // ----------------------------------------------------------
  // Reverse geocoding
  // ----------------------------------------------------------

  const reverseGeocode = async (
    latitude,
    longitude
  ) => {

    try {

      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              Accept:
                'application/json'
            }
          }
        )

      if (!response.ok) {
        return ''
      }

      const data =
        await response.json()

      return (
        data.display_name ||
        ''
      )

    } catch (error) {

      console.warn(
        'Address lookup failed:',
        error
      )

      return ''
    }
  }


  // ----------------------------------------------------------
  // Put red marker and update location
  // ----------------------------------------------------------

  const updateLocation = async (
    latitude,
    longitude,
    autoOpen = false
  ) => {

    const map =
      mapRef.current

    if (!map) {
      return
    }


    setLocating(true)


    // Remove previous marker

    if (markerRef.current) {

      markerRef.current.remove()

      markerRef.current = null
    }


    // Create RED marker

    markerRef.current =
      L.marker(
        [latitude, longitude],
        {
          icon:
            createRedLocationIcon()
        }
      )
        .addTo(map)
        .bindPopup(
          '<b>📍 Your Location</b>'
        )


    // Move map

    map.setView(
      [
        latitude,
        longitude
      ],
      17,
      {
        animate: true
      }
    )


    // Find address

    const addr =
      await reverseGeocode(
        latitude,
        longitude
      )


    setAddress(addr)


    // Send location to UserPortal

    onChange({
      latitude,
      longitude,
      address: addr
    })


    setLocating(false)


    // Open popup automatically

    if (
      autoOpen &&
      markerRef.current
    ) {

      setTimeout(() => {

        markerRef.current?.openPopup()

      }, 500)

    }
  }


  // ----------------------------------------------------------
  // Browser GPS
  // ----------------------------------------------------------

  const locateUser = () => {

    if (!navigator.geolocation) {

      alert(
        'Geolocation is not supported by this browser.'
      )

      return
    }


    setLocating(true)


    navigator.geolocation.getCurrentPosition(

      (position) => {

        const {
          latitude,
          longitude
        } = position.coords


        updateLocation(
          latitude,
          longitude,
          true
        )

      },


      (error) => {

        console.error(
          'Geolocation error:',
          error
        )

        setLocating(false)


        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {

          alert(
            'Location permission was denied. Please allow location access for localhost.'
          )

        } else if (
          error.code ===
          error.TIMEOUT
        ) {

          alert(
            'Location request timed out. Please try again.'
          )

        } else {

          alert(
            'Unable to detect your location. Please try again.'
          )
        }
      },


      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }


  // ----------------------------------------------------------
  // Create Leaflet map
  // ----------------------------------------------------------

  useEffect(() => {

    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return
    }


    const map =
      L.map(
        mapContainerRef.current,
        {
          zoomControl: true,
          attributionControl: true
        }
      )


    map.setView(
      [17.3850, 78.4867],
      12
    )


    // OpenStreetMap tiles

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,

        attribution:
          '&copy; OpenStreetMap contributors'
      }
    ).addTo(map)


    mapRef.current = map


    // Fix Leaflet rendering

    setTimeout(() => {

      map.invalidateSize()

    }, 300)


    // Click map

    const handleMapClick =
      (event) => {

        updateLocation(
          event.latlng.lat,
          event.latlng.lng,
          false
        )
      }


    map.on(
      'click',
      handleMapClick
    )


    // Automatically detect user location

    locateUser()


    // Cleanup

    return () => {

      map.off(
        'click',
        handleMapClick
      )

      map.remove()

      mapRef.current = null

      markerRef.current = null
    }

  }, [])


  return (
    <div>

      {/* MAP */}

      <div
        ref={mapContainerRef}
        className="map"
        style={{
          width: '100%',
          height: '540px',
          minHeight: '400px',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      />


      {/* MAP CONTROLS */}

      <div className="mapBottom">

        <button
          type="button"
          className="softBtn"
          onClick={locateUser}
          disabled={locating}
        >

          {locating
            ? '⌖ LOCATING...'
            : '⌖ USE MY LOCATION'}

        </button>


        <span>
          {address ||
            'Detecting your location...'}
        </span>

      </div>


      {/* LOCATION STATUS */}

      {address && (

        <div className="locationDetected">

          <span className="locationRedDot" />

          <div>

            <strong>
              YOUR LOCATION DETECTED
            </strong>

            <small>
              {address}
            </small>

          </div>

        </div>

      )}

    </div>
  )
}


// ============================================================
// USER PORTAL
// ============================================================

function UserPortal({
  onSwitch
}) {

  const [location, setLocation] =
    useState({})

  const [proof, setProof] =
    useState(null)

  const [message, setMessage] =
    useState('')

  const [trackId, setTrackId] =
    useState('')

  const [tracked, setTracked] =
    useState(null)


  // ----------------------------------------------------------
  // Submit complaint
  // ----------------------------------------------------------

  const submit = async (event) => {

    event.preventDefault()

    setMessage('')


    const form =
      new FormData(
        event.currentTarget
      )


    // Add location

    if (
      location.latitude != null &&
      location.longitude != null
    ) {

      form.set(
        'latitude',
        String(location.latitude)
      )

      form.set(
        'longitude',
        String(location.longitude)
      )

      form.set(
        'address',
        location.address || ''
      )
    }


    // Add proof image

    if (proof) {

      form.set(
        'proof',
        proof
      )
    }


    try {

      const data =
        await api.createComplaint(
          form
        )


      setMessage(
        `Submitted successfully. Your complaint ID is ${data.complaintId}.`
      )


      event.currentTarget.reset()

      setProof(null)

      setLocation({})

    } catch (error) {

      setMessage(
        error.message ||
        'Unable to submit complaint.'
      )
    }
  }


  // ----------------------------------------------------------
  // Track complaint
  // ----------------------------------------------------------

  const track = async () => {

    /*
     * Remove punctuation accidentally copied
     * after the complaint ID.
     *
     * CMP-2E1BE4BB.
     * becomes
     * CMP-2E1BE4BB
     */

    const cleanId =
      trackId
        .trim()
        .replace(
          /[.,;:!?]+$/g,
          ''
        )
        .trim()


    if (!cleanId) {

      setTracked({
        error:
          'Please enter a complaint ID.'
      })

      return
    }


    try {

      const result =
        await api.getComplaint(
          cleanId
        )

      setTracked(result)

    } catch (error) {

      setTracked({
        error:
          error.message
      })
    }
  }


  return (
    <div className="userShell shell">

      <FloatingOrbs />

      <Topbar
        onSwitch={onSwitch}
      />


      <main className="portal">


        {/* HERO */}

        <div className="sectionIntro">

          <div>

            <span className="eyebrow">
              CITIZEN PORTAL
            </span>

            <h1>

              Turn a complaint
              <br />

              <em>
                into action.
              </em>

            </h1>

          </div>


          <div className="floatingBadge">

            ✦ PROOF + LOCATION

            <br />

            <small>
              One report. One ID.
            </small>

          </div>

        </div>


        {/* MAIN GRID */}

        <div className="portalGrid">


          {/* COMPLAINT FORM */}

          <form
            className="glassCard complaintCard"
            onSubmit={submit}
          >

            <div className="cardHeader">

              <div>

                <span className="miniLabel">
                  NEW REPORT
                </span>

                <h2>
                  What happened?
                </h2>

              </div>

              <span className="step">
                01
              </span>

            </div>


            {/* TYPE */}

            <label>

              Complaint type

              <select
                name="type"
                required
              >

                <option>
                  Road / Street
                </option>

                <option>
                  Water Supply
                </option>

                <option>
                  Garbage / Sanitation
                </option>

                <option>
                  Electricity
                </option>

                <option>
                  Public Safety
                </option>

                <option>
                  Other
                </option>

              </select>

            </label>


            {/* DESCRIPTION */}

            <label>

              Description

              <textarea
                name="description"
                required
                placeholder="Describe the issue, where it happened, and anything useful for the department."
              />

            </label>


            {/* CONTACT */}

            <label>

              Contact information

              <input
                name="contact"
                required
                placeholder="Phone or email"
              />

            </label>


            {/* PROOF */}

            <div className="proofBox">

              <div>

                <span className="miniLabel">
                  EVIDENCE
                </span>

                <h3>
                  Attach proof photo
                </h3>

                <p>
                  JPG, PNG or WEBP • max 10 MB
                </p>

              </div>


              <label className="uploadBtn">

                + CHOOSE PHOTO

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setProof(
                      event.target.files?.[0] ||
                      null
                    )
                  }
                />

              </label>


              {proof && (

                <div className="proofPreview">

                  <img
                    src={
                      URL.createObjectURL(
                        proof
                      )
                    }
                    alt="Proof preview"
                  />

                  <span>
                    {proof.name}
                  </span>

                </div>

              )}

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="primaryBtn big"
            >

              SUBMIT COMPLAINT

              <span>
                ↗
              </span>

            </button>


            {message && (

              <div className="successBox">
                {message}
              </div>

            )}

          </form>


          {/* LOCATION */}

          <section
            className="glassCard mapCard"
          >

            <div className="cardHeader">

              <div>

                <span className="miniLabel">
                  LOCATION
                </span>

                <h2>
                  Pin the issue
                </h2>

              </div>

              <span className="step">
                02
              </span>

            </div>


            <LocationMap
              onChange={
                setLocation
              }
            />


            <div className="locationMeta">

              <span>
                ● LOCATION IS OPTIONAL
              </span>

              <span>
                OPENSTREETMAP
              </span>

            </div>

          </section>

        </div>


        {/* TRACKING */}

        <section
          className="glassCard tracker"
        >

          <div>

            <span className="miniLabel">
              TRACKING
            </span>

            <h2>
              Where is my complaint?
            </h2>

          </div>


          <div className="trackRow">

            <input
              value={trackId}
              onChange={(event) =>
                setTrackId(
                  event.target.value
                )
              }
              placeholder="Enter CMP-XXXXXXXX"
            />

            <button
              type="button"
              className="primaryBtn"
              onClick={track}
            >
              CHECK STATUS
            </button>

          </div>


          {tracked && (

            <div className="trackResult">

              {tracked.error ? (

                <b>
                  ⚠ {tracked.error}
                </b>

              ) : (

                <>

                  <strong>
                    {tracked.complaintId}
                  </strong>

                  <span>
                    {statusLabel(
                      tracked.status
                    )}
                  </span>

                  <p>
                    {tracked.type}
                    {' • '}
                    Updated{' '}
                    {formatDate(
                      tracked.updatedAt
                    )}
                  </p>


                  {tracked.address && (

                    <small>
                      📍 {tracked.address}
                    </small>

                  )}

                  {tracked.latitude != null &&
                    tracked.longitude != null && (

                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        opacity: 0.7
                      }}
                    >
                      Coordinates:{' '}
                      {Number(
                        tracked.latitude
                      ).toFixed(6)}
                      {' , '}
                      {Number(
                        tracked.longitude
                      ).toFixed(6)}
                    </div>

                  )}

                </>

              )}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}


// ============================================================
// ADMIN MINI MAP
// ============================================================

function MiniMap({
  lat,
  lng,
  id
}) {

  const ref =
    useRef(null)


  useEffect(() => {

    if (
      !ref.current ||
      lat == null ||
      lng == null
    ) {
      return
    }


    const map =
      L.map(
        ref.current,
        {
          zoomControl: false,
          attributionControl: false
        }
      )


    map.setView(
      [lat, lng],
      15
    )


    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19
      }
    ).addTo(map)


    // RED marker for complaint location

    L.marker(
      [lat, lng],
      {
        icon:
          createRedLocationIcon()
      }
    )
      .addTo(map)
      .bindPopup(
        `<b>📍 Complaint Location</b><br/>${id}`
      )


    setTimeout(() => {
      map.invalidateSize()
    }, 200)


    return () => {

      map.remove()

    }

  }, [lat, lng, id])


  return (
    <div
      ref={ref}
      className="miniMap"
      title={
        `Location ${id}`
      }
    />
  )
}


// ============================================================
// ADMIN PORTAL
// ============================================================

function AdminPortal({
  onSwitch
}) {

  const [data, setData] =
    useState([])

  const [filter, setFilter] =
    useState('ALL')

  const [search, setSearch] =
    useState('')

  const [selected, setSelected] =
    useState(null)


  // ----------------------------------------------------------
  // Load complaints
  // ----------------------------------------------------------

  const load = async () => {

    try {

      const complaints =
        await api.allComplaints()

      setData(
        Array.isArray(
          complaints
        )
          ? complaints
          : []
      )

    } catch (error) {

      console.error(
        'Failed to load complaints:',
        error
      )

      setData([])
    }
  }


  useEffect(() => {

    load()

  }, [])


  // ----------------------------------------------------------
  // Filter complaints
  // ----------------------------------------------------------

  const visible =
    useMemo(() => {

      const query =
        search.toLowerCase()

      return data.filter(
        (complaint) => {

          const matchesStatus =
            filter === 'ALL' ||
            complaint.status === filter


          const searchable =
            `
              ${complaint.complaintId || ''}
              ${complaint.type || ''}
              ${complaint.description || ''}
              ${complaint.contact || ''}
              ${complaint.address || ''}
            `.toLowerCase()


          return (
            matchesStatus &&
            searchable.includes(query)
          )
        }
      )

    }, [
      data,
      filter,
      search
    ])


  // ----------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------

  const counts = {

    total:
      data.length,

    pending:
      data.filter(
        item =>
          item.status ===
          'PENDING'
      ).length,

    progress:
      data.filter(
        item =>
          item.status ===
          'IN_PROGRESS'
      ).length,

    resolved:
      data.filter(
        item =>
          item.status ===
          'RESOLVED'
      ).length

  }


  // ----------------------------------------------------------
  // Update complaint
  // ----------------------------------------------------------

  const update = async (
    id,
    body
  ) => {

    try {

      await api.updateComplaint(
        id,
        body
      )

      await load()

    } catch (error) {

      alert(
        error.message ||
        'Unable to update complaint.'
      )
    }
  }


  return (
    <div className="adminShell shell">

      <FloatingOrbs />

      <Topbar
        admin
        onSwitch={onSwitch}
      />


      <main className="adminPortal">


        {/* ADMIN HERO */}

        <div className="adminHero">

          <div>

            <span className="eyebrow">
              OPERATIONS • LIVE
            </span>

            <h1>

              Complaint
              <br />

              <em>
                control room.
              </em>

            </h1>

            <p>
              Review evidence, locate incidents,
              assign staff and move every case
              toward resolution.
            </p>

          </div>


          <div className="pulseCard glassCard">

            <span className="liveDot" />

            SYSTEM ONLINE

            <div className="pulseLine" />

          </div>

        </div>


        {/* STATS */}

        <div className="statsGrid">

          <div className="stat glassCard">

            <span>
              TOTAL CASES
            </span>

            <b>
              {counts.total}
            </b>

            <small>
              All complaints
            </small>

          </div>


          <div className="stat glassCard">

            <span>
              PENDING
            </span>

            <b>
              {counts.pending}
            </b>

            <small>
              Awaiting action
            </small>

          </div>


          <div className="stat glassCard">

            <span>
              IN PROGRESS
            </span>

            <b>
              {counts.progress}
            </b>

            <small>
              Assigned cases
            </small>

          </div>


          <div className="stat glassCard">

            <span>
              RESOLVED
            </span>

            <b>
              {counts.resolved}
            </b>

            <small>
              Closed successfully
            </small>

          </div>

        </div>


        {/* CASE DATABASE */}

        <section
          className="glassCard adminTableCard"
        >

          <div className="tableToolbar">

            <div>

              <span className="miniLabel">
                CASE DATABASE
              </span>

              <h2>
                All complaints
              </h2>

            </div>


            <div className="tools">

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search cases..."
              />


              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value
                  )
                }
              >

                <option>
                  ALL
                </option>

                <option>
                  PENDING
                </option>

                <option>
                  IN_PROGRESS
                </option>

                <option>
                  RESOLVED
                </option>

                <option>
                  REJECTED
                </option>

              </select>

            </div>

          </div>


          {/* TABLE */}

          <div className="tableWrap">

            <table>

              <thead>

                <tr>

                  <th>
                    CASE
                  </th>

                  <th>
                    ISSUE
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    ASSIGNEE
                  </th>

                  <th>
                    LOCATION
                  </th>

                  <th>
                    PROOF
                  </th>

                </tr>

              </thead>


              <tbody>

                {visible.map(
                  (complaint) => (

                    <tr
                      key={
                        complaint.complaintId
                      }
                    >

                      {/* CASE */}

                      <td>

                        <b>
                          {complaint.complaintId}
                        </b>

                        <small>
                          {formatDate(
                            complaint.createdAt
                          )}
                        </small>

                      </td>


                      {/* ISSUE */}

                      <td>

                        <b>
                          {complaint.type}
                        </b>

                        <p>
                          {complaint.description}
                        </p>

                        <small>
                          {complaint.contact}
                        </small>

                      </td>


                      {/* STATUS */}

                      <td>

                        <select
                          className={
                            `statusSelect ${complaint.status}`
                          }
                          value={
                            complaint.status
                          }
                          onChange={
                            (event) =>
                              update(
                                complaint.complaintId,
                                {
                                  status:
                                    event.target.value
                                }
                              )
                          }
                        >

                          <option>
                            PENDING
                          </option>

                          <option>
                            IN_PROGRESS
                          </option>

                          <option>
                            RESOLVED
                          </option>

                          <option>
                            REJECTED
                          </option>

                        </select>

                      </td>


                      {/* STAFF */}

                      <td>

                        <input
                          className="staffInput"
                          defaultValue={
                            complaint.assignedStaff ||
                            ''
                          }
                          placeholder="Assign staff"
                          onBlur={
                            (event) => {

                              const value =
                                event.target.value

                              if (
                                value !==
                                (
                                  complaint.assignedStaff ||
                                  ''
                                )
                              ) {

                                update(
                                  complaint.complaintId,
                                  {
                                    assignedStaff:
                                      value
                                  }
                                )

                              }
                            }
                          }
                        />

                      </td>


                      {/* LOCATION */}

                      <td>

                        {complaint.latitude != null &&
                        complaint.longitude != null ? (

                          <>

                            <MiniMap
                              lat={
                                Number(
                                  complaint.latitude
                                )
                              }
                              lng={
                                Number(
                                  complaint.longitude
                                )
                              }
                              id={
                                complaint.complaintId
                              }
                            />

                            <small className="address">

                              {complaint.address ||
                                `${Number(
                                  complaint.latitude
                                ).toFixed(5)}, ${Number(
                                  complaint.longitude
                                ).toFixed(5)}`}

                            </small>

                          </>

                        ) : (

                          <span className="muted">
                            No pin
                          </span>

                        )}

                      </td>


                      {/* PROOF */}

                      <td>

                        {complaint.proofFileName ? (

                          <button
                            type="button"
                            className="proofBtn"
                            onClick={() =>
                              setSelected(
                                complaint
                              )
                            }
                          >
                            VIEW PROOF ↗
                          </button>

                        ) : (

                          <span className="muted">
                            No proof
                          </span>

                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>


            {!visible.length && (

              <div className="empty">
                No complaints match your filters.
              </div>

            )}

          </div>

        </section>

      </main>


      {/* PROOF MODAL */}

      {selected && (

        <div
          className="modalBack"
          onClick={() =>
            setSelected(null)
          }
        >

          <div
            className="proofModal glassCard"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="close"
              onClick={() =>
                setSelected(null)
              }
            >
              ×
            </button>


            <span className="miniLabel">

              EVIDENCE •{' '}
              {selected.complaintId}

            </span>


            <h2>
              {selected.proofFileName}
            </h2>


            <img
              src={
                api.proofUrl(
                  selected.complaintId
                )
              }
              alt="Complaint proof"
            />


            <p>
              {selected.description}
            </p>


            {selected.address && (

              <p>
                📍 {selected.address}
              </p>

            )}


            {selected.latitude != null &&
              selected.longitude != null && (

              <p>
                Coordinates:{' '}
                {Number(
                  selected.latitude
                ).toFixed(6)}
                {' , '}
                {Number(
                  selected.longitude
                ).toFixed(6)}
              </p>

            )}

          </div>

        </div>

      )}

    </div>
  )
}


// ============================================================
// MAIN APP
// ============================================================

export default function App() {

  const [screen, setScreen] =
    useState('login-user')


  const goUser = () =>
    setScreen('login-user')


  const goAdmin = () =>
    setScreen('login-admin')


  // USER PORTAL

  if (screen === 'user') {

    return (
      <UserPortal
        onSwitch={goAdmin}
      />
    )
  }


  // ADMIN PORTAL

  if (screen === 'admin') {

    return (
      <AdminPortal
        onSwitch={goUser}
      />
    )
  }


  // LOGIN

  const isAdmin =
    screen === 'login-admin'


  return (
    <Login
      mode={
        isAdmin
          ? 'admin'
          : 'user'
      }

      onSwitch={
        isAdmin
          ? goUser
          : goAdmin
      }

      onSuccess={() =>
        setScreen(
          isAdmin
            ? 'admin'
            : 'user'
        )
      }
    />
  )
}
