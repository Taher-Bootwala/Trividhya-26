/* ══════════════════════════════════════
   REGISTER.JS — Registration Logic
   ══════════════════════════════════════ */

let currentEvent = null;
let memberCount = 0;
let leaderEmailVerified = false;

// Parse event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
const comboId = urlParams.get('combo_id');

async function initRegisterPage() {
    const container = document.getElementById('regContainer');
    const loading = document.getElementById('regLoading');

    if (!eventId && !comboId) {
        container.innerHTML = `
            <div class="reg-error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>No Event/Combo Selected</h2>
                <p>Please select an event or combo from the main page first.</p>
                <a href="index.html" class="btn-primary" style="display:inline-flex;margin-top:1.5rem;border-radius:12px;">
                    <i class="fas fa-arrow-left"></i> Go to Events
                </a>
            </div>`;
        return;
    }

    if (comboId) {
        const combo = await getComboById(comboId);
        if (combo) {
            // Fetch all associated events to get coordinators/volunteers
            const eventIds = combo.events_data.map(e => e.event_id);
            const { data: eventsList } = await supabaseClient
                .from('events')
                .select('title, coordinators, volunteers, logo_url')
                .in('id', eventIds);

            let allCoords = [];
            let allVols = [];
            if (eventsList) {
                eventsList.forEach(e => {
                    if (e.coordinators) allCoords.push(`${e.title}: ${e.coordinators}`);
                    if (e.volunteers) allVols.push(`${e.title}: ${e.volunteers}`);
                });
            }

            currentEvent = {
                id: 'COMBO_' + combo.id,
                title: combo.name,
                category: 'combo',
                badge: 'Combo Deal',
                type: combo.max_members > 1 ? 'group' : 'individual',
                max_members: combo.max_members,
                min_members: combo.min_members,
                fee: combo.total_fee,
                description: combo.description,
                coordinators: allCoords.join('<br>') || 'TBA',
                volunteers: allVols.join('<br>') || 'TBA',
                is_combo: true,
                combo_data: combo,
                combo_events_details: eventsList,
                logo_url: combo.image_url
            };
        }
    } else {
        currentEvent = await getEventById(eventId);
    }

    if (!currentEvent) {
        container.innerHTML = `
            <div class="reg-error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Not Found</h2>
                <p>This event or combo doesn't exist or has been removed.</p>
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
 * Saves form data to localStorage so it persists after email link redirect or reload
 */
function saveFormState() {
    if (!currentEvent) return;
    const leaderCollege = document.getElementById('leaderCollege')?.value || '';
    const leaderOtherCollege = document.getElementById('leaderOtherCollege')?.value || '';
    
    const leaderEnrollmentType = document.getElementById('leaderEnrollmentType')?.value || 'Enrollment';
    const leaderEnrollment = leaderEnrollmentType === 'New Admission'
        ? 'New Admission'
        : (document.getElementById('leaderEnrollment')?.value || '');
    
    const data = {
        groupName: document.getElementById('groupName')?.value || '',
        leaderName: document.getElementById('leaderName')?.value || '',
        leaderEmail: document.getElementById('leaderEmail')?.value || '',
        leaderMobile: document.getElementById('leaderMobile')?.value || '',
        leaderCollege: leaderCollege,
        leaderOtherCollege: leaderOtherCollege,
        leaderGender: document.getElementById('leaderGender')?.value || '',
        leaderEnrollmentType: leaderEnrollmentType,
        leaderEnrollment: leaderEnrollment,
        leaderSemester: document.getElementById('leaderSemester')?.value || '',
        leaderInGameId: document.getElementById('leaderInGameId')?.value || '',
        leaderUid: document.getElementById('leaderUid')?.value || '',
    };

    // Save extra members
    const members = [];
    const grid = document.getElementById('allMembersGrid');
    if (grid) {
        const extraCards = grid.querySelectorAll('.member-card:not(#leaderMemberCard)');
        extraCards.forEach(card => {
            const enrollType = card.querySelector('.member-enrollment-type')?.value || 'Enrollment';
            const enrollVal = enrollType === 'New Admission' ? 'New Admission' : (card.querySelector('.member-enrollment')?.value || '');
            members.push({
                name: card.querySelector('.member-name')?.value || '',
                email: card.querySelector('.member-email')?.value || '',
                mobile: card.querySelector('.member-mobile')?.value || '',
                college: card.querySelector('.member-college')?.value || '',
                otherCollege: card.querySelector('.member-other-college')?.value || '',
                gender: card.querySelector('.member-gender')?.value || '',
                enrollment_type: enrollType,
                enrollment: enrollVal,
                semester: card.querySelector('.member-semester')?.value || '',
                in_game_id: card.querySelector('.member-in-game-id')?.value || '',
                in_game_uid: card.querySelector('.member-in-game-uid')?.value || ''
            });
        });
    }
    data.members = members;
    data.eventId = eventId || comboId;
    localStorage.setItem('regFormState', JSON.stringify(data));
}

/**
 * Loads form data from localStorage
 */
function loadFormState() {
    const saved = localStorage.getItem('regFormState');
    if (!saved || !currentEvent) return;
    const data = JSON.parse(saved);

    const currentId = eventId || comboId;
    if (data.eventId !== currentId) {
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
    if (document.getElementById('leaderEmailCard')) document.getElementById('leaderEmailCard').value = data.leaderEmail || '';
    if (document.getElementById('leaderMobile')) document.getElementById('leaderMobile').value = data.leaderMobile || '';
    if (document.getElementById('leaderCollege')) {
        document.getElementById('leaderCollege').value = data.leaderCollege || '';
        if (data.leaderCollege === 'Other' && document.getElementById('leaderOtherCollege')) {
            document.getElementById('leaderOtherCollege').style.display = 'block';
            document.getElementById('leaderOtherCollege').value = data.leaderOtherCollege || '';
        }
    }
    if (document.getElementById('leaderGender')) document.getElementById('leaderGender').value = data.leaderGender || '';
    if (document.getElementById('leaderEnrollmentType')) {
        const enrollType = data.leaderEnrollmentType || (data.leaderEnrollment === 'New Admission' ? 'New Admission' : 'Enrollment');
        document.getElementById('leaderEnrollmentType').value = enrollType;
        handleLeaderEnrollmentTypeChange(document.getElementById('leaderEnrollmentType'));
    }
    if (document.getElementById('leaderEnrollment')) {
        document.getElementById('leaderEnrollment').value = (data.leaderEnrollment === 'New Admission') ? '' : (data.leaderEnrollment || '');
    }
    if (document.getElementById('leaderSemester')) document.getElementById('leaderSemester').value = data.leaderSemester || '';
    if (document.getElementById('leaderInGameId')) document.getElementById('leaderInGameId').value = data.leaderInGameId || '';
    if (document.getElementById('leaderUid')) document.getElementById('leaderUid').value = data.leaderUid || '';

    // Restore member cards
    const minM = Math.max(1, currentEvent.min_members || 1);
    const maxM = Math.max(minM, currentEvent.max_members || 1);
    const grid = document.getElementById('allMembersGrid');
    if (grid && maxM > 1) {
        // Clear existing non-leader cards
        const extraCards = grid.querySelectorAll('.member-card:not(#leaderMemberCard)');
        extraCards.forEach(c => c.remove());

        const savedMembers = data.members || [];
        const requiredExtras = minM - 1;
        const totalExtrasToRender = Math.max(requiredExtras, savedMembers.length);

        for (let i = 0; i < totalExtrasToRender; i++) {
            const memberIdx = i + 2;
            const isReq = memberIdx <= minM;
            const memberData = savedMembers[i] || null;
            const cardEl = createMemberCardElement(memberIdx, isReq, memberData);
            grid.appendChild(cardEl);
        }
        updateAddButton();
    }
}

/**
 * Checks if the user is returning from a Firebase Email Link redirect
 */
async function checkFirebaseVerification() {
    // Legacy placeholder
}

/**
 * Helper to show the details section and hide the initial verification view
 */
function showDetailsSection() {
    const dSec = document.getElementById('detailsSection');
    const badge = document.getElementById('emailVerifiedBadge');
    const emailInput = document.getElementById('leaderEmail');
    const sendBtn = document.getElementById('sendOtpBtn');
    const leaderEmailCard = document.getElementById('leaderEmailCard');

    if (dSec) dSec.style.display = 'block';
    if (badge) badge.style.display = 'block';
    if (emailInput) {
        emailInput.readOnly = true;
        emailInput.style.borderColor = '#2ed573';
        emailInput.style.boxShadow = '0 0 0 3px rgba(46,213,115,0.2)';
    }
    if (leaderEmailCard && emailInput) {
        leaderEmailCard.value = emailInput.value.trim();
    }
    if (sendBtn) sendBtn.style.display = 'none';
    
    // Smooth scroll to the start of the form
    if (dSec) dSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleLeaderCollegeChange(selectEl) {
    const otherEl = document.getElementById('leaderOtherCollege');
    if (otherEl) {
        otherEl.style.display = selectEl.value === 'Other' ? 'block' : 'none';
        if (selectEl.value !== 'Other') otherEl.value = '';
    }
    saveFormState();
}

function handleMemberCollegeChange(selectEl) {
    const otherEl = selectEl.parentElement.querySelector('.member-other-college');
    if (otherEl) {
        otherEl.style.display = selectEl.value === 'Other' ? 'block' : 'none';
        if (selectEl.value !== 'Other') otherEl.value = '';
    }
    saveFormState();
}

function handleLeaderEnrollmentTypeChange(selectEl) {
    const isNew = selectEl.value === 'New Admission';
    const input = document.getElementById('leaderEnrollment');
    const badge = document.getElementById('leaderNewAdmissionBadge');
    const label = document.getElementById('leaderEnrollmentLabel');
    if (!input || !badge) return;

    if (isNew) {
        input.style.display = 'none';
        input.required = false;
        input.value = 'New Admission';
        badge.style.display = 'flex';
        if (label) label.textContent = 'Enrollment Status';
    } else {
        input.style.display = 'block';
        input.required = true;
        if (input.value === 'New Admission') {
            input.value = '';
        }
        badge.style.display = 'none';
        if (label) label.innerHTML = 'Enrollment No. *';
        input.focus();
    }
    saveFormState();
}

function handleMemberEnrollmentTypeChange(selectEl) {
    const card = selectEl.closest('.member-card');
    if (!card) return;
    const isNew = selectEl.value === 'New Admission';
    const input = card.querySelector('.member-enrollment');
    const badge = card.querySelector('.member-new-admission-badge');
    const label = card.querySelector('.member-enrollment-label');
    if (!input || !badge) return;

    if (isNew) {
        input.style.display = 'none';
        input.required = false;
        input.value = 'New Admission';
        badge.style.display = 'flex';
        if (label) label.textContent = 'Enrollment Status';
    } else {
        input.style.display = 'block';
        input.required = true;
        if (input.value === 'New Admission') {
            input.value = '';
        }
        badge.style.display = 'none';
        if (label) label.innerHTML = 'Enrollment No. *';
        input.focus();
    }
    saveFormState();
}

function renderLeaderCard(isGroup) {
    const isGame = currentEvent.category === 'game';
    return `
        <div class="member-card leader-card" id="leaderMemberCard">
            <div class="member-card-header">
                <span class="member-card-title">
                    <i class="fas fa-crown" style="color:#d4af37;"></i> ${isGroup ? 'Member 1 (Leader)' : 'Your Details'}
                </span>
                <span class="member-badge leader-badge">
                    <i class="fas fa-user-shield"></i> ${isGroup ? 'Team Leader' : 'Participant'}
                </span>
            </div>
            <div class="card-fields-grid">
                <div class="form-group col-span-2">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-input" id="leaderName" placeholder="Enter full name" required oninput="saveFormState()">
                </div>
                <div class="form-group col-span-2">
                    <label class="form-label">Email Address (Verified) *</label>
                    <input type="email" class="form-input" id="leaderEmailCard" placeholder="Verified email" readonly style="background:#f4f6f8 !important; cursor:not-allowed; border-color:#2ed573 !important;">
                </div>
                <div class="form-group">
                    <label class="form-label">Mobile Number *</label>
                    <input type="tel" class="form-input" id="leaderMobile" placeholder="10-digit mobile" pattern="[0-9]{10}" maxlength="10" required oninput="saveFormState()">
                </div>
                <div class="form-group">
                    <label class="form-label">Gender *</label>
                    <select class="form-input" id="leaderGender" required onchange="saveFormState()">
                        <option value="" disabled selected>Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <div class="form-group col-span-2">
                    <label class="form-label">College *</label>
                    <select class="form-input" id="leaderCollege" required onchange="handleLeaderCollegeChange(this)">
                        <option value="" disabled selected>Select college</option>
                        <option value="Government Engineering College, Dahod">Government Engineering College, Dahod</option>
                        <option value="Government Polytechnic, Dahod">Government Polytechnic, Dahod</option>
                        <option value="Navjivan Science College, Dahod">Navjivan Science College, Dahod</option>
                        <option value="Navjivan Arts and Commerce College, Dahod">Navjivan Arts and Commerce College, Dahod</option>
                        <option value="Other">Other (Please specify)</option>
                    </select>
                    <input type="text" class="form-input" id="leaderOtherCollege" placeholder="Enter college name" style="display:none; margin-top:0.4rem;" oninput="saveFormState()">
                </div>
                <div class="form-group col-span-2">
                    <label class="form-label">Admission Type *</label>
                    <select class="form-input" id="leaderEnrollmentType" onchange="handleLeaderEnrollmentTypeChange(this)">
                        <option value="New Admission">New Admission</option>
                        <option value="Enrollment" selected>Enrollment</option>
                    </select>
                </div>
                <div class="form-group" id="leaderEnrollmentGroup">
                    <label class="form-label" id="leaderEnrollmentLabel">Enrollment No. *</label>
                    <input type="text" class="form-input" id="leaderEnrollment" placeholder="Enrollment no." required oninput="saveFormState()">
                    <div id="leaderNewAdmissionBadge" class="new-admission-badge" style="display:none;">
                        <i class="fas fa-check-circle"></i> New Admission (No enrollment required)
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Semester *</label>
                    <input type="number" class="form-input" id="leaderSemester" placeholder="e.g. 1" min="1" max="10" required oninput="saveFormState()">
                </div>
                ${isGame ? `
                <div class="form-group">
                    <label class="form-label">In-Game ID *</label>
                    <input type="text" class="form-input" id="leaderInGameId" placeholder="e.g. OGxItachi" required oninput="saveFormState()">
                </div>
                <div class="form-group">
                    <label class="form-label">UID *</label>
                    <input type="text" class="form-input" id="leaderUid" placeholder="Numbers only" pattern="[0-9]+" required oninput="saveFormState()">
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createMemberCardElement(memberIndex, isRequired = false, data = null) {
    const isGame = currentEvent && currentEvent.category === 'game';
    const isNewAdmission = (data?.enrollment_type === 'New Admission') || (data?.enrollment === 'New Admission');
    const card = document.createElement('div');
    card.className = 'member-card';
    card.id = `memberCard-${memberIndex}`;
    card.dataset.memberIndex = memberIndex;
    
    card.innerHTML = `
        <div class="member-card-header">
            <span class="member-card-title">
                <i class="fas fa-user"></i> Member ${memberIndex}
            </span>
            ${isRequired 
                ? `<span class="member-badge req-badge"><i class="fas fa-lock"></i> Required</span>`
                : `<button type="button" class="member-remove-btn" onclick="removeMemberCard(${memberIndex})">
                    <i class="fas fa-trash-alt"></i> Remove
                   </button>`
            }
        </div>
        <div class="card-fields-grid">
            <div class="form-group col-span-2">
                <label class="form-label">Full Name *</label>
                <input type="text" class="form-input member-name" placeholder="Enter member name" required oninput="saveFormState()" value="${data?.name ? data.name.replace(/"/g, '&quot;') : ''}">
            </div>
            <div class="form-group col-span-2">
                <label class="form-label">Email Address *</label>
                <input type="email" class="form-input member-email" placeholder="Enter member email" required oninput="saveFormState()" value="${data?.email ? data.email.replace(/"/g, '&quot;') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Mobile Number *</label>
                <input type="tel" class="form-input member-mobile" placeholder="10-digit mobile" pattern="[0-9]{10}" maxlength="10" required oninput="saveFormState()" value="${data?.mobile ? data.mobile.replace(/"/g, '&quot;') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Gender *</label>
                <select class="form-input member-gender" required onchange="saveFormState()">
                    <option value="" disabled ${!data?.gender ? 'selected' : ''}>Select gender</option>
                    <option value="Male" ${data?.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${data?.gender === 'Female' ? 'selected' : ''}>Female</option>
                </select>
            </div>
            <div class="form-group col-span-2">
                <label class="form-label">College *</label>
                <select class="form-input member-college" required onchange="handleMemberCollegeChange(this)">
                    <option value="" disabled ${!data?.college ? 'selected' : ''}>Select college</option>
                    <option value="Government Engineering College, Dahod" ${data?.college === 'Government Engineering College, Dahod' ? 'selected' : ''}>Government Engineering College, Dahod</option>
                    <option value="Government Polytechnic, Dahod" ${data?.college === 'Government Polytechnic, Dahod' ? 'selected' : ''}>Government Polytechnic, Dahod</option>
                    <option value="Navjivan Science College, Dahod" ${data?.college === 'Navjivan Science College, Dahod' ? 'selected' : ''}>Navjivan Science College, Dahod</option>
                    <option value="Navjivan Arts and Commerce College, Dahod" ${data?.college === 'Navjivan Arts and Commerce College, Dahod' ? 'selected' : ''}>Navjivan Arts and Commerce College, Dahod</option>
                    <option value="Other" ${data?.college === 'Other' || (data?.college && !['Government Engineering College, Dahod','Government Polytechnic, Dahod','Navjivan Science College, Dahod','Navjivan Arts and Commerce College, Dahod'].includes(data.college)) ? 'selected' : ''}>Other (Please specify)</option>
                </select>
                <input type="text" class="form-input member-other-college" placeholder="Enter college name" style="display:${data?.otherCollege || (data?.college && !['Government Engineering College, Dahod','Government Polytechnic, Dahod','Navjivan Science College, Dahod','Navjivan Arts and Commerce College, Dahod'].includes(data.college)) ? 'block' : 'none'}; margin-top:0.4rem;" oninput="saveFormState()" value="${data?.otherCollege ? data.otherCollege.replace(/"/g, '&quot;') : (data?.college && !['Government Engineering College, Dahod','Government Polytechnic, Dahod','Navjivan Science College, Dahod','Navjivan Arts and Commerce College, Dahod'].includes(data.college) ? data.college.replace(/"/g, '&quot;') : '')}">
            </div>
            <div class="form-group col-span-2">
                <label class="form-label">Admission Type *</label>
                <select class="form-input member-enrollment-type" onchange="handleMemberEnrollmentTypeChange(this)">
                    <option value="New Admission" ${isNewAdmission ? 'selected' : ''}>New Admission</option>
                    <option value="Enrollment" ${!isNewAdmission ? 'selected' : ''}>Enrollment</option>
                </select>
            </div>
            <div class="form-group member-enrollment-group">
                <label class="form-label member-enrollment-label">${isNewAdmission ? 'Enrollment Status' : 'Enrollment No. *'}</label>
                <input type="text" class="form-input member-enrollment" placeholder="Enrollment no." ${isNewAdmission ? '' : 'required'} oninput="saveFormState()" value="${data?.enrollment && data.enrollment !== 'New Admission' ? data.enrollment.replace(/"/g, '&quot;') : (isNewAdmission ? 'New Admission' : '')}" style="${isNewAdmission ? 'display:none;' : ''}">
                <div class="new-admission-badge member-new-admission-badge" style="${isNewAdmission ? 'display:flex;' : 'display:none;'}">
                    <i class="fas fa-check-circle"></i> New Admission (No enrollment required)
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Semester *</label>
                <input type="number" class="form-input member-semester" placeholder="e.g. 1" min="1" max="10" required oninput="saveFormState()" value="${data?.semester || ''}">
            </div>
            ${isGame ? `
            <div class="form-group">
                <label class="form-label">In-Game ID *</label>
                <input type="text" class="form-input member-in-game-id" placeholder="e.g. OGxItachi" required oninput="saveFormState()" value="${data?.in_game_id ? data.in_game_id.replace(/"/g, '&quot;') : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">UID *</label>
                <input type="text" class="form-input member-in-game-uid" placeholder="Numbers only" pattern="[0-9]+" required oninput="saveFormState()" value="${data?.in_game_uid ? data.in_game_uid.replace(/"/g, '&quot;') : ''}">
            </div>
            ` : ''}
        </div>
    `;
    return card;
}

function renderRegistrationForm(ev) {
    const container = document.getElementById('regContainer');
    const isGroup = (ev.max_members || 1) > 1;
    const minM = Math.max(1, ev.min_members || 1);
    const maxM = Math.max(minM, ev.max_members || 1);
    const feeStr = ev.fee > 0 ? '₹' + ev.fee : 'Free';
    const teamStr = maxM <= 1 
        ? 'Solo' 
        : (minM > 1 && minM < maxM ? `Min ${minM} - Max ${maxM} Members` : `${maxM} Members`);

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

            ${ev.is_combo && ev.combo_events_details ? 
                `<div style="margin-top: 1.2rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    ${ev.combo_events_details.map(e => `
                        <div style="display: flex; align-items: stretch; background: #f8f9fa; border-radius: 16px; border: 1.5px solid #000000; padding: 0.8rem; gap: 1rem; text-align: left;">
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 75px; max-width: 75px;">
                                ${e.logo_url 
                                    ? `<img src="${e.logo_url}" alt="${e.title}" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 0.4rem; border-radius: 8px;">`
                                    : `<div style="width: 50px; height: 50px; background: var(--primary, #000000); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 8px; margin-bottom: 0.4rem; font-size: 1.2rem;">${e.title.charAt(0)}</div>`
                                }
                                <span style="font-size: 0.7rem; font-weight: 600; line-height: 1.1; text-align: center; word-wrap: break-word;">${e.title}</span>
                            </div>
                            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; font-size: 0.85rem; border-left: 1px solid #ddd; padding-left: 1rem;">
                                <div style="display: flex; align-items: flex-start; gap: 0.4rem; flex-wrap: wrap;">
                                    <span style="white-space: nowrap; font-weight: 600; color: #000;"><i class="fas fa-user-tie" style="margin-right: 0.3rem;"></i>Coordinators:</span>
                                    <span style="font-weight: 400; color: #333;">${e.coordinators || 'TBA'}</span>
                                </div>
                                <div style="display: flex; align-items: flex-start; gap: 0.4rem; flex-wrap: wrap;">
                                    <span style="white-space: nowrap; font-weight: 600; color: #000;"><i class="fas fa-hands-helping" style="margin-right: 0.3rem;"></i>Volunteers:</span>
                                    <span style="font-weight: 400; color: #333;">${e.volunteers || 'TBA'}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`
            :
                `<div style="margin-top: 1.2rem; padding: 0.9rem 1.2rem; background: #f8f9fa; border-radius: 16px; border: 1.5px solid #000000; text-align: left; font-size: 0.85rem;">
                    <div style="margin-bottom: 0.4rem; color: #000000; font-weight: 600; display: flex; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="white-space: nowrap;"><i class="fas fa-user-tie" style="margin-right: 0.4rem;"></i>Coordinators:</span>
                        <span style="font-weight: 400; color: #333333;">${ev.coordinators || 'TBA'}</span>
                    </div>
                    <div style="color: #000000; font-weight: 600; display: flex; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="white-space: nowrap;"><i class="fas fa-hands-helping" style="margin-right: 0.4rem;"></i>Volunteers:</span>
                        <span style="font-weight: 400; color: #333333;">${ev.volunteers || 'TBA'}</span>
                    </div>
                </div>`
            }
            
            ${ev.rules_text ? `
            <div style="margin-top: 1.5rem; padding: 1.5rem; background: #ffffff; border-radius: 16px; border: 1.5px solid #000000; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <h3 style="font-size: 1rem; margin-bottom: 0.8rem; color: #000000; font-family: var(--font-heading);"><i class="fas fa-scroll" style="margin-right: 0.4rem;"></i> Rules & Regulations</h3>
                <div style="font-size: 0.85rem; color: #333333; line-height: 1.6; white-space: pre-wrap; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">${ev.rules_text}</div>
            </div>
            ` : ''}
        </div>

        <!-- Registration Form -->
        <div class="reg-form-card">
            <form id="regForm" onsubmit="handleRegistration(event)">
                
                <!-- STEP 1: EMAIL VERIFICATION -->
                <div id="verificationSection">
                    <div class="reg-form-title"><i class="fas fa-envelope-open-text"></i> Step 1: Verify Your Email</div>
                    <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.2rem;">Before you can register, please provide and verify your email address. We will send you a secure verification code.</p>
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
                    <div id="otpVerifySection" style="display:none; margin-top: 1rem; padding: 1.2rem; background: #f8f9fa; border-radius: 14px; border: 1.5px solid #000000;">
                        <label class="form-label">Enter 8-Digit Verification Code</label>
                        <p style="font-size:0.75rem; color:var(--muted); margin-bottom:0.8rem;">We've sent a code to your email.</p>
                        <div style="display:flex;gap:0.5rem;">
                            <input type="text" class="form-input" id="otpInput" placeholder="00000000" maxlength="8" style="flex:1; text-align:center; font-size:1.2rem; font-weight:700; letter-spacing:4px;">
                            <button type="button" class="otp-verify-btn" id="verifyOtpBtn" onclick="verifyOtp()">
                                <i class="fas fa-check"></i> Verify
                            </button>
                        </div>
                    </div>

                    <div id="emailVerifiedBadge" style="display:none;margin-bottom:1rem;">
                        <span style="background:rgba(46,213,115,0.15);color:#2ed573;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:0.4rem;">
                            <i class="fas fa-check-circle"></i> Email Verified
                        </span>
                    </div>
                    <div class="form-group otp-section" id="otpSection" style="display:none;">
                        <p id="otpMsg" style="font-size:0.88rem;margin-top:0.4rem;padding: 0.8rem 1rem; background: #f8f9fa; border-radius: 10px; border: 1.5px solid #000000; line-height: 1.5;"></p>
                    </div>
                </div>

                <!-- STEP 2: REGISTRATION DETAILS (HIDDEN UNTIL VERIFIED) -->
                <div id="detailsSection" style="display: none; border-top: 2px dashed #000000; padding-top: 1.5rem; margin-top: 1rem;">
                    <div class="reg-form-title"><i class="fas fa-user-edit"></i> Step 2: Complete Registration Details</div>
                    
                    ${isGroup ? `
                    <div class="form-group" style="margin-bottom: 1.2rem;">
                        <label class="form-label">Team / Group Name *</label>
                        <input type="text" class="form-input" id="groupName" placeholder="Enter your team name" required oninput="saveFormState()">
                    </div>
                    <div class="team-requirement-banner">
                        <i class="fas fa-users" style="font-size: 1.1rem;"></i>
                        <div>
                            <strong>Team Size Requirement:</strong> Minimum <strong>${minM}</strong> member${minM > 1 ? 's' : ''} (including Leader) required, and up to <strong>${maxM}</strong> members allowed.
                        </div>
                    </div>
                    ` : `
                    <input type="hidden" id="groupName" value="">
                    `}

                    <!-- Side-by-side Members Grid: Member 1 (Leader) | Member 2 | Member 3 ... -->
                    <div class="members-grid ${!isGroup ? 'solo-grid' : ''}" id="allMembersGrid">
                        <!-- Populated by JS -->
                    </div>

                    ${isGroup && maxM > minM ? `
                    <button type="button" class="add-member-btn" id="addMemberBtn" onclick="addMemberCard()">
                        <i class="fas fa-plus-circle"></i> Add Team Member
                    </button>
                    ` : ''}

                    ${ev.terms_checkbox_label ? `
                    <div style="margin-top: 1.5rem; margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border: 1.5px solid #000000; border-radius: 12px; display: flex; align-items: flex-start; gap: 0.8rem;">
                        <input type="checkbox" id="termsCheckbox" required style="margin-top: 0.2rem; width: 18px; height: 18px; cursor: pointer; accent-color: #000000;">
                        <label for="termsCheckbox" style="font-size: 0.85rem; color: #000000; cursor: pointer; line-height: 1.4;">${ev.terms_checkbox_label}</label>
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

    // Populate initial members grid
    const membersGrid = document.getElementById('allMembersGrid');
    if (membersGrid) {
        // 1. Leader (Member 1)
        membersGrid.innerHTML = renderLeaderCard(isGroup);

        // 2. Pre-render required additional members according to min_members (e.g. if min is 3, render Member 2 and Member 3)
        if (isGroup && minM > 1) {
            for (let i = 2; i <= minM; i++) {
                const memberCardEl = createMemberCardElement(i, true);
                membersGrid.appendChild(memberCardEl);
            }
        }
    }

    updateAddButton();
}

