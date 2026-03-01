/**
 * SIM UPT PUSDA - Global JavaScript Engine
 * Versi: 2.8.1 (CORS Production Fix - GitHub Pages)
 * Sinkronisasi: MS_PEG, MS_WIL, TOOLS, CONF, E_PRES
 * Fitur: Minimalist GET (No-Preflight), Text-Plain POST, GAS Redirect Support
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxF7MP60nTfLmnA7_GhUedzAl58I51kfJmk_xePBhgVxVHaLtce51aBfCuSskPP67ym/exec";

// Global State Aplikasi
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

// Inisialisasi Utama
window.addEventListener('load', async () => {
    console.log("🚀 Engine SIM PUSDA Memulai...");
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    initTheme();
    initClock();
    
    // Ambil data database
    await fetchAppData();

    // Jalankan Fitur UI secara Kondisional
    if (document.getElementById('toolsContainer')) renderDashboardTools();
    if (document.getElementById('heroImage')) startHeroSlide();
    if (document.getElementById('adminContent')) renderAdminTable();
    if (document.getElementById('selPegawai')) populateCombinedPegawai();
});

/**
 * --- 1. DATA SYNC (GET DATA) ---
 * Perbaikan: Menghapus header kustom untuk menghindari Preflight OPTIONS
 */
