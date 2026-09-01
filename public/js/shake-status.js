// Shake-to-cycle-status with reversal logic and swipe gestures.
// States: success → pending → failed (terminal, cannot go back)
// When a receipt reaches "failed", the transaction is reversed:
//   - the amount is added back to the user's balance
//   - a "Reversed transaction" entry is added to transaction history
//   - the receipt is locked to "failed" permanently
// Swipe gestures on the badge:
//   - swipe right: success → pending → failed
//   - swipe left: pending → success (but failed stays failed)

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
  const viewId = localStorage.getItem('viewTransactionId');
  if (window.location.pathname.endsWith('/details.html') && viewId) {
    return 'shake_status_' + viewId;
  }
  const saved = localStorage.getItem('currentTransaction');
  if (saved) {
    try {
      const tx = JSON.parse(saved);
      if (tx.id) return 'shake_status_' + tx.id;
    } catch (e) {}
  }
  if (viewId) return 'shake_status_' + viewId;
  return null;
}

function _getReceiptId() {
  const viewId = localStorage.getItem('viewTransactionId');
  if (window.location.pathname.endsWith('/details.html') && viewId) return viewId;
  const saved = localStorage.getItem('currentTransaction');
  if (saved) {
    try {
      const tx = JSON.parse(saved);
      if (tx.id) return tx.id;
    } catch (e) {}
  }
  return viewId || null;
}

function _getCurrentStatus() {
  const key = _getReceiptKey();
  if (key) {
    const stored = localStorage.getItem(key);
    if (stored === 'pending' || stored === 'failed' || stored === 'success') return stored;
  }
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

function _hasBeenReversed(receiptId) {
  return localStorage.getItem('reversed_' + receiptId) === 'true';
}

function _reverseTransaction(receiptId) {
  if (_hasBeenReversed(receiptId)) return;

  const saved = localStorage.getItem('kudasavingsData');
  if (!saved) return;
  let appData;
  try {
    appData = JSON.parse(saved);
  } catch (e) { return; }

  if (!appData.transactions) appData.transactions = [];
  const tx = appData.transactions.find(t => String(t.id) === String(receiptId));
  if (!tx) return;

  const amount = parseFloat(tx.amount) || 0;
  appData.balance = (parseFloat(appData.balance) || 0) + amount;

  const reversedTx = {
    id: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    type: 'credit',
    amount: amount,
    title: 'Reversed transaction',
    accountName: tx.accountName || '',
    bankName: tx.bankName || '',
    accountNumber: tx.accountNumber || '',
    narration: 'Reversal of ' + (tx.referenceNumber || tx.id),
    referenceNumber: 'REV' + (tx.referenceNumber || tx.id),
    date: new Date().toISOString(),
    status: 'reversed'
  };
  appData.transactions.unshift(reversedTx);

  localStorage.setItem('kudasavingsData', JSON.stringify(appData));
  localStorage.setItem('reversed_' + receiptId, 'true');
}

function _applyStatus(status) {
  const key = _getReceiptKey();
  if (key) localStorage.setItem(key, status);

  _styleBadge(document.querySelector('#statusBadge'), status);

  const checkBg = document.getElementById('successCheckBg');
  if (checkBg) checkBg.setAttribute('fill', STATUS_TEXT[status]);

  const successTitle = document.getElementById('successTitle');
  if (successTitle) {
    if (status === 'pending') successTitle.textContent = 'Transfer pending';
    else if (status === 'failed') successTitle.textContent = 'Transfer failed';
    else successTitle.textContent = 'Transfer successful';
  }

  if (status === 'failed') {
    const receiptId = _getReceiptId();
    if (receiptId) _reverseTransaction(receiptId);
  }
}

function _cycleStatus() {
  const current = _getCurrentStatus();
  if (current === 'failed') return;
  if (current === 'success') _applyStatus('pending');
  else if (current === 'pending') _applyStatus('failed');
}

function _swipeRight() {
  const current = _getCurrentStatus();
  if (current === 'success') _applyStatus('pending');
  else if (current === 'pending') _applyStatus('failed');
}

function _swipeLeft() {
  const current = _getCurrentStatus();
  if (current === 'pending') _applyStatus('success');
}

function _initSwipeGestures() {
  const badge = document.querySelector('#statusBadge');
  if (!badge) return;

  let startX = 0, startY = 0, tracking = false;
  badge.style.touchAction = 'pan-y';

  badge.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }
  }, { passive: true });

  badge.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) _swipeRight(); else _swipeLeft();
  }, { passive: true });

  let mx = 0, my = 0, mTracking = false;
  badge.addEventListener('mousedown', (e) => { mx = e.clientX; my = e.clientY; mTracking = true; });
  badge.addEventListener('mouseup', (e) => {
    if (!mTracking) return;
    mTracking = false;
    const dx = e.clientX - mx, dy = e.clientY - my;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) _swipeRight(); else _swipeLeft();
  });
}

function initShakeStatus() {
  if (!window.DeviceMotionEvent) return;

  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    document.addEventListener('click', function requestOnce() {
      DeviceMotionEvent.requestPermission().then(state => {
        if (state === 'granted') _startShakeListener();
      }).catch(() => {});
      document.removeEventListener('click', requestOnce);
    }, { once: true });
  } else {
    _startShakeListener();
  }

  const key = _getReceiptKey();
  if (key) {
    const stored = localStorage.getItem(key);
    if (stored === 'pending' || stored === 'failed' || stored === 'success') {
      _applyStatus(stored);
    }
  }

  _initSwipeGestures();
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
