/* ══════════════════════════════════════
   REGISTER.JS — Registration Logic
   ══════════════════════════════════════ */

let currentEvent = null;
let memberCount = 0;
let leaderEmailVerified = false;

// Parse event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

async function initRegisterPage() {
    const container = document.getElementById('regContainer');
    const loading = document.getElementById('regLoading');

    if (!eventId) {
        container.innerHTML = `
            <div class="reg-error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>No Event Selected</h2>
                <p>Please select an event from the main page first.</p>
                <a href="index.html" class="btn-primary" style="display:inline-flex;margin-top:1.5rem;border-radius:12px;">
                    <i class="fas fa-arrow-left"></i> Go to Events
                </a>
            </div>`;
        return;
    }

    currentEvent = await getEventById(eventId);

    if (!currentEvent) {
        container.innerHTML = `
            <div class="reg-error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Event Not Found</h2>
                <p>This event doesn't exist or has been removed.</p>
                <a href="index.html" class="btn-primary" style="display:inline-flex;margin-top:1.5rem;border-radius:12px;">
                    <i class="fas fa-arrow-left"></i> Go to Events
                </a>
            </div>`;
        return;
    }

    document.title = `Register — ${currentEvent.title} | Trividhya'26`;
    renderRegistrationForm(currentEvent);

    // After rendering, check for Firebase verification and load saved data
    await checkFirebaseVerification();
    loadFormState();
}

/**
 * Saves form data to localStorage so it persists after email link redirect
 */
function saveFormState() {
    const data = {
        groupName: document.getElementById('groupName')?.value,
        leaderName: document.getElementById('leaderName')?.value,
        leaderEmail: document.getElementById('leaderEmail')?.value,
        leaderMobile: document.getElementById('leaderMobile')?.value,
        leaderCollege: document.getElementById('leaderCollege')?.value,
        leaderEnrollment: document.getElementById('leaderEnrollment')?.value,
        leaderSemester: document.getElementById('leaderSemester')?.value,
    };
    // Also save members
    const members = [];
    const memberCards = document.querySelectorAll('#membersContainer .member-card');
    memberCards.forEach(card => {
        members.push({
            name: card.querySelector('.member-name').value,
            email: card.querySelector('.member-email').value,
            mobile: card.querySelector('.member-mobile').value,
            college: card.querySelector('.member-college').value,
            enrollment: card.querySelector('.member-enrollment').value,
            semester: card.querySelector('.member-semester').value,
        });
    });
    data.members = members;
    data.eventId = eventId; // Store the eventId to prevent data from showing in other events
    localStorage.setItem('regFormState', JSON.stringify(data));
}

/**
 * Loads form data from localStorage
 */
function loadFormState() {
    const saved = localStorage.getItem('regFormState');
    if (!saved) return;
    const data = JSON.parse(saved);

    // ONLY load if the data belongs to the CURRENT event
    if (data.eventId !== eventId) {
        localStorage.removeItem('regFormState');
        return;
    }

    if (document.getElementById('groupName')) document.getElementById('groupName').value = data.groupName || '';
    if (document.getElementById('leaderName')) document.getElementById('leaderName').value = data.leaderName || '';
    if (document.getElementById('leaderEmail')) {
        document.getElementById('leaderEmail').value = data.leaderEmail || '';
        if (leaderEmailVerified) {
            showDetailsSection();
        }
    }
    if (document.getElementById('leaderMobile')) document.getElementById('leaderMobile').value = data.leaderMobile || '';
    if (document.getElementById('leaderCollege')) document.getElementById('leaderCollege').value = data.leaderCollege || '';
    if (document.getElementById('leaderEnrollment')) document.getElementById('leaderEnrollment').value = data.leaderEnrollment || '';
    if (document.getElementById('leaderSemester')) document.getElementById('leaderSemester').value = data.leaderSemester || '';

    // Restore members
    if (data.members && data.members.length > 0) {
        const container = document.getElementById('membersContainer');
        if (container) {
            container.innerHTML = '';
            memberCount = 0;
            data.members.forEach(m => {
                addMember();
                const card = document.getElementById(`member-${memberCount}`);
                card.querySelector('.member-name').value = m.name;
                card.querySelector('.member-email').value = m.email;
                card.querySelector('.member-mobile').value = m.mobile;
                card.querySelector('.member-college').value = m.college;
                card.querySelector('.member-enrollment').value = m.enrollment;
                card.querySelector('.member-semester').value = m.semester;
            });
        }
    }
}

