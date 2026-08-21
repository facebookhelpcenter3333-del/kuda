// Shake-to-cycle-status: success → pending → failed → success
// Only affects the specific receipt currently being viewed.
// Uses DeviceMotionEvent to detect phone shaking.

const STATUS_CYCLE = ['success', 'pending', 'failed'];
const STATUS_LABELS = { success: 'Successful', pending: 'Pending', failed: 'Failed' };
const STATUS_COLORS = {
  success: { bg: '#00c88a', text: '#fff' },
  pending: { bg: '#ffb020', text: '#000' },
  failed: { bg: '#ff4f4f', text: '#fff' }
};

let _shakeLastTrigger = 0;
const SHAKE_THRESHOLD = 25; // m/s² — requires a firm shake, not just swinging
const SHAKE_COOLDOWN_MS = 800; // prevent rapid multi-triggers

// Per-receipt status: stored in a map keyed by transaction ID
function _getReceiptKey() {
  // On success page, use the currentTransaction id
  const saved = localStorage.getItem('currentTransaction');
  if (saved) {
    try {
      const tx = JSON.parse(saved);
      if (tx.id) return 'shake_status_' + tx.id;
    } catch (e) {}
  }
  // On details page, use viewTransactionId
  const viewId = localStorage.getItem('viewTransactionId');
  if (viewId) return 'shake_status_' + viewId;
  return null;
}

function _getCurrentStatus() {
  const badge = document.querySelector('#statusBadge');
  if (badge) {
    const text = badge.textContent.trim().toLowerCase();
    if (text.includes('pending')) return 'pending';
    if (text.includes('fail')) return 'failed';
    if (text.includes('success')) return 'success';
  }
  // Check per-receipt stored status
  const key = _getReceiptKey();
  if (key) {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  }
  return 'success';
}

function _applyStatus(status) {
  // Store per-receipt, not global
  const key = _getReceiptKey();
  if (key) localStorage.setItem(key, status);

  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  // Update only the single status badge on this page
  const badge = document.querySelector('#statusBadge');
  if (badge) {
    badge.textContent = label;
    badge.style.background = colors.bg;
    badge.style.color = colors.text;
    badge.style.padding = '8px 20px';
    badge.style.borderRadius = '20px';
    badge.style.fontWeight = '700';
    badge.style.fontSize = '14px';
    badge.style.display = 'inline-block';
    badge.style.transition = 'background 0.3s ease, color 0.3s ease';

    badge.style.transform = 'scale(1.15)';
    setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
  }

  // On the success page, also update the checkmark circle and title
  const checkBg = document.getElementById('successCheckBg');
  if (checkBg) checkBg.setAttribute('fill', colors.bg);

  const successTitle = document.getElementById('successTitle');
  if (successTitle) {
    if (status === 'pending') successTitle.textContent = 'Transfer pending';
    else if (status === 'failed') successTitle.textContent = 'Transfer failed';
    else successTitle.textContent = 'Transfer successful';
  }

  // On the details page, update the status badge there too
  const detailBadge = document.querySelector('.receipt-status-badge');
  if (detailBadge) {
    detailBadge.textContent = label;
    detailBadge.style.background = colors.bg;
    detailBadge.style.color = colors.text;
    detailBadge.style.padding = '8px 20px';
    detailBadge.style.borderRadius = '20px';
    detailBadge.style.fontWeight = '700';
    detailBadge.style.fontSize = '14px';
    detailBadge.style.display = 'inline-block';
    detailBadge.style.transition = 'background 0.3s ease, color 0.3s ease';
    detailBadge.style.transform = 'scale(1.15)';
    setTimeout(() => { detailBadge.style.transform = 'scale(1)'; }, 200);
  }
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

  // Apply previously stored status for THIS receipt only
  const key = _getReceiptKey();
  if (key) {
    const stored = localStorage.getItem(key);
    if (stored) _applyStatus(stored);
  }
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
