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
async function saveReceiptToCloud(receiptData) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('receipts').insert({
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
    });
    if (error) {
      console.error('Supabase insert error:', error);
    }
    return { data, error };
  } catch (e) {
    console.error('Failed to save receipt to cloud:', e);
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
    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('Failed to fetch receipts from cloud:', e);
    return [];
  }
}
