/* ══════════════════════════════════════
   EVENT_ADMIN.JS — Per-Event Admin (v2)
   ══════════════════════════════════════ */

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

let currentEvent = null;
let registrations = [];

/* ── Toast & Confirm (standalone) ── */
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
async function initAdmin() {
    const sessionAdminId = sessionStorage.getItem('eventAdminId');
    if (!eventId || sessionAdminId !== eventId) {
        window.location.href = 'eventmanagers.html';
        return;
    }

    currentEvent = await getEventById(eventId);
    if (!currentEvent) {
        document.body.innerHTML = '<h2 style="color:white;text-align:center;margin-top:5rem;">Event Not Found</h2>';
        return;
    }

    document.title = `Admin — ${currentEvent.title} | Trividhya'26`;
    renderEventInfo();
    await loadRegistrations();
}

function renderEventInfo() {
    const panel = document.getElementById('eventInfoPanel');
    const logoHtml = currentEvent.logo_url
        ? `<img src="${currentEvent.logo_url}" class="info-logo" alt="Logo">`
        : `<div class="info-logo" style="background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:#fff;"><i class="fas fa-trophy"></i></div>`;

    panel.innerHTML = `
        <div style="text-align:center;">
            ${logoHtml}
            <h2 class="info-title">${currentEvent.title}</h2>
        </div>
        
        <div class="stat-box">
            <span style="color:var(--muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-users" style="margin-right:0.4rem;color:var(--primary);"></i>Total Teams</span>
            <span class="stat-value" id="statTotal">--</span>
        </div>
        <div class="stat-box">
            <span style="color:var(--muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-check-circle" style="margin-right:0.4rem;color:#2ed573;"></i>Paid</span>
            <span class="stat-value" style="color:#2ed573;" id="statPaid">--</span>
        </div>
        <div class="stat-box">
            <span style="color:var(--muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-clock" style="margin-right:0.4rem;color:#ffa502;"></i>Pending Cash</span>
            <span class="stat-value" style="color:#ffa502;" id="statPending">--</span>
        </div>
        <div class="stat-box" style="margin-bottom:1rem;">
            <span style="color:var(--muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-rupee-sign" style="margin-right:0.4rem;color:var(--gold);"></i>Revenue</span>
            <span class="stat-value" id="statRev">--</span>
        </div>

        <div style="background:#f8f9fa; border:1.5px solid #000000; border-radius:14px; padding:1rem; margin-bottom:1rem; font-size:0.82rem;">
            <div style="margin-bottom:0.4rem; color:#000; font-weight:600;">
                <i class="fas fa-user-tie" style="margin-right:0.4rem;"></i>Coordinators:
                <div style="font-weight:400; color:#333; margin-top:2px;" id="dispCoordinators">${currentEvent.coordinators || 'None assigned'}</div>
            </div>
            <div style="color:#000; font-weight:600; margin-top:0.6rem;">
                <i class="fas fa-hands-helping" style="margin-right:0.4rem;"></i>Volunteers:
                <div style="font-weight:400; color:#333; margin-top:2px;" id="dispVolunteers">${currentEvent.volunteers || 'None assigned'}</div>
            </div>
        </div>

        <div class="edit-section">
            <h3 style="font-size:0.9rem;margin-bottom:1rem;color:var(--accent);">
                <i class="fas fa-edit"></i> Edit Event Details & Staff
            </h3>
            <div class="form-group">
                <label class="form-label">Event Title</label>
                <input type="text" id="evTitle" class="form-input" value="${currentEvent.title}">
            </div>
            <div class="form-group">
                <label class="form-label">Event Logo (Image)</label>
                <input type="file" id="evLogoFile" class="form-input" accept="image/*" style="padding:0.5rem;" onchange="previewEvLogo(this)">
                <div id="evLogoPreviewArea" style="margin-top:0.5rem; ${currentEvent.logo_url ? '' : 'display:none;'}">
                    <img id="evLogoPreviewImg" src="${currentEvent.logo_url || ''}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; border:2px solid #000;">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Coordinators</label>
                <input type="text" id="evCoordinators" class="form-input" placeholder="e.g. John Doe, Jane Smith" value="${currentEvent.coordinators || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Volunteers</label>
                <input type="text" id="evVolunteers" class="form-input" placeholder="e.g. Alex, Bob, Charlie" value="${currentEvent.volunteers || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Fee (₹)</label>
                <input type="number" id="evFee" class="form-input" value="${currentEvent.fee}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="evDesc" class="form-input" rows="4">${currentEvent.description || ''}</textarea>
            </div>
            <button class="btn-primary" id="saveInfoBtn" style="width:100%;border-radius:10px;justify-content:center;padding:0.6rem;" onclick="saveEventInfo()">
                <i class="fas fa-save"></i> Save Changes
            </button>
        </div>
    `;
}

