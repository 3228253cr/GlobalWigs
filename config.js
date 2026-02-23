// Global Air Export - Supabase Configuration
const SUPABASE_URL = 'https://xfkenicbdgwfsfjqadcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhma2VuaWNiZGd3ZnNmanFhZGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzE4ODYsImV4cCI6MjA4NzQ0Nzg4Nn0.FvM3R7iu14YHrHFKJeJvV77RJ8ob6x37kBHmzPVrVwY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check auth and redirect
async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Load lookup values by category
async function getLookupValues(category) {
    const { data } = await supabase
        .from('lookup_values')
        .select('value, label')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order');
    return data || [];
}

// Load active records
async function getActiveRecords(table) {
    const { data } = await supabase
        .from(table)
        .select('*')
        .eq('is_active', true)
        .order('name');
    return data || [];
}

// Toast notification
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toastMsg.textContent = msg;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
