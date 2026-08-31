// ═══════════════════════════════════════════════════
//  SUPABASE CONFIG — Replace with your project credentials
// ═══════════════════════════════════════════════════
const SUPABASE_URL = 'https://cwjxzhshujlujhproenn.supabase.co';       // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3anh6aHNodWpsdWpocHJvZW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDYwNDMsImV4cCI6MjA4OTQ4MjA0M30.8E9n9jUeMHs5IuWuYt0YkB7bYaNawf1RNpUBKTUxi4o'; // from Settings → API

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════
//  EVENT HELPERS
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  PAYMENT QRS HELPERS
// ═══════════════════════════════════════════════════

async function getAllPaymentQrs() {
    const { data, error } = await supabaseClient
        .from('payment_qrs')
        .select('*')
        .order('amount', { ascending: true });
    if (error) { console.error('Error fetching payment qrs:', error); return []; }
    return data;
}

async function createPaymentQr(qrData) {
    const { data, error } = await supabaseClient
        .from('payment_qrs')
        .insert([qrData])
        .select()
        .single();
    if (error) { console.error('Error creating payment qr:', error); return { error }; }
    return { data };
}

async function deletePaymentQr(id) {
    const { error } = await supabaseClient
        .from('payment_qrs')
        .delete()
        .eq('id', id);
    if (error) { console.error('Error deleting payment qr:', error); return { error }; }
    return { success: true };
}

async function getAllEvents() {
    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
    if (error) { console.error('Error fetching events:', error); return []; }
    return data;
}

async function getEventById(id) {
    let { data, error } = await supabaseClient
        .from('events')
        .select('*, payment_qrs(*)')
        .eq('id', id)
        .single();
        
    // Fallback if the user hasn't updated the schema to include the payment_qrs table/relation yet
    if (error && error.message && (error.message.includes('payment_qrs') || error.message.includes('relationship'))) {
        console.warn('payment_qrs relationship not found. Falling back to fetching event without it. Please update schema.sql in Supabase.');
        const fallback = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', id)
            .single();
        data = fallback.data;
        error = fallback.error;
    }

    if (error) { console.error('Error fetching event:', error); return null; }
    return data;
}

async function getAllEventsAdmin() {
    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) { console.error('Error fetching events:', error); return []; }
    return data;
}

async function createEvent(eventData) {
    let { data, error } = await supabaseClient
        .from('events')
        .insert([eventData])
        .select()
        .single();
        
    if (error && error.message && error.message.includes('payment_qr_id')) {
        console.warn('payment_qr_id column missing. Retrying creation without it...');
        const fallbackData = { ...eventData };
        delete fallbackData.payment_qr_id;
        
        const res = await supabaseClient
            .from('events')
            .insert([fallbackData])
            .select()
            .single();
        data = res.data;
        error = res.error;
    }
        
    if (error) { console.error('Error creating event:', error); return { error }; }
    return { data };
}

async function updateEvent(id, updates) {
    let { data, error } = await supabaseClient
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
    if (error && error.message && error.message.includes('payment_qr_id')) {
        console.warn('payment_qr_id column missing. Retrying update without it...');
        const fallbackUpdates = { ...updates };
        delete fallbackUpdates.payment_qr_id;
        
        const res = await supabaseClient
            .from('events')
            .update(fallbackUpdates)
            .eq('id', id)
            .select()
            .single();
        data = res.data;
        error = res.error;
    }
        
    if (error) { console.error('Error updating event:', error); return { error }; }
    return { data };
}

async function deleteEvent(id) {
    const { error } = await supabaseClient
        .from('events')
        .delete()
        .eq('id', id);
    if (error) { console.error('Error deleting event:', error); return { error }; }
    return { success: true };
}

// ═══════════════════════════════════════════════════
//  COMBO HELPERS
// ═══════════════════════════════════════════════════

async function getAllCombos() {
    const { data, error } = await supabaseClient
        .from('combos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
    if (error) { console.error('Error fetching combos:', error); return []; }
    return data;
}

async function getAllCombosAdmin() {
    const { data, error } = await supabaseClient
        .from('combos')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) { console.error('Error fetching combos:', error); return []; }
    return data;
}