function previewEvLogo(input) {
    const area = document.getElementById('evLogoPreviewArea');
    const img = document.getElementById('evLogoPreviewImg');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            area.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

let currentTab = 'active'; // 'active', 'cancelled', 'deleted'
let selectedRegIds = new Set();

async function loadRegistrations() {
    registrations = await getRegistrationsByEvent(eventId);
    updateStats();
    renderTable();
}

function switchTab(tabName) {
    currentTab = tabName;
    selectedRegIds.clear();
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tabName === 'active') document.getElementById('tabActive')?.classList.add('active');
    if (tabName === 'cancelled') document.getElementById('tabCancelled')?.classList.add('active');
    if (tabName === 'deleted') document.getElementById('tabDeleted')?.classList.add('active');
    
    // Update section title text
    const titleEl = document.getElementById('tableSectionTitle');
    if (titleEl) {
        if (tabName === 'active') titleEl.innerHTML = '<i class="fas fa-users" style="margin-right:0.5rem;"></i>Active Registrations (<span id="regCount">0</span>)';
        if (tabName === 'cancelled') titleEl.innerHTML = '<i class="fas fa-ban" style="margin-right:0.5rem;"></i>Cancelled Registrations (<span id="regCount">0</span>)';
        if (tabName === 'deleted') titleEl.innerHTML = '<i class="fas fa-trash-alt" style="margin-right:0.5rem;"></i>Recently Deleted (<span id="regCount">0</span>)';
    }

    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) selectAllCb.checked = false;
    
    updateBulkBar();
    renderTable();
}

