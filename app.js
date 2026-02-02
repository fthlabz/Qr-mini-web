/* --------------------------------------------------
   DIJITAL KATALOG - ANA MANTIK DOSYASI (app.js)
   --------------------------------------------------
*/

// 🔥 BURAYA DİKKAT: Kendi Google Apps Script Linkini tırnak içine yapıştır.
const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

// URL'den ID'yi al
const urlParams = new URLSearchParams(window.location.search);
const PAGE_ID = urlParams.get('id');

// Global Veri Deposu
let DATA = {
    title: "", slogan: "", phone: "", insta: "", map: "",
    pLink: "", vLink: "", daily: "",
    fImg: "", fTag: "", fOld: "", fNew: "",
    adminHash: ""
};

/* --- 1. BAŞLANGIÇ --- */
window.onload = function() {
    if (!PAGE_ID) {
        document.getElementById('loading-screen').innerHTML = "<br>ID BULUNAMADI<br><small>Linkin sonuna ?id=X ekleyin</small>";
        return;
    }
    fetchData();
};

/* --- 2. VERİ ÇEKME İŞLEMİ --- */
async function fetchData() {
    try {
        const response = await fetch(`${API_URL}?action=read&id=${PAGE_ID}`);
        const result = await response.json();

        // Yükleme ekranını gizle
        document.getElementById('loading-screen').style.display = 'none';

        if (result.status === "empty") {
            // Veri yoksa kurulum modunu aç
            toggleAdminPanel(true);
            document.getElementById('ui-company').innerText = "Kurulum Gerekli";
            return;
        }

        // Gelen veriyi işle (Eski yapıya uygun parse etme)
        const parts = (result.folder || "").split("|||");
        
        DATA = {
            title: result.title,
            slogan: safeDec(parts[3]),
            phone: safeDec(parts[4]),
            insta: safeDec(parts[6]),
            map: safeDec(parts[8]),
            
            pLink: parts[0], // Ürünler Klasörü
            vLink: parts[1], // Video Klasörü
            adminHash: parts[2], // Şifre Hash'i
            
            daily: result.ses, // Öne Çıkan Video ID'si
            
            fImg: safeDec(parts[9]),  // Fırsat Resim
            fOld: safeDec(parts[10]), // Eski Fiyat
            fNew: safeDec(parts[11]), // Yeni Fiyat
            fTag: safeDec(parts[12])  // Fırsat Etiketi
        };

        // Arayüzü Güncelle
        updateUI();
        
        // İçerik panelini göster
        document.getElementById('content-panel').style.display = 'block';

    } catch (error) {
        console.error(error);
        alert("Veri çekilemedi. Lütfen internet bağlantınızı kontrol edin.");
    }
}

/* --- 3. ARAYÜZ GÜNCELLEME --- */
function updateUI() {
    // Header Bilgileri
    setText('ui-company', DATA.title);
    setText('ui-slogan', DATA.slogan);

    // Flaş Fırsat Alanı
    if (DATA.fImg) {
        const imgID = getDriveId(DATA.fImg);
        const imgEl = document.getElementById('ui-flash-img');
        
        // Hızlı Resim Yükleme (Google Proxy)
        imgEl.src = `https://lh3.googleusercontent.com/d/${imgID}=s1000`;
        imgEl.style.display = 'block';
        document.getElementById('ui-flash-placeholder').style.display = 'none';
        
        setText('ui-flash-tag', DATA.fTag || "FIRSAT");
        setText('ui-price-old', DATA.fOld || "-");
        setText('ui-price-new', DATA.fNew || "Tükendi");
        document.getElementById('flash-section').style.display = 'block';

        // 🔥 BİLDİRİM KONTROLÜ (Local Storage)
        checkNotification(imgID);

    } else {
        // Fırsat yoksa gizle veya boş göster
        document.getElementById('flash-section').style.display = 'none';
    }
}

/* --- 4. BİLDİRİM SİSTEMİ --- */
function checkNotification(currentDealID) {
    const storageKey = `last_deal_${PAGE_ID}`;
    const lastSeenID = localStorage.getItem(storageKey);

    // Eğer kayıtlı ID yoksa veya değişmişse -> YENİ FIRSAT VAR!
    if (lastSeenID !== currentDealID) {
        const toast = document.getElementById('notification-toast');
        
        // 2 saniye sonra bildirimi göster
        setTimeout(() => {
            toast.classList.add('show');
            // Yeni ID'yi kaydet
            localStorage.setItem(storageKey, currentDealID);
        }, 2000);

        // 7 saniye sonra bildirimi gizle
        setTimeout(() => {
            toast.classList.remove('show');
        }, 9000);
    }
}