async function getComboById(id) {
    const { data, error } = await supabaseClient
        .from('combos')
        .select('*')
        .eq('id', id)
        .single();
    if (error) { console.error('Error fetching combo:', error); return null; }
    return data;
}

async function createCombo(comboData) {
    const { data, error } = await supabaseClient
        .from('combos')
        .insert([comboData])
        .select()
        .single();
    if (error) { console.error('Error creating combo:', error); return { error }; }
    return { data };
}

async function updateCombo(id, comboData) {
    const { data, error } = await supabaseClient
        .from('combos')
        .update(comboData)
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('Error updating combo:', error); return { error }; }
    return { data };
}

async function deleteCombo(id) {
    const { error } = await supabaseClient
        .from('combos')
        .delete()
        .eq('id', id);
    if (error) { console.error('Error deleting combo:', error); return { error }; }
    return { success: true };
}

async function forceDeleteCombo(id) {
    try {
        // 1. Get combo details
        const { data: combo } = await supabaseClient
            .from('combos')
            .select('name')
            .eq('id', id)
            .single();
        const comboName = combo ? combo.name : 'Unknown Combo';

        // 2. Get all registrations for this combo WITH members
        const { data: regs } = await supabaseClient
            .from('registrations')
            .select('*, members(*)')
            .eq('combo_id', id);
        
        // 3. Archive and delete if there are registrations
        if (regs && regs.length > 0) {
            // Try to archive data, but DO NOT halt if it fails
            const archiveData = regs.map(reg => ({
                combo_id: id,
                combo_name: comboName,
                registration_data: reg
            }));
            
            const { error: archiveErr } = await supabaseClient
                .from('archived_registrations')
                .insert(archiveData);
            if (archiveErr) console.warn('Archiving failed (table might not exist), proceeding to delete anyway:', archiveErr);

            const regIds = regs.map(r => r.id);
            
            // Try to delete members first (ignore errors, they might cascade or not exist)
            const { error: memErr } = await supabaseClient
                .from('members')
                .delete()
                .in('registration_id', regIds);
            if (memErr) console.warn('Deleting members warning:', memErr);
            
            // Delete registrations (essential before deleting combo)
            const { error: regErr } = await supabaseClient
                .from('registrations')
                .delete()
                .in('id', regIds);
            if (regErr) console.error('Error deleting combo registrations:', regErr);
        }
        
        // 4. Delete combo
        const { error: comboErr } = await supabaseClient
            .from('combos')
            .delete()
            .eq('id', id);
        if (comboErr) { console.error('Error force deleting combo:', comboErr); return { error: comboErr }; }
        
        return { success: true };
    } catch (err) {
        console.error('Exception in forceDeleteCombo:', err);
        return { error: err };
    }
}

// ═══════════════════════════════════════════════════
//  ARCHIVED REGISTRATIONS HELPERS
// ═══════════════════════════════════════════════════

async function getArchivedRegistrations() {
    const { data, error } = await supabaseClient
        .from('archived_registrations')
        .select('*')
        .order('archived_at', { ascending: false });
    if (error) { console.error('Error fetching archived registrations:', error); return []; }
    return data;
}

// ═══════════════════════════════════════════════════
//  REGISTRATION HELPERS
// ═══════════════════════════════════════════════════

async function createRegistration(regData, membersData) {
    // Insert the registration
    const { data: reg, error: regErr } = await supabaseClient
        .from('registrations')
        .insert([regData])
        .select()
        .single();
    if (regErr) { console.error('Registration error:', regErr); return { error: regErr }; }

    // Insert members if any
    if (membersData && membersData.length > 0) {
        const members = membersData.map(m => ({ ...m, registration_id: reg.id }));
        const { error: memErr } = await supabaseClient
            .from('members')
            .insert(members);
        if (memErr) { console.error('Members error:', memErr); return { error: memErr }; }
    }

    return { data: reg };
}

async function getRegistrationsByEvent(eventId) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`*, members(*), combos(name)`)
        .eq('event_id', eventId)
        .neq('is_combo', true)
        .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching registrations:', error); return []; }
    return data;
}

async function getComboRegistrations(comboId) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`*, members(*), combos(name)`)
        .eq('combo_id', comboId)
        .eq('is_combo', true)
        .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching combo registrations:', error); return []; }
    return data;
}