function updateStats() {
    const activeRegs = registrations.filter(r => r.payment_status !== 'deleted' && r.payment_status !== 'cancelled');
    const cancelledRegs = registrations.filter(r => r.payment_status === 'cancelled');
    const deletedRegs = registrations.filter(r => r.payment_status === 'deleted');

    document.getElementById('countActive').textContent = activeRegs.length;
    document.getElementById('countCancelled').textContent = cancelledRegs.length;
    document.getElementById('countDeleted').textContent = deletedRegs.length;
    
    const countEl = document.getElementById('regCount');
    if (countEl) {
        if (currentTab === 'active') countEl.textContent = activeRegs.length;
        else if (currentTab === 'cancelled') countEl.textContent = cancelledRegs.length;
        else countEl.textContent = deletedRegs.length;
    }
    
    document.getElementById('statTotal').textContent = activeRegs.length;
    
    const paidCount = activeRegs.filter(r => r.payment_status === 'paid').length;
    const pendingCount = activeRegs.filter(r => r.payment_status === 'pending' && r.payment_mode === 'cash').length;
    
    document.getElementById('statPaid').textContent = paidCount;
    document.getElementById('statPending').textContent = pendingCount;
    document.getElementById('statRev').textContent = '₹' + (paidCount * currentEvent.fee);
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const term = document.getElementById('searchBox').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    // Base view filter
    let list = registrations;
    if (currentTab === 'active') {
        list = registrations.filter(r => r.payment_status !== 'deleted' && r.payment_status !== 'cancelled');
    } else if (currentTab === 'cancelled') {
        list = registrations.filter(r => r.payment_status === 'cancelled');
    } else if (currentTab === 'deleted') {
        list = registrations.filter(r => r.payment_status === 'deleted');
    }

    let filtered = list.filter(r => 
        (r.group_name || '').toLowerCase().includes(term) ||
        (r.leader_name || '').toLowerCase().includes(term) ||
        (r.leader_email || '').toLowerCase().includes(term) ||
        (r.leader_mobile || '').includes(term)
    );

    if (statusFilter !== 'all' && currentTab === 'active') {
        filtered = filtered.filter(r => r.payment_status === statusFilter);
    }

    const regCountEl = document.getElementById('regCount');
    if (regCountEl) regCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted);">No registrations found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((r) => {
        const isChecked = selectedRegIds.has(r.id) ? 'checked' : '';

        let paymentBadge = r.payment_status === 'paid' 
            ? '<span class="badge paid">Paid</span>' 
            : r.payment_status === 'cancelled'
            ? '<span class="badge rejected">Cancelled</span>'
            : r.payment_status === 'deleted'
            ? '<span class="badge rejected">Deleted</span>'
            : '<span class="badge pending">Pending</span>';

        let modeBadge = r.payment_mode === 'online' 
            ? '<span class="badge online">Online</span>' 
            : '<span class="badge cash">Cash</span>';
        
        let membersHtml = '';
        if (r.members && r.members.length > 0) {
            membersHtml = r.members.map(m => `<div>• ${m.name}</div>`).join('');
            membersHtml = `<div class="member-list">${membersHtml}</div>`;
        } else {
            membersHtml = '<div class="member-list" style="color:rgba(0,0,0,0.3);">— Solo —</div>';
        }

        let actionHtml = '';

        if (currentTab === 'active') {
            // Approve cash payment
            if (r.payment_status === 'pending' && r.payment_mode === 'cash') {
                actionHtml += `<button class="action-btn approve" onclick="approveCash('${r.id}')" title="Approve Cash Payment"><i class="fas fa-check-circle" style="font-size:1rem;"></i></button>`;
            }
            // Cancel registration
            actionHtml += `<button class="action-btn reject" onclick="cancelReg('${r.id}')" title="Cancel Registration"><i class="fas fa-ban" style="font-size:0.9rem;"></i></button>`;
            // Edit team details
            actionHtml += `<button class="action-btn edit" onclick="openEditModal('${r.id}')" title="Edit Team Details"><i class="fas fa-edit"></i></button>`;
            // Move to deleted
            actionHtml += `<button class="action-btn delete" onclick="moveToDeleted('${r.id}', '${r.group_name.replace(/'/g, "\\'")}')" title="Move to Recently Deleted"><i class="fas fa-trash-alt"></i></button>`;
        } else if (currentTab === 'cancelled') {
            // Restore / Retrieve
            actionHtml += `<button class="action-btn approve" onclick="restoreReg('${r.id}')" title="Retrieve / Restore Registration"><i class="fas fa-undo" style="font-size:0.9rem;"></i> Restore</button>`;
            // Move to deleted
            actionHtml += `<button class="action-btn delete" onclick="moveToDeleted('${r.id}', '${r.group_name.replace(/'/g, "\\'")}')" title="Move to Recently Deleted"><i class="fas fa-trash-alt"></i></button>`;
        } else if (currentTab === 'deleted') {
            // Restore / Retrieve
            actionHtml += `<button class="action-btn approve" onclick="restoreReg('${r.id}')" title="Retrieve / Restore Registration"><i class="fas fa-undo" style="font-size:0.9rem;"></i> Restore</button>`;
            // Delete Permanently
            actionHtml += `<button class="action-btn delete" onclick="permanentDeleteReg('${r.id}', '${r.group_name.replace(/'/g, "\\'")}')" title="Delete Permanently"><i class="fas fa-times-circle"></i> Permanent Delete</button>`;
        }

        let statusText = r.is_approved 
            ? '<span style="color:#2ed573;font-size:0.8rem;font-weight:600;"><i class="fas fa-check-circle"></i> Confirmed</span>' 
            : '<span style="color:#ffa502;font-size:0.8rem;font-weight:600;"><i class="fas fa-clock"></i> Awaiting</span>';

        return `
            <tr>
                <td><input type="checkbox" class="row-cb" value="${r.id}" ${isChecked} onchange="toggleSelectRow('${r.id}', this.checked)" style="cursor:pointer; width:16px; height:16px;"></td>
                <td style="font-weight:700;color:#000000;">${r.group_name}</td>
                <td>
                    <div style="font-weight:600;color:#000000;">${r.leader_name} <i class="fas fa-crown" style="color:#000;font-size:0.65rem;margin-left:3px;"></i></div>
                    <div style="font-size:0.72rem;color:#555;margin-top:2px;">${r.leader_email}</div>
                    <div style="font-size:0.72rem;color:#555;">${r.leader_mobile}</div>
                </td>
                <td>${membersHtml}</td>
                <td>${paymentBadge}<div style="margin-top:0.3rem;">${modeBadge}</div></td>
                <td>${statusText}</td>
                <td style="white-space:nowrap;">${actionHtml}</td>
            </tr>
        `;
    }).join('');
    
    updateSelectAllCheckbox();
}

