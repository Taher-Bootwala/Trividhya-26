// ═══════════════════════════════════════════════════
//  SUPABASE CONFIG — Replace with your project credentials
// ═══════════════════════════════════════════════════
const SUPABASE_URL = 'https://cwjxzhshujlujhproenn.supabase.co';       // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3anh6aHNodWpsdWpocHJvZW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDYwNDMsImV4cCI6MjA4OTQ4MjA0M30.8E9n9jUeMHs5IuWuYt0YkB7bYaNawf1RNpUBKTUxi4o'; // from Settings → API

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════
//  EVENT HELPERS
// ═══════════════════════════════════════════════════

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
    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
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
    const { data, error } = await supabaseClient
        .from('events')
        .insert([eventData])
        .select()
        .single();
    if (error) { console.error('Error creating event:', error); return { error }; }
    return { data };
}

async function updateEvent(id, updates) {
    const { data, error } = await supabaseClient
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
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
        .select(`*, members(*)`)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching registrations:', error); return []; }
    return data;
}

async function getRegistrationById(regId) {
    const { data, error } = await supabaseClient
        .from('registrations')
        .select(`*, members(*), events(*)`)
        .eq('id', regId)
        .single();
    if (error) { console.error('Error fetching registration:', error); return null; }
    return data;
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
async function checkRegistrationDuplicate(eventId, email, mobile) {
    let query = supabaseClient
        .from('registrations')
        .select('id, leader_email, leader_mobile')
        .eq('event_id', eventId);

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

async function verifyMainAdminPassword(password) {
    const { data, error } = await supabaseClient
        .from('admin_config')
        .select('main_admin_password')
        .eq('id', 1)
        .single();
    if (error || !data) return false;
    return data.main_admin_password === password;
}

async function updateMainAdminPassword(newPassword) {
    const { error } = await supabaseClient
        .from('admin_config')
        .update({ main_admin_password: newPassword })
        .eq('id', 1);
    if (error) { console.error('Error updating password:', error); return { error }; }
    return { success: true };
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
