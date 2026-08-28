/* ══════════════════════════════════════
   PAYMENT.JS — Payment Handling Logic
   ══════════════════════════════════════ */

let regData = null;
let membersData = null;
let eventFee = 0;

// Initialize Payment Page
function initPaymentPage() {
    const rDataStr = sessionStorage.getItem('pendingRegistration');
    const mDataStr = sessionStorage.getItem('pendingMembers');
    const titleStr = sessionStorage.getItem('pendingEventTitle');
    const feeStr = sessionStorage.getItem('pendingEventFee');
    const logoStr = sessionStorage.getItem('pendingEventLogo');

    if (!rDataStr) {
        showError('No registration session found. Please register first.');
        return;
    }

    try {
        regData = JSON.parse(rDataStr);
        membersData = mDataStr ? JSON.parse(mDataStr) : [];
        eventFee = feeStr ? parseInt(feeStr, 10) : 0;
    } catch (e) {
        showError('Invalid session data. Please register again.');
        return;
    }

    // Update UI
    document.getElementById('payEventTitle').textContent = titleStr || 'Event Registration';
    document.getElementById('payGroupName').textContent = regData.group_name;
    document.getElementById('payAmountValue').textContent = eventFee > 0 ? '₹' + eventFee : 'Free';

    const logoArea = document.getElementById('payLogoArea');
    if (logoStr) {
        logoArea.innerHTML = `<img src="${logoStr}" alt="Event Logo" class="pay-event-logo">`;
    } else {
        logoArea.innerHTML = `<i class="fas fa-trophy" style="font-size:3.5rem;color:var(--accent);margin-bottom:1rem;display:block;"></i>`;
    }

    // If free event, register automatically without showing payment options
    if (eventFee === 0) {
        processRegistration('online', 'paid', true);
    }
}