async function getRegistrationById(regId) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`*, members(*), events(*), combos(name)`)
        .eq('id', regId)
        .single();
    if (error) { console.error('Error fetching registration:', error); return null; }
    return data;
}

async function getRegistrationsByEmail(email) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`*, members(*), events(*), combos(name, events_data)`)
        .eq('leader_email', email)
        .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching registrations by email:', error); return []; }
    return data;
}

async function approveRegistration(regId) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .update({ payment_status: 'paid', is_approved: true })
        .eq('id', regId)
        .select();
    if (error) { console.error('Error approving registration:', error); return { error }; }
    return { data, success: true };
}

async function deleteRegistration(regId) {
    // Delete members first
    const { error: memErr } = await supabaseClient
        .from('members')
        .delete()
        .eq('registration_id', regId);
    if (memErr) { console.error('Error deleting members:', memErr); return { error: memErr }; }
    
    // Delete registration
    const { error: regErr } = await supabaseClient
        .from('registrations')
        .delete()
        .eq('id', regId);
    if (regErr) { console.error('Error deleting registration:', regErr); return { error: regErr }; }
    
    return { success: true };
}

async function updateRegistration(id, updates) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('Error updating registration:', error); return { error }; }
    return { data };
}

async function deleteRegistration(id) {
    const { error } = await supabaseClient
        .from('registrations')
        .delete()
        .eq('id', id);
    if (error) { console.error('Error deleting registration:', error); return { error }; }
    return { success: true };
}

/**
 * Checks if a leader email or leader mobile is already registered for a specific event
 */
async function checkRegistrationDuplicate(eventId, email, mobile, isCombo = false) {
    let query = supabaseClient
        .from('registrations')
        .select('id, leader_email, leader_mobile');
        
    if (isCombo) {
        query = query.eq('combo_id', eventId);
    } else if (Array.isArray(eventId)) {
        query = query.in('event_id', eventId);
    } else {
        query = query.eq('event_id', eventId);
    }

    if (email && mobile) {
        query = query.or(`leader_email.eq.${email},leader_mobile.eq.${mobile}`);
    } else if (email) {
        query = query.eq('leader_email', email);
    } else if (mobile) {
        query = query.eq('leader_mobile', mobile);
    }

    const { data, error } = await query.maybeSingle();
    if (error) { console.error('Error checking duplicate registration:', error); return { error }; }
    return { data };
}

// ═══════════════════════════════════════════════════
//  ADMIN AUTH HELPERS
// ═══════════════════════════════════════════════════

async function verifyEventAdminPassword(eventId, password) {
    const { data, error } = await supabaseClient
        .from('events')
        .select('id, title, password')
        .eq('id', eventId)
        .single();
    if (error || !data) return false;
    return data.password === password;
}



async function updateEventPassword(eventId, newPassword) {
    const { error } = await supabaseClient
        .from('events')
        .update({ password: newPassword })
        .eq('id', eventId);
    if (error) { console.error('Error updating event password:', error); return { error }; }
    return { success: true };
}

// ═══════════════════════════════════════════════════
//  SITE SETTINGS HELPERS
// ═══════════════════════════════════════════════════

async function getSiteSettings() {
    const { data, error } = await supabaseClient
        .from('admin_config')
        .select('*')
        .eq('id', 1)
        .single();
    if (error) { console.error('Error fetching site settings:', error); return null; }
    return data;
}

async function updateSiteSettingsDB(updates) {
    const { error } = await supabaseClient
        .from('admin_config')
        .update(updates)
        .eq('id', 1);
    if (error) { console.error('Error updating site settings:', error); return { error }; }
    return { success: true };
}

// ═══════════════════════════════════════════════════
//  IMAGE COMPRESSION HELPER (BROWSER CANVAS)
// ═══════════════════════════════════════════════════

/**
 * Client-side image compressor.
 * Resizes images to max dimensions and converts to WebP format for high performance.
 */
function compressImageFile(file, maxWidth = 500, maxHeight = 500, quality = 0.8) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) return resolve(file);
                        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        const compressedFile = new File([blob], `${cleanName}.webp`, {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => resolve(file);
            img.src = event.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
