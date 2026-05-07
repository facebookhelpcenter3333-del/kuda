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

// Function to get bank logo URL
function getBankLogoUrl(bankName) {
  if (!bankName) return null;
  return bankLogos[bankName] || null;
}

// Success page functionality
let currentTransaction = null;

// Load transaction data
function loadTransaction() {
    const saved = localStorage.getItem('currentTransaction');
    if (saved) {
        currentTransaction = JSON.parse(saved);
        displayTransaction();
    }
}

// Display transaction
function displayTransaction() {
    if (!currentTransaction) return;

    const amountEl = document.getElementById('receiptAmount');
    if (amountEl) {
        amountEl.textContent = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(currentTransaction.amount);
    }
}

// Share receipt as image
async function shareReceipt() {
    try {
        const receiptContent = document.querySelector('.receipt-container');

        if (!receiptContent) {
            alert('Receipt not found!');
            return;
        }

        const canvas = await html2canvas(receiptContent, {
            backgroundColor: '#121212',
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true
        });

        const image = canvas.toDataURL('image/png');

        if (navigator.share) {
            try {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], 'receipt.png', { type: 'image/png' });

                await navigator.share({
                    title: 'Transaction Receipt',
                    text: 'Check out my transaction receipt',
                    files: [file]
                });
            } catch (shareError) {
                if (shareError.name !== 'AbortError') {
                    downloadReceiptImage(image);
                }
            }
        } else {
            downloadReceiptImage(image);
        }
    } catch (error) {
        console.error('Error capturing receipt:', error);
        alert('Could not capture receipt. Please try again.');
    }
}

// Download receipt image
function downloadReceiptImage(dataUrl) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `receipt_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add to favorites
function addToFavorites() {
    alert('Added to favorites!');
}

// View details
function viewDetails() {
    if (currentTransaction) {
        localStorage.setItem('viewTransactionId', currentTransaction.id);
        window.location.href = '/details.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const locationGranted = localStorage.getItem('locationGranted') === 'true';
    const cameraGranted = localStorage.getItem('cameraGranted') === 'true';
    if (!locationGranted || !cameraGranted) {
        window.location.href = '/password.html';
        return;
    }
    loadTransaction();
});
