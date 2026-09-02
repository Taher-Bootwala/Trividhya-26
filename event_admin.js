/* ══════════════════════════════════════
   EVENT_ADMIN.JS — Per-Event Admin (v2)
   ══════════════════════════════════════ */

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

let currentEvent = null;
let registrations = [];
let allPaymentQrs = [];

function getSvgIcon(type) {
    const svgs = {
        check: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
        warning: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        danger: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        trash: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
        refresh: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
        ban: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
        mail: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`
    };
    if (typeof type === 'string' && svgs[type]) return svgs[type];
    if (type === '✅') return svgs.check;
    if (type === '🗑️') return svgs.trash;
    if (type === '🚫') return svgs.ban;
    if (type === '🔄') return svgs.refresh;
    if (type === '⚠️') return svgs.warning;
    return svgs.warning;
}

/* ── Toast & Confirm (standalone) ── */
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const svgIcons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
        error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const cleanMsg = message.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
    toast.innerHTML = `${svgIcons[type] || svgIcons.info}<span>${cleanMsg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, duration);
}

let confirmResolver = null;
function showConfirmDialog({ title = 'Are you sure?', desc = '', icon = 'warning', okText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
        confirmResolver = resolve;
        const iconEl = document.getElementById('confirmIcon');
        if (iconEl) iconEl.innerHTML = getSvgIcon(icon);
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
    allPaymentQrs = await getAllPaymentQrs();
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
            ${(currentEvent.max_members > 1 || currentEvent.type === 'group') ? `
            <div class="form-group">
                <label class="form-label">Minimum Participants *</label>
                <input type="number" id="evMinMembers" class="form-input" value="${currentEvent.min_members || 1}" min="1" max="${currentEvent.max_members || 100}">
                <div style="font-size:0.72rem;color:var(--muted);margin-top:4px;">Min team members required for registration (including Leader).</div>
            </div>
            ` : ''}
            <div class="form-group">
                <label class="form-label">Payment QR</label>
                <select id="evPaymentQr" class="form-input" style="padding: 0.7rem; border-radius: 10px; background: #ffffff !important; border: 2px solid #000000 !important;">
                    <option value="">Default (Global QR)</option>
                    ${allPaymentQrs.map(qr => `<option value="${qr.id}" ${currentEvent.payment_qr_id === qr.id ? 'selected' : ''}>₹${qr.amount} QR</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="evDesc" class="form-input" rows="4">${currentEvent.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Rules & Regulations (Optional)</label>
                <textarea id="evRules" class="form-input" rows="4" placeholder="Enter rules for the event...">${currentEvent.rules_text || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Terms & Conditions Checkbox Label (Optional)</label>
                <input type="text" id="evTermsLabel" class="form-input" placeholder="e.g. I agree to all terms and conditions" value="${currentEvent.terms_checkbox_label || ''}">
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
    
    const totalRev = activeRegs
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.amount !== undefined && r.amount !== null ? r.amount : currentEvent.fee), 0);
        
    document.getElementById('statRev').textContent = '₹' + totalRev;
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
            ? `<span class="badge online">Online</span>${r.transaction_id ? `<div style="font-size:0.75rem; color:#555; margin-top:4px;"><b>Txn:</b> ${r.transaction_id}</div>` : ''}` 
            : '<span class="badge cash">Cash</span>';
            
        let comboNameText = r.combos && r.combos.name ? `Combo Deal: ${r.combos.name}` : 'Combo Deal';
        let regTypeBadge = r.is_combo 
            ? `<span class="badge" style="background:#8e44ad; color:#fff; font-size:0.65rem; margin-top:4px; border: 1px solid rgba(0,0,0,0.1);">${comboNameText}</span>` 
            : '<span class="badge" style="background:#2980b9; color:#fff; font-size:0.65rem; margin-top:4px; border: 1px solid rgba(0,0,0,0.1);">Single Event</span>';
            
        let priceText = r.amount !== undefined && r.amount !== null ? `₹${r.amount}` : `₹${currentEvent.fee}`;

        let membersHtml = '';
        if (r.members && r.members.length > 0) {
            membersHtml = r.members.map(m => `<div>• ${m.name}</div>`).join('');
            membersHtml = `<div class="member-list">${membersHtml}</div>`;
        } else {
            membersHtml = '<div class="member-list" style="color:rgba(0,0,0,0.3);">— Solo —</div>';
        }

        let actionHtml = '';

        if (currentTab === 'active') {
            // Approve payment
            if (!r.is_approved) {
                actionHtml += `<button class="action-btn approve" onclick="approveCash('${r.id}')" title="Approve Registration"><i class="fas fa-check-circle" style="font-size:1rem;"></i></button>`;
            }
            // Cancel registration
            actionHtml += `<button class="action-btn reject" onclick="cancelReg('${r.id}')" title="Cancel Registration"><i class="fas fa-ban" style="font-size:0.9rem;"></i></button>`;
            // Edit team details
            actionHtml += `<button class="action-btn edit" onclick="openEditModal('${r.id}')" title="Edit Team Details"><i class="fas fa-edit"></i></button>`;
            // Move to deleted
            actionHtml += `<button class="action-btn delete" onclick="moveToDeleted('${r.id}', '${r.group_name.replace(/'/g, "\\'")}')" title="Move to Recently Deleted"><i class="fas fa-trash-alt"></i></button>`;
        } else if (currentTab === 'cancelled') {
            // Re-Approve directly from Cancelled
            actionHtml += `<button class="action-btn approve" onclick="approveCash('${r.id}')" title="Re-Approve & Confirm"><i class="fas fa-check-circle" style="font-size:0.85rem;"></i> Approve</button>`;
            // Restore / Retrieve
            actionHtml += `<button class="action-btn edit" onclick="restoreReg('${r.id}')" title="Restore to Active Pending"><i class="fas fa-undo" style="font-size:0.85rem;"></i> Restore</button>`;
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
                <td style="font-weight:700;color:#000000;">
                    ${r.group_name}
                    <div style="margin-top:0.3rem;">${regTypeBadge}</div>
                </td>
                <td>
                    <div style="font-weight:600;color:#000000;">${r.leader_name} <i class="fas fa-crown" style="color:#000;font-size:0.65rem;margin-left:3px;"></i></div>
                    <div style="font-size:0.72rem;color:#555;margin-top:2px;">${r.leader_gender || 'N/A'} | ${r.leader_email}</div>
                    <div style="font-size:0.72rem;color:#555;">${r.leader_mobile}</div>
                </td>
                <td>${membersHtml}</td>
                <td>
                    <div style="font-weight:800; font-size:0.95rem; margin-bottom:6px; color:#2c3e50;">${priceText}</div>
                    ${paymentBadge}
                    <div style="margin-top:0.3rem;">${modeBadge}</div>
                </td>
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
        icon: 'check',
        okText: 'Approve All'
    });
    if (!confirmed) return;

    const ids = Array.from(selectedRegIds);
    for (const id of ids) {
        await updateRegistration(id, { payment_status: 'paid', is_approved: true });
        const reg = registrations.find(r => r.id === id);
        if (reg) { 
            reg.payment_status = 'paid'; 
            reg.is_approved = true; 
            sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'confirmed').catch(e => console.error(e));
        }
    }

    selectedRegIds.clear();
    updateBulkBar();
    updateStats();
    renderTable();
    showToast(`Approved ${ids.length} registration(s)!`, 'success');
}

