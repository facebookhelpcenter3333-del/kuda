// Transaction history functionality
let appData = {
    balance: 10000.00,
    userName: 'BABATUNDE',
    transactions: []
};

// Load data
function loadData() {
    const saved = localStorage.getItem('kudasavingsData');
    if (saved) {
        appData = JSON.parse(saved);
    }
    displayTransactions();
}

// Display transactions
function displayTransactions() {
    const container = document.getElementById('transactionsList');
    const emptyState = document.getElementById('emptyState');

    if (!appData.transactions || appData.transactions.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';

    // Group by month
    const grouped = groupByMonth(appData.transactions);

    container.innerHTML = Object.keys(grouped).map(month => {
        const txs = grouped[month];
        const totalIn = txs.filter(t => t.type === 'credit').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalOut = txs.filter(t => t.type === 'debit').reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return `
            <div class="month-section">
                <div class="month-header">
                    <h2>
                        ${month}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="transform: rotate(${Math.random() > 0.5 ? 0 : 180}deg);">
                            <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </h2>
                    <button class="analysis-btn">Analysis</button>
                </div>
                <div class="month-summary">
                    <span class="in-amount">In: ₦${totalIn.toLocaleString('en-NG', {minimumFractionDigits: 2})}</span>
                    <span class="out-amount">Out: ₦${totalOut.toLocaleString('en-NG', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="transactions-list">
                    ${txs.map(tx => `
                        <div class="history-transaction-item" onclick="viewTransaction('${tx.id}')">
                            <div class="transaction-icon ${tx.type === 'credit' ? 'green' : 'purple'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="${tx.type === 'credit' ? 'M12 5V19M5 12L12 5L19 12' : 'M12 19V5M5 12L12 19L19 12'}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="transaction-details" style="flex: 1;">
                                <div class="transaction-title">${tx.title || tx.accountName || 'Transaction'}</div>
                                <div class="transaction-date">${formatDate(tx.date)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="transaction-amount ${tx.type === 'credit' ? 'positive' : 'negative'}">
                                    ${tx.type === 'credit' ? '+' : '-'}₦${parseFloat(tx.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}
                                </div>
                                <div class="transaction-status ${(tx.status || 'successful') === 'successful' ? 'success' : (tx.status === 'pending' ? 'pending' : 'failed')}">
                                    ${(tx.status || 'successful') === 'successful' ? 'Successful' : (tx.status === 'pending' ? 'Pending' : 'Failed')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Group transactions by month
function groupByMonth(transactions) {
    const grouped = {};

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!grouped[monthKey]) {
            grouped[monthKey] = [];
        }
        grouped[monthKey].push(tx);
    });

    return grouped;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}

// View transaction
function viewTransaction(id) {
    localStorage.setItem('viewTransactionId', id);
    window.location.href = '/details.html';
}

// Download history
function downloadHistory() {
    alert('Download feature coming soon!');
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
});