// Option 1: Show Online Payment Flow (QR & TXN ID)
async function showOnlinePaymentFlow() {
    const btn = document.querySelector('.pay-online-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
    btn.disabled = true;

    // Fetch the QR code from site settings
    const settings = await getSiteSettings();
    const qrUrl = settings?.qr_url || '';

    btn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Online';
    btn.disabled = false;

    // Hide choices, show online form
    document.getElementById('payChoiceSection').style.display = 'none';
    const onlineSec = document.getElementById('payOnlineSection');
    onlineSec.style.display = 'block';

    document.getElementById('payOnlineAmount').textContent = eventFee > 0 ? '₹' + eventFee : 'Free';
    
    const qrImg = document.getElementById('paymentQrImg');
    const qrLoading = document.getElementById('qrLoadingText');

    if (qrUrl) {
        qrImg.style.display = 'none';
        qrLoading.style.display = 'block';
        qrImg.onload = () => {
            qrLoading.style.display = 'none';
            qrImg.style.display = 'block';
        };
        qrImg.src = qrUrl;
    } else {
        qrImg.style.display = 'none';
        qrLoading.style.display = 'block';
        qrLoading.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ff4757;"></i><br>No QR Code set by Admin.';
    }
}

function goBackToChoices() {
    document.getElementById('payOnlineSection').style.display = 'none';
    document.getElementById('payChoiceSection').style.display = 'block';
    document.getElementById('transactionIdInput').value = '';
    document.getElementById('txnErrorMsg').style.display = 'none';
}

async function submitOnlinePayment() {
    const txnInput = document.getElementById('transactionIdInput').value.trim();
    const errorMsg = document.getElementById('txnErrorMsg');

    if (!/^[0-9]{12}$/.test(txnInput)) {
        errorMsg.textContent = 'Please enter a valid exactly 12-digit transaction ID.';
        errorMsg.style.display = 'block';
        return;
    }
    errorMsg.style.display = 'none';

    const btn = document.getElementById('submitOnlineBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking ID...';
    btn.disabled = true;
    document.querySelector('#payOnlineSection .pay-cash-btn').disabled = true; 

    // CHECK IF TRANSACTION ID ALREADY EXISTS
    try {
        const { data: existing, error: checkError } = await supabaseClient
            .from('registrations')
            .select('id')
            .eq('transaction_id', txnInput)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            document.querySelector('#payOnlineSection .pay-cash-btn').disabled = false;
            showError('This Transaction ID has already been used by someone else. Please verify you have entered it correctly or contact support.', true);
            return;
        }
    } catch (err) {
        console.error('Error checking transaction ID:', err);
        // Fallback: If check fails, we'll let the database unique constraint handle it during insert
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    // Process Registration
    await processRegistration('online', 'paid', false, txnInput);
}

// Option 2: Pay Cash
async function payCash() {
    const btn = document.querySelector('.pay-cash-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;
    document.querySelector('.pay-online-btn').disabled = true;

    await processRegistration('cash', 'pending', false, null);
}

// Process the registration with Supabase
async function processRegistration(mode, status, isApproved, transactionId = null) {
    if (!regData) return;
    try {
        const comboDataStr = sessionStorage.getItem('pendingComboData');
        let comboData = null;
    try { if (comboDataStr) comboData = JSON.parse(comboDataStr); } catch(e){}

    if (comboData && comboData.events_data && comboData.events_data.length > 0) {
        // Handle Combo Registration: Insert multiple rows, one for each event
        let hasError = false;
        let lastErrorMsg = '';
        
        for (let i = 0; i < comboData.events_data.length; i++) {
            const ev = comboData.events_data[i];
            
            // Clone regData for this specific event
            const specificRegData = { ...regData };
            specificRegData.event_id = ev.event_id;
            specificRegData.payment_mode = mode;
            specificRegData.payment_status = status;
            specificRegData.is_approved = isApproved;
            specificRegData.amount = ev.allocation;
            specificRegData.is_combo = true;
            specificRegData.combo_id = comboData.id;
            
            // Append suffix to transaction ID to keep it unique per row
            if (transactionId) {
                specificRegData.transaction_id = `${transactionId}-C${i+1}`;
            }

            const { data, error } = await createRegistration(specificRegData, membersData);
            if (error) {
                console.error(`Registration failed for event ${ev.event_id}:`, error);
                hasError = true;
                lastErrorMsg = error.message;
            }
        }

        if (hasError) {
            showError(lastErrorMsg || 'Some registrations in the combo failed to process. Please contact support.');
            return;
        }

    } else {
        // Handle Single Event Registration
        regData.payment_mode = mode;
        regData.payment_status = status;
        regData.is_approved = isApproved;
        regData.amount = eventFee;
        regData.is_combo = false;
        
        if (transactionId) {
            regData.transaction_id = transactionId;
        }

        try {
            const { data, error } = await createRegistration(regData, membersData);

            if (error) {
                console.error('Registration failed:', error);
                if (error.code === '23505') {
                    showError('A registration with this email or mobile number already exists for this event.');
                } else {
                    showError(error.message || 'Failed to submit registration. Please try again.');
                }
                return;
            }
        } catch (e) {
            showError('An unexpected error occurred.');
            return;
        }
    }

    // Success - Clear session
    sessionStorage.removeItem('pendingRegistration');
    sessionStorage.removeItem('pendingMembers');
    sessionStorage.removeItem('pendingEventTitle');
    sessionStorage.removeItem('pendingEventFee');
    sessionStorage.removeItem('pendingEventLogo');
    sessionStorage.removeItem('pendingComboData');

        // Show outcome
        document.getElementById('payChoiceSection').style.display = 'none';
        document.getElementById('payOnlineSection').style.display = 'none'; // in case we came from here

        if (mode === 'online') {
            document.getElementById('paySuccess').classList.add('show');
            showConfetti();
        } else {
            document.getElementById('payCashResult').classList.add('show');
        }

    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
    }
}

// Show Error function
function showError(msg, showRetry = false) {
    document.getElementById('payChoiceSection').style.display = 'none';
    document.getElementById('payOnlineSection').style.display = 'none';
    const errorDiv = document.getElementById('payError');
    const retryBtn = document.getElementById('retryBtn');
    
    errorDiv.classList.add('show');
    if (msg) {
        document.getElementById('payErrorMsg').textContent = msg;
    }

    if (showRetry) {
        retryBtn.style.display = 'flex';
    } else {
        retryBtn.style.display = 'none';
    }
}

// Retry Payment: Takes user back to Transaction ID input
function retryPayment() {
    // Hide error result
    document.getElementById('payError').classList.remove('show');
    
    // Reset buttons on the online payment section
    const submitBtn = document.getElementById('submitOnlineBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Submit Payment Details';
    document.querySelector('#payOnlineSection .pay-cash-btn').disabled = false;

    // Show input section again
    document.getElementById('payOnlineSection').style.display = 'block';
    
    // Focus the input
    document.getElementById('transactionIdInput').focus();
}

// Confetti Animation Effect
function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#7B2FBE', '#FF6B35', '#FFD700', '#E91E8C', '#00BCD4', '#2ed573'];

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 15);
    }

    setTimeout(() => container.remove(), 5000);
}

// Run on load
initPaymentPage();