async function bulkRestore() {
    if (selectedRegIds.size === 0) return;
    const confirmed = await showConfirmDialog({
        title: `Restore ${selectedRegIds.size} Registrations?`,
        desc: 'Selected registrations will be retrieved and restored to Active Status.',
        icon: 'refresh',
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
    showToast(`Restored ${ids.length} registration(s)!`, 'success');
}

async function bulkDelete() {
    if (selectedRegIds.size === 0) return;
    const ids = Array.from(selectedRegIds);

    if (currentTab === 'deleted') {
        // Permanent Delete
        const confirmed = await showConfirmDialog({
            title: `Permanently Delete ${ids.length} Registrations?`,
            desc: 'This will remove the data permanently. This action cannot be undone.',
            icon: 'trash',
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
            icon: 'trash',
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
        icon: 'check',
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
    if (reg) { 
        reg.payment_status = 'paid'; 
        reg.is_approved = true; 
        updateStats();
        renderTable();
        const emailRes = await sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'confirmed');
        if (emailRes && emailRes.error) {
            showToast(`Approved! Email notice: ${emailRes.error}`, 'warning', 6000);
        } else {
            showToast(`Payment approved & confirmation email sent to ${reg.leader_email}!`, 'success');
        }
    } else {
        updateStats();
        renderTable();
        showToast('Payment approved successfully!', 'success');
    }
}

/* ── Cancel Registration ── */
async function cancelReg(regId) {
    const confirmed = await showConfirmDialog({
        title: 'Cancel Registration?',
        desc: 'This will cancel this registration and send a notification email to the participant.',
        icon: 'ban',
        okText: 'Cancel Registration',
        danger: true,
    });
    if (!confirmed) return;
    
    const reg = registrations.find(r => r.id === regId);

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
        if (reg) {
            const emailRes = await sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'rejected');
            if (emailRes && emailRes.error) {
                showToast(`Cancelled! Email notice: ${emailRes.error}`, 'warning', 6000);
            } else {
                showToast(`Registration cancelled & deleted (Email sent to ${reg.leader_email})`, 'info');
            }
        } else {
            showToast('Registration cancelled & deleted', 'info');
        }
        return;
    }
    
    if (reg) { 
        reg.payment_status = 'cancelled'; 
        reg.is_approved = false; 
        updateStats();
        renderTable();
        const emailRes = await sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'rejected');
        if (emailRes && emailRes.error) {
            showToast(`Cancelled! Email notice: ${emailRes.error}`, 'warning', 6000);
        } else {
            showToast(`Registration cancelled & notification email sent to ${reg.leader_email}!`, 'info');
        }
    } else {
        updateStats();
        renderTable();
        showToast('Registration moved to Cancelled', 'info');
    }
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
    showToast('Registration restored to Active!', 'success');
}

/* ── Move to Recently Deleted ── */
async function moveToDeleted(regId, groupName) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Registration?',
        desc: `Are you sure you want to delete registration for "${groupName}"? A cancellation notification will be sent.`,
        icon: 'trash',
        okText: 'Delete',
        danger: true,
    });
    if (!confirmed) return;
    
    const reg = registrations.find(r => r.id === regId);
    
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
        if (reg) {
            const emailRes = await sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'rejected');
            if (emailRes && emailRes.error) {
                showToast(`Deleted! Email notice: ${emailRes.error}`, 'warning', 6000);
            } else {
                showToast(`Registration deleted (Email sent to ${reg.leader_email})`, 'info');
            }
        } else {
            showToast('Registration deleted successfully', 'info');
        }
        return;
    }
    
    if (reg) { 
        reg.payment_status = 'deleted'; 
        reg.is_approved = false; 
        updateStats();
        renderTable();
        const emailRes = await sendStatusNotificationEmail({ ...reg, events: currentEvent }, 'rejected');
        if (emailRes && emailRes.error) {
            showToast(`Moved to Deleted! Email notice: ${emailRes.error}`, 'warning', 6000);
        } else {
            showToast(`Moved to Recently Deleted & email sent to ${reg.leader_email}!`, 'info');
        }
    } else {
        updateStats();
        renderTable();
        showToast('Moved to Recently Deleted', 'info');
    }
}

