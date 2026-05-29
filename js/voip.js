// Global Air Export - VoIP (Twilio Voice) dialer logic
// ---------------------------------------------------------------
// Browser-based outgoing calls using the Twilio Voice JavaScript SDK.
// The SDK (window.Twilio.Device) must be loaded before this script.
// ---------------------------------------------------------------

// ⚙️ CONFIG — replace tokenUrl with your deployed Twilio Function URL.
//    Example: https://my-voip-1234-dev.twil.io/token
const VOIP_CONFIG = {
    tokenUrl: '', // <-- PASTE YOUR /token FUNCTION URL HERE
};

let device = null;     // Twilio.Device instance
let activeCall = null;  // current Twilio.Call
let callStartTime = null;
let durationTimer = null;

// --- UI helpers -------------------------------------------------
function setStatus(text, cssClass) {
    const el = document.getElementById('callStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'badge ' + (cssClass || 'bg-secondary');
}

function setButtons({ canCall, inCall }) {
    const callBtn = document.getElementById('btnCall');
    const hangupBtn = document.getElementById('btnHangup');
    const muteBtn = document.getElementById('btnMute');
    if (callBtn) callBtn.disabled = !canCall || inCall;
    if (hangupBtn) hangupBtn.disabled = !inCall;
    if (muteBtn) muteBtn.disabled = !inCall;
}

function startDurationTimer() {
    callStartTime = Date.now();
    durationTimer = setInterval(() => {
        const s = Math.floor((Date.now() - callStartTime) / 1000);
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        const el = document.getElementById('callTimer');
        if (el) el.textContent = `${mm}:${ss}`;
    }, 1000);
}

function stopDurationTimer() {
    clearInterval(durationTimer);
    durationTimer = null;
    const el = document.getElementById('callTimer');
    if (el) el.textContent = '00:00';
}

// --- Device setup -----------------------------------------------
async function initDevice(identity) {
    if (!VOIP_CONFIG.tokenUrl) {
        setStatus('לא מוגדר — חסר Token URL', 'bg-danger');
        const warn = document.getElementById('configWarning');
        if (warn) warn.classList.remove('d-none');
        return;
    }

    setStatus('מתחבר...', 'bg-warning text-dark');
    try {
        const url = `${VOIP_CONFIG.tokenUrl}?identity=${encodeURIComponent(identity)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Token request failed: ' + res.status);
        const { token } = await res.json();

        device = new Twilio.Device(token, {
            codecPreferences: ['opus', 'pcmu'],
            logLevel: 'error',
        });

        device.on('registered', () => {
            setStatus('מוכן לחיוג', 'bg-success');
            setButtons({ canCall: true, inCall: false });
        });
        device.on('error', (err) => {
            console.error('Twilio.Device error:', err);
            setStatus('שגיאה: ' + (err.message || err.code), 'bg-danger');
        });
        device.on('tokenWillExpire', async () => {
            try {
                const r = await fetch(`${VOIP_CONFIG.tokenUrl}?identity=${encodeURIComponent(identity)}`);
                const { token: fresh } = await r.json();
                device.updateToken(fresh);
            } catch (e) { console.error('token refresh failed', e); }
        });

        await device.register();
    } catch (err) {
        console.error(err);
        setStatus('כשל בהתחברות', 'bg-danger');
    }
}

// --- Call actions -----------------------------------------------
async function placeCall() {
    const input = document.getElementById('phoneInput');
    const to = (input.value || '').trim();
    if (!to) { showToast('נא להזין מספר טלפון', 'danger'); return; }
    if (!device) { showToast('המכשיר אינו מוכן', 'danger'); return; }

    setStatus('מחייג...', 'bg-info text-dark');
    setButtons({ canCall: true, inCall: true });

    try {
        activeCall = await device.connect({ params: { To: to } });

        activeCall.on('accept', () => {
            setStatus('בשיחה', 'bg-success');
            startDurationTimer();
        });
        activeCall.on('disconnect', endCallCleanup);
        activeCall.on('cancel', endCallCleanup);
        activeCall.on('reject', endCallCleanup);
        activeCall.on('error', (e) => {
            console.error('Call error:', e);
            setStatus('שגיאת שיחה', 'bg-danger');
            endCallCleanup();
        });
    } catch (err) {
        console.error(err);
        setStatus('כשל בחיוג', 'bg-danger');
        setButtons({ canCall: true, inCall: false });
    }
}

function hangUp() {
    if (activeCall) activeCall.disconnect();
    else if (device) device.disconnectAll();
}

function toggleMute() {
    if (!activeCall) return;
    const muted = !activeCall.isMuted();
    activeCall.mute(muted);
    const btn = document.getElementById('btnMute');
    if (btn) {
        btn.innerHTML = muted
            ? '<i class="bi bi-mic-mute-fill"></i>'
            : '<i class="bi bi-mic-fill"></i>';
        btn.classList.toggle('btn-warning', muted);
        btn.classList.toggle('btn-outline-secondary', !muted);
    }
}

function endCallCleanup() {
    activeCall = null;
    stopDurationTimer();
    setStatus('מוכן לחיוג', 'bg-success');
    setButtons({ canCall: true, inCall: false });
    const btn = document.getElementById('btnMute');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-outline-secondary');
    }
}

// --- Keypad -----------------------------------------------------
function pressKey(digit) {
    const input = document.getElementById('phoneInput');
    if (activeCall) {
        activeCall.sendDigits(digit); // send DTMF during a live call
    }
    input.value += digit;
}

function clearNumber() {
    document.getElementById('phoneInput').value = '';
}

function backspace() {
    const input = document.getElementById('phoneInput');
    input.value = input.value.slice(0, -1);
}
