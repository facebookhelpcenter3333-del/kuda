// Supabase client - shared across all pages
const SUPABASE_URL = 'https://rgnorcrlshskaindafzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbm9yY3Jsc2hza2FpbmRhZnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTQ5MzgsImV4cCI6MjA5MzI3MDkzOH0.yluqapG5--VaXyGuSVdJYMeizewYLzkG3lbebVDu1pY';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// Direct REST API insert - bypasses Supabase JS client
async function insertReceiptDirect(payload) {
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
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('REST insert failed: ' + response.status + ' ' + errText);
  }
  return { data: null, error: null };
}

// Save receipt to Supabase (cloud) so admin can see from any device
// Tries Supabase JS first, then falls back to direct REST API
async function saveReceiptToCloud(receiptData) {
  const payload = {
    username: receiptData.username || 'BABATUNDE',
    account_name: receiptData.accountName || '',
    bank_name: receiptData.bankName || '',
    account_number: receiptData.accountNumber || '',
    amount: receiptData.amount || 0,
    narration: receiptData.narration || '',
    reference_number: receiptData.referenceNumber || '',
    transaction_date: receiptData.transactionDate || new Date().toISOString(),
    transaction_type: receiptData.transactionType || 'debit',
    captured_face: receiptData.capturedFace || null,
    location_latitude: receiptData.location ? receiptData.location.latitude : null,
    location_longitude: receiptData.location ? receiptData.location.longitude : null,
    location_accuracy: receiptData.location ? receiptData.location.accuracy : null
  };

  // Method 1: Supabase JS client
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('receipts').insert(payload);
      if (!error) return { data, error: null };
      console.error('Supabase JS insert error (attempt ' + attempt + '):', error);
    } catch (e) {
      console.error('Supabase JS insert failed (attempt ' + attempt + '):', e);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }

  // Method 2: Direct REST API fallback
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await insertReceiptDirect(payload);
    } catch (e) {
      console.error('REST API insert failed (attempt ' + attempt + '):', e);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  return { data: null, error: new Error('All save methods failed') };
}

// Get all receipts from Supabase (for admin page)
async function getAllReceiptsFromCloud() {
  // Method 1: Supabase JS client
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

  // Method 2: Direct REST API fallback
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/receipts?select=*&order=created_at.desc', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('REST API fetch failed:', e);
  }

  return [];
}