function addMemberCard() {
    if (!currentEvent) return;
    const minM = Math.max(1, currentEvent.min_members || 1);
    const maxM = Math.max(minM, currentEvent.max_members || 1);
    const grid = document.getElementById('allMembersGrid');
    if (!grid) return;

    const currentTotal = grid.querySelectorAll('.member-card').length;
    if (currentTotal >= maxM) return;

    const nextIndex = currentTotal + 1;
    const isReq = nextIndex <= minM;
    const newCard = createMemberCardElement(nextIndex, isReq);
    grid.appendChild(newCard);
    
    updateAddButton();
    saveFormState();

    // Smooth scroll into view
    newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeMemberCard(index) {
    if (!currentEvent) return;
    const minM = Math.max(1, currentEvent.min_members || 1);
    if (index <= minM) {
        return;
    }

    const card = document.getElementById(`memberCard-${index}`);
    if (card) {
        card.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            card.remove();
            reindexMembers();
            updateAddButton();
            saveFormState();
        }, 250);
    }
}

function reindexMembers() {
    if (!currentEvent) return;
    const minM = Math.max(1, currentEvent.min_members || 1);
    const grid = document.getElementById('allMembersGrid');
    if (!grid) return;

    const extraCards = grid.querySelectorAll('.member-card:not(#leaderMemberCard)');
    extraCards.forEach((card, idx) => {
        const newIndex = idx + 2;
        card.id = `memberCard-${newIndex}`;
        card.dataset.memberIndex = newIndex;
        const isReq = newIndex <= minM;
        const header = card.querySelector('.member-card-header');
        if (header) {
            header.innerHTML = `
                <span class="member-card-title">
                    <i class="fas fa-user"></i> Member ${newIndex}
                </span>
                ${isReq 
                    ? `<span class="member-badge req-badge"><i class="fas fa-lock"></i> Required</span>`
                    : `<button type="button" class="member-remove-btn" onclick="removeMemberCard(${newIndex})">
                        <i class="fas fa-trash-alt"></i> Remove
                       </button>`
                }
            `;
        }
    });
}

