/**
 * SIM UPT PUSDA - Global JavaScript Engine
 * Versi: 2.7.4 (Production Ready - GitHub Pages Optimized)
 * Sinkronisasi: MS_PEG, MS_WIL, TOOLS, CONF, E_PRES
 * Fitur: Modern Toast, CRUD Sync, Auto-Scoring, & GAS Redirect Fix
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxOL0goC2pdIIx6hHzgrzdHm8tlO3FBKICPGl5AJsKuJfRT_0qsMQE7gqStHAzsLTW0/exec";

// Global State Aplikasi
window.appData = {
    config: {},
    pegawai: [],
    korlap: [],
    presensi: [],
    tools: [],
    agenda: [],
    isLoaded: false // Flag untuk mengecek apakah data sudah siap
};

let slideIdx = 0;
let slideInterval;

// Inisialisasi Utama
window.addEventListener('load', async () => {
    console.log("Sistem PUSDA Memulai...");
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initTheme();
    initClock();
    
    // Ambil data dari database sebelum menjalankan fitur halaman
    await fetchAppData();

    // Jalankan fitur spesifik jika elemen tersedia di DOM
    if (document.getElementById('toolsContainer')) renderDashboardTools();
    if (document.getElementById('heroImage')) startHeroSlide();
    if (document.getElementById('adminContent')) renderAdminTable();
    
    // Inisialisasi khusus halaman presensi jika ada
    if (typeof populateCombinedPegawai === 'function') populateCombinedPegawai();
});

/**
 * --- DATA SYNC ---
 * Menggunakan mode cors dan redirect follow untuk Google Apps Script
 */
async function fetchAppData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, {
            method: 'GET',
            mode: 'cors', 
            redirect: 'follow',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);

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
            console.log("✅ Database Terkoneksi & Sinkron.");
            
            // Re-render jika di halaman admin
            const tableBody = document.getElementById('tableBody');
            if (tableBody && typeof renderAdminTable === 'function') {
                renderAdminTable();
            }
        } else {
            throw new Error(result.message || "Server mengembalikan status error.");
        }
    } catch (error) {
        window.appData.isLoaded = false;
        let msg = "Gagal sinkronisasi database.";
        if (error.message.includes("fetch")) {
            msg = "Masalah Koneksi/CORS. Pastikan Apps Script 'Anyone' & jalankan di Server/Hosting.";
        }
        showToast(msg, "danger");
        console.error("🔴 Error Detail:", error);
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
 * --- NOTIFICATION SYSTEM (TOAST) ---
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
            background: ${type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white; padding: 15px 25px; border-radius: 20px;
            display: flex; align-items: center; gap: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-weight: 800; font-size: 0.85rem;
            border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px);
            max-width: 300px;
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
 * --- ADMIN & LOGIN LOGIC ---
 */
async function login() {
    const passInput = document.getElementById('pass');
    if (!passInput) return;
    
    // Cegah login jika data belum siap
    if (!window.appData.isLoaded) {
        showToast("Menunggu sinkronisasi database... Mohon tunggu sebentar.", "warning");
        await fetchAppData();
        if (!window.appData.isLoaded) return;
    }

    const passValue = passInput.value;
    const adminPass = window.appData.config.AdminPassword || 'pusda123';

    if (passValue === adminPass) {
        showToast("Akses Diterima. Selamat Datang Admin.");
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
        passInput.focus();
    }
}

/**
 * --- CRUD: SAVE DATA ---
 */
async function saveAdminData() {
    const btn = document.querySelector('#formAdmin button[type="submit"]');
    if (!btn) return;

    const originalText = btn.innerHTML;
    const id = document.getElementById('formID').value;
    const nama = document.getElementById('formNama').value;
    
    if (!id || !nama) {
        showToast("ID dan Nama wajib diisi!", "warning");
        return;
    }

    const isKorlap = document.getElementById('modalTitle').innerText.includes("Korlap");

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
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sinkronisasi...';
        lucide.createIcons();

        // Mengirim sebagai text/plain untuk menghindari Preflight OPTIONS di GitHub Pages
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.status === 'success') {
            showToast("Data tersimpan dan disinkronkan.");
            if (typeof closeModalAdmin === 'function') closeModalAdmin();
            await fetchAppData(); 
        } else {
            showToast("Gagal: " + result.message, "danger");
        }
    } catch (error) {
        showToast("Terjadi kesalahan koneksi/server.", "danger");
        console.error("Save Error:", error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        lucide.createIcons();
    }
}

/**
 * --- HERO & DASHBOARD ---
 */
function startHeroSlide() {
    const heroImg = document.getElementById('heroImage');
    const heroLabel = document.getElementById('heroLabel');
    if (!heroImg || !window.appData.korlap || window.appData.korlap.length === 0) return;

    const updateSlide = () => {
        const p = window.appData.korlap[slideIdx % window.appData.korlap.length];
        if (p && p.Link_Foto_Profile) {
            heroImg.style.opacity = '0';
            heroImg.style.transform = 'scale(0.9) translateY(10px)';
            
            setTimeout(() => {
                heroImg.src = p.Link_Foto_Profile;
                heroImg.onload = () => {
                    heroImg.style.opacity = '1';
                    heroImg.style.transform = 'scale(1.15) translateY(-10px)';
                    if (heroLabel) {
                        heroLabel.innerHTML = `
                            <div style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 8px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
                                <span style="display:block; font-size:0.85rem; font-weight:800; color: #fff;">${p.Nama.toUpperCase()}</span>
                                <span style="font-weight:600; font-size:0.65rem; color: var(--accent); text-transform: uppercase;">KORLAP ${p.Wilayah}</span>
                            </div>
                        `;
                    }
                };
            }, 500);
        }
        slideIdx++;
    };

    updateSlide();
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(updateSlide, 7000);
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
    if (tool.Link_URL && tool.Link_URL !== '#') return tool.Link_URL;
    const map = { 
        'E-Presensi': 'presensi.html', 
        'E-Raport': 'raport.html', 
        'Wilayah': 'wilayah.html',
        'Admin Panel': 'admin.html'
    };
    return map[tool.Nama] || '#';
}

/**
 * --- GLOBAL UTILS ---
 */
function initClock() {
    const clockEl = document.getElementById('clockSidebar');
    if (!clockEl) return;
    const update = () => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
}

function initTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    showToast(`Mode ${isLight ? 'Terang' : 'Gelap'} Aktif`, "info");
}

window.onerror = function(msg, url, line) {
    console.error("PUSDA Engine Error:", msg, "at line:", line);
    return false;
};