/* ── Multi-Select Checkbox Handling ── */
function toggleSelectRow(regId, isChecked) {
    if (isChecked) selectedRegIds.add(regId);
    else selectedRegIds.delete(regId);
    
    updateSelectAllCheckbox();
    updateBulkBar();
}

function toggleSelectAll(masterCb) {
    const rowCbs = document.querySelectorAll('.row-cb');
    rowCbs.forEach(cb => {
        cb.checked = masterCb.checked;
        if (masterCb.checked) selectedRegIds.add(cb.value);
        else selectedRegIds.delete(cb.value);
    });
    updateBulkBar();
}

function updateSelectAllCheckbox() {
    const masterCb = document.getElementById('selectAllCb');
    if (!masterCb) return;
    const rowCbs = document.querySelectorAll('.row-cb');
    if (rowCbs.length === 0) { masterCb.checked = false; return; }
    const allChecked = Array.from(rowCbs).every(cb => cb.checked);
    masterCb.checked = allChecked;
}

function updateBulkBar() {
    const bulkBar = document.getElementById('bulkBar');
    const countEl = document.getElementById('bulkCount');
    const restoreBtn = document.getElementById('bulkRestoreBtn');
    const approveBtn = document.getElementById('bulkApproveBtn');
    const deleteBtn = document.getElementById('bulkDeleteBtn');

    if (!bulkBar) return;

    if (selectedRegIds.size > 0) {
        bulkBar.style.display = 'flex';
        countEl.textContent = selectedRegIds.size;

        if (currentTab === 'active') {
            approveBtn.style.display = 'inline-flex';
            restoreBtn.style.display = 'none';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Move to Deleted';
        } else if (currentTab === 'cancelled') {
            approveBtn.style.display = 'none';
            restoreBtn.style.display = 'inline-flex';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Move to Deleted';
        } else if (currentTab === 'deleted') {
            approveBtn.style.display = 'none';
            restoreBtn.style.display = 'inline-flex';
            deleteBtn.innerHTML = '<i class="fas fa-times-circle"></i> Permanent Delete';
        }
    } else {
        bulkBar.style.display = 'none';
    }
}

/* ── Bulk Actions ── */
async function bulkApprove() {
    if (selectedRegIds.size === 0) return;
    const confirmed = await showConfirmDialog({
        title: `Approve ${selectedRegIds.size} Registrations?`,
        desc: 'Selected registrations will be marked as PAID and CONFIRMED.',
        icon: '✅',
        okText: 'Approve All'
    });
    if (!confirmed) return;

    const ids = Array.from(selectedRegIds);
    for (const id of ids) {
        await updateRegistration(id, { payment_status: 'paid', is_approved: true });
        const reg = registrations.find(r => r.id === id);
        if (reg) { reg.payment_status = 'paid'; reg.is_approved = true; }
    }

    selectedRegIds.clear();
    updateBulkBar();
    updateStats();
    renderTable();
    showToast(`Approved ${ids.length} registration(s)! ✅`, 'success');
}

async function bulkRestore() {
    if (selectedRegIds.size === 0) return;
    const confirmed = await showConfirmDialog({
        title: `Restore ${selectedRegIds.size} Registrations?`,
        desc: 'Selected registrations will be retrieved and restored to Active Status.',
        icon: '🔄',
        okText: 'Restore All'
    });
    if (!confirmed) return;

    const ids = Array.from(selectedRegIds);
    for (const id of ids) {
        await updateRegistration(id, { payment_status: 'pending', is_approved: false });
        const reg = registrations.find(r => r.id === id);
        if (reg) { reg.payment_status = 'pending'; reg.is_approved = false; }
    }

    selectedRegIds.clear();
    updateBulkBar();
    updateStats();
    renderTable();
    showToast(`Restored ${ids.length} registration(s)! 🔄`, 'success');
}