function scrollToFlash() {
    document.getElementById('flash-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('notification-toast').classList.remove('show');
}

/* --- 5. GALERİ VE ÜRÜNLER --- */
async function openGallery(type) {
    const modal = document.getElementById('gallery-modal');
    const container = document.getElementById('gallery-grid');
    const title = document.getElementById('gallery-title');
    
    let targetLink = (type === 'products') ? DATA.pLink : DATA.vLink;

    if (!targetLink) return alert("Bu kategori henüz eklenmemiş.");

    modal.style.display = 'flex';
    container.innerHTML = '<div class="spinner"></div><p style="text-align:center; color:#fff">Yükleniyor...</p>';

    try {
        // Dosyaları API'den iste
        const resp = await fetch(`${API_URL}?action=getFiles&url=${encodeURIComponent(targetLink)}`);
        const res = await resp.json();

        container.innerHTML = ""; // Temizle

        if (!res.files || res.files.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#fff">Dosya bulunamadı.</p>';
            return;
        }

        if (type === 'products') {
            title.innerText = "ÜRÜNLERİMİZ";
            container.className = 'gallery-body product-grid'; // CSS Grid aktif

            res.files.forEach((file, index) => {
                // Dosya adı formatı: Ürün Adı | Kod | Fiyat
                const parts = file.name.split("|");
                const pName = (parts[0] || "").trim();
                const pCode = (parts[1] || "").trim();
                const pPrice = (parts[2] || "").trim();
                
                // Resim Linki
                const imgUrl = `https://lh3.googleusercontent.com/d/${file.id}=s500`;

                // WhatsApp Mesajı
                const wpMsg = `Merhaba, "${pName}" (${pPrice}) hakkında bilgi almak istiyorum.`;
                const wpLink = `https://wa.me/${cleanPhone(DATA.phone)}?text=${encodeURIComponent(wpMsg)}`;

                // Animasyon gecikmesi (Stagger effect)
                const delay = index * 100;

                const cardHTML = `
                <div class="prod-card" style="animation-delay:${delay}ms">
                    <img src="${imgUrl}" class="prod-img" loading="lazy">
                    <div class="prod-details">
                        <div class="prod-name">${pName}</div>
                        ${pCode ? `<div style="font-size:10px; color:#94a3b8">${pCode}</div>` : ''}
                        <div class="prod-price">${pPrice}</div>
                        <a href="${wpLink}" class="btn-sm">
                            <i class="fab fa-whatsapp"></i> İlgileniyorum
                        </a>
                    </div>
                </div>`;
                
                container.innerHTML += cardHTML;
            });

        } else {
            // VİDEO MODU
            title.innerText = "VİDEO VİTRİN";
            container.className = 'gallery-body';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '15px';

            res.files.forEach(file => {
                if (file.mimeType.includes('video')) {
                    const vUrl = `https://drive.google.com/file/d/${file.id}/preview`;
                    container.innerHTML += `
                    <div style="border-radius:16px; overflow:hidden; border:1px solid #334155; background:#000;">
                        <iframe src="${vUrl}" style="width:100%; height:250px; border:none;" allowfullscreen></iframe>
                    </div>`;
                }
            });
        }

    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:red">Bağlantı Hatası</p>';
    }
}

function openFeatured() {
    if (!DATA.daily) return alert("Öne çıkan video eklenmemiş.");
    const modal = document.getElementById('gallery-modal');
    const container = document.getElementById('gallery-grid');
    
    document.getElementById('gallery-title').innerText = "ÖNE ÇIKAN";
    modal.style.display = 'flex';
    container.innerHTML = "";
    
    const vID = getDriveId(DATA.daily);
    const vUrl = `https://drive.google.com/file/d/${vID}/preview`;
    
    container.innerHTML = `
    <div style="height:100%; display:flex; align-items:center; justify-content:center;">
        <iframe src="${vUrl}" style="width:100%; height:300px; border-radius:16px; border:none;" allow="autoplay" allowfullscreen></iframe>
    </div>`;
}

function closeGallery() {
    document.getElementById('gallery-modal').style.display = 'none';
}

/* --- 6. YARDIMCI BUTONLAR --- */
function actionWhatsApp(isFlash = false) {
    const num = cleanPhone(DATA.phone);
    if (!num) return alert("Telefon numarası eklenmemiş.");
    
    let msg = "Merhaba, katalog üzerinden yazıyorum.";
    if (isFlash) {
        msg = `Merhaba, FIRSAT ÜRÜNÜ (${DATA.fTag} - ${DATA.fNew}) hakkında bilgi almak istiyorum.`;
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function actionCall() {
    const num = cleanPhone(DATA.phone);
    if (num) window.open(`tel:${num}`);
}

function actionSaveContact() {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${DATA.title}
TEL;TYPE=CELL:${cleanPhone(DATA.phone)}
URL:${window.location.href}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${DATA.title || 'isletme'}.vcf`;
    a.click();
}

/* --- 7. YÖNETİCİ PANELİ --- */
function toggleAdminPanel(forceOpen = false) {
    const panel = document.getElementById('setup-panel');
    
    if (forceOpen) {
        panel.style.display = 'block';
        return;
    }

    if (panel.style.display === 'none') {
        // Şifre kontrolü
        const pass = prompt("Yönetici Şifresi:");
        if (!pass) return;
        
        // Eğer hiç şifre yoksa (ilk kurulum) veya şifre doğruysa
        if (!DATA.adminHash || CryptoJS.SHA256(pass).toString() === DATA.adminHash) {
            panel.style.display = 'block';
            fillAdminForm();
        } else {
            alert("Hatalı Şifre!");
        }
    } else {
        panel.style.display = 'none';
    }
}

function fillAdminForm() {
    setVal('in-title', DATA.title);
    setVal('in-slogan', DATA.slogan);
    setVal('in-phone', DATA.phone);
    setVal('in-insta', DATA.insta);
    setVal('in-map', DATA.map);
    
    setVal('in-plink', DATA.pLink);
    setVal('in-vlink', DATA.vLink);
    setVal('in-daily', DATA.daily);
    
    setVal('in-fimg', DATA.fImg);
    setVal('in-ftag', DATA.fTag);
    setVal('in-fold', DATA.fOld);
    setVal('in-fnew', DATA.fNew);
}

function saveSettings() {
    const btn = document.querySelector('#setup-panel button');
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    // Şifre işlemleri
    const newPass = document.getElementById('in-pass').value;
    const finalHash = newPass ? CryptoJS.SHA256(newPass).toString() : DATA.adminHash;

    // Klasör Yapısına Paketleme (Eski Yapı Sıralaması Korunmalı)
    // Sıra: pLink || vLink || hash || slogan || phone || whats || insta || adr || map || fImg || fOld || fNew || fTag
    const folderData = [
        getVal('in-plink'),
        getVal('in-vlink'),
        finalHash,
        safeEnc(getVal('in-slogan')),
        safeEnc(getVal('in-phone')),
        safeEnc(getVal('in-phone')), // WhatsApp'ı telefonla aynı yapıyoruz
        safeEnc(getVal('in-insta')),
        "", // Adres boş
        safeEnc(getVal('in-map')),
        safeEnc(getVal('in-fimg')),
        safeEnc(getVal('in-fold')),
        safeEnc(getVal('in-fnew')),
        safeEnc(getVal('in-ftag'))
    ].join("|||");

    const dailyFile = getVal('in-daily');
    const title = safeEnc(getVal('in-title'));

    // API'ye Gönder
    const url = `${API_URL}?action=save&id=${PAGE_ID}&title=${title}&folder=${encodeURIComponent(folderData)}&ses=${encodeURIComponent(dailyFile)}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Başarıyla Kaydedildi!");
                location.reload();
            } else {
                alert("Hata oluştu.");
                btn.disabled = false;
                btn.innerText = "TEKRAR DENE";
            }
        });
}

/* --- YARDIMCI FONKSİYONLAR --- */
function getDriveId(url) { const m = (url || "").match(/[-\w]{25,}/); return m ? m[0] : ""; }
function cleanPhone(p) { return (p || "").replace(/[^\d]/g, '').replace(/^0/, '90'); }
function setText(id, txt) { const el = document.getElementById(id); if (el) el.innerText = txt || ""; }
function setVal(id, val) { document.getElementById(id).value = val || ""; }
function getVal(id) { return document.getElementById(id).value; }
function safeEnc(s) { return encodeURIComponent((s || "").trim()); }
function safeDec(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
