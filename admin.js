/* ══════════════════════════════════════
   ADMIN.JS — Super Admin Panel (v2)
   ══════════════════════════════════════ */

let allEvents = [];
let allRegs = [];
let allCombos = [];
let allArchivedCombos = [];
let allPaymentQrs = [];

/* ── Toast & Confirm (standalone for admin pages) ── */
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, duration);
}

let confirmResolver = null;
function showConfirmDialog({ title = 'Are you sure?', desc = '', icon = '⚠️', okText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
        confirmResolver = resolve;
        document.getElementById('confirmIcon').textContent = icon;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmDesc').textContent = desc;
        document.getElementById('confirmOk').textContent = okText;
        document.getElementById('confirmOk').className = danger ? 'confirm-ok danger' : 'confirm-ok';
        document.getElementById('confirmDialog').classList.add('open');
    });
}
function closeConfirm(result) {
    document.getElementById('confirmDialog').classList.remove('open');
    if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
}

/* ── Init ── */
async function initMainAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const { data: mfaLevel, error } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error || !mfaLevel || mfaLevel.currentLevel !== 'aal2') {
        // Not authenticated with 2FA, force re-login
        await supabaseClient.auth.signOut();
        sessionStorage.removeItem('mainAdmin');
        window.location.href = 'index.html';
        return;
    }

    // Passed 2FA
    await loadDashboard();
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }

    // Hide mobile menu on selection
    const mobileMenu = document.querySelector('.admin-tabs');
    if (mobileMenu) mobileMenu.classList.remove('show');
}

function toggleMobileMenu() {
    const tabs = document.querySelector('.admin-tabs');
    if (tabs) {
        tabs.classList.toggle('show');
    }
}

async function loadDashboard() {
    allEvents = await getAllEventsAdmin();
    // Sort events alphabetically
    allEvents.sort((a, b) => a.title.localeCompare(b.title));
    renderEventsTable();

    allCombos = await getAllCombosAdmin();
    renderCombosTable();
    populateComboEventsList();

    allArchivedCombos = await getArchivedRegistrations();
    renderArchivedTab();

    await updateGlobalStats();
    renderCharts();
}

async function updateGlobalStats() {
    document.getElementById('stEvents').textContent = allEvents.length;

    const { data, error } = await supabaseClient
        .from('registrations')
        .select('*, events(fee, title)');

    if (error) { console.error('Stats error:', error); return; }
    allRegs = data || [];

    document.getElementById('stRegs').textContent = allRegs.length;

    const paidRegs = allRegs.filter(r => r.payment_status === 'paid');
    const pendingRegs = allRegs.filter(r => r.payment_status === 'pending');
    const totalRev = paidRegs.reduce((sum, r) => sum + (r.amount !== undefined && r.amount !== null ? r.amount : (r.events?.fee || 0)), 0);

    document.getElementById('stRev').textContent = '₹' + totalRev;
    document.getElementById('stPending').textContent = pendingRegs.length;
}

/* ══════════════════════════════════════
   CHART.JS ANALYTICS
   ══════════════════════════════════════ */

let chartInstances = {};

function renderCharts() {
    // Destroy existing charts
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};

    renderRegsPerEventChart();
    renderRevenueChart();
    renderTrendsChart();
}

function renderRegsPerEventChart() {
    const ctx = document.getElementById('chartRegsPerEvent');
    if (!ctx) return;

    // Count registrations per event
    const eventRegCounts = {};
    allEvents.forEach(ev => { eventRegCounts[ev.title] = 0; });
    allRegs.forEach(r => {
        const title = r.events?.title || 'Unknown';
        if (eventRegCounts[title] !== undefined) eventRegCounts[title]++;
    });

    const labelsFull = Object.keys(eventRegCounts);
    const dataFull = Object.values(eventRegCounts);

    // Filter to only show events with at least 1 registration
    const filteredData = labelsFull.map((label, i) => ({ label, count: dataFull[i] }))
        .filter(item => item.count > 0);

    const labels = filteredData.map(item => item.label);
    const data = filteredData.map(item => item.count);
    const colors = labels.map((_, i) => {
        const hue = (i * 360 / labels.length) % 360;
        return `hsla(${hue}, 70%, 55%, 0.8)`;
    });

    chartInstances.regsPerEvent = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Registrations',
                data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: {
                    ticks: { color: '#A0A0C0', font: { size: 10 }, maxRotation: 45 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#A0A0C0', stepSize: 1 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function renderRevenueChart() {
    const ctx = document.getElementById('chartRevenue');
    if (!ctx) return;

    // Revenue per event (only paid)
    const eventRevenue = {};
    allRegs.filter(r => r.payment_status === 'paid').forEach(r => {
        const title = r.events?.title || 'Unknown';
        const fee = r.events?.fee || 0;
        eventRevenue[title] = (eventRevenue[title] || 0) + fee;
    });

    const labels = Object.keys(eventRevenue);
    const data = Object.values(eventRevenue);
    const colors = labels.map((_, i) => {
        const hue = (i * 360 / labels.length + 30) % 360;
        return `hsla(${hue}, 60%, 50%, 0.8)`;
    });

    if (labels.length === 0) {
        // No revenue data, show placeholder
        ctx.parentElement.innerHTML += '<p style="text-align:center;color:var(--muted);padding:2rem;">No revenue data yet.</p>';
        return;
    }

    chartInstances.revenue = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(10,10,26,0.8)',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#A0A0C0', font: { size: 11 }, padding: 12 }
                }
            }
        }
    });
}