function updateAddButton() {
    const btn = document.getElementById('addMemberBtn');
    if (!btn || !currentEvent) return;
    const minM = Math.max(1, currentEvent.min_members || 1);
    const maxM = Math.max(minM, currentEvent.max_members || 1);
    const grid = document.getElementById('allMembersGrid');
    const totalCards = grid ? grid.querySelectorAll('.member-card').length : 1;

    btn.disabled = totalCards >= maxM;
    if (totalCards >= maxM) {
        btn.innerHTML = `<i class="fas fa-check-circle"></i> Maximum team size reached (${totalCards}/${maxM})`;
    } else {
        btn.innerHTML = `<i class="fas fa-plus-circle"></i> Add Team Member (Member ${totalCards + 1})`;
    }
}

async function handleRegistration(e) {
    e.preventDefault();

    const errEl = document.getElementById('formError');
    const submitBtn = document.getElementById('submitBtn');

    // Email verification check
    if (!leaderEmailVerified) {
        errEl.textContent = 'Please verify your email address first';
        errEl.style.display = 'block';
        return;
    }

    const isGroup = (currentEvent.max_members || 1) > 1;
    let groupName = isGroup ? (document.getElementById('groupName')?.value || '').trim() : '';
    const leaderName = (document.getElementById('leaderName')?.value || '').trim();
    const leaderEmail = (document.getElementById('leaderEmail')?.value || '').trim();
    const leaderMobile = (document.getElementById('leaderMobile')?.value || '').trim();
    let leaderCollege = (document.getElementById('leaderCollege')?.value || '').trim();
    const leaderOtherCollege = (document.getElementById('leaderOtherCollege')?.value || '').trim();
    if (leaderCollege === 'Other') leaderCollege = leaderOtherCollege;
    const leaderGender = (document.getElementById('leaderGender')?.value || '').trim();
    const leaderEnrollmentType = document.getElementById('leaderEnrollmentType')?.value || 'Enrollment';
    let leaderEnrollment = (document.getElementById('leaderEnrollment')?.value || '').trim();
    if (leaderEnrollmentType === 'New Admission') {
        leaderEnrollment = 'New Admission';
    }
    const leaderSemester = parseInt(document.getElementById('leaderSemester')?.value, 10);

    if (!groupName && !isGroup) {
        groupName = leaderName;
    }

    if (isGroup && !groupName) {
        errEl.textContent = 'Please enter a Team / Group Name';
        errEl.style.display = 'block';
        document.getElementById('groupName')?.focus();
        return;
    }

    if (!leaderName || !leaderMobile || !leaderCollege || !leaderGender || !leaderEnrollment || isNaN(leaderSemester)) {
        errEl.textContent = 'Please fill all required details for Member 1 (Leader)';
        errEl.style.display = 'block';
        return;
    }

    if (!/^[0-9]{10}$/.test(leaderMobile)) {
        errEl.textContent = 'Member 1 (Leader) has an invalid 10-digit mobile number';
        errEl.style.display = 'block';
        return;
    }

    let leaderInGameId = null;
    let leaderUid = null;
    if (currentEvent.category === 'game') {
        leaderInGameId = (document.getElementById('leaderInGameId')?.value || '').trim();
        leaderUid = (document.getElementById('leaderUid')?.value || '').trim();

        if (!leaderInGameId || !leaderUid) {
            errEl.textContent = 'Please fill In-Game ID and UID for Member 1 (Leader)';
            errEl.style.display = 'block';
            return;
        }
    }

    const termsCb = document.getElementById('termsCheckbox');
    if (termsCb && !termsCb.checked) {
        errEl.textContent = 'You must agree to the terms and conditions before proceeding.';
        errEl.style.display = 'block';
        return;
    }

    // Collect and validate all additional members
    const membersData = [];
    const grid = document.getElementById('allMembersGrid');
    const extraCards = grid ? grid.querySelectorAll('.member-card:not(#leaderMemberCard)') : [];

    for (let i = 0; i < extraCards.length; i++) {
        const card = extraCards[i];
        const memberNum = i + 2;
        const name = (card.querySelector('.member-name')?.value || '').trim();
        const email = (card.querySelector('.member-email')?.value || '').trim();
        const mobile = (card.querySelector('.member-mobile')?.value || '').trim();
        let college = (card.querySelector('.member-college')?.value || '').trim();
        const otherCollege = (card.querySelector('.member-other-college')?.value || '').trim();
        if (college === 'Other') college = otherCollege;
        const gender = (card.querySelector('.member-gender')?.value || '').trim();
        const memberEnrollType = card.querySelector('.member-enrollment-type')?.value || 'Enrollment';
        let enrollment = (card.querySelector('.member-enrollment')?.value || '').trim();
        if (memberEnrollType === 'New Admission') {
            enrollment = 'New Admission';
        }
        const semester = parseInt(card.querySelector('.member-semester')?.value, 10);
        let in_game_id = null;
        let in_game_uid = null;
        if (currentEvent.category === 'game') {
            in_game_id = (card.querySelector('.member-in-game-id')?.value || '').trim();
            in_game_uid = (card.querySelector('.member-in-game-uid')?.value || '').trim();
        }

        if (!name || !email || !mobile || !college || !gender || !enrollment || isNaN(semester)) {
            errEl.textContent = `Please fill all details for Member ${memberNum}`;
            errEl.style.display = 'block';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errEl.textContent = `Member ${memberNum} (${name}) has an invalid email address`;
            errEl.style.display = 'block';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            errEl.textContent = `Member ${memberNum} (${name}) has an invalid 10-digit mobile number`;
            errEl.style.display = 'block';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (currentEvent.category === 'game') {
            if (!in_game_id || !in_game_uid) {
                errEl.textContent = `Please fill In-Game ID and UID for Member ${memberNum} (${name})`;
                errEl.style.display = 'block';
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }

        membersData.push({ name, email, mobile, gender, college, enrollment, semester, in_game_id, in_game_uid });
    }

    // Minimum participants check
    const minRequired = Math.max(1, currentEvent.min_members || 1);
    const totalTeamCount = 1 + membersData.length;
    
    if (isGroup && totalTeamCount < minRequired) {
        const needed = minRequired - totalTeamCount;
        errEl.textContent = `This event requires a minimum of ${minRequired} participants (including Leader). Currently you have ${totalTeamCount}. Please fill the remaining ${needed} member(s).`;
        errEl.style.display = 'block';
        return;
    }

    // Duplicate check (Leader Mobile)
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking details...';
    errEl.style.display = 'none';

    const evIdParam = currentEvent.is_combo ? currentEvent.combo_data.id : currentEvent.id;
    const { data: existing, error: dupError } = await checkRegistrationDuplicate(evIdParam, null, leaderMobile, currentEvent.is_combo);
    if (existing) {
        errEl.textContent = `This mobile number (${leaderMobile}) is already registered for ${currentEvent.is_combo ? 'this combo' : 'this event'}.`;
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Payment';
        return;
    }

    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

    // Save registration session data
    const regData = {
        event_id: currentEvent.id,
        group_name: groupName,
        leader_name: leaderName,
        leader_email: leaderEmail,
        leader_mobile: leaderMobile,
        leader_gender: leaderGender,
        college: leaderCollege,
        enrollment: leaderEnrollment,
        semester: leaderSemester,
        leader_in_game_id: leaderInGameId,
        leader_in_game_uid: leaderUid,
        payment_mode: 'pending',
        payment_status: 'pending'
    };

    localStorage.removeItem('regFormState');
    localStorage.removeItem('emailForSignIn');

    sessionStorage.setItem('pendingRegistration', JSON.stringify(regData));
    sessionStorage.setItem('pendingMembers', JSON.stringify(membersData));
    sessionStorage.setItem('pendingEventTitle', currentEvent.title);
    sessionStorage.setItem('pendingEventFee', currentEvent.fee);
    sessionStorage.setItem('pendingEventLogo', currentEvent.logo_url || '');
    
    if (currentEvent.is_combo) {
        sessionStorage.setItem('pendingComboData', JSON.stringify(currentEvent.combo_data));
        window.location.href = `payment.html?combo_id=${currentEvent.combo_data.id}&v=${Date.now()}`;
    } else {
        sessionStorage.setItem('pendingComboData', '');
        window.location.href = `payment.html?event_id=${currentEvent.id}&v=${Date.now()}`;
    }
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

    const evIdParam = currentEvent.is_combo ? currentEvent.combo_data.id : currentEvent.id;
    const { data: existing, error: dupError } = await checkRegistrationDuplicate(evIdParam, email, null, currentEvent.is_combo);
    if (existing) {
        otpSection.style.display = 'block';
        otpMsg.textContent = `This email (${email}) is already registered for ${currentEvent.is_combo ? 'this combo' : 'this event'}. Please use a different email.`;
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