async function bulkDelete() {
    if (selectedRegIds.size === 0) return;
    const ids = Array.from(selectedRegIds);

    if (currentTab === 'deleted') {
        // Permanent Delete
        const confirmed = await showConfirmDialog({
            title: `Permanently Delete ${ids.length} Registrations?`,
            desc: 'This will remove the data permanently. This action cannot be undone.',
            icon: '🗑️',
            okText: 'Delete Permanently',
            danger: true
        });
        if (!confirmed) return;

        for (const id of ids) {
            await deleteRegistration(id);
            registrations = registrations.filter(r => r.id !== id);
        }
        showToast(`Permanently deleted ${ids.length} registration(s)`, 'info');
    } else {
        // Soft delete (Move to Recently Deleted)
        const confirmed = await showConfirmDialog({
            title: `Move ${ids.length} Registrations to Deleted?`,
            desc: 'Items will be moved to Recently Deleted and can be restored anytime.',
            icon: '🗑️',
            okText: 'Move to Deleted',
            danger: true
        });
        if (!confirmed) return;

        for (const id of ids) {
            const { error } = await updateRegistration(id, { payment_status: 'deleted', is_approved: false });
            if (error) {
                await deleteRegistration(id);
                registrations = registrations.filter(r => r.id !== id);
            } else {
                const reg = registrations.find(r => r.id === id);
                if (reg) { reg.payment_status = 'deleted'; reg.is_approved = false; }
            }
        }
        showToast(`Processed ${ids.length} item(s)`, 'info');
    }

    selectedRegIds.clear();
    updateBulkBar();
    updateStats();
    renderTable();
}

function filterTable() { renderTable(); }

/* ── Approve Cash Payment ── */
async function approveCash(regId) {
    const confirmed = await showConfirmDialog({
        title: 'Approve Cash Payment?',
        desc: 'This will mark this registration as PAID and APPROVED.',
        icon: '✅',
        okText: 'Approve',
    });
    if (!confirmed) return;
    
    const { data, error } = await updateRegistration(regId, {
        payment_status: 'paid',
        is_approved: true
    });
    
    if (error) {
        showToast('Failed to approve: ' + error.message, 'error');
        return;
    }
    
    const reg = registrations.find(r => r.id === regId);
    if (reg) { reg.payment_status = 'paid'; reg.is_approved = true; }
    updateStats();
    renderTable();
    showToast('Payment approved successfully! ✅', 'success');
}

/* ── Cancel Registration ── */
async function cancelReg(regId) {
    const confirmed = await showConfirmDialog({
        title: 'Cancel Registration?',
        desc: 'This will cancel this registration.',
        icon: '🚫',
        okText: 'Cancel Registration',
        danger: true,
    });
    if (!confirmed) return;
    
    const { error } = await updateRegistration(regId, {
        payment_status: 'cancelled',
        is_approved: false
    });
    
    if (error) {
        // Fallback: If DB constraint rejects status update to 'cancelled', delete directly
        const delRes = await deleteRegistration(regId);
        if (delRes.error) {
            showToast('Failed to cancel: ' + delRes.error.message, 'error');
            return;
        }
        registrations = registrations.filter(r => r.id !== regId);
        updateStats();
        renderTable();
        showToast('Registration cancelled & deleted 🚫', 'info');
        return;
    }
    
    const reg = registrations.find(r => r.id === regId);
    if (reg) { reg.payment_status = 'cancelled'; reg.is_approved = false; }
    updateStats();
    renderTable();
    showToast('Registration moved to Cancelled', 'info');
}

/* ── Restore / Retrieve Registration ── */
async function restoreReg(regId) {
    const { data, error } = await updateRegistration(regId, {
        payment_status: 'pending',
        is_approved: false
    });
    
    if (error) {
        showToast('Failed to restore: ' + error.message, 'error');
        return;
    }
    
    const reg = registrations.find(r => r.id === regId);
    if (reg) { reg.payment_status = 'pending'; reg.is_approved = false; }
    updateStats();
    renderTable();
    showToast('Registration restored to Active! 🔄', 'success');
}

/* ── Move to Recently Deleted ── */
async function moveToDeleted(regId, groupName) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Registration?',
        desc: `Are you sure you want to delete registration for "${groupName}"?`,
        icon: '🗑️',
        okText: 'Delete',
        danger: true,
    });
    if (!confirmed) return;
    
    const { error } = await updateRegistration(regId, { payment_status: 'deleted', is_approved: false });
    if (error) {
        // Fallback: If DB constraint rejects status update to 'deleted', delete directly from database
        const delRes = await deleteRegistration(regId);
        if (delRes.error) {
            showToast('Failed to delete: ' + delRes.error.message, 'error');
            return;
        }
        registrations = registrations.filter(r => r.id !== regId);
        updateStats();
        renderTable();
        showToast('Registration deleted successfully 🗑️', 'info');
        return;
    }
    
    const reg = registrations.find(r => r.id === regId);
    if (reg) { reg.payment_status = 'deleted'; reg.is_approved = false; }
    updateStats();
    renderTable();
    showToast('Moved to Recently Deleted 🗑️', 'info');
}

