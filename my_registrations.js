/* ── TOAST NOTIFICATIONS ── */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.style.background = type === 'error' ? 'rgba(255, 71, 87, 0.9)' : type === 'info' ? 'rgba(41, 128, 185, 0.9)' : 'rgba(46, 213, 115, 0.9)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    toast.style.fontFamily = 'var(--font-main)';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '500';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    toast.textContent = msg;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ── AUTH STATE MANAGEMENT ── */
let currentEmail = '';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user && session.user.email) {
        currentEmail = session.user.email;
        showDashboard();
    } else {
        showEmailForm();
    }
});

/* ── UI TOGGLES ── */
function showEmailForm() {
    document.getElementById('emailFormCard').classList.add('active');
    document.getElementById('otpFormCard').classList.remove('active');
    document.getElementById('dashboardCard').classList.remove('active');
    document.getElementById('errorMsg').style.display = 'none';
}

function showOtpForm(email) {
    currentEmail = email;
    document.getElementById('displayEmail').textContent = email;
    document.getElementById('emailFormCard').classList.remove('active');
    document.getElementById('otpFormCard').classList.add('active');
    document.getElementById('dashboardCard').classList.remove('active');
    document.getElementById('otpErrorMsg').style.display = 'none';
    document.getElementById('successMsg').style.display = 'block';
    document.getElementById('successMsg').textContent = 'OTP sent successfully! Please check your inbox.';
}

function showDashboard() {
    document.getElementById('emailFormCard').classList.remove('active');
    document.getElementById('otpFormCard').classList.remove('active');
    document.getElementById('dashboardCard').classList.add('active');
    document.getElementById('dashEmailDisplay').textContent = currentEmail;
    loadUserRegistrations(currentEmail);
}

/* ── AUTH ACTIONS ── */
async function requestOtp() {
    const emailInput = document.getElementById('emailInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('sendOtpBtn');
    
    if (!emailInput) {
        errorMsg.textContent = 'Please enter a valid email address.';
        errorMsg.style.display = 'block';
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
        errorMsg.textContent = 'Invalid email format.';
        errorMsg.style.display = 'block';
        return;
    }

    errorMsg.style.display = 'none';
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: emailInput,
        });

        if (error) throw error;
        
        showOtpForm(emailInput);
        showToast('OTP sent!', 'success');
    } catch (err) {
        errorMsg.textContent = err.message || 'Failed to send OTP. Please try again.';
        errorMsg.style.display = 'block';
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function submitOtp() {
    const otpInput = document.getElementById('otpInput').value.trim();
    const errorMsg = document.getElementById('otpErrorMsg');
    const successMsg = document.getElementById('successMsg');
    const btn = document.getElementById('verifyOtpBtn');
    
    successMsg.style.display = 'none';

    if (!otpInput || otpInput.length !== 8) {
        errorMsg.textContent = 'Please enter a valid 8-digit OTP.';
        errorMsg.style.display = 'block';
        return;
    }

    errorMsg.style.display = 'none';
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: currentEmail,
            token: otpInput,
            type: 'email'
        });

        if (error) throw error;
        
        showToast('Login successful!', 'success');
        showDashboard();
    } catch (err) {
        errorMsg.textContent = err.message || 'Invalid OTP. Please try again.';
        errorMsg.style.display = 'block';
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        document.getElementById('otpInput').value = '';
    }
}

async function logoutUser() {
    await supabaseClient.auth.signOut();
    currentEmail = '';
    showEmailForm();
    showToast('Logged out successfully', 'info');
}