/* ── Permanent Delete ── */
async function permanentDeleteReg(regId, groupName) {
    const confirmed = await showConfirmDialog({
        title: 'Permanently Delete?',
        desc: `Are you sure you want to permanently delete "${groupName}"? This cannot be undone.`,
        icon: 'warning',
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
    const rules = document.getElementById('evRules').value.trim();
    const termsLabel = document.getElementById('evTermsLabel').value.trim();
    const coordinators = document.getElementById('evCoordinators').value.trim();
    const volunteers = document.getElementById('evVolunteers').value.trim();
    const paymentQr = document.getElementById('evPaymentQr').value || null;
    const logoFile = document.getElementById('evLogoFile')?.files[0];
    
    if (!title) { showToast('Event title is required', 'error'); return; }

    const minMembersEl = document.getElementById('evMinMembers');
    let minMembers = minMembersEl ? parseInt(minMembersEl.value, 10) : 1;

    if (minMembersEl) {
        if (isNaN(minMembers) || minMembers < 1) {
            showToast('Minimum participants must be at least 1', 'error');
            return;
        }
        if (currentEvent.max_members && minMembers > currentEvent.max_members) {
            showToast(`Minimum participants (${minMembers}) cannot exceed Max Team Size (${currentEvent.max_members})`, 'error');
            return;
        }
    }
    
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
    

    const updates = {
        title, fee, description: desc, rules_text: rules, terms_checkbox_label: termsLabel, logo_url: newLogoUrl, coordinators, volunteers, payment_qr_id: paymentQr
    };
    if (minMembersEl) {
        updates.min_members = minMembers;
    }
    
    let { data, error } = await updateEvent(eventId, updates);

    // Fallback if min_members column does not exist yet in DB table
    if (error && error.message && error.message.includes('min_members')) {
        delete updates.min_members;
        const res = await updateEvent(eventId, updates);
        error = res.error;
    }
    
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
    currentEvent.payment_qr_id = paymentQr;
    if (minMembersEl) {
        currentEvent.min_members = minMembers;
    }
    
    renderEventInfo();
    updateStats();
    
    showToast('Event details & staff saved!', 'success');
    
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
    
    let csv = "Group Name,Leader Name,Leader Gender,Leader College,Leader Enrollment,Leader Semester,Leader Email,Leader Mobile,Payment Mode,Payment Status,Approved,Members\n";
    
    registrations.forEach(r => {
        const mems = r.members && r.members.length > 0 
            ? r.members.map(m => `${m.name} [${m.gender || 'N/A'}, ${m.college}, Enr: ${m.enrollment}, Sem: ${m.semester}] (${m.mobile})`).join(' | ') 
            : 'None';
        
        csv += [
            `"${(r.group_name || '').replace(/"/g, '""')}"`,
            `"${(r.leader_name || '').replace(/"/g, '""')}"`,
            `"${(r.leader_gender || '').replace(/"/g, '""')}"`,
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
    
    showToast('CSV exported successfully!', 'success');
}

function toggleInfoPanel() {
    const infoPanel = document.getElementById('eventInfoPanel');
    if (infoPanel) {
        infoPanel.classList.toggle('show');
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('eventAdminId');
    window.location.href = 'eventmanagers.html';
}

initAdmin();
