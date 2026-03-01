/**
 * SIM UPT PUSDA - Global JavaScript Engine
 * Versi: 3.0.0 (Ultimate Production Sync)
 * Sinkronisasi: MS_PEG, MS_WIL, TOOLS, CONF, E_PRES, E_AGN
 * Fitur: No-Preflight POST (CORS Fix), Reset Logic, Auto-Scoring, lh3 Link Support
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxF7MP60nTfLmnA7_GhUedzAl58I51kfJmk_xePBhgVxVHaLtce51aBfCuSskPP67ym/exec";

// State Global Aplikasi
window.appData = {
    config: {},
    pegawai: [],
    korlap: [],
    presensi: [],
    tools: [],
    agenda: [],
    isLoaded: false
};

let slideIdx = 0;
let slideInterval;

// Inisialisasi saat halaman selesai dimuat
window.addEventListener('load', async () => {
    console.log("🚀 Engine SIM PUSDA v3.0 Memulai...");
    
    // Aktifkan Ikon Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Fitur Dasar
    initTheme();
    initClock();
    
    // Sinkronisasi Database
    await fetchAppData();

    // Inisialisasi Komponen UI berdasarkan elemen yang ada di halaman
    if (document.getElementById('toolsContainer')) renderDashboardTools();
    if (document.getElementById('heroImage')) startHeroSlide();
    if (document.getElementById('adminContent')) renderAdminTable();
    if (document.getElementById('selPegawai')) populateCombinedPegawai();
});

/**
 * --- 1. DATA SYNC (GET) ---
 */
async function fetchAppData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });
        
        if (!response.ok) throw new Error("Server tidak merespon.");
        const result = await response.json();

        if (result.status === 'success') {
            window.appData = {
                config: result.config || {},
                pegawai: result.pegawai || [],
                korlap: result.korlap || [],
                presensi: result.presensi || [],
                tools: result.tools || [],
                agenda: result.agenda || [],
                isLoaded: true
            };
            
            updateGlobalUI();
            console.log("✅ Sinkronisasi Database Berhasil.");
            
            // Render ulang komponen jika diperlukan
            if (typeof renderAdminTable === 'function' && document.getElementById('tableBody')) renderAdminTable();
        }
    } catch (error) {
        window.appData.isLoaded = false;
        console.error("🔴 Sync Error:", error);
        showToast("Gagal menyambung ke database Cloud.", "danger");
    }
}

function updateGlobalUI() {
    const logoUrl = window.appData.config.Logo;
    if (logoUrl) {
        const logos = document.querySelectorAll('#sidebarLogo, #printLogo, #adminLogo');
        logos.forEach(el => { if (el) el.src = logoUrl; });
    }
}

/**
 * --- 2. NOTIFIKASI (TOAST) ---
 */
function showToast(message, type = "success") {
    const existing = document.querySelector('.pusda-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `pusda-toast fade-in ${type}`;
    const icons = { success: 'check-circle', danger: 'alert-circle', info: 'info', warning: 'alert-triangle' };

    toast.innerHTML = `
        <div class="toast-content" style="
            position: fixed; top: 25px; right: 25px; z-index: 9999;
            background: ${type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#3b82f6'};
            color: white; padding: 15px 25px; border-radius: 20px;
            display: flex; align-items: center; gap: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-weight: 800; font-size: 0.85rem;
            border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px);
            max-width: 320px;
        ">
            <i data-lucide="${icons[type] || 'bell'}"></i>
            <span style="flex:1;">${message}</span>
        </div>`;

    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4500);
}

/**
 * --- 3. LOGIN & ADMIN LOGIC ---
 */
async function login() {
    const passInput = document.getElementById('pass');
    if (!passInput) return;
    
    if (!window.appData.isLoaded) {
        showToast("Database sedang memuat...", "warning");
        return;
    }

    const passValue = passInput.value;
    const adminPass = window.appData.config.AdminPassword || 'pusda123';

    if (passValue === adminPass) {
        showToast("Akses Diterima!");
        document.getElementById('loginArea').style.display = 'none';
        const adminContent = document.getElementById('adminContent');
        if (adminContent) {
            adminContent.classList.remove('hidden');
            adminContent.classList.add('fade-in');
            renderAdminTable();
        }
    } else {
        showToast("Kata Sandi Salah!", "danger");
        passInput.value = '';
    }
}

/**
 * --- 4. CRUD: SAVE PEGAWAI/KORLAP (POST) ---
 */
async function saveAdminData() {
    const btn = document.querySelector('#formAdmin button[type="submit"]');
    if (!btn) return;

    const payload = {
        action: "savePegawai",
        isKorlap: document.getElementById('modalTitle').innerText.includes("Korlap"),
        ID: document.getElementById('formID').value,
        Nama: document.getElementById('formNama').value,
        Jabatan: document.getElementById('formJabatan').value,
        Wilayah: document.getElementById('formWilayah').value,
        NoHP: document.getElementById('formHP').value,
        Lokasi_Kerja: document.getElementById('formLokasi').value,
        Status: document.getElementById('formStatus').value,
        Link_Foto_Profile: document.getElementById('formLinkFoto').value
    };

    if (document.getElementById('formPreview').src.startsWith('data:image')) {
        payload.fotoBase64 = document.getElementById('formPreview').src;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sinkronisasi...';
        lucide.createIcons();

        // Gunakan text/plain untuk bypass CORS OPTIONS di GitHub Pages
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            showToast("Data tersimpan di Cloud.");
            if (typeof closeModalAdmin === 'function') closeModalAdmin();
            await fetchAppData(); 
        }
    } catch (error) {
        showToast("Gagal menyimpan data.", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Simpan Perubahan';
        lucide.createIcons();
    }
}

