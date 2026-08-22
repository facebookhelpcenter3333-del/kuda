// Per-receipt status helpers — shared by dashboard, history, and details pages.
// Reads the shake-status override for a specific receipt (keyed by transaction id),
// falling back to the receipt's own status, then to 'success'.

function getReceiptStatus(transaction) {
    if (!transaction || !transaction.id) return 'success';
    const stored = localStorage.getItem('shake_status_' + transaction.id);
    if (stored === 'pending' || stored === 'failed' || stored === 'success') return stored;
    if (transaction.status === 'pending') return 'pending';
    if (transaction.status === 'failed') return 'failed';
    return 'success';
}

function getReceiptStatusLabel(status) {
    return status === 'pending' ? 'Pending' : status === 'failed' ? 'Failed' : 'Successful';
}

function getReceiptStatusClass(status) {
    return status === 'pending' ? 'pending' : status === 'failed' ? 'failed' : 'success';
}
