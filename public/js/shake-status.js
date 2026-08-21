// Shake-to-cycle-status: success → pending → failed → success
// Uses DeviceMotionEvent to detect phone shaking
// Cycles the status badge on receipt pages

const STATUS_CYCLE = ['success', 'pending', 'failed'];
const STATUS_LABELS = { success: 'Successful', pending: 'Pending', failed: 'Failed' };
const STATUS_COLORS = {
  success: { bg: '#00c88a', text: '#fff' },
  pending: { bg: '#ffb020', text: '#000' },
  failed: { bg: '#ff4f4f', text: '#fff' }
};

let _shakeLastTrigger = 0;
const SHAKE_THRESHOLD = 12; // m/s² acceleration delta
const SHAKE_COOLDOWN_MS = 600; // prevent rapid multi-triggers

function _getCurrentStatus() {
  // Read from the badge element or localStorage
  const badge = document.querySelector('.success-badge, .receipt-status-badge, #statusBadge');
  if (badge) {
    const text = badge.textContent.trim().toLowerCase();
    if (text.includes('pending')) return 'pending';
    if (text.includes('fail')) return 'failed';
    if (text.includes('success')) return 'success';
  }
  // Default
  const stored = localStorage.getItem('receiptShakeStatus');
  return stored || 'success';
}

function _applyStatus(status) {
  localStorage.setItem('receiptShakeStatus', status);
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  // Update all status badges on the page
  const badges = document.querySelectorAll('.success-badge, .receipt-status-badge, #statusBadge');
  badges.forEach(badge => {
    badge.textContent = label;
    badge.style.background = colors.bg;
    badge.style.color = colors.text;
    badge.style.padding = '8px 20px';
    badge.style.borderRadius = '20px';
    badge.style.fontWeight = '700';
    badge.style.fontSize = '14px';
    badge.style.display = 'inline-block';
    badge.style.transition = 'background 0.3s ease, color 0.3s ease';

    // Add a brief flash animation
    badge.style.transform = 'scale(1.15)';
    setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
  });

  // On the success page, also update the checkmark circle and title
  const checkBg = document.getElementById('successCheckBg');
  if (checkBg) checkBg.setAttribute('fill', colors.bg);

  const successTitle = document.getElementById('successTitle');
  if (successTitle) {
    if (status === 'pending') successTitle.textContent = 'Transfer pending';
    else if (status === 'failed') successTitle.textContent = 'Transfer failed';
    else successTitle.textContent = 'Transfer successful';
  }

  // Also update any status text in history list items
  const statusTexts = document.querySelectorAll('.transaction-status');
  statusTexts.forEach(el => {
    if (el.classList.contains('success') || el.classList.contains('failed') || el.classList.contains('pending')) {
      el.classList.remove('success', 'failed', 'pending');
      el.classList.add(status);
      el.textContent = label;
      el.style.color = colors.bg;
    }
  });
}

function _cycleStatus() {
  const current = _getCurrentStatus();
  const idx = STATUS_CYCLE.indexOf(current);
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  _applyStatus(next);
}

function initShakeStatus() {
  if (!window.DeviceMotionEvent) return;

  // For iOS 13+, need permission
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    // Permission will be requested on first tap; set up a one-time tap listener
    document.addEventListener('click', function requestOnce() {
      DeviceMotionEvent.requestPermission().then(state => {
        if (state === 'granted') {
          _startShakeListener();
        }
      }).catch(() => {});
      document.removeEventListener('click', requestOnce);
    }, { once: true });
  } else {
    _startShakeListener();
  }

  // Apply any previously stored status on load
  const stored = localStorage.getItem('receiptShakeStatus');
  if (stored) _applyStatus(stored);
}

function _startShakeListener() {
  let lastX = 0, lastY = 0, lastZ = 0;
  let firstReading = true;

  window.addEventListener('devicemotion', (e) => {
    if (!e.accelerationIncludingGravity) return;
    const x = e.accelerationIncludingGravity.x || 0;
    const y = e.accelerationIncludingGravity.y || 0;
    const z = e.accelerationIncludingGravity.z || 0;

    if (firstReading) {
      lastX = x; lastY = y; lastZ = z;
      firstReading = false;
      return;
    }

    const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
    lastX = x; lastY = y; lastZ = z;

    if (delta > SHAKE_THRESHOLD) {
      const now = Date.now();
      if (now - _shakeLastTrigger > SHAKE_COOLDOWN_MS) {
        _shakeLastTrigger = now;
        _cycleStatus();
      }
    }
  });
}