async function fetchAppData() {
    try {
        // Penting: Jangan menambahkan headers kustom pada GET ke GAS untuk menghindari CORS Preflight
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, {
            method: 'GET',
            redirect: 'follow' // Wajib bagi Google Apps Script
        });
        
        if (!response.ok) throw new Error("Gagal merespon server.");
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
            console.log("✅ Database Sinkron.");
            
            // Trigger Re-render
            if (typeof renderAdminTable === 'function' && document.getElementById('tableBody')) renderAdminTable();
            if (typeof populateCombinedPegawai === 'function' && document.getElementById('selPegawai')) populateCombinedPegawai();
        }
    } catch (error) {
        window.appData.isLoaded = false;
        console.error("🔴 Sync Error:", error);
        // showToast("Gagal sinkronisasi. Cek status Deployment GAS Anda.", "danger");
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
 * --- 2. NOTIFICATION SYSTEM (TOAST) ---
 */
function showToast(message, type = "success") {
    const existing = document.querySelector('.pusda-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `pusda-toast fade-in ${type}`;
    
    const icons = { 
        success: 'check-circle', 
        danger: 'alert-circle', 
        info: 'info', 
        warning: 'alert-triangle' 
    };

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
        </div>
    `;

    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}

/**
 * --- 3. ADMIN & AUTH LOGIC ---
 */
async function login() {
    const passInput = document.getElementById('pass');
    if (!passInput) return;
    
    if (!window.appData.isLoaded) {
        showToast("Database sedang memuat. Ulangi dalam 3 detik.", "warning");
        await fetchAppData();
        if (!window.appData.isLoaded) return;
    }

    const passValue = passInput.value;
    const adminPass = window.appData.config.AdminPassword || 'pusda123';

    if (passValue === adminPass) {
        showToast("Login Berhasil!");
        const loginArea = document.getElementById('loginArea');
        const adminContent = document.getElementById('adminContent');
        
        if (loginArea) {
            loginArea.classList.add('fade-out');
            setTimeout(() => {
                loginArea.style.display = 'none';
                if (adminContent) {
                    adminContent.style.display = 'block';
                    adminContent.classList.remove('hidden');
                    adminContent.classList.add('fade-in');
                    if (typeof renderAdminTable === 'function') renderAdminTable();
                }
            }, 400);
        }
    } else {
        showToast("Kata Sandi Salah!", "danger");
        passInput.value = '';
    }
}

/**
 * --- 4. CRUD PEGAWAI & KORLAP (POST DATA) ---
 * Menggunakan Content-Type: text/plain untuk bypass CORS Preflight
 */
async function saveAdminData() {
    const btn = document.querySelector('#formAdmin button[type="submit"]');
    if (!btn) return;

    const id = document.getElementById('formID').value;
    const nama = document.getElementById('formNama').value;
    
    if (!id || !nama) {
        showToast("ID dan Nama wajib diisi!", "warning");
        return;
    }

    const modalTitle = document.getElementById('modalTitle').innerText;
    const isKorlap = modalTitle.includes("Korlap");

    const payload = {
        action: "savePegawai",
        isKorlap: isKorlap,
        ID: id,
        Nama: nama,
        Jabatan: document.getElementById('formJabatan').value,
        Wilayah: document.getElementById('formWilayah').value,
        NoHP: document.getElementById('formHP').value,
        Lokasi_Kerja: document.getElementById('formLokasi').value,
        Status: document.getElementById('formStatus').value,
        Link_Foto_Profile: document.getElementById('formLinkFoto').value
    };

    const previewImg = document.getElementById('formPreview');
    if (previewImg && previewImg.src.startsWith('data:image')) {
        payload.fotoBase64 = previewImg.src;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Memproses...';
        lucide.createIcons();

        // Mengirim sebagai text/plain agar browser tidak mengirim permintaan OPTIONS
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.status === 'success') {
            showToast("Data Berhasil Disimpan.");
            if (typeof closeModalAdmin === 'function') closeModalAdmin();
            await fetchAppData(); 
        } else {
            showToast("Gagal: " + result.message, "danger");
        }
    } catch (error) {
        showToast("Error Koneksi. Pastikan Apps Script Aktif.", "danger");
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
        selfieBase64: document.getElementById('prevSelfie').src,
        workBase64: document.getElementById('prevWork').src
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Mengirim...';
        lucide.createIcons();

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.status === 'success') {
            showToast(`Berhasil! Skor: ${result.score}`);
            setTimeout(() => location.reload(), 2000);
        } else {
            showToast(result.message, "danger");
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Gagal kirim. Cek internet.", "danger");
    }
}

/**
 * Suara ke Teks
 */
function startSpeechToText() {
    const btn = document.getElementById('voiceBtn');
    const noteArea = document.getElementById('inpNote');

    if (!('webkitSpeechRecognition' in window)) {
        showToast("Voice Input tidak didukung.", "warning");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'id-ID';
    
    recognition.onstart = () => {
        btn.classList.add('listening');
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        lucide.createIcons();
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        noteArea.value += (noteArea.value ? ' ' : '') + text;
    };

    recognition.onend = () => {
        btn.classList.remove('listening');
        btn.innerHTML = '<i data-lucide="mic"></i>';
        lucide.createIcons();
        if (typeof validateForm === 'function') validateForm();
    };

    recognition.start();
}

/**
 * --- 6. UI COMPONENT RENDERING ---
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
            heroImg.src = p.Link_Foto_Profile || 'https://placehold.co/400x600?text=PNG';
            heroImg.onload = () => {
                heroImg.style.opacity = '1';
                if (heroLabel) {
                    heroLabel.innerHTML = `
                        <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); padding: 10px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
                            <span style="display:block; font-size:0.9rem; font-weight:800; color:#fff;">${p.Nama.toUpperCase()}</span>
                            <span style="font-weight:700; font-size:0.7rem; color:var(--accent); text-transform:uppercase;">KORLAP ${p.Wilayah}</span>
                        </div>
                    `;
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
    if (!container || window.appData.tools.length === 0) return;

    container.innerHTML = window.appData.tools.map(tool => `
        <div class="tool-card fade-in" onclick="location.href='${getToolUrl(tool)}'">
            <div class="tool-icon" style="background:${tool.Warna || '#1e3a8a'}">
                <i data-lucide="${tool.Icon || 'box'}"></i>
            </div>
            <div class="tool-name">${tool.Nama}</div>
        </div>
    `).join('');
    lucide.createIcons();
}

function getToolUrl(tool) {
    const map = { 'E-Presensi': 'presensi.html', 'E-Raport': 'raport.html', 'Wilayah': 'wilayah.html' };
    return tool.Link_URL && tool.Link_URL !== '#' ? tool.Link_URL : (map[tool.Nama] || '#');
}

/**
 * --- 7. UTILITIES ---
 */
function initClock() {
    const el = document.getElementById('clockSidebar');
    if (!el) return;
    const tick = () => {
        el.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
}

function initTheme() {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-theme');
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

window.onerror = (msg, url, line) => { 
    console.error(`🔴 Runtime Error: ${msg} at line ${line}`); 
    return false; 
};

