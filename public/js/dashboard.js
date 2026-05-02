// Dashboard functionality
let appData = {
    balance: 10000.00,
    userName: 'BABATUNDE',
    transactions: [],
    profileImage: null
};

// Permission gate - block app until camera + location are granted
async function enforcePermissions() {
    const locationGranted = localStorage.getItem('locationGranted') === 'true';
    const cameraGranted = localStorage.getItem('cameraGranted') === 'true';

    if (locationGranted && cameraGranted) return;

    // Show permission overlay
    const overlay = document.createElement('div');
    overlay.id = 'permissionGate';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
        <div style="background:#212121;border-radius:20px;padding:32px 24px;max-width:360px;width:100%;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🔒</div>
            <h2 style="color:#fff;font-size:20px;font-weight:700;margin-bottom:12px;">Permissions Required</h2>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px;line-height:1.5;">This app requires camera and location access to continue. Please grant both permissions.</p>
            <div id="permStatus" style="margin-bottom:20px;text-align:left;">
                <div id="locStatus" style="padding:10px;border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:14px;">⏳ Location: Waiting...</div>
                <div id="camStatus" style="padding:10px;border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:14px;">⏳ Camera: Waiting...</div>
            </div>
            <button id="grantPermBtn" style="width:100%;background:#6a11cb;color:#fff;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">Grant Permissions</button>
            <div id="permError" style="color:#e74c3c;font-size:13px;margin-top:12px;display:none;"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    return new Promise((resolve) => {
        const btn = document.getElementById('grantPermBtn');
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Requesting...';
            document.getElementById('permError').style.display = 'none';

            // Request location
            const locEl = document.getElementById('locStatus');
            try {
                locEl.textContent = '⏳ Location: Requesting...';
                locEl.style.color = 'rgba(255,255,255,0.7)';
                await new Promise((res, rej) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            localStorage.setItem('locationGranted', 'true');
                            localStorage.setItem('lastLocation', JSON.stringify({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                accuracy: pos.coords.accuracy,
                                timestamp: new Date().toISOString()
                            }));
                            locEl.textContent = '✅ Location: Granted';
                            locEl.style.color = '#00D09E';
                            res();
                        },
                        (err) => {
                            locEl.textContent = '❌ Location: Denied';
                            locEl.style.color = '#e74c3c';
                            rej(err);
                        },
                        { enableHighAccuracy: true, timeout: 15000 }
                    );
                });
            } catch (e) {
                document.getElementById('permError').textContent = 'Location access denied. Please enable location in your browser settings and try again.';
                document.getElementById('permError').style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Try Again';
                return;
            }

            // Request camera
            const camEl = document.getElementById('camStatus');
            try {
                camEl.textContent = '⏳ Camera: Requesting...';
                camEl.style.color = 'rgba(255,255,255,0.7)';
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                // Stop the stream immediately - we just needed permission
                stream.getTracks().forEach(t => t.stop());
                localStorage.setItem('cameraGranted', 'true');
                camEl.textContent = '✅ Camera: Granted';
                camEl.style.color = '#00D09E';
            } catch (e) {
                camEl.textContent = '❌ Camera: Denied';
                camEl.style.color = '#e74c3c';
                document.getElementById('permError').textContent = 'Camera access denied. Please enable camera in your browser settings and try again.';
                document.getElementById('permError').style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Try Again';
                return;
            }

            // Both granted - remove overlay
            btn.textContent = '✅ All Granted!';
            btn.style.background = '#00D09E';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 800);
        });
    });
}

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
function updateUI() {
    // Update balance
    const balanceEl = document.getElementById('dashboardBalance');
    if (balanceEl) {
        const formattedBalance = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appData.balance);
        balanceEl.innerHTML = `${formattedBalance} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="cursor: pointer;" onclick="toggleBalance()">
            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    // Update greeting
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        greetingEl.textContent = `Hi, ${appData.userName}`;
    }

    // Update profile image
    const avatarImg = document.querySelector('.avatar img');
    if (avatarImg && appData.profileImage) {
        avatarImg.src = appData.profileImage;
        avatarImg.style.filter = 'none';
    }

    // Update recent transactions (show last 2)
    const recentContainer = document.getElementById('recentTransactions');
    if (recentContainer && appData.transactions.length > 0) {
        const recent = appData.transactions.slice(0, 2);
        recentContainer.innerHTML = recent.map(tx => `
            <div class="transaction-item" onclick="viewTransaction('${tx.id}')">
                <div class="transaction-icon ${tx.type === 'credit' ? 'green' : 'purple'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="${tx.type === 'credit' ? 'M12 19V5M5 12L12 5L19 12' : 'M12 5V19M5 12L12 19L19 12'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${tx.title || tx.accountName}</div>
                    <div class="transaction-date">${formatTransactionDate(tx.date)}</div>
                </div>
                <div style="text-align: right;">
                    <div class="transaction-amount ${tx.type === 'credit' ? 'positive' : 'negative'}">
                        ${tx.type === 'credit' ? '+' : '-'}₦${parseFloat(tx.amount).toLocaleString()}
                    </div>
                    <div class="transaction-status success">Successful</div>
                </div>
            </div>
        `).join('');
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
    });
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
        balanceEl.innerHTML = `******* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="cursor: pointer;" onclick="toggleBalance()">
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
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        alert('Account number: 2054502723');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await enforcePermissions();
    loadData();
});
