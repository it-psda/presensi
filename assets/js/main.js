/**
 * SIM UPT PUSDA - Master Engine v5.0.0 (Ultimate Speed & Sync)
 * Pengembang: Authority Control System
 * Fitur: Instant Loading, Background Sync, Cache Busting, Voice Command.
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxF7MP60nTfLmnA7_GhUedzAl58I51kfJmk_xePBhgVxVHaLtce51aBfCuSskPP67ym/exec";
const FALLBACK_LOGO = "https://lh3.googleusercontent.com/d/1VYrfN1EG20Enf74vSyw1dGdskFujX8_r";

// State Global Aplikasi
window.appData = {
    config: {},
    pegawai: [],
    korlap: [],
    presensi: [],
    tools: [],
    cash: [],
    isLoaded: false
};

// --- INISIALISASI PADA SAAT LOAD ---
window.addEventListener('DOMContentLoaded', async () => {
    // Inisialisasi Komponen Statis
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initTheme();
    initClock();

    // Protokol Speed Optimized: Gunakan Cache Sesi jika tersedia
    const cached = sessionStorage.getItem('pusda_app_data');
    if (cached) {
        window.appData = JSON.parse(cached);
        applyGlobalUI();
        triggerActiveRenderers();
        console.log("⚡ Loading Instan: Menggunakan data dari memori sesi.");
        
        // Background Sync: Update data di latar belakang tanpa mengganggu UI
        fetchFreshData(true);
    } else {
        await fetchFreshData();
    }
});

// --- ENGINE: AMBIL DATA DARI CLOUD ---
async function fetchFreshData(isBackground = false) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`);
        const result = await response.json();

        if (result.status === 'success') {
            window.appData = result;
            window.appData.isLoaded = true;
            
            // Simpan ke Memori Browser (Session Only)
            sessionStorage.setItem('pusda_app_data', JSON.stringify(result));
            
            applyGlobalUI();
            if (!isBackground) triggerActiveRenderers();
            
            // Broadcast event untuk skrip spesifik halaman jika diperlukan
            window.dispatchEvent(new Event('pusdaDataReady'));
        }
    } catch (error) {
        console.error("Cloud Sync Error:", error);
    }
}

// --- ENGINE: PENGIRIMAN DATA (POST) ---
async function submitToCloud(payload) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Limitasi Apps Script
            body: JSON.stringify(payload)
        });
        
        // Cache Busting: Hapus cache lokal agar data baru dipaksa ditarik saat reload
        sessionStorage.removeItem('pusda_app_data');
        return { status: 'success' };
    } catch (error) {
        console.error("Cloud Post Error:", error);
        return { status: 'error' };
    }
}

// --- RENDERER: DISTRIBUSI LOGIKA PER HALAMAN ---
function triggerActiveRenderers() {
    // Dashboard: Ikon Layanan Digital
    if (document.getElementById('toolsContainer')) renderDashboardTools();
    
    // Dashboard: Slider Hero
    if (document.getElementById('heroImage')) startHeroSlider();
    
    // Admin: Grid Pegawai/Korlap
    if (document.getElementById('dataContainer')) typeof renderCards === 'function' ? renderCards() : null;
    
    // Kas: Tabel Keuangan
    if (document.getElementById('kasTableBody')) typeof renderKasTable === 'function' ? renderKasTable() : null;
}

// --- UI: BRANDING & CONSISTENCY ---
function applyGlobalUI() {
    const finalLogo = window.appData.config?.Logo || FALLBACK_LOGO;
    document.querySelectorAll('.main-logo-src, #sidebarLogo, #printLogo').forEach(el => {
        el.src = finalLogo;
    });
}

// --- FITUR: SEARCH & FILTER LOGIC (DASHBOARD) ---
function renderDashboardTools() {
    const container = document.getElementById('toolsContainer');
    if (!container || !window.appData.tools) return;

    const query = (document.getElementById('toolSearch')?.value || "").toLowerCase();
    const rawTools = [...window.appData.tools];
    
    // Auto-Grouping LAPKIN
    const lapkinGroup = rawTools.filter(t => t.Nama.toLowerCase().includes("lapkin"));
    const otherTools = rawTools.filter(t => !t.Nama.toLowerCase().includes("lapkin"));

    let html = "";
    
    // Render Folder LAPKIN
    if(lapkinGroup.length > 0 && (!query || "lapkin".includes(query))) {
        html += `
        <div class="tool-card fade-in" onclick="openLapkinModal(${JSON.stringify(lapkinGroup).replace(/"/g, '&quot;')})">
            <div class="tool-icon" style="background:var(--accent-gradient)"><i data-lucide="folder-kanban"></i></div>
            <div class="tool-name" style="font-weight:900; font-size:0.85rem;">LAPKIN</div>
            <div style="font-size:0.55rem; opacity:0.5; margin-top:-10px;">${lapkinGroup.length} Modul</div>
        </div>`;
    }

    // Render Layanan Terfilter
    html += otherTools.filter(t => t.Nama.toLowerCase().includes(query)).map(t => {
        let url = t.Link_URL || '#';
        if(t.Nama === "E-Presensi") url = 'presensi.html';
        else if(t.Nama === "E-Raport") url = 'raport.html';
        else if(t.Nama === "Wilayah") url = 'wilayah.html';
        else if(t.Nama === "Live Preview") url = 'livepresensi.html';

        return `
        <div class="tool-card fade-in" onclick="location.href='${url}'">
            <div class="tool-icon" style="background:${t.Warna || 'var(--primary)'}"><i data-lucide="${t.Icon || 'layers'}"></i></div>
            <div class="tool-name" style="font-weight:900; font-size:0.85rem;">${t.Nama}</div>
        </div>`;
    }).join('');

    // Layanan Statis (Kas & Admin)
    if("kas kantor".includes(query)) html += `<div class="tool-card fade-in" onclick="location.href='kas.html'"><div class="tool-icon" style="background:var(--toska);"><i data-lucide="wallet"></i></div><div class="tool-name" style="font-weight:900; font-size:0.85rem;">Kas Kantor</div></div>`;
    if("admin panel".includes(query)) html += `<div class="tool-card fade-in" onclick="location.href='admin.html'"><div class="tool-icon" style="background:var(--bg-body); border:1px solid var(--glass-border); color:var(--text-main);"><i data-lucide="shield-check"></i></div><div class="tool-name" style="font-weight:900; font-size:0.85rem;">Admin Panel</div></div>`;

    container.innerHTML = html || `<div style="grid-column:1/-1; text-align:center; padding:50px; opacity:0.3; font-weight:800;">Layanan tidak ditemukan.</div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- FITUR: VOICE COMMAND (SPEAK TO TEXT) ---
function speechToText(targetInputId, btnElement) {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Browser tidak mendukung pencarian suara.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.onstart = () => btnElement.classList.add('listening');
    recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        document.getElementById(targetInputId).value = result;
        // Trigger fungsi render jika di dashboard atau admin
        if (targetInputId === 'toolSearch') renderDashboardTools();
        if (targetInputId === 'adminSearch') typeof renderCards === 'function' ? renderCards() : null;
        if (targetInputId === 'kasSearch') typeof renderKasTable === 'function' ? renderKasTable() : null;
    };
    recognition.onend = () => btnElement.classList.remove('listening');
    recognition.start();
}

// --- UTILS: THEME & CLOCK ---
function initTheme() {
    const isLight = localStorage.getItem('theme') === 'light';
    if (isLight) document.body.classList.add('light-theme');
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    // Sinkronisasi Ikon di sidebar/mobile jika ada
    const sI = document.getElementById('sidebarThemeIcon'), mI = document.getElementById('mobileThemeIcon'), lbl = document.getElementById('themeLabel');
    if (mI) mI.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
    if (sI) sI.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
    if (lbl) lbl.innerText = isLight ? "LIGHT MODE" : "DARK MODE";
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initClock() {
    const el = document.getElementById('clockSidebar');
    if (!el) return;
    setInterval(() => {
        el.innerText = new Date().toLocaleTimeString('id-ID', { hour12: false });
    }, 1000);
}

// --- HERO SLIDER ENGINE ---
let slideIdx = 0;
function startHeroSlider() {
    const img = document.getElementById('heroImage');
    const data = window.appData.korlap;
    if (!img || !data || data.length === 0) return;

    const updateSlider = () => {
        const p = data[slideIdx % data.length];
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = p.Link_Foto_Profile || '';
            img.onload = () => {
                img.style.opacity = '1';
                const label = document.getElementById('heroLabel');
                if(label) {
                    label.innerHTML = `
                        <div style="font-weight:900; font-size:0.85rem; color:white; text-transform:uppercase;">${p.Nama}</div>
                        <div style="font-weight:800; font-size:0.55rem; color:var(--accent); text-transform:uppercase;">${p.Jabatan} ${p.Wilayah}</div>
                    `;
                }
            };
        }, 400);
        slideIdx++;
    };
    updateSlider();
    setInterval(updateSlider, 8000);
}