/**
 * Checks if the user is returning from a Firebase Email Link redirect
 * (KEEPING for potential session recovery, but mostly switching to on-page OTP)
 */
async function checkFirebaseVerification() {
    // We are switching away from Firebase, so this is now a legacy function
}

/**
 * Helper to show the details section and hide the initial verification view
 */
function showDetailsSection() {
    const vSec = document.getElementById('verificationSection');
    const dSec = document.getElementById('detailsSection');
    const badge = document.getElementById('emailVerifiedBadge');
    const emailInput = document.getElementById('leaderEmail');
    const sendBtn = document.getElementById('sendOtpBtn');

    if (dSec) dSec.style.display = 'block';
    if (badge) badge.style.display = 'block';
    if (emailInput) {
        emailInput.readOnly = true;
        emailInput.style.borderColor = '#2ed573';
        emailInput.style.boxShadow = '0 0 0 3px rgba(46,213,115,0.2)';
    }
    if (sendBtn) sendBtn.style.display = 'none';
    
    // Smooth scroll to the start of the form
    if (dSec) dSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderRegistrationForm(ev) {
    const container = document.getElementById('regContainer');
    const isGroup = ev.max_members > 1;
    const feeStr = ev.fee > 0 ? '₹' + ev.fee : 'Free';
    const teamStr = ev.max_members <= 1 ? 'Solo' : ev.max_members + ' Members';

    const logoHtml = ev.logo_url
        ? `<img src="${ev.logo_url}" alt="${ev.title}" class="reg-event-logo">`
        : `<div class="reg-event-logo-placeholder"><i class="fas fa-trophy"></i></div>`;

    container.innerHTML = `
        <!-- Event Header -->
        <div class="reg-event-header">
            ${logoHtml}
            <h1 class="reg-event-title">${ev.title}</h1>
            <p class="reg-event-desc">${ev.description}</p>
            <div class="reg-event-meta">
                <div class="reg-meta-item">
                    <div class="reg-meta-label">Fee</div>
                    <div class="reg-meta-value">${feeStr}</div>
                </div>
                <div class="reg-meta-item">
                    <div class="reg-meta-label">Team Size</div>
                    <div class="reg-meta-value">${teamStr}</div>
                </div>
                <div class="reg-meta-item">
                    <div class="reg-meta-label">Category</div>
                    <div class="reg-meta-value" style="text-transform:capitalize;">${ev.badge}</div>
                </div>
            </div>
        </div>

        <!-- Registration Form -->
        <div class="reg-form-card">
            <form id="regForm" onsubmit="handleRegistration(event)">
                
                <!-- STEP 1: EMAIL VERIFICATION -->
                <div id="verificationSection">
                    <div class="reg-form-title"><i class="fas fa-envelope-open-text"></i> Step 1: Verify Your Email</div>
                    <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.2rem;">Before you can register, please provide and verify your email address. We will send you a secure link.</p>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <div style="display:flex;gap:0.5rem;">
                            <input type="email" class="form-input" id="leaderEmail" placeholder="Enter email address" required style="flex:1;">
                            <button type="button" class="otp-send-btn" id="sendOtpBtn" onclick="sendOtp()">
                                <i class="fas fa-paper-plane"></i> Send OTP
                            </button>
                        </div>
                    </div>

                    <!-- 8-DIGIT OTP INPUT (HIDDEN INITIALLY) -->
                    <div id="otpVerifySection" style="display:none; margin-top: 1rem; padding: 1.2rem; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid rgba(123,47,190,0.2);">
                        <label class="form-label">Enter 8-Digit Verification Code</label>
                        <p style="font-size:0.75rem; color:var(--muted); margin-bottom:0.8rem;">We've sent a code to your email.</p>
                        <div style="display:flex;gap:0.5rem;">
                            <input type="text" class="form-input" id="otpInput" placeholder="00000000" maxlength="8" style="flex:1; text-align:center; font-size:1.2rem; font-weight:700; letter-spacing:4px;">
                            <button type="button" class="otp-send-btn" id="verifyOtpBtn" onclick="verifyOtp()" style="background:var(--accent);">
                                <i class="fas fa-check"></i> Verify
                            </button>
                        </div>
                    </div>

                    <div id="emailVerifiedBadge" style="display:none;margin-bottom:1rem;">
                        <span style="background:rgba(46,213,115,0.15);color:#2ed573;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;font-weight:600;">
                            <i class="fas fa-check-circle"></i> Email Verified
                        </span>
                    </div>
                    <div class="form-group otp-section" id="otpSection" style="display:none;">
                        <p id="otpMsg" style="font-size:0.9rem;margin-top:0.4rem;padding: 1rem; background: rgba(123,47,190,0.1); border-radius: 12px; border: 1px solid rgba(123,47,190,0.3); line-height: 1.5;"></p>
                    </div>
                </div>

                <!-- STEP 2: REGISTRATION DETAILS (HIDDEN UNTIL VERIFIED) -->
                <div id="detailsSection" style="display: none; border-top: 1px solid rgba(123,47,190,0.2); padding-top: 1.5rem; margin-top: 0.5rem;">
                    <div class="reg-form-title"><i class="fas fa-user-plus"></i> Step 2: Complete Registration</div>
                    
                    <div class="form-group">
                        <label class="form-label">${isGroup ? 'Team / Group Name' : 'Your Name (as group name)'}</label>
                        <input type="text" class="form-input" id="groupName" placeholder="Enter ${isGroup ? 'team name' : 'your name'}" required>
                    </div>

                    <div class="reg-form-title" style="margin-top:1.5rem;margin-bottom:1rem;font-size:1rem;">
                        <i class="fas fa-crown" style="color:var(--gold);"></i> ${isGroup ? 'Leader Details' : 'Your Details'}
                    </div>

                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" id="leaderName" placeholder="Enter full name" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Mobile Number</label>
                        <input type="tel" class="form-input" id="leaderMobile" placeholder="Enter 10-digit mobile number" pattern="[0-9]{10}" maxlength="10" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">College</label>
                        <select class="form-input" id="leaderCollege" required>
                            <option value="" disabled selected>Select your college</option>
                            <option value="Government Engineering College, Dahod">Government Engineering College, Dahod</option>
                            <option value="Government Polytechnic, Dahod">Government Polytechnic, Dahod</option>
                            <option value="Navjivan Science College, Dahod">Navjivan Science College, Dahod</option>
                            <option value="Navjivan Arts and Commerce College, Dahod">Navjivan Arts and Commerce College, Dahod</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Enrollment Number</label>
                        <input type="text" class="form-input" id="leaderEnrollment" placeholder="Enter enrollment number" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Current Semester</label>
                        <input type="number" class="form-input" id="leaderSemester" placeholder="e.g. 6" min="1" max="10" required>
                    </div>

                    ${isGroup ? `
                    <div class="member-section">
                        <div class="reg-form-title" style="margin-bottom:1rem;font-size:1rem;">
                            <i class="fas fa-users" style="color:var(--primary);"></i> Team Members
                            <span style="font-size:0.75rem;color:var(--muted);font-weight:400;margin-left:auto;">
                                Max ${ev.max_members - 1} member${ev.max_members - 1 > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div id="membersContainer"></div>
                        <button type="button" class="add-member-btn" id="addMemberBtn" onclick="addMember()">
                            <i class="fas fa-plus-circle"></i> Add Team Member
                        </button>
                    </div>
                    ` : ''}

                    <p id="formError" class="form-error" style="display:none;margin-top:1rem;text-align:center;"></p>
                    <button type="submit" class="reg-submit-btn" id="submitBtn">
                        <i class="fas fa-arrow-right"></i> Proceed to Payment
                    </button>
                </div>
            </form>
        </div>
    `;
}

function addMember() {
    if (!currentEvent) return;
    const maxExtra = currentEvent.max_members - 1;
    if (memberCount >= maxExtra) return;

    memberCount++;
    const container = document.getElementById('membersContainer');
    const card = document.createElement('div');
    card.className = 'member-card';
    card.id = `member-${memberCount}`;
    card.innerHTML = `
        <div class="member-card-header">
            <span class="member-card-title"><i class="fas fa-user" style="margin-right:0.4rem;"></i> Member ${memberCount}</span>
            <button type="button" class="member-remove-btn" onclick="removeMember('member-${memberCount}')">
                <i class="fas fa-trash-alt"></i> Remove
            </button>
        </div>
        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input member-name" placeholder="Enter member name" required>
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input member-email" placeholder="Enter member email" required>
        </div>
        <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input type="tel" class="form-input member-mobile" placeholder="Enter 10-digit mobile" pattern="[0-9]{10}" maxlength="10" required>
        </div>
        <div class="form-group">
            <label class="form-label">College</label>
            <select class="form-input member-college" required>
                <option value="" disabled selected>Select college</option>
                <option value="Government Engineering College, Dahod">Government Engineering College, Dahod</option>
                <option value="Government Polytechnic, Dahod">Government Polytechnic, Dahod</option>
                <option value="Navjivan Science College, Dahod">Navjivan Science College, Dahod</option>
                <option value="Navjivan Arts and Commerce College, Dahod">Navjivan Arts and Commerce College, Dahod</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Enrollment Number</label>
            <input type="text" class="form-input member-enrollment" placeholder="Enter enrollment number" required>
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Current Semester</label>
            <input type="number" class="form-input member-semester" placeholder="e.g. 6" min="1" max="10" required>
        </div>
    `;
    container.appendChild(card);
    updateAddButton();
}

function removeMember(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            el.remove();
            reindexMembers();
            updateAddButton();
        }, 300);
    }
}