/* ── Permanent Delete ── */
async function permanentDeleteReg(regId, groupName) {
    const confirmed = await showConfirmDialog({
        title: 'Permanently Delete?',
        desc: `Are you sure you want to permanently delete "${groupName}"? This cannot be undone.`,
        icon: '⚠️',
        okText: 'Permanent Delete',
        danger: true,
    });
    if (!confirmed) return;
    
    const { error } = await deleteRegistration(regId);
    if (error) {
        showToast('Failed to delete: ' + error.message, 'error');
        return;
    }
    
    registrations = registrations.filter(r => r.id !== regId);
    updateStats();
    renderTable();
    showToast('Permanently deleted registration', 'info');
}

/* ── Save Event Info & Logo ── */
async function saveEventInfo() {
    const title = document.getElementById('evTitle').value.trim();
    const fee = parseInt(document.getElementById('evFee').value, 10);
    const desc = document.getElementById('evDesc').value.trim();
    const coordinators = document.getElementById('evCoordinators').value.trim();
    const volunteers = document.getElementById('evVolunteers').value.trim();
    const logoFile = document.getElementById('evLogoFile')?.files[0];
    
    if (!title) { showToast('Event title is required', 'error'); return; }
    
    const btn = document.getElementById('saveInfoBtn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    let newLogoUrl = currentEvent.logo_url;

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
            showToast('Logo upload failed: ' + uploadError.message, 'error');
            return;
        }

        const { data: urlData } = supabaseClient
            .storage
            .from('trividhya_images')
            .getPublicUrl(filePath);

        newLogoUrl = urlData.publicUrl;
    }
    
    const { data, error } = await updateEvent(eventId, {
        title, fee, description: desc, logo_url: newLogoUrl, coordinators, volunteers
    });
    
    btn.innerHTML = oldHtml;
    btn.disabled = false;
    
    if (error) {
        showToast('Failed to save: ' + error.message, 'error');
        return;
    }
    
    currentEvent.title = title;
    currentEvent.fee = fee;
    currentEvent.description = desc;
    currentEvent.logo_url = newLogoUrl;
    currentEvent.coordinators = coordinators;
    currentEvent.volunteers = volunteers;
    
    renderEventInfo();
    updateStats();
    
    showToast('Event details & staff saved! ✅', 'success');
    
    // Green glow effect on button
    btn.style.boxShadow = '0 0 15px #2ed573';
    btn.style.background = '#2ed573';
    btn.innerHTML = '<i class="fas fa-check"></i> Saved';
    setTimeout(() => {
        btn.style.boxShadow = '';
        btn.style.background = '';
        btn.innerHTML = oldHtml;
    }, 2000);
}

/* ── Export CSV ── */
function exportCSV() {
    if (registrations.length === 0) { showToast('No data to export', 'info'); return; }
    
    let csv = "Group Name,Leader Name,Leader College,Leader Enrollment,Leader Semester,Leader Email,Leader Mobile,Payment Mode,Payment Status,Approved,Members\n";
    
    registrations.forEach(r => {
        const mems = r.members && r.members.length > 0 
            ? r.members.map(m => `${m.name} [${m.college}, Enr: ${m.enrollment}, Sem: ${m.semester}] (${m.mobile})`).join(' | ') 
            : 'None';
        
        csv += [
            `"${(r.group_name || '').replace(/"/g, '""')}"`,
            `"${(r.leader_name || '').replace(/"/g, '""')}"`,
            `"${(r.college || '').replace(/"/g, '""')}"`,
            `"${(r.enrollment || '').replace(/"/g, '""')}"`,
            `"${r.semester || ''}"`,
            `"${r.leader_email}"`,
            `"${r.leader_mobile}"`,
            r.payment_mode,
            r.payment_status,
            r.is_approved ? 'Yes' : 'No',
            `"${mems.replace(/"/g, '""')}"`
        ].join(',') + "\n";
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Trividhya26_${currentEvent.title.replace(/\s+/g,'_')}_Registrations.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully! 📥', 'success');
}

function logoutAdmin() {
    sessionStorage.removeItem('eventAdminId');
    window.location.href = 'eventmanagers.html';
}

initAdmin();