function renderTrendsChart() {
    const ctx = document.getElementById('chartTrends');
    if (!ctx) return;

    // Group registrations by day (last 7 days)
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        days.push(label);
        const dayCount = allRegs.filter(r => r.created_at && r.created_at.startsWith(key)).length;
        counts.push(dayCount);
    }

    chartInstances.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Registrations',
                data: counts,
                borderColor: '#7B2FBE',
                backgroundColor: 'rgba(123,47,190,0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FF6B35',
                pointBorderColor: '#FF6B35',
                pointRadius: 5,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: {
                    ticks: { color: '#A0A0C0' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#A0A0C0', stepSize: 1 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

/* ══════════════════════════════════════
   EVENTS TABLE
   ══════════════════════════════════════ */

function renderEventsTable() {
    const tbody = document.getElementById('evTableBody');

    if (allEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted);">No events found. Create one!</td></tr>';
        return;
    }

    const term = (document.getElementById('evSearchBox')?.value || '').toLowerCase();
    const filtered = allEvents.filter(ev => ev.title.toLowerCase().includes(term) || ev.category.includes(term));

    tbody.innerHTML = filtered.map((ev) => {
        const logo = ev.logo_url
            ? `<img src="${ev.logo_url}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">`
            : `<div style="width:40px;height:40px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;"><i class="fas fa-trophy"></i></div>`;

        const fee = ev.fee > 0 ? '₹' + ev.fee : 'Free';
        let team = 'Solo';
        if (ev.max_members > 1) {
            if (ev.min_members && ev.min_members !== ev.max_members && ev.min_members > 1) {
                team = `${ev.min_members} - ${ev.max_members} Members`;
            } else if (ev.min_members === 1 && ev.max_members > 1) {
                team = `1 - ${ev.max_members} Members`;
            } else {
                team = `${ev.max_members} Members`;
            }
        }
        const active = ev.is_active
            ? `<span style="color:#2ed573;"><i class="fas fa-eye"></i> Active</span>`
            : `<span style="color:#ff4757;"><i class="fas fa-eye-slash"></i> Hidden</span>`;

        const coordText = ev.coordinators ? `<div style="font-size:0.72rem;color:#555;font-weight:normal;margin-top:2px;"><i class="fas fa-user-tie" style="margin-right:3px;"></i>Coordinators: ${ev.coordinators}</div>` : '';
        const volunText = ev.volunteers ? `<div style="font-size:0.72rem;color:#555;font-weight:normal;"><i class="fas fa-hands-helping" style="margin-right:3px;"></i>Volunteers: ${ev.volunteers}</div>` : '';

        return `
            <tr>
                <td>${logo}</td>
                <td style="font-weight:600;">
                    ${ev.title}
                    ${coordText}
                    ${volunText}
                </td>
                <td style="text-transform:capitalize;">${ev.category}</td>
                <td>${fee}</td>
                <td>${team}</td>
                <td>${active}</td>
                <td>
                    <button class="action-btn edit" onclick="openEditEventModal('${ev.id}')" title="Edit Event & Staff"><i class="fas fa-edit"></i></button>
                    <button class="action-btn pass" onclick="changePassword('${ev.id}', '${ev.title.replace(/'/g, "\\'")}')" title="Change Event Password"><i class="fas fa-key"></i></button>
                    <button class="action-btn edit" onclick="toggleVisibility('${ev.id}', ${ev.is_active})" title="${ev.is_active ? 'Hide Event' : 'Show Event'}"><i class="fas ${ev.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                    <button class="action-btn delete" onclick="deleteEv('${ev.id}', '${ev.title.replace(/'/g, "\\'")}')" title="Delete Event"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEventsTable() { renderEventsTable(); }

async function toggleVisibility(id, currentStatus) {
    const confirmed = await showConfirmDialog({
        title: currentStatus ? 'Hide Event?' : 'Show Event?',
        desc: `This will ${currentStatus ? 'remove the event from' : 'add the event to'} the main page.`,
        icon: currentStatus ? '🙈' : '👁️',
        okText: currentStatus ? 'Hide' : 'Show',
    });
    if (!confirmed) return;

    const { error } = await updateEvent(id, { is_active: !currentStatus });
    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast(`Event ${currentStatus ? 'hidden' : 'shown'} on main page`, 'success');
    await loadDashboard();
}

async function changePassword(id, title) {
    const newPass = prompt(`Enter NEW password for event: ${title}`);
    if (!newPass) return;

    const { error } = await updateEventPassword(id, newPass);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast(`Password for "${title}" updated!`, 'success');
}

async function deleteEv(id, title) {
    const confirmed = await showConfirmDialog({
        title: '⚠️ Delete Event?',
        desc: `This will permanently delete "${title}" and ALL registrations associated with it. This cannot be undone.`,
        icon: '🗑️',
        okText: 'Delete Forever',
        danger: true,
    });
    if (!confirmed) return;

    const { error } = await deleteEvent(id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast(`"${title}" deleted successfully`, 'success');
    await loadDashboard();
}

/* ── Edit Event Modal Functions ── */
function openEditEventModal(id) {
    const ev = allEvents.find(e => e.id === id);
    if (!ev) return;

    document.getElementById('editEvId').value = ev.id;
    document.getElementById('editEvTitle').value = ev.title || '';
    document.getElementById('editEvCat').value = ev.category || 'tech';
    document.getElementById('editEvType').value = ev.type || 'individual';
    document.getElementById('editEvMembers').value = ev.max_members || 1;
    document.getElementById('editEvMinMembers').value = ev.min_members || 1;
    document.getElementById('editEvFee').value = ev.fee !== undefined ? ev.fee : 0;
    document.getElementById('editEvColor').value = ev.color || '#7B2FBE';
    document.getElementById('editEvCoordinators').value = ev.coordinators || '';
    document.getElementById('editEvVolunteers').value = ev.volunteers || '';
    document.getElementById('editEvDesc').value = ev.description || '';
    document.getElementById('editEvRules').value = ev.rules_text || '';
    document.getElementById('editEvTermsLabel').value = ev.terms_checkbox_label || '';
    document.getElementById('editEvPass').value = ev.password || '';
    document.getElementById('editEvPaymentQr').value = ev.payment_qr_id || '';
    document.getElementById('editEvLogo').value = '';
    document.getElementById('editEvError').style.display = 'none';

    const preview = document.getElementById('editLogoPreview');
    const img = document.getElementById('editLogoPreviewImg');
    if (ev.logo_url) {
        img.src = ev.logo_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    document.getElementById('editEventModal').classList.add('open');
}

function closeEditEventModal() {
    document.getElementById('editEventModal').classList.remove('open');
}

function previewEditLogo(input) {
    const preview = document.getElementById('editLogoPreview');
    const img = document.getElementById('editLogoPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitEventEdit() {
    const id = document.getElementById('editEvId').value;
    const ev = allEvents.find(e => e.id === id);
    if (!ev) return;

    const btn = document.getElementById('saveEventEditBtn');
    const errEl = document.getElementById('editEvError');
    errEl.style.display = 'none';

    const title = document.getElementById('editEvTitle').value.trim();
    const cat = document.getElementById('editEvCat').value;
    const type = document.getElementById('editEvType').value;
    const max = parseInt(document.getElementById('editEvMembers').value, 10);
    const min = parseInt(document.getElementById('editEvMinMembers')?.value || '1', 10);
    const fee = parseInt(document.getElementById('editEvFee').value, 10);
    const color = document.getElementById('editEvColor').value;
    const logoFile = document.getElementById('editEvLogo').files[0];
    const desc = document.getElementById('editEvDesc').value.trim();
    const rules = document.getElementById('editEvRules').value.trim();
    const termsLabel = document.getElementById('editEvTermsLabel').value.trim();
    const pass = document.getElementById('editEvPass').value.trim();

    if (!title || isNaN(max) || isNaN(fee)) {
        errEl.textContent = 'Please fill all required (*) fields correctly.';
        errEl.style.display = 'block';
        return;
    }

    if (min > max) {
        errEl.textContent = 'Minimum members cannot exceed maximum members.';
        errEl.style.display = 'block';
        return;
    }

    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    let logoUrl = ev.logo_url;
    if (logoFile) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing logo...';
        const compressedLogo = await compressImageFile(logoFile, 500, 500, 0.8);

        const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const filePath = `event_logos/${safeName}_${Date.now()}.webp`;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading logo...';

        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('trividhya_images')
            .upload(filePath, compressedLogo, {
                cacheControl: '31536000',
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            errEl.textContent = 'Logo upload failed: ' + uploadError.message;
            errEl.style.display = 'block';
            showToast('Logo upload failed', 'error');
            return;
        }

        const { data: urlData } = supabaseClient
            .storage
            .from('trividhya_images')
            .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
    }

    let badge = 'Tech';
    if (cat === 'nontech') badge = 'Fun';
    if (cat === 'game') badge = 'Gaming';

    const coordinators = document.getElementById('editEvCoordinators').value.trim();
    const volunteers = document.getElementById('editEvVolunteers').value.trim();
    const paymentQr = document.getElementById('editEvPaymentQr').value || null;

    const updates = {
        title, description: desc, rules_text: rules, terms_checkbox_label: termsLabel, category: cat, type, fee,
        max_members: max, min_members: min, logo_url: logoUrl, color, badge,
        coordinators, volunteers, payment_qr_id: paymentQr
    };

    if (pass) {
        updates.password = pass;
    }

    let { data, error } = await updateEvent(id, updates);

    // Fallback if min_members column does not exist yet in DB table
    if (error && error.message && error.message.includes('min_members')) {
        delete updates.min_members;
        const res = await updateEvent(id, updates);
        error = res.error;
    }

    btn.innerHTML = oldHtml;
    btn.disabled = false;

    if (error) {
        errEl.textContent = 'Error: ' + error.message;
        errEl.style.display = 'block';
        showToast('Failed to update event', 'error');
        return;
    }

    showToast(`Event "${title}" updated successfully! 🎉`, 'success');
    closeEditEventModal();
    await loadDashboard();
}

/* ── Logo Preview ── */
function previewLogo(input) {
    const preview = document.getElementById('logoPreview');
    const img = document.getElementById('logoPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
    }
}

/* ── Add New Event ── */
async function submitNewEvent() {
    const btn = document.getElementById('createEventBtn');
    const errEl = document.getElementById('addError');
    errEl.style.display = 'none';

    const title = document.getElementById('addTitle').value.trim();
    const cat = document.getElementById('addCat').value;
    const type = document.getElementById('addType').value;
    const max = parseInt(document.getElementById('addMembers').value, 10);
    const min = parseInt(document.getElementById('addMinMembers')?.value || '1', 10);
    const fee = parseInt(document.getElementById('addFee').value, 10);
    const color = document.getElementById('addColor').value;
    const logoFile = document.getElementById('addLogo').files[0];
    const desc = document.getElementById('addDesc').value.trim();
    const rules = document.getElementById('addRules').value.trim();
    const termsLabel = document.getElementById('addTermsLabel').value.trim();
    const pass = document.getElementById('addPass').value.trim();

    if (!title || !pass || isNaN(max) || isNaN(fee)) {
        errEl.textContent = 'Please fill all required (*) fields correctly.';
        errEl.style.display = 'block';
        return;
    }

    if (min > max) {
        errEl.textContent = 'Minimum members cannot exceed maximum members.';
        errEl.style.display = 'block';
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    // Upload logo to Supabase Storage if provided
    let logoUrl = '';
    if (logoFile) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing logo...';
        const compressedLogo = await compressImageFile(logoFile, 500, 500, 0.8);

        const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const filePath = `event_logos/${safeName}_${Date.now()}.webp`;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading logo...';

        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('trividhya_images')
            .upload(filePath, compressedLogo, {
                cacheControl: '31536000',
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) {
            btn.innerHTML = '<i class="fas fa-save"></i> Create Event';
            btn.disabled = false;
            errEl.textContent = 'Logo upload failed: ' + uploadError.message;
            errEl.style.display = 'block';
            showToast('Logo upload failed', 'error');
            return;
        }

        // Get public URL
        const { data: urlData } = supabaseClient
            .storage
            .from('trividhya_images')
            .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating event...';

    let badge = 'Tech';
    if (cat === 'nontech') badge = 'Fun';
    if (cat === 'game') badge = 'Gaming';

    const coordinators = document.getElementById('addCoordinators').value.trim();
    const volunteers = document.getElementById('addVolunteers').value.trim();
    const paymentQr = document.getElementById('addPaymentQr').value || null;

    const newEvent = {
        title, description: desc, rules_text: rules, terms_checkbox_label: termsLabel, category: cat, type, fee,
        max_members: max, min_members: min, logo_url: logoUrl, color, badge,
        password: pass, is_active: true,
        coordinators, volunteers, payment_qr_id: paymentQr
    };

    let { data, error } = await createEvent(newEvent);

    // Fallback if min_members column does not exist yet in DB table
    if (error && error.message && error.message.includes('min_members')) {
        delete newEvent.min_members;
        const res = await createEvent(newEvent);
        error = res.error;
    }

    btn.innerHTML = '<i class="fas fa-save"></i> Create Event';
    btn.disabled = false;

    if (error) {
        errEl.textContent = 'Error: ' + error.message;
        errEl.style.display = 'block';
        showToast('Failed to create event', 'error');
        return;
    }

    showToast(`Event "${title}" created successfully! 🎉`, 'success');

    // Clear form
    document.getElementById('addTitle').value = '';
    document.getElementById('addPass').value = '';
    document.getElementById('addDesc').value = '';
    document.getElementById('addRules').value = '';
    document.getElementById('addTermsLabel').value = '';
    document.getElementById('addCoordinators').value = '';
    document.getElementById('addVolunteers').value = '';
    document.getElementById('addPaymentQr').value = '';
    document.getElementById('addLogo').value = '';
    document.getElementById('logoPreview').style.display = 'none';

    // Refresh & switch tab
    await loadDashboard();
    switchTab('events', document.querySelectorAll('.tab-btn')[1]);
}

async function logoutAdmin() {
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem('mainAdmin');
    window.location.href = 'index.html';
}

/* ══════════════════════════════════════
   GAME DETAILS TAB
   ══════════════════════════════════════ */

/* ── Generic Registration Details Renderer ── */
async function renderRegDetails(categories, containerId, searchTerm = '') {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner"></i> Loading details...</div>';

    // Filter relevant events
    const events = allEvents.filter(ev => categories.includes(ev.category));

    // Fetch registrations for each event
    const eventData = [];
    const term = searchTerm.toLowerCase().trim();

    for (const ev of events) {
        let regs = await getRegistrationsByEvent(ev.id);

        // Filter by search term
        if (term) {
            regs = regs.filter(r => {
                const teamMatch = (r.group_name || '').toLowerCase().includes(term) || (r.team_name || '').toLowerCase().includes(term);
                const leaderMatch = (r.leader_name || '').toLowerCase().includes(term) || (r.leader_email || '').toLowerCase().includes(term) || (r.leader_phone || r.leader_mobile || '').toLowerCase().includes(term);
                const membersMatch = r.members && r.members.some(m => (m.name || '').toLowerCase().includes(term));
                return teamMatch || leaderMatch || membersMatch;
            });
        }

        if (regs.length > 0) {
            eventData.push({ event: ev, regs });
        }
    }

    if (eventData.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:var(--muted);">
                <i class="fas fa-info-circle" style="font-size:3rem; margin-bottom:1rem; display:block; opacity:0.3;"></i>
                <p>No registrations found.</p>
            </div>`;
        return;
    }

    container.innerHTML = eventData.map(({ event, regs }) => {
        const totalParticipants = regs.reduce((sum, r) => sum + 1 + (r.members?.length || 0), 0);
        const paidCount = regs.filter(r => r.payment_status === 'paid').length;
        const pendingCount = regs.filter(r => r.payment_status === 'pending').length;

        const teamsHtml = regs.map((r) => {
            const membersArr = r.members || [];
            const membersHtml = membersArr.length > 0
                ? membersArr.map(m => `
                    <div style="display:flex; align-items:center; gap:0.8rem; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                        <i class="fas fa-user" style="color:var(--muted); font-size:0.7rem;"></i>
                        <span style="font-size:0.82rem;">${m.name}</span>
                        <span style="color:var(--muted); font-size:0.75rem;">${m.gender || 'N/A'}</span>
                        <span style="color:var(--muted); font-size:0.75rem;">${m.mobile || ''}</span>
                    </div>`).join('')
                : '<p style="color:var(--muted); font-size:0.8rem; padding:0.5rem 0;">No additional members</p>';

            const statusBadge = r.payment_status === 'paid'
                ? '<span style="background:rgba(46,213,115,0.15); color:#2ed573; padding:0.2rem 0.6rem; border-radius:50px; font-size:0.72rem; font-weight:600;">PAID</span>'
                : '<span style="background:rgba(255,165,2,0.15); color:#ffa502; padding:0.2rem 0.6rem; border-radius:50px; font-size:0.72rem; font-weight:600;">PENDING</span>';

            const comboNameText = r.combos && r.combos.name ? `Combo Deal: ${r.combos.name}` : 'Combo Deal';
            const regTypeBadge = r.is_combo
                ? `<span style="background:rgba(142,68,173,0.15); color:#8e44ad; border: 1px solid rgba(142,68,173,0.3); padding:0.2rem 0.5rem; border-radius:50px; font-size:0.65rem; font-weight:700; text-transform:uppercase; margin-left:0.5rem;">${comboNameText}</span>`
                : '<span style="background:rgba(41,128,185,0.15); color:#2980b9; border: 1px solid rgba(41,128,185,0.3); padding:0.2rem 0.5rem; border-radius:50px; font-size:0.65rem; font-weight:700; text-transform:uppercase; margin-left:0.5rem;">Single Event</span>';

            const priceText = r.amount !== undefined && r.amount !== null ? `₹${r.amount}` : `₹${event.fee}`;

            const approveBtnHtml = r.payment_status !== 'paid' ?
                `<button class="action-btn success" style="padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="approveRegPrompt('${r.id}')"><i class="fas fa-check"></i> Approve</button>` : '';
            const deleteBtnHtml = `<button class="action-btn danger" style="padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="deleteRegPrompt('${r.id}')"><i class="fas fa-trash"></i> Delete</button>`;

            return `
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(123,47,190,0.15); border-radius:14px; padding:1rem 1.2rem; margin-bottom:0.8rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
                        <div style="display:flex; align-items:center;">
                            <span style="font-weight:700; font-size:0.95rem;">${r.group_name || r.team_name || 'Individual'}</span>
                            ${regTypeBadge}
                            <span style="color:var(--muted); font-size:0.78rem; margin-left:0.5rem;">by ${r.leader_name}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.8rem;">
                            <span style="color:var(--gold); font-weight:800; font-size:0.9rem;">${priceText}</span>
                            ${statusBadge}
                        </div>
                    </div>
                    <div style="padding-left:0.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                            <div>
                                <div style="display:flex; align-items:center; gap:0.8rem; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                                    <i class="fas fa-crown" style="color:var(--gold); font-size:0.7rem;"></i>
                                    <span style="font-size:0.82rem; font-weight:600;">${r.leader_name}</span>
                                    <span style="color:var(--muted); font-size:0.75rem;">${r.leader_gender || 'N/A'}</span>
                                    <span style="color:var(--muted); font-size:0.75rem;">${r.leader_phone || r.leader_mobile}</span>
                                    <span style="color:var(--muted); font-size:0.75rem;">${r.leader_email || ''}</span>
                                    <span style="color:var(--gold); font-size:0.68rem; font-weight:600;">LEADER</span>
                                </div>
                                ${membersHtml}
                            </div>
                            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                                ${approveBtnHtml}
                                ${deleteBtnHtml}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        return `
            <div style="margin-bottom:2rem;">
                <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                    ${event.logo_url ? `<img src="${event.logo_url}" style="width:45px;height:45px;object-fit:cover;border-radius:10px;">` : ''}
                    <div>
                        <h4 style="font-size:1.1rem; font-weight:700;">${event.title}</h4>
                        <div style="display:flex; gap:1.5rem; font-size:0.78rem; color:var(--muted); margin-top:0.2rem;">
                            <span><i class="fas fa-users" style="margin-right:0.3rem;color:var(--primary);"></i>${totalParticipants} Participants</span>
                            <span><i class="fas fa-trophy" style="margin-right:0.3rem;color:var(--gold);"></i>${regs.length} Teams</span>
                            <span style="color:#2ed573;"><i class="fas fa-check-circle" style="margin-right:0.3rem;"></i>${paidCount} Paid</span>
                            <span style="color:#ffa502;"><i class="fas fa-clock" style="margin-right:0.3rem;"></i>${pendingCount} Pending</span>
                        </div>
                    </div>
                </div>
                ${teamsHtml}
            </div>
            <hr style="border:none; border-top:1px solid rgba(123,47,190,0.15); margin-bottom:2rem;">`;
    }).join('');
}

async function renderGameDetailsTab() {
    const searchTerm = document.getElementById('gameSearchInput')?.value || '';
    await renderRegDetails(['game'], 'gameDetailsContainer', searchTerm);
}

async function renderEventDetailsTab() {
    const searchTerm = document.getElementById('eventSearchInput')?.value || '';
    await renderRegDetails(['tech', 'nontech'], 'eventDetailsContainer', searchTerm);
}

async function approveRegPrompt(id) {
    const confirm = await showConfirmDialog({
        title: 'Approve Registration?',
        desc: 'Mark this registration as PAID? This will approve their participation.',
        okText: 'Approve'
    });
    if (confirm) {
        const res = await approveRegistration(id);
        if (res.success) {
            showToast('Registration approved successfully', 'success');
            // Re-render tabs to reflect changes
            renderGameDetailsTab();
            renderEventDetailsTab();
            updateGlobalStats();
        } else {
            showToast('Failed to approve registration', 'error');
        }
    }
}

async function deleteRegPrompt(id) {
    const confirm = await showConfirmDialog({
        title: 'Delete Registration?',
        desc: 'Are you sure you want to permanently delete this registration?',
        danger: true,
        okText: 'Delete'
    });
    if (confirm) {
        const res = await deleteRegistration(id);
        if (res.success) {
            showToast('Registration deleted', 'success');
            renderGameDetailsTab();
            renderEventDetailsTab();
            updateGlobalStats();
        } else {
            showToast('Failed to delete registration', 'error');
        }
    }
}


/* ══════════════════════════════════════
   SITE SETTINGS TAB
   ══════════════════════════════════════ */

async function loadSiteSettingsAdmin() {
    const settings = await getSiteSettings();
    if (!settings) return;

    document.getElementById('setNavbarTitle').value = settings.navbar_title || '';
    document.getElementById('setHeroTitle').value = settings.hero_title || '';
    document.getElementById('setEventDates').value = settings.event_dates || '';
    document.getElementById('setEventVenue').value = settings.event_venue || '';

    // Show existing QR code if present
    if (settings.qr_url) {
        document.getElementById('qrPreviewArea').style.display = 'block';
        document.getElementById('qrPreviewImg').src = settings.qr_url;
    }
}

function previewQrCode(input) {
    const area = document.getElementById('qrPreviewArea');
    const img = document.getElementById('qrPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            area.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        area.style.display = 'none';
        img.src = '';
    }
}

async function updateSiteSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    const msgEl = document.getElementById('settingsMsg');

    const navbarTitle = document.getElementById('setNavbarTitle').value.trim();
    const heroTitle = document.getElementById('setHeroTitle').value.trim();
    const eventDates = document.getElementById('setEventDates').value.trim();
    const eventVenue = document.getElementById('setEventVenue').value.trim();
    const qrFileInput = document.getElementById('setQrUrl');

    if (!navbarTitle && !heroTitle && !eventDates && !eventVenue && (!qrFileInput.files || qrFileInput.files.length === 0)) {
        msgEl.textContent = 'Please fill at least one field or upload a QR core.';
        msgEl.style.color = '#ff4757';
        msgEl.style.display = 'block';
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const updates = {};
    if (navbarTitle) updates.navbar_title = navbarTitle;
    if (heroTitle) updates.hero_title = heroTitle;
    if (eventDates) updates.event_dates = eventDates;
    if (eventVenue) updates.event_venue = eventVenue;

    // Handle QR image upload if selected
    if (qrFileInput.files && qrFileInput.files.length > 0) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing QR...';
        const file = qrFileInput.files[0];
        const compressedQr = await compressImageFile(file, 800, 800, 0.8);

        const fileName = `qr_codes/qr_${Date.now()}.webp`;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading QR...';

        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('trividhya_images')
            .upload(fileName, compressedQr, {
                cacheControl: '31536000',
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            console.error('QR Upload error:', uploadError);
            msgEl.textContent = 'Error uploading QR code. Is bucket public?';
            msgEl.style.color = '#ff4757';
            msgEl.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
            btn.disabled = false;
            return;
        }

        const { data: publicUrlData } = supabaseClient
            .storage
            .from('trividhya_images')
            .getPublicUrl(fileName);

        updates.qr_url = publicUrlData.publicUrl;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving to DB...';
    const result = await updateSiteSettingsDB(updates);

    btn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
    btn.disabled = false;

    if (result.error) {
        msgEl.textContent = 'Error: ' + result.error.message;
        msgEl.style.color = '#ff4757';
        msgEl.style.display = 'block';
        showToast('Failed to save settings', 'error');
    } else {
        msgEl.textContent = '✅ Settings saved successfully!';
        msgEl.style.color = '#2ed573';
        msgEl.style.display = 'block';
        showToast('Homepage settings updated! 🎉', 'success');

        // Clear file input so it doesn't re-upload on next save
        if (qrFileInput) qrFileInput.value = '';

        setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    }
}

/* ══════════════════════════════════════
   COMBOS MANAGEMENT
   ══════════════════════════════════════ */

function renderCombosTable() {
    const tbody = document.getElementById('cbTableBody');
    if (!tbody) return;

    if (allCombos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--muted);">No combos found. Create one above!</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    allCombos.forEach(combo => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 600; color: #fff;">${combo.name}</td>
            <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${combo.description || '-'}</td>
            <td>${combo.min_members} - ${combo.max_members}</td>
            <td style="color: var(--gold); font-weight: bold;">₹${combo.total_fee}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${combo.is_active ? 'checked' : ''} onchange="toggleComboVisibility('${combo.id}', ${combo.is_active})">
                    <span class="slider"></span>
                </label>
            </td>
            <td>
                <button class="action-btn" onclick="openEditComboModal('${combo.id}')" title="Edit Combo" style="margin-right: 0.5rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn danger" onclick="deleteComboPrompt('${combo.id}')" title="Delete Combo">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateComboEventsList() {
    const container = document.getElementById('comboEventsList');
    if (!container) return;

    if (allEvents.length === 0) {
        container.innerHTML = '<div style="color: var(--muted);">No events available to create a combo.</div>';
        return;
    }

    container.innerHTML = '';
    allEvents.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'combo-ev-item';
        item.dataset.title = ev.title.toLowerCase();
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '1rem';
        item.style.marginBottom = '0.8rem';
        item.innerHTML = `
            <label style="flex: 1; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" class="combo-ev-checkbox" value="${ev.id}">
                <span>${ev.title}</span>
            </label>
        `;
        container.appendChild(item);
    });
}

function previewComboLogo(input) {
    const area = document.getElementById('comboLogoPreviewArea');
    const img = document.getElementById('comboLogoPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            area.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function filterComboEvents() {
    const searchVal = document.getElementById('comboEventSearch').value.toLowerCase().trim();
    const items = document.querySelectorAll('.combo-ev-item');
    items.forEach(item => {
        if (item.dataset.title.includes(searchVal)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function calculateComboTotal() {
    // Deprecated, no longer used as price is manually entered
}

async function submitNewCombo() {
    const title = document.getElementById('addComboTitle').value.trim();
    const desc = document.getElementById('addComboDesc').value.trim();
    const minM = parseInt(document.getElementById('addComboMin').value) || 1;
    const maxM = parseInt(document.getElementById('addComboMax').value) || 1;

    if (!title) {
        showToast('Combo Title is required', 'error');
        return;
    }
    if (minM > maxM) {
        showToast('Min members cannot exceed max members', 'error');
        return;
    }

    const selectedEvents = [];
    document.querySelectorAll('.combo-ev-checkbox:checked').forEach(cb => {
        selectedEvents.push({ event_id: cb.value });
    });
    const totalFee = parseInt(document.getElementById('comboTotalPrice').value) || 0;
    const paymentQrId = document.getElementById('addComboPaymentQr') ? document.getElementById('addComboPaymentQr').value : null;

    if (selectedEvents.length < 2) {
        showToast('A combo must have at least 2 events', 'error');
        return;
    }

    const btn = document.querySelector('#tab-combos .action-btn.primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    // Handle Image Upload
    let imageUrl = null;
    const logoInput = document.getElementById('addComboLogo');
    if (logoInput && logoInput.files && logoInput.files[0]) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing logo...';
        const logoFile = logoInput.files[0];
        try {
            const compressedLogo = await compressImageFile(logoFile, 2000, 2000, 0.95);
            const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const filePath = `combo_logos/${safeName}_${Date.now()}.webp`;

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading logo...';
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('trividhya_images')
                .upload(filePath, compressedLogo, {
                    cacheControl: '31536000',
                    contentType: 'image/webp',
                    upsert: true
                });

            if (uploadError) {
                btn.innerHTML = originalText;
                btn.disabled = false;
                showToast('Logo upload failed: ' + uploadError.message, 'error');
                return;
            }

            const { data: urlData } = supabaseClient
                .storage
                .from('trividhya_images')
                .getPublicUrl(filePath);

            imageUrl = urlData.publicUrl;
        } catch (e) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            showToast('Error processing logo: ' + e.message, 'error');
            return;
        }
    }

    const newCombo = {
        name: title,
        description: desc,
        min_members: minM,
        max_members: maxM,
        events_data: selectedEvents,
        total_fee: totalFee,
        image_url: imageUrl,
        payment_qr_id: paymentQrId || null,
        is_active: true
    };

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Combo...';
    const result = await createCombo(newCombo);

    btn.innerHTML = originalText;
    btn.disabled = false;

    if (result.error) {
        showToast('Error creating combo: ' + result.error.message, 'error');
    } else {
        showToast('Combo created successfully!', 'success');
        document.getElementById('addComboTitle').value = '';
        document.getElementById('addComboDesc').value = '';
        if (document.getElementById('addComboLogo')) document.getElementById('addComboLogo').value = '';
        if (document.getElementById('comboLogoPreviewArea')) document.getElementById('comboLogoPreviewArea').style.display = 'none';
        document.querySelectorAll('.combo-ev-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('comboTotalPrice').value = '0';
        if (document.getElementById('addComboPaymentQr')) document.getElementById('addComboPaymentQr').value = '';

        // Refresh combos
        allCombos = await getAllCombosAdmin();
        renderCombosTable();
    }
}

async function toggleComboVisibility(id, currentStatus) {
    const { error } = await supabaseClient.from('combos').update({ is_active: !currentStatus }).eq('id', id);
    if (error) {
        showToast('Failed to update visibility', 'error');
        allCombos = await getAllCombosAdmin();
        renderCombosTable(); // Revert toggle
    } else {
        showToast('Combo visibility updated', 'success');
        allCombos = await getAllCombosAdmin();
        renderCombosTable();
    }
}

async function deleteComboPrompt(id) {
    const confirm = await showConfirmDialog({
        title: 'Delete Combo?',
        desc: 'Are you sure you want to delete this combo? This action cannot be undone.',
        danger: true,
        okText: 'Delete'
    });
    if (confirm) {
        const res = await deleteCombo(id);
        if (res.success) {
            showToast('Combo deleted', 'success');
            allCombos = await getAllCombosAdmin();
            renderCombosTable();
        } else {
            // Normal delete failed, likely due to registered users constraint. Ask for force delete.
            const forceConfirm = await showConfirmDialog({
                title: 'Force Delete Combo?',
                desc: 'This combo likely has registered users. Do you want to force delete it? This will delete ALL registrations and users associated with this combo. This action cannot be undone.',
                danger: true,
                okText: 'Force Delete'
            });
            if (forceConfirm) {
                const forceRes = await forceDeleteCombo(id);
                if (forceRes.success) {
                    showToast('Combo force deleted successfully', 'success');
                    allCombos = await getAllCombosAdmin();
                    renderCombosTable();
                } else {
                    showToast('Force delete failed', 'error');
                }
            }
        }
    }
}

/* ── Edit Combo Logic ── */
async function openEditComboModal(id) {
    const combo = allCombos.find(c => c.id === id);
    if (!combo) return;

    document.getElementById('editComboId').value = combo.id;
    document.getElementById('editComboName').value = combo.name;
    document.getElementById('editComboMax').value = combo.max_members;
    document.getElementById('editComboMin').value = combo.min_members || 1;
    document.getElementById('editComboDesc').value = combo.description || '';
    document.getElementById('editComboActive').value = combo.is_active ? 'true' : 'false';
    if (document.getElementById('editComboPaymentQr')) {
        document.getElementById('editComboPaymentQr').value = combo.payment_qr_id || '';
    }

    // Logo preview
    const logoArea = document.getElementById('editComboLogoPreviewArea');
    const logoImg = document.getElementById('editComboLogoPreviewImg');
    if (combo.image_url) {
        logoImg.src = combo.image_url;
        logoArea.style.display = 'block';
    } else {
        logoArea.style.display = 'none';
        logoImg.src = '';
    }
    document.getElementById('editComboLogo').value = '';

    // Events list
    const container = document.getElementById('editComboEventsList');
    container.innerHTML = '';

    if (allEvents.length === 0) {
        container.innerHTML = '<div style="color: var(--muted);">No events available.</div>';
    } else {
        allEvents.forEach(ev => {
            const eventsData = combo.events_data || [];
            const isSelected = eventsData.find(e => e.event_id === ev.id);
            const allocation = isSelected ? isSelected.allocation : 0;

            const item = document.createElement('div');
            item.className = 'edit-combo-ev-item';
            item.dataset.title = ev.title.toLowerCase();
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '1rem';
            item.style.marginBottom = '0.8rem';
            item.innerHTML = `
                <label style="flex: 1; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" class="edit-combo-ev-checkbox" value="${ev.id}" ${isSelected ? 'checked' : ''}>
                    <span>${ev.title}</span>
                </label>
            `;
            container.appendChild(item);
        });
    }

    document.getElementById('editComboTotalPrice').value = combo.total_fee || 0;
    document.getElementById('editComboError').style.display = 'none';
    document.getElementById('editComboModal').classList.add('open');
}

function closeEditComboModal() {
    document.getElementById('editComboModal').classList.remove('open');
}

function filterEditComboEvents() {
    const q = document.getElementById('editComboEventSearch').value.toLowerCase();
    const items = document.querySelectorAll('.edit-combo-ev-item');
    items.forEach(item => {
        if (item.dataset.title.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function calculateEditComboTotal() {
    // Deprecated, no longer used
}

function previewEditComboLogo(input) {
    const area = document.getElementById('editComboLogoPreviewArea');
    const img = document.getElementById('editComboLogoPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            area.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitComboEdit() {
    const id = document.getElementById('editComboId').value;
    const name = document.getElementById('editComboName').value.trim();
    const desc = document.getElementById('editComboDesc').value.trim();
    const minM = parseInt(document.getElementById('editComboMin').value) || 1;
    const maxM = parseInt(document.getElementById('editComboMax').value) || 1;
    const isActive = document.getElementById('editComboActive').value === 'true';
    const errEl = document.getElementById('editComboError');

    errEl.style.display = 'none';

    if (!name) {
        errEl.textContent = 'Combo Name is required';
        errEl.style.display = 'block';
        return;
    }
    if (minM > maxM) {
        errEl.textContent = 'Min members cannot exceed max members';
        errEl.style.display = 'block';
        return;
    }

    const selectedEvents = [];
    document.querySelectorAll('.edit-combo-ev-checkbox:checked').forEach(cb => {
        selectedEvents.push({ event_id: cb.value });
    });
    const totalFee = parseInt(document.getElementById('editComboTotalPrice').value) || 0;

    if (selectedEvents.length < 2) {
        errEl.textContent = 'A combo must have at least 2 events';
        errEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('saveComboEditBtn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    let imageUrl = null;
    const logoInput = document.getElementById('editComboLogo');

    // Check if new image was uploaded
    if (logoInput && logoInput.files && logoInput.files[0]) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing image...';
        const logoFile = logoInput.files[0];
        try {
            const compressedLogo = await compressImageFile(logoFile, 2000, 2000, 0.95);
            const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const filePath = `combo_logos/${safeName}_${Date.now()}.webp`;

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('trividhya_images')
                .upload(filePath, compressedLogo, {
                    cacheControl: '31536000',
                    contentType: 'image/webp',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('trividhya_images').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
        } catch (e) {
            errEl.textContent = 'Image upload failed: ' + e.message;
            errEl.style.display = 'block';
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            return;
        }
    }

    const paymentQrId = document.getElementById('editComboPaymentQr') ? document.getElementById('editComboPaymentQr').value : null;

    const updates = {
        name,
        description: desc,
        min_members: minM,
        max_members: maxM,
        events_data: selectedEvents,
        total_fee: totalFee,
        payment_qr_id: paymentQrId || null,
        is_active: isActive
    };

    if (imageUrl) {
        updates.image_url = imageUrl;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating combo...';

    const { data, error } = await updateCombo(id, updates);

    btn.innerHTML = oldHtml;
    btn.disabled = false;

    if (error) {
        errEl.textContent = 'Error: ' + error.message;
        errEl.style.display = 'block';
        showToast('Failed to update combo', 'error');
        return;
    }

    showToast(`Combo "${name}" updated successfully! 🎉`, 'success');
    closeEditComboModal();
    allCombos = await getAllCombosAdmin();
    renderCombosTable();
}

/* Override switchTab to load game details and settings on tab switch */
const _origSwitchTab = switchTab;
switchTab = function (tabId, btn) {
    _origSwitchTab(tabId, btn);
    if (tabId === 'game-details') {
        renderGameDetailsTab();
    } else if (tabId === 'event-details') {
        renderEventDetailsTab();
    } else if (tabId === 'archived') {
        renderArchivedTab();
    } else if (tabId === 'settings') {
        loadSiteSettingsAdmin();
    }
};

/* Load settings on dashboard init */
const _origLoadDashboard = loadDashboard;
loadDashboard = async function () {
    await _origLoadDashboard();
    // Pre-load settings form
    loadSiteSettingsAdmin();
    allArchivedCombos = await getArchivedRegistrations();
};

async function renderArchivedTab() {
    const container = document.getElementById('archivedList');
    if (!container) return;

    container.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Loading archived combos...</div>';

    allArchivedCombos = await getArchivedRegistrations();

    if (allArchivedCombos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:var(--muted);">
                <i class="fas fa-box-open" style="font-size:3rem; margin-bottom:1rem; display:block; opacity:0.3;"></i>
                <p>No archived combos found.</p>
            </div>`;
        return;
    }

    // Group by combo_id (and format date)
    const grouped = {};
    allArchivedCombos.forEach(item => {
        const key = item.combo_id;
        if (!grouped[key]) {
            grouped[key] = {
                id: item.combo_id,
                name: item.combo_name || 'Unknown Combo',
                date: new Date(item.archived_at).toLocaleString(),
                regs: []
            };
        }
        grouped[key].regs.push(item.registration_data);
    });

    const groupsHtml = Object.values(grouped).map(group => {
        const regsHtml = group.regs.map(r => {
            const membersHtml = (r.members && r.members.length > 0)
                ? r.members.map(m => `<div style="font-size:0.8rem; color:var(--muted); padding:2px 0;">• ${m.name} ${m.mobile ? `(${m.mobile})` : ''}</div>`).join('')
                : '<div style="font-size:0.8rem; color:var(--muted);">No additional members</div>';

            return `
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:1rem; margin-bottom:0.5rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <span style="font-weight:700;">${r.group_name || 'Individual'}</span>
                        <span style="color:${r.payment_status === 'paid' ? '#2ed573' : '#ffa502'}; font-size:0.8rem; font-weight:600; text-transform:uppercase;">${r.payment_status}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.2rem; margin-bottom:0.8rem;">
                        <span style="font-size:0.85rem;"><i class="fas fa-crown" style="color:var(--gold); margin-right:4px;"></i> ${r.leader_name}</span>
                        <span style="font-size:0.8rem; color:var(--muted);"><i class="fas fa-envelope" style="margin-right:4px;"></i> ${r.leader_email}</span>
                        <span style="font-size:0.8rem; color:var(--muted);"><i class="fas fa-phone" style="margin-right:4px;"></i> ${r.leader_mobile}</span>
                    </div>
                    <div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.5rem;">
                        <div style="font-size:0.75rem; font-weight:600; color:var(--accent); margin-bottom:4px;">TEAM MEMBERS</div>
                        ${membersHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="admin-panel-card" style="border: 1px solid rgba(255,71,87,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:1rem;">
                    <div>
                        <h3 style="color:#ff4757; margin-bottom:0.3rem;"><i class="fas fa-trash-alt" style="margin-right:0.5rem;"></i>${group.name}</h3>
                        <div style="font-size:0.8rem; color:var(--muted);">Archived on: ${group.date}</div>
                    </div>
                    <div style="background:rgba(255,71,87,0.1); color:#ff4757; padding:0.4rem 0.8rem; border-radius:50px; font-size:0.8rem; font-weight:700;">
                        ${group.regs.length} Registrations
                    </div>
                </div>
                <div>${regsHtml}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = groupsHtml;
}

/* ══════════════════════════════════════
   PAYMENT QRS TAB LOGIC
   ══════════════════════════════════════ */
async function loadPaymentQrsTab() {
    allPaymentQrs = await getAllPaymentQrs();
    renderPaymentQrsTable();
    populatePaymentQrDropdowns();
}

function renderPaymentQrsTable() {
    const tbody = document.getElementById('paymentQrsBody');
    if (!tbody) return;

    if (allPaymentQrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted);">No Payment QRs uploaded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = allPaymentQrs.map(qr => {
        return `
            <tr>
                <td><img src="${qr.qr_url}" style="width:60px;height:60px;object-fit:contain;background:#fff;border-radius:8px;"></td>
                <td style="font-weight:700;font-size:1.1rem;">₹${qr.amount}</td>
                <td>${qr.upi_id || '<span style="color:var(--muted)">N/A</span>'}</td>
                <td>
                    <button class="action-btn delete" onclick="deleteQrPrompt('${qr.id}', ${qr.amount})" title="Delete QR"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function populatePaymentQrDropdowns() {
    const addDropdown = document.getElementById('addPaymentQr');
    const editDropdown = document.getElementById('editEvPaymentQr');
    const addComboDropdown = document.getElementById('addComboPaymentQr');
    const editComboDropdown = document.getElementById('editComboPaymentQr');

    let optionsHtml = '<option value="">Default (Global QR)</option>';
    allPaymentQrs.forEach(qr => {
        optionsHtml += `<option value="${qr.id}">₹${qr.amount} QR</option>`;
    });

    if (addDropdown) addDropdown.innerHTML = optionsHtml;
    if (addComboDropdown) addComboDropdown.innerHTML = optionsHtml;

    if (editDropdown) {
        const currentEditVal = editDropdown.value;
        editDropdown.innerHTML = optionsHtml;
        if (currentEditVal) editDropdown.value = currentEditVal;
    }
    
    if (editComboDropdown) {
        const currentEditComboVal = editComboDropdown.value;
        editComboDropdown.innerHTML = optionsHtml;
        if (currentEditComboVal) editComboDropdown.value = currentEditComboVal;
    }
}

function previewNewQr(input) {
    const preview = document.getElementById('newQrPreviewArea');
    const img = document.getElementById('newQrPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
    }
}

async function submitNewPaymentQr() {
    const btn = document.getElementById('saveNewQrBtn');
    const errEl = document.getElementById('addQrError');
    errEl.style.display = 'none';

    const amount = parseInt(document.getElementById('addQrAmount').value, 10);
    const upi = document.getElementById('addQrUpi').value.trim();
    const file = document.getElementById('addQrImg').files[0];

    if (isNaN(amount) || amount < 0 || !file) {
        errEl.textContent = 'Please provide a valid Amount and select a QR Image.';
        errEl.style.display = 'block';
        return;
    }

    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    let qrUrl = '';

    try {
        const compressedLogo = await compressImageFile(file, 600, 600, 0.9);
        const filePath = `payment_qrs/${amount}_${Date.now()}.webp`;

        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('trividhya_images')
            .upload(filePath, compressedLogo, {
                cacheControl: '31536000',
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('trividhya_images').getPublicUrl(filePath);
        qrUrl = urlData.publicUrl;

        const { data: dbData, error: dbError } = await createPaymentQr({
            amount: amount,
            upi_id: upi || null,
            qr_url: qrUrl
        });

        if (dbError) throw dbError;

        showToast('Payment QR added successfully!', 'success');

        // Reset form
        document.getElementById('addQrAmount').value = '';
        document.getElementById('addQrUpi').value = '';
        document.getElementById('addQrImg').value = '';
        document.getElementById('newQrPreviewArea').style.display = 'none';

        await loadPaymentQrsTab();

    } catch (e) {
        errEl.textContent = 'Error: ' + e.message;
        errEl.style.display = 'block';
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}

async function deleteQrPrompt(id, amount) {
    const confirmed = await showConfirmDialog({
        title: 'Delete QR Code?',
        desc: `Are you sure you want to delete the ₹${amount} QR code? Events using this QR will revert to the Global QR.`,
        icon: '🗑️',
        okText: 'Delete',
        danger: true
    });

    if (!confirmed) return;

    const { error } = await deletePaymentQr(id);
    if (error) {
        showToast('Error deleting QR: ' + error.message, 'error');
        return;
    }

    showToast(`₹${amount} QR deleted successfully.`, 'success');
    await loadPaymentQrsTab();
}

// Hook into dashboard load and tab switches to load QRs
const _origLoadDashboardQRs = loadDashboard;
loadDashboard = async function () {
    await _origLoadDashboardQRs();
    await loadPaymentQrsTab();
};

const _origSwitchTabQRs = switchTab;
switchTab = function (tabId, btn) {
    _origSwitchTabQRs(tabId, btn);
    if (tabId === 'payment-qrs') {
        loadPaymentQrsTab();
    } else if (tabId === 'combo-regs') {
        renderComboRegistrationsTab();
    }
};

initMainAdmin();

// ═══════════════════════════════════════════════════
// COMBO REGISTRATIONS TAB LOGIC
// ═══════════════════════════════════════════════════
async function renderComboRegistrationsTab() {
    const container = document.getElementById('comboRegDetailsContainer');
    const searchVal = (document.getElementById('comboRegSearchInput').value || '').toLowerCase().trim();

    // Ensure combos are loaded
    if (!allCombos || allCombos.length === 0) {
        allCombos = await getAllCombosAdmin();
    }

    if (allCombos.length === 0) {
        container.innerHTML = '<div style="color:var(--muted); text-align:center; margin-top:2rem;">No combos found.</div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    for (const combo of allCombos) {
        html += `
            <div class="combo-reg-group" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleComboRegs('${combo.id}')">
                    <h4 style="margin:0; font-size:1.1rem; color:var(--accent);"><i class="fas fa-box-open" style="margin-right:0.5rem;"></i>${combo.name}</h4>
                    <div>
                        <span class="status-badge" style="background:var(--gold); color:#fff;">View Registrations <i class="fas fa-chevron-down"></i></span>
                    </div>
                </div>
                <div id="combo-regs-${combo.id}" style="display:none; margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                    <div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Loading registrations...</div>
                </div>
            </div>
        `;
    }
    html += '</div>';

    container.innerHTML = html;
}

async function toggleComboRegs(comboId) {
    const detailsDiv = document.getElementById(`combo-regs-${comboId}`);
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';

        // Fetch registrations
        const regs = await getComboRegistrations(comboId);

        if (regs.length === 0) {
            detailsDiv.innerHTML = '<div style="color:var(--muted);">No registrations yet.</div>';
            return;
        }

        // Render regs (similar to event registrations)
        let html = '<div style="display:flex; flex-direction:column; gap:1rem;">';
        regs.forEach(reg => {
            const isPaid = reg.payment_status === 'paid';
            const isApproved = reg.is_approved;
            const mCount = 1 + (reg.members ? reg.members.length : 0);

            let membersHtml = `
                <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); border-radius: 8px;">
                    <div style="font-weight:600; margin-bottom:0.5rem; color:var(--primary);">Leader</div>
                    <div style="font-size:0.85rem; margin-bottom:0.5rem;">
                        <strong>Name:</strong> ${reg.leader_name} (${reg.leader_gender || 'N/A'})<br>
                        <strong>College:</strong> ${reg.college || 'N/A'}<br>
                        <strong>Enrollment:</strong> ${reg.enrollment || 'N/A'} (Sem: ${reg.semester || 'N/A'})<br>
                        <strong>Contact:</strong> ${reg.leader_mobile} | ${reg.leader_email}
                    </div>
            `;

            if (reg.members && reg.members.length > 0) {
                membersHtml += `<div style="font-weight:600; margin-top:1rem; margin-bottom:0.5rem; color:var(--primary);">Team Members</div>`;
                reg.members.forEach((m, idx) => {
                    membersHtml += `
                        <div style="font-size:0.85rem; margin-bottom:0.5rem; padding-bottom:0.5rem; border-bottom:1px dashed rgba(0,0,0,0.1);">
                            <strong>Member ${idx + 1}:</strong> ${m.name} (${m.gender || 'N/A'})<br>
                            <strong>College:</strong> ${m.college || 'N/A'}<br>
                            <strong>Enrollment:</strong> ${m.enrollment || 'N/A'} (Sem: ${m.semester || 'N/A'})<br>
                            <strong>Contact:</strong> ${m.mobile || 'N/A'}
                        </div>
                    `;
                });
            }
            membersHtml += `</div>`;

            html += `
                <div class="reg-card">
                    <div class="reg-header">
                        <span class="reg-id">ID: ${reg.id.split('-')[0]}</span>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <div class="reg-status ${isPaid ? 'status-paid' : 'status-pending'}" style="font-size:0.75rem; padding:0.2rem 0.6rem;">
                                ${isPaid ? '<i class="fas fa-check-circle"></i> Paid' : '<i class="fas fa-clock"></i> Pending Payment'}
                            </div>
                            <div class="reg-status ${isApproved ? 'status-paid' : 'status-pending'}" style="font-size:0.75rem; padding:0.2rem 0.6rem;">
                                ${isApproved ? '<i class="fas fa-check-double"></i> Approved' : '<i class="fas fa-hourglass-half"></i> Pending Approval'}
                            </div>
                        </div>
                    </div>
                    <div class="reg-info">
                        <div><i class="fas fa-users"></i> ${reg.group_name || 'Individual/Solo'}</div>
                        <div><i class="fas fa-user-shield"></i> L: ${reg.leader_name} (${reg.leader_mobile})</div>
                        <div><i class="fas fa-envelope"></i> ${reg.leader_email}</div>
                        <div><i class="fas fa-user-friends"></i> Total Members: ${mCount}</div>
                        <div><i class="fas fa-money-bill-wave"></i> ₹${reg.amount} (${reg.payment_mode})</div>
                    </div>
                    
                    <div id="team-info-${reg.id}" style="display:none;">
                        ${membersHtml}
                    </div>

                    <div class="reg-actions" style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${!isApproved ? `<button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="approveComboRegistration('${reg.id}', '${comboId}')"><i class="fas fa-check"></i> Approve</button>` : ''}
                        <button class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="document.getElementById('team-info-${reg.id}').style.display = document.getElementById('team-info-${reg.id}').style.display === 'none' ? 'block' : 'none'"><i class="fas fa-info-circle"></i> Team Info</button>
                        <button class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="deleteComboRegistration('${reg.id}', '${comboId}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        detailsDiv.innerHTML = html;

    } else {
        detailsDiv.style.display = 'none';
    }
}

async function approveComboRegistration(regId, comboId) {
    const c = confirm('Mark this combo registration as Paid/Approved?');
    if (!c) return;

    const res = await approveRegistration(regId);
    if (res.success) {
        showToast('Combo registration approved', 'success');
        // Refresh the specific combo div
        const detailsDiv = document.getElementById(`combo-regs-${comboId}`);
        detailsDiv.style.display = 'none';
        toggleComboRegs(comboId);
    } else {
        showToast('Error approving registration', 'error');
    }
}

async function deleteComboRegistration(regId, comboId) {
    const c = confirm('Are you sure you want to delete this combo registration? This cannot be undone.');
    if (!c) return;

    const res = await deleteRegistration(regId);
    if (res.success) {
        showToast('Combo registration deleted', 'success');
        const detailsDiv = document.getElementById(`combo-regs-${comboId}`);
        detailsDiv.style.display = 'none';
        toggleComboRegs(comboId);
    } else {
        showToast('Error deleting registration', 'error');
    }
}

/* ── Combo Registrations CSV Export ── */
async function openComboCsvModal() {
    // Ensure combos are loaded
    if (!allCombos || allCombos.length === 0) {
        allCombos = await getAllCombosAdmin();
    }

    const container = document.getElementById('downloadComboCheckboxes');
    if (allCombos.length === 0) {
        container.innerHTML = '<div style="color:var(--muted); padding:1rem; text-align:center;">No combos available.</div>';
    } else {
        container.innerHTML = allCombos.map(combo => `
            <label style="display:flex; align-items:center; gap:0.8rem; cursor:pointer; padding:0.5rem; border-radius:6px; background:rgba(0,0,0,0.03);">
                <input type="checkbox" class="combo-csv-checkbox" value="${combo.id}" checked>
                <span style="font-weight:600;">${combo.name}</span>
            </label>
        `).join('');
    }

    document.getElementById('downloadComboCsvModal').classList.add('show');
}

function closeComboCsvModal() {
    document.getElementById('downloadComboCsvModal').classList.remove('show');
}

async function downloadAllComboCsv() {
    const btn = document.querySelector('#downloadComboCsvModal .btn-primary');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    if (!allCombos || allCombos.length === 0) {
        allCombos = await getAllCombosAdmin();
    }
    const comboIds = allCombos.map(c => c.id);
    await exportComboRegistrationsToCsv(comboIds, 'All_Combo_Registrations.csv');

    btn.innerHTML = ogHtml;
    btn.disabled = false;
    closeComboCsvModal();
}

async function downloadSelectedComboCsv() {
    const checkboxes = document.querySelectorAll('.combo-csv-checkbox:checked');
    const comboIds = Array.from(checkboxes).map(cb => cb.value);

    if (comboIds.length === 0) {
        showToast('Please select at least one combo', 'error');
        return;
    }

    const btn = document.querySelectorAll('#downloadComboCsvModal .btn-primary')[1];
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    await exportComboRegistrationsToCsv(comboIds, 'Selected_Combos_Registrations.csv');

    btn.innerHTML = ogHtml;
    btn.disabled = false;
    closeComboCsvModal();
}

async function exportComboRegistrationsToCsv(comboIds, filename) {
    let allRegs = [];
    // Fetch registrations for each selected combo
    for (const id of comboIds) {
        const regs = await getComboRegistrations(id);
        allRegs = allRegs.concat(regs);
    }

    if (allRegs.length === 0) {
        showToast('No registrations found for the selected combos.', 'error');
        return;
    }

    // Sort registrations by Group Name, then Leader Name
    allRegs.sort((a, b) => {
        const nameA = (a.group_name || a.leader_name || '').toLowerCase();
        const nameB = (b.group_name || b.leader_name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Combo Name,Group Name,Leader Name,Leader Gender,Leader College,Leader Enrollment,Leader Sem,Leader Mobile,Leader Email,Payment Mode,Payment Status,Approval Status,Amount Paid,Transaction ID,Registration Date,Team Members\n";

    allRegs.forEach(reg => {
        const comboName = `"${(reg.combos && reg.combos.name) ? reg.combos.name.replace(/"/g, '""') : 'Unknown Combo'}"`;
        const groupName = `"${(reg.group_name || 'Individual').replace(/"/g, '""')}"`;
        const leaderName = `"${(reg.leader_name || '').replace(/"/g, '""')}"`;
        const leaderGender = `"${(reg.leader_gender || '').replace(/"/g, '""')}"`;
        const leaderCollege = `"${(reg.college || '').replace(/"/g, '""')}"`;
        const leaderEnroll = `"${(reg.enrollment || '').replace(/"/g, '""')}"`;
        const leaderSem = `"${(reg.semester || '').replace(/"/g, '""')}"`;
        const leaderMobile = `"${(reg.leader_mobile || '').replace(/"/g, '""')}"`;
        const leaderEmail = `"${(reg.leader_email || '').replace(/"/g, '""')}"`;
        const payMode = `"${(reg.payment_mode || '').toUpperCase().replace(/"/g, '""')}"`;
        const payStatus = `"${(reg.payment_status || '').toUpperCase().replace(/"/g, '""')}"`;
        const appStatus = `"${reg.is_approved ? 'APPROVED' : 'PENDING'}"`;
        const amount = `"${reg.amount || ''}"`;
        const txnId = `"${(reg.transaction_id || 'N/A').replace(/"/g, '""')}"`;

        const date = new Date(reg.created_at).toLocaleString('en-IN');
        const regDate = `"${date}"`;

        let membersStr = '';
        if (reg.members && reg.members.length > 0) {
            membersStr = reg.members.map(m =>
                `${m.name} [${m.gender || 'N/A'}, ${m.college || 'N/A'}, ${m.enrollment || 'N/A'}, ${m.mobile || 'N/A'}]`
            ).join(' | ');
        }
        const membersFormatted = `"${membersStr.replace(/"/g, '""')}"`;

        const row = [comboName, groupName, leaderName, leaderGender, leaderCollege, leaderEnroll, leaderSem, leaderMobile, leaderEmail, payMode, payStatus, appStatus, amount, txnId, regDate, membersFormatted].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ── User Registrations Tab Logic ── */
let allGroupedUsers = [];

async function fetchGroupedUserRegistrations() {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`
            *,
            events(title),
            combos(name),
            members(*)
        `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching registrations for grouping:', error);
        return [];
    }

    // Group by email (fallback to mobile)
    const usersMap = {};

    data.forEach(reg => {
        const email = (reg.leader_email || '').trim().toLowerCase();
        const mobile = (reg.leader_mobile || '').trim();
        const key = email || mobile;
        if (!key) return; // Skip if somehow no email or mobile

        if (!usersMap[key]) {
            usersMap[key] = {
                name: reg.leader_name || 'Unknown',
                email: email,
                mobile: mobile,
                college: reg.college || 'N/A',
                enrollment: reg.enrollment || 'N/A',
                events: []
            };
        }

        let eventName = 'Unknown Event';
        if (reg.is_combo && reg.combos) {
            eventName = `Combo: ${reg.combos.name}`;
        } else if (!reg.is_combo && reg.events) {
            eventName = reg.events.title;
        }

        // Prevent duplicate games (if they accidentally registered twice)
        if (!usersMap[key].events.includes(eventName)) {
            usersMap[key].events.push(eventName);
        }
    });

    // Convert map to array
    let users = Object.values(usersMap);

    // Sort events alphabetically within each user
    users.forEach(u => u.events.sort((a, b) => a.localeCompare(b)));

    // Sort users alphabetically by name
    users.sort((a, b) => a.name.localeCompare(b.name));

    allGroupedUsers = users;
    return users;
}

async function renderUserRegistrationsTab() {
    const tbody = document.getElementById('userRegistrationsTableBody');
    const searchVal = (document.getElementById('userRegSearchInput').value || '').toLowerCase().trim();

    if (allGroupedUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Loading user data...</td></tr>';
        await fetchGroupedUserRegistrations();
    }

    if (allGroupedUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding: 2rem;">No users found.</td></tr>';
        return;
    }

    let filteredUsers = allGroupedUsers;
    if (searchVal) {
        filteredUsers = allGroupedUsers.filter(u =>
            u.name.toLowerCase().includes(searchVal) ||
            u.email.toLowerCase().includes(searchVal) ||
            u.mobile.toLowerCase().includes(searchVal)
        );
    }

    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding: 2rem;">No matching users found.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredUsers.map(u => {
        const eventsHtml = u.events.map(e => `<span style="display:inline-block; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:4px; margin:2px; font-size:0.8rem;">${e}</span>`).join('');
        return `
            <tr>
                <td style="font-weight:600; color:var(--accent);">${u.name}</td>
                <td>
                    <div><i class="fas fa-envelope" style="color:var(--muted); font-size:0.8rem; width:16px;"></i> ${u.email || 'N/A'}</div>
                    <div><i class="fas fa-phone" style="color:var(--muted); font-size:0.8rem; width:16px;"></i> ${u.mobile || 'N/A'}</div>
                </td>
                <td>${u.college}</td>
                <td>${u.enrollment}</td>
                <td>${eventsHtml}</td>
            </tr>
        `;
    }).join('');
}

function exportGroupedUsersCsv() {
    if (allGroupedUsers.length === 0) {
        showToast('No user data to export', 'error');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Mobile,College,Enrollment,Events Registered\n";

    allGroupedUsers.forEach(u => {
        const name = `"${u.name.replace(/"/g, '""')}"`;
        const email = `"${u.email.replace(/"/g, '""')}"`;
        const mobile = `"${u.mobile.replace(/"/g, '""')}"`;
        const college = `"${u.college.replace(/"/g, '""')}"`;
        const enroll = `"${u.enrollment.replace(/"/g, '""')}"`;
        const events = `"${u.events.join(", ").replace(/"/g, '""')}"`;

        csvContent += [name, email, mobile, college, enroll, events].join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "User_Registrations_Details.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportGroupedUsersPdf() {
    if (allGroupedUsers.length === 0) {
        showToast('No user data to export', 'error');
        return;
    }

    // jsPDF is loaded via CDN in admin.html
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.text("Trividhya'26 - User Registration Details", 14, 15);

    const tableColumn = ["Name", "Contact (Email/Mobile)", "College", "Enrollment", "Events Registered"];
    const tableRows = [];

    allGroupedUsers.forEach(u => {
        const contact = `${u.email}\n${u.mobile}`;
        const events = u.events.join("\n");
        tableRows.push([u.name, contact, u.college, u.enrollment, events]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { fontSize: 8 },
        columnStyles: {
            4: { cellWidth: 100 } // Give events column more space
        }
    });

    doc.save("User_Registrations_Details.pdf");
}