function reindexMembers() {
    const cards = document.querySelectorAll('#membersContainer .member-card');
    memberCount = cards.length;
    cards.forEach((card, i) => {
        card.querySelector('.member-card-title').innerHTML = `<i class="fas fa-user" style="margin-right:0.4rem;"></i> Member ${i + 1}`;
    });
}

function updateAddButton() {
    const btn = document.getElementById('addMemberBtn');
    if (!btn || !currentEvent) return;
    const maxExtra = currentEvent.max_members - 1;
    btn.disabled = memberCount >= maxExtra;
    if (memberCount >= maxExtra) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Maximum members reached';
    } else {
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Team Member';
    }
}

async function handleRegistration(e) {
    e.preventDefault();

    const errEl = document.getElementById('formError');
    const submitBtn = document.getElementById('submitBtn');

    const groupName = document.getElementById('groupName').value.trim();
    const leaderName = document.getElementById('leaderName').value.trim();
    const leaderEmail = document.getElementById('leaderEmail').value.trim();
    const leaderMobile = document.getElementById('leaderMobile').value.trim();
    const leaderCollege = document.getElementById('leaderCollege').value.trim();
    const leaderEnrollment = document.getElementById('leaderEnrollment').value.trim();
    const leaderSemester = parseInt(document.getElementById('leaderSemester').value, 10);

    // Validate email verified
    if (!leaderEmailVerified) {
        errEl.textContent = 'Please verify your email address first';
        errEl.style.display = 'block';
        return;
    }

    // Collect members
    const membersData = [];
    const memberCards = document.querySelectorAll('#membersContainer .member-card');
    for (const card of memberCards) {
        const name = card.querySelector('.member-name').value.trim();
        const email = card.querySelector('.member-email').value.trim();
        const mobile = card.querySelector('.member-mobile').value.trim();
        const college = card.querySelector('.member-college').value.trim();
        const enrollment = card.querySelector('.member-enrollment').value.trim();
        const semester = parseInt(card.querySelector('.member-semester').value, 10);

        if (!name || !email || !mobile || !college || !enrollment || isNaN(semester)) {
            errEl.textContent = 'Please fill all member details';
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Payment';
            return;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            errEl.textContent = `Member "${name}" has an invalid mobile number`;
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Payment';
            return;
        }
        membersData.push({ name, email, mobile, college, enrollment, semester });
    }

    // FINAL DUPLICATE CHECK (MOBILE)
    const { data: existing, error: dupError } = await checkRegistrationDuplicate(currentEvent.id, null, leaderMobile);
    if (existing) {
        errEl.textContent = `This mobile number (${leaderMobile}) is already registered for this event.`;
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Payment';
        return;
    }

    // Disable submit
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    errEl.style.display = 'none';

    // Store data in session and go to payment
    const regData = {
        event_id: currentEvent.id,
        group_name: groupName,
        leader_name: leaderName,
        leader_email: leaderEmail,
        leader_mobile: leaderMobile,
        college: leaderCollege,
        enrollment: leaderEnrollment,
        semester: leaderSemester,
        payment_mode: 'pending', // will be set on payment page
        payment_status: 'pending'
    };

    // Registration succeeded (moving to payment), so clear the temporary form state
    localStorage.removeItem('regFormState');
    localStorage.removeItem('emailForSignIn');

    // Save to session storage for the payment page
    sessionStorage.setItem('pendingRegistration', JSON.stringify(regData));
    sessionStorage.setItem('pendingMembers', JSON.stringify(membersData));
    sessionStorage.setItem('pendingEventTitle', currentEvent.title);
    sessionStorage.setItem('pendingEventFee', currentEvent.fee);
    sessionStorage.setItem('pendingEventLogo', currentEvent.logo_url || '');

    // Navigate to payment page
    window.location.href = `payment.html?event_id=${currentEvent.id}`;
}

