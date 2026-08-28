/* ══════════════════════════════════════
   ADMIN.JS — Super Admin Panel (v2)
   ══════════════════════════════════════ */

let allEvents = [];
let allRegs = [];

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

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

async function loadDashboard() {
    allEvents = await getAllEventsAdmin();
    // Sort events alphabetically
    allEvents.sort((a, b) => a.title.localeCompare(b.title));
    renderEventsTable();
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
    const totalRev = paidRegs.reduce((sum, r) => sum + (r.events?.fee || 0), 0);
    
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
    document.getElementById('editEvPass').value = ev.password || '';
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

    const updates = {
        title, description: desc, category: cat, type, fee,
        max_members: max, min_members: min, logo_url: logoUrl, color, badge,
        coordinators, volunteers
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

    const newEvent = {
        title, description: desc, category: cat, type, fee,
        max_members: max, min_members: min, logo_url: logoUrl, color, badge,
        password: pass, is_active: true,
        coordinators, volunteers
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
    document.getElementById('addCoordinators').value = '';
    document.getElementById('addVolunteers').value = '';
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
async function renderRegDetails(categories, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner"></i> Loading details...</div>';

    // Filter relevant events
    const events = allEvents.filter(ev => categories.includes(ev.category));

    // Fetch registrations for each event
    const eventData = [];
    for (const ev of events) {
        const regs = await getRegistrationsByEvent(ev.id);
        if (regs.length > 0) {
            eventData.push({ event: ev, regs });
        }
    }

    if (eventData.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:var(--muted);">
                <i class="fas fa-info-circle" style="font-size:3rem; margin-bottom:1rem; display:block; opacity:0.3;"></i>
                <p>No registrations found for these categories.</p>
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
                        <span style="color:var(--muted); font-size:0.75rem;">${m.mobile || ''}</span>
                    </div>`).join('')
                : '<p style="color:var(--muted); font-size:0.8rem; padding:0.5rem 0;">No additional members</p>';

            const statusBadge = r.payment_status === 'paid'
                ? '<span style="background:rgba(46,213,115,0.15); color:#2ed573; padding:0.2rem 0.6rem; border-radius:50px; font-size:0.72rem; font-weight:600;">PAID</span>'
                : '<span style="background:rgba(255,165,2,0.15); color:#ffa502; padding:0.2rem 0.6rem; border-radius:50px; font-size:0.72rem; font-weight:600;">PENDING</span>';

            return `
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(123,47,190,0.15); border-radius:14px; padding:1rem 1.2rem; margin-bottom:0.8rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
                        <div>
                            <span style="font-weight:700; font-size:0.95rem;">${r.group_name}</span>
                            <span style="color:var(--muted); font-size:0.78rem; margin-left:0.5rem;">by ${r.leader_name}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.8rem;">
                            <span style="color:var(--muted); font-size:0.78rem;">₹${event.fee}</span>
                            ${statusBadge}
                        </div>
                    </div>
                    <div style="padding-left:0.5rem;">
                        <div style="display:flex; align-items:center; gap:0.8rem; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                            <i class="fas fa-crown" style="color:var(--gold); font-size:0.7rem;"></i>
                            <span style="font-size:0.82rem; font-weight:600;">${r.leader_name}</span>
                            <span style="color:var(--muted); font-size:0.75rem;">${r.leader_mobile}</span>
                            <span style="color:var(--gold); font-size:0.68rem; font-weight:600;">LEADER</span>
                        </div>
                        ${membersHtml}
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
    await renderRegDetails(['game'], 'gameDetailsContainer');
}

async function renderEventDetailsTab() {
    await renderRegDetails(['tech', 'nontech'], 'eventDetailsContainer');
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
        if(qrFileInput) qrFileInput.value = '';
        
        setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    }
}

/* Override switchTab to load game details and settings on tab switch */
const _origSwitchTab = switchTab;
switchTab = function(tabId, btn) {
    _origSwitchTab(tabId, btn);
    if (tabId === 'game-details') {
        renderGameDetailsTab();
    } else if (tabId === 'event-details') {
        renderEventDetailsTab();
    } else if (tabId === 'settings') {
        loadSiteSettingsAdmin();
    }
};

/* Load settings on dashboard init */
const _origLoadDashboard = loadDashboard;
loadDashboard = async function() {
    await _origLoadDashboard();
    // Pre-load settings form
    loadSiteSettingsAdmin();
};

initMainAdmin();
