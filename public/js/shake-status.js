// Shake-to-cycle-status: success → pending → failed → success
// Only affects the specific receipt currently being viewed.
// Badge design: faded background + bold colored text (same style for all statuses).

const STATUS_CYCLE = ['success', 'pending', 'failed'];
const STATUS_LABELS = { success: 'Successful', pending: 'Pending', failed: 'Failed' };
const STATUS_BG = {
  success: 'rgba(0, 200, 138, 0.15)',
  pending: 'rgba(255, 176, 32, 0.15)',
  failed: 'rgba(255, 79, 79, 0.15)'
};
const STATUS_TEXT = {
  success: '#00c88a',
  pending: '#ffb020',
  failed: '#ff4f4f'
};

let _shakeLastTrigger = 0;
const SHAKE_THRESHOLD = 25;
const SHAKE_COOLDOWN_MS = 800;

function _getReceiptKey() {
  // On details page, ALWAYS use viewTransactionId first (the receipt actually open)
  const viewId = localStorage.getItem('viewTransactionId');
  if (window.location.pathname.endsWith('/details.html') && viewId) {
    return 'shake_status_' + viewId;
  }
  // On success page, use the currentTransaction id
  const saved = localStorage.getItem('currentTransaction');
  if (saved) {
    try {
      const tx = JSON.parse(saved);
      if (tx.id) return 'shake_status_' + tx.id;
    } catch (e) {}
  }
  // Fallback to viewId if available
  if (viewId) return 'shake_status_' + viewId;
  return null;
}

function _getCurrentStatus() {
  // Check per-receipt stored status first (source of truth)
  const key = _getReceiptKey();
  if (key) {
    const stored = localStorage.getItem(key);
    if (stored === 'pending' || stored === 'failed' || stored === 'success') return stored;
  }
  // Fall back to badge text
  const badge = document.querySelector('#statusBadge');
  if (badge) {
    const text = badge.textContent.trim().toLowerCase();
    if (text.includes('pending')) return 'pending';
    if (text.includes('fail')) return 'failed';
  }
  return 'success';
}

function _styleBadge(badge, status) {
  if (!badge) return;
  const inner = badge.querySelector('span');
  if (inner) {
    inner.textContent = STATUS_LABELS[status];
    inner.style.color = STATUS_TEXT[status];
    inner.style.fontWeight = '700';
  } else {
    badge.textContent = STATUS_LABELS[status];
    badge.style.color = STATUS_TEXT[status];
    badge.style.fontWeight = '700';
  }
  badge.style.background = STATUS_BG[status];
  badge.style.borderRadius = '20px';
  badge.style.display = 'inline-block';
  badge.style.transition = 'background 0.3s ease, color 0.3s ease';
  badge.style.transform = 'scale(1.1)';
  setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
}

function _applyStatus(status) {
  // Store per-receipt, not global
  const key = _getReceiptKey();
  if (key) localStorage.setItem(key, status);

  // Update the status badge on this page (same faded-bg + bold-text design)
  _styleBadge(document.querySelector('#statusBadge'), status);

  // On the success page, also update the checkmark circle and title
  const checkBg = document.getElementById('successCheckBg');
  if (checkBg) checkBg.setAttribute('fill', STATUS_TEXT[status]);

  const successTitle = document.getElementById('successTitle');
  if (successTitle) {
    if (status === 'pending') successTitle.textContent = 'Transfer pending';
    else if (status === 'failed') successTitle.textContent = 'Transfer failed';
    else successTitle.textContent = 'Transfer successful';
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
    if (stored === 'pending' || stored === 'failed' || stored === 'success') {
      _applyStatus(stored);
    }
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