/* ── Supabase Email OTP Verification — with Custom SMTP ── */
async function sendOtp() {
    const email = document.getElementById('leaderEmail').value.trim();
    const btn = document.getElementById('sendOtpBtn');
    const otpSection = document.getElementById('otpSection');
    const otpMsg = document.getElementById('otpMsg');
    const otpVerifySection = document.getElementById('otpVerifySection');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        otpSection.style.display = 'block';
        otpMsg.textContent = 'Enter a valid email';
        otpMsg.style.color = '#ff4757';
        return;
    }

    // PRE-SEND DUPLICATE CHECK (EMAIL)
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking email...';

    const { data: existing, error: dupError } = await checkRegistrationDuplicate(currentEvent.id, email, null);
    if (existing) {
        otpSection.style.display = 'block';
        otpMsg.textContent = `This email (${email}) is already registered for this event. Please use a different email.`;
        otpMsg.style.color = '#ff4757';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

    try {
        // CALL SUPABASE OTP (shouldCreateUser: true allows new registrants to receive OTP)
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true
            }
        });

        if (error) throw error;

        // Success - show the code input field
        otpSection.style.display = 'block';
        otpMsg.textContent = 'Verification code sent! Please check your email inbox (and spam folder).';
        otpMsg.style.color = '#2ed573';
        btn.style.display = 'none'; // hide send button
        otpVerifySection.style.display = 'block'; // show code field

    } catch (error) {
        console.error('OTP Send Error:', error);
        otpSection.style.display = 'block';
        
        const errorMsg = error.message || '';
        let displayMsg = 'Failed to send OTP: ' + (errorMsg || 'Check your SMTP settings.');
        
        // Detailed guide for Supabase Auth / SMTP errors
        if (errorMsg.includes('magic link') || errorMsg.includes('email') || errorMsg.includes('rate limit')) {
            displayMsg = `Failed to send OTP (${errorMsg}). This occurs if Supabase email rate limit is reached or SMTP is not configured in Supabase Dashboard.`;
        }
        
        otpMsg.innerHTML = `${displayMsg}<br><br>
        <button type="button" class="otp-send-btn" onclick="bypassOtpVerification()" style="background:#000000; color:#ffffff; border:2px solid #000000; font-size:0.8rem; padding:0.5rem 1rem;">
            <i class="fas fa-arrow-right"></i> Skip OTP & Continue Registration
        </button>`;
        otpMsg.style.color = '#ff4757';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Retry OTP';
    }
}