/**
 * --- 5. PRESENSI LOGIC ---
 */
async function submitPresensi() {
    const btn = document.getElementById('btnSubmit');
    if (!btn) return;

    const payload = {
        action: "presensi",
        idPegawai: document.getElementById('selPegawai').value,
        nama: document.getElementById('profName').innerText,
        status: typeof selectedStatus !== 'undefined' ? selectedStatus : '',
        keterangan: document.getElementById('inpNote').value,
        gps: typeof coords !== 'undefined' ? coords : '',
        wilayah: typeof currentRegion !== 'undefined' ? currentRegion : '',
        selfieBase64: document.getElementById('prevSelfie').src.includes('data:image') ? document.getElementById('prevSelfie').src : "",
        workBase64: document.getElementById('prevWork').src.includes('data:image') ? document.getElementById('prevWork').src : ""
    };

    try {
        btn.disabled = true;
        btn.innerHTML = 'Mengirim...';

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            showToast(`Presensi Berhasil! Skor: ${result.score}`);
            setTimeout(() => location.reload(), 2000);
        }
    } catch (error) {
        showToast("Gagal kirim presensi.", "danger");
        btn.disabled = false;
    }
}

/**
 * --- 6. RESET LOGIC (FITUR BARU) ---
 */
async function resetTodayPresence(idPegawai) {
    const confirmReset = confirm("Hapus data presensi pegawai ini untuk HARI INI? Pegawai bisa melakukan absen ulang setelah direset.");
    if (!confirmReset) return;

    const payload = {
        action: "resetPresensi",
        idPegawai: idPegawai,
        tanggal: new Date().toISOString().split('T')[0]
    };

    try {
        showToast("Mereset data...", "info");
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(result.message);
            await fetchAppData(); // Refresh tabel
        } else {
            showToast(result.message, "warning");
        }
    } catch (error) {
        showToast("Gagal menghubungi server.", "danger");
    }
}

/**
 * --- 7. UI RENDERING ---
 */
function startHeroSlide() {
    const heroImg = document.getElementById('heroImage');
    const heroLabel = document.getElementById('heroLabel');
    const data = window.appData.korlap;

    if (!heroImg || !data || data.length === 0) return;

    const update = () => {
        const p = data[slideIdx % data.length];
        heroImg.style.opacity = '0';
        setTimeout(() => {
            heroImg.src = p.Link_Foto_Profile || '';
            heroImg.onload = () => {
                heroImg.style.opacity = '1';
                if (heroLabel) {
                    heroLabel.innerHTML = `
                        <div style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); padding: 8px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
                            <span style="display:block; font-size:0.85rem; font-weight:800; color:#fff;">${p.Nama.toUpperCase()}</span>
                            <span style="font-weight:600; font-size:0.65rem; color:var(--accent); text-transform:uppercase;">KORLAP ${p.Wilayah}</span>
                        </div>`;
                }
            };
        }, 500);
        slideIdx++;
    };

    update();
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(update, 8000);
}

function renderDashboardTools() {
    const container = document.getElementById('toolsContainer');
    if (!container || !window.appData.tools.length) return;

    container.innerHTML = window.appData.tools.map(tool => `
        <div class="tool-card fade-in" onclick="location.href='${getToolUrl(tool)}'">
            <div class="tool-icon" style="background:${tool.Warna || '#1e3a8a'}">
                <i data-lucide="${tool.Icon || 'box'}"></i>
            </div>
            <div class="tool-name">${tool.Nama}</div>
        </div>`).join('');
    lucide.createIcons();
}

function getToolUrl(tool) {
    const map = { 'E-Presensi': 'presensi.html', 'E-Raport': 'raport.html', 'Wilayah': 'wilayah.html', 'Admin Panel': 'admin.html' };
    return tool.Link_URL && tool.Link_URL !== '#' ? tool.Link_URL : (map[tool.Nama] || '#');
}

/**
 * --- 8. UTILS ---
 */
function initClock() {
    const el = document.getElementById('clockSidebar');
    if (!el) return;
    const tick = () => { el.innerText = new Date().toLocaleTimeString('id-ID'); };
    tick(); setInterval(tick, 1000);
}

function initTheme() {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-theme');
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

// Speak to Text
function startSpeechToText() {
    const btn = document.getElementById('voiceBtn');
    const noteArea = document.getElementById('inpNote');
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.onstart = () => { btn.classList.add('listening'); };
    recognition.onresult = (event) => { noteArea.value += event.results[0][0].transcript; };
    recognition.onend = () => { btn.classList.remove('listening'); if (typeof validateForm === 'function') validateForm(); };
    recognition.start();
}

window.onerror = (msg) => { console.error("🔴 Runtime Error:", msg); return false; };