/* ── LOAD REGISTRATIONS ── */
async function loadUserRegistrations(email) {
    const grid = document.getElementById('regGrid');
    const loader = document.getElementById('loadingRegs');
    
    grid.innerHTML = '';
    loader.style.display = 'block';
    
    try {
        const regs = await getRegistrationsByEmail(email);
        
        loader.style.display = 'none';
        
        if (!regs || regs.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:4rem; background:rgba(0,0,0,0.02); border-radius:12px; border:1px dashed rgba(0,0,0,0.1);">
                    <i class="fas fa-ticket-alt" style="font-size:3rem; color:#555; margin-bottom:1rem; opacity:0.5;"></i>
                    <h3 style="color:#000; font-family:var(--font-heading);">No registrations found</h3>
                    <p style="color:#555; font-size:0.9rem; margin-top:0.5rem;">We couldn't find any event registrations linked to ${email}.</p>
                    <a href="index.html#events" class="btn-primary" style="display:inline-block; margin-top:1.5rem;">Explore Events</a>
                </div>
            `;
            return;
        }
        
        renderRegistrations(regs);
    } catch (err) {
        loader.style.display = 'none';
        grid.innerHTML = `<div style="grid-column:1/-1; color:#ff4757; text-align:center;">Error loading registrations: ${err.message}</div>`;
    }
}

function renderRegistrations(regs) {
    const grid = document.getElementById('regGrid');
    
    const html = regs.map(r => {
        // Status Badge
        let statusBadge = '';
        if (r.payment_status === 'paid' && r.is_approved) {
            statusBadge = '<span class="reg-badge badge-paid"><i class="fas fa-check-circle"></i> Confirmed</span>';
        } else if (r.payment_status === 'cancelled') {
            statusBadge = '<span class="reg-badge badge-cancelled"><i class="fas fa-ban"></i> Cancelled</span>';
        } else if (r.payment_status === 'deleted') {
            statusBadge = '<span class="reg-badge badge-cancelled"><i class="fas fa-trash"></i> Deleted</span>';
        } else {
            statusBadge = '<span class="reg-badge badge-pending"><i class="fas fa-clock"></i> Awaiting</span>';
        }

        // Combo/Event info
        let eventName = r.events ? r.events.title : 'Unknown Event';
        let comboBadge = '';
        if (r.is_combo) {
            const cName = r.combos && r.combos.name ? r.combos.name : 'Combo Deal';
            comboBadge = `<div class="combo-badge"><i class="fas fa-layer-group"></i> ${cName}</div>`;
        } else {
            comboBadge = `<div class="combo-badge" style="background:rgba(41,128,185,0.15); color:#2980b9; border-color:rgba(41,128,185,0.3);"><i class="fas fa-calendar-check"></i> Single Event</div>`;
        }

        // Members
        let membersHtml = '';
        if (r.members && r.members.length > 0) {
            const lis = r.members.map(m => `<li>${m.name}</li>`).join('');
            membersHtml = `
                <div class="reg-members">
                    <h4>Team Members</h4>
                    <ul>${lis}</ul>
                </div>
            `;
        } else {
            membersHtml = `
                <div class="reg-members">
                    <div style="font-size:0.85rem; color:#555; font-style:italic;">Individual Registration</div>
                </div>
            `;
        }

        // Price text
        let amount = r.amount !== null && r.amount !== undefined ? `₹${r.amount}` : (r.events ? `₹${r.events.fee}` : '₹--');

        return `
            <div class="reg-card">
                <div class="reg-header">
                    <div>
                        <div class="reg-title">${eventName}</div>
                        ${comboBadge}
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="reg-leader">
                    <div class="leader-name"><i class="fas fa-crown"></i> ${r.group_name || r.leader_name}</div>
                    ${r.group_name ? `<div><i class="fas fa-user"></i> ${r.leader_name} (Leader)</div>` : ''}
                    <div><i class="fas fa-envelope"></i> ${r.leader_email}</div>
                    <div><i class="fas fa-phone"></i> ${r.leader_mobile}</div>
                    <div style="margin-top:10px; font-weight:600; color:#000;">
                        <i class="fas ${r.payment_mode === 'cash' ? 'fa-money-bill-wave' : 'fa-credit-card'}"></i> 
                        ${amount} (${r.payment_mode.toUpperCase()})
                    </div>
                </div>
                
                ${membersHtml}
            </div>
        `;
    }).join('');
    
    grid.innerHTML = html;
}