// Fallback helper to allow registration if Supabase Email/SMTP is unavailable
function bypassOtpVerification() {
    leaderEmailVerified = true;
    showDetailsSection();
    const otpMsg = document.getElementById('otpMsg');
    if (otpMsg) {
        otpMsg.textContent = 'Email accepted. Proceeding to registration details...';
        otpMsg.style.color = '#2ed573';
    }
}

async function verifyOtp() {
    const email = document.getElementById('leaderEmail').value.trim();
    const code = document.getElementById('otpInput').value.trim();
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const otpMsg = document.getElementById('otpMsg');

    if (!code || code.length !== 8) {
        otpMsg.textContent = 'Please enter a valid 8-digit code.';
        otpMsg.style.color = '#ff4757';
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email,
            token: code,
            type: 'email'
        });

        if (error) throw error;

        // SUCCESS!
        leaderEmailVerified = true;
        
        // Use existing helper to show Step 2
        showDetailsSection();
        
        // Update OTP messages
        document.getElementById('otpVerifySection').style.display = 'none';
        otpMsg.textContent = 'Email verified successfully!';
        otpMsg.style.color = '#2ed573';

        console.log('Supabase OTP verification successful');

    } catch (error) {
        console.error('OTP Verification Error:', error);
        otpMsg.textContent = 'Incorrect or expired code. Please try again.';
        otpMsg.style.color = '#ff4757';
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check"></i> Verify';
    }
}

// Initialize on load
initRegisterPage();
