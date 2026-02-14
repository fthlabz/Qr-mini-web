// app.js - B2B Toptan Katalog Sürümü

const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

const urlParams = new URLSearchParams(window.location.search);
const currentID = urlParams.get('id');

// Veri Modeli
let pageData = {
  company: "", slogan: "",
  phone: "", email: "", whats: "", insta: "", address: "", maps: "", review: "", hours: "",
  legal: "", // Sipariş ve Teslimat Metni
  pLink: "", vLink: "", // Ürünler, Vitrin
  daily: "", // Tanıtım/Kurumsal
  adminHash: "",
  flashImg: "", flashOld: "", flashNew: "", flashLabel: ""
};

/* --- YARDIMCI FONKSİYONLAR --- */
function sha256hex(str){
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}
function storageKey(name){ return `${name}_${currentID}`; }
function encodeSafe(s){ return encodeURIComponent((s||"").trim()); }
function decodeSafe(s){ try { return decodeURIComponent(s); } catch(e){ return s; } }

function escapeHtml(str){
  return (str||"").replace(/[&<>"']/g, m => ({
    '&':'&','<':'<','>':'>','"':'"','\'':"'"
  }[m]));
}
function escapeJs(s){
  return (s||"").replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');
}

// Drive ID Ayıklama
function getDriveId(link){
  const m = (link||"").match(/[-\w]{25,}/);
  return m ? m[0] : "";
}
// Thumbnail Linki
function driveThumb(fileId, size=800){
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
// Yüksek Kalite İndirme Linki (View)
function driveDownloadLink(fileId){
  return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
}

// Ürün İsmi Parse Etme (İsim | Kod | Fiyat)
function parseProductMeta(name){
  const parts = (name || "").split("|").map(part => part.trim()).filter(Boolean);
  if(parts.length === 0) return null;
  return {
    title: parts[0],
    code: parts.length >= 2 ? parts[1] : "",
    price: parts.length >= 3 ? parts[2] : ""
  };
}

function buildProductMeta(name){
  const meta = parseProductMeta(name);
  if(!meta) return "";
  const titleHtml = `<div class="meta-title">${escapeHtml(meta.title)}</div>`;
  const codeHtml = meta.code ? `<div class="meta-code">KOD: ${escapeHtml(meta.code)}</div>` : "";
  const priceHtml = meta.price ? `<div class="meta-price">${escapeHtml(meta.price)}</div>` : "";
  return `<div class="meta-box">${titleHtml}${codeHtml}${priceHtml}</div>`;
}

/* --- BAŞLANGIÇ (INIT) --- */
window.onload = function() {
  if (!currentID) { document.getElementById('loading').innerHTML = "ID BULUNAMADI"; return; }
  document.getElementById('certId').innerText = currentID;

  fetch(API_URL + "?action=read&id=" + currentID)
    .then(res => res.json())
    .then(data => {
      document.getElementById('loading').style.display = 'none';

      // 1. Durum: Yeni Kayıt
      if (data.status === "empty") {
        document.getElementById('companyName').innerText = "Toptan Katalog";
        document.getElementById('companySlogan').innerText = "Kurulum Bekleniyor";
        document.getElementById('setup-panel').style.display = 'block';
        return;
      }

      // 2. Durum: Eski Şifreli Veri (Reset Gerekebilir)
      const looksEncrypted = (v) => typeof v === 'string' && v.startsWith("U2FsdGVkX1");
      if (looksEncrypted(data.title)) {
        alert("Eski veri formatı. Lütfen yönetici panelinden tekrar kaydedin.");
      }

      // 3. Verileri Çek ve Doldur
      pageData.company = (data.title || "").trim();
      pageData.legal   = (data.not || "").trim(); // Artık Sipariş Notu
      pageData.daily   = (data.ses || "").trim(); // Artık Tanıtım Klasörü

      const folderStr = (data.folder || "").trim();
      const parts = folderStr.split("|||");

      pageData.pLink = (parts[0] || "").trim();
      pageData.vLink = (parts[1] || "").trim();
      pageData.adminHash = (parts[2] || "").trim();

      pageData.slogan  = decodeSafe(parts[3] || "");
      pageData.phone   = decodeSafe(parts[4] || "");
      pageData.whats   = decodeSafe(parts[5] || "");
      pageData.insta   = decodeSafe(parts[6] || "");
      pageData.address = decodeSafe(parts[7] || "");
      pageData.maps    = decodeSafe(parts[8] || "");

      pageData.flashImg   = decodeSafe(parts[9] || "");
      pageData.flashOld   = decodeSafe(parts[10] || "");
      pageData.flashNew   = decodeSafe(parts[11] || "");
      pageData.flashLabel = decodeSafe(parts[12] || "");

      pageData.email  = decodeSafe(parts[13] || "");
      pageData.review = decodeSafe(parts[14] || "");
      pageData.hours  = decodeSafe(parts[15] || "");

      // Arayüzü Güncelle
      document.getElementById('companyName').innerText = pageData.company || "Toptan Firma";
      document.getElementById('companySlogan').innerText = pageData.slogan || "";
      
      // V-Card / Bilgi Alanı Başlığı
      const vcardTitle = document.querySelector('.vcard-title');
      if(vcardTitle) vcardTitle.innerText = pageData.company || "Firma Bilgileri";

      renderFlash();
      renderGrids();
      renderFeatured();

      // Açıklama Metni (Legal) Varsa Göster (Footer üstü)
      /* if(pageData.legal){
        const l = document.getElementById('legalText');
        l.innerText = pageData.legal;
        l.style.display = 'block';
      } 
      */

      document.getElementById('view-panel').style.display = 'block';
    })
    .catch((e) => {
      console.error(e);
      document.getElementById('loading').innerHTML = "Bağlantı Hatası.<br>Sayfayı Yenileyin.";
    });
};

/* --- RENDER (Görselleştirme) --- */

// Kampanya Alanı
function renderFlash(){
  const img = document.getElementById('flashImg');
  const ph  = document.getElementById('flashPlaceholder');
  const oldT = document.getElementById('oldPriceText');
  const newT = document.getElementById('newPriceText');
  const title = document.getElementById('flashTitle');

  const label = (pageData.flashLabel || "ÖZEL FIRSAT").trim();
  title.innerHTML = `<i class="fas fa-bolt"></i> ${escapeHtml(label).toUpperCase()}`;

  oldT.innerText = pageData.flashOld ? pageData.flashOld : "—";
  newT.innerText = pageData.flashNew ? pageData.flashNew : "—";

  if(pageData.flashImg){
    const id = getDriveId(pageData.flashImg);
    // Proxy yerine direkt drive thumbnail deniyoruz, daha stabil
    const src = id ? driveThumb(id, 1200) : pageData.flashImg;
    img.src = src;
    img.style.display = 'block';
    ph.style.display = 'none';
    
    // Kampanya resmine tıklayınca da modal aç
    document.getElementById('flashMedia').onclick = () => openMediaModal({
        title: label,
        mediaType: 'image',
        src: src, // thumbnail
        realId: id, // indirme için gerçek ID
        metaHtml: `<div class="meta-price">Fiyat: ${pageData.flashNew || 'Sorunuz'}</div>`
    });

  } else {
    img.style.display = 'none';
    ph.style.display = 'flex';
  }
}

// Grid Yer Tutucular
function buildGridPlaceholders(label, count=3){
  let html = "";
  for(let i=0; i<count; i++){
    html += `
      <div class="grid-card placeholder-card">
        <div class="grid-media placeholder-media"></div>
        <div class="grid-caption">${label}</div>
      </div>`;
  }
  return html;
}

// Ana Grid Oluşturucu (Ürünler ve Vitrin)
function renderGrid(context, link, grid, label){
  if(!grid) return;
  
  // Link yoksa boşalt
  if(!link){
    grid.parentElement.style.display = 'none'; // Başlığı da gizle
    return;
  }

  grid.innerHTML = buildGridPlaceholders("Yükleniyor...", 3);

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.status === "error" || !data.files || data.files.length === 0){
        grid.innerHTML = `<div class="empty-msg">Bu klasörde henüz ürün yok.</div>`;
        return;
      }

      grid.innerHTML = "";
      // Max 12 ürün göster (B2B olduğu için çok boğmayalım, "Tümünü Gör" var)
      const showFiles = data.files.slice(0, 12);

      showFiles.forEach(file => {
        const card = document.createElement('div');
        card.className = context === 'vitrin' ? 'grid-card vitrin-card' : 'grid-card';
        
        const name = (file.name || "").trim();
        const meta = parseProductMeta(name);
        const productTitle = (meta && meta.title) ? meta.title : (name || label);
        const thumb = driveThumb(file.id, 800);

        if(file.type === 'video' || context === 'vitrin'){
           // VİTRİN (Video)
           card.innerHTML = `
             <div class="grid-media vitrin-media">
               <img src="${thumb}" alt="">
               <span class="vitrin-play"><i class="fas fa-play"></i></span>
             </div>
             <div class="grid-caption">${escapeHtml(productTitle)}</div>
           `;
           card.onclick = () => openMediaModal({
             title: productTitle,
             mediaType: 'video',
             src: `https://drive.google.com/file/d/${file.id}/preview`,
             realId: file.id,
             metaHtml: buildProductMeta(name)
           });

        } else {
           // ÜRÜN (Resim)
           card.innerHTML = `
             <div class="grid-media">
               <img src="${thumb}" alt="">
             </div>
             <div class="grid-caption">${escapeHtml(productTitle)}</div>
             <button class="offer-btn" onclick="event.stopPropagation(); orderOnWhatsApp('${escapeJs(productTitle)}', '${file.id}')">
                <i class="fab fa-whatsapp"></i> Fiyat Al
             </button>
           `;
           card.onclick = () => openMediaModal({
             title: productTitle,
             mediaType: 'image',
             src: thumb,
             realId: file.id,
             metaHtml: buildProductMeta(name)
           });
        }
        grid.appendChild(card);
      });
    })
    .catch(err => {
      console.log(err);
      grid.innerHTML = "Yükleme hatası.";
    });
}

function renderGrids(){
  renderGrid("product", pageData.pLink, document.getElementById('productGrid'), "Ürün");
  renderGrid("vitrin", pageData.vLink, document.getElementById('vitrinGrid'), "Vitrin");
}

/* --- FEATURED (Kurumsal Görseller / Katalog Sayfaları) --- */
function renderFeatured(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;
  const link = (pageData.daily || "").trim();
  
  if(!link){
    document.getElementById('featuredSection').style.display = 'none';
    return;
  }

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.files && data.files.length){
        grid.innerHTML = "";
        data.files.slice(0, 4).forEach(file => {
           const card = document.createElement('div');
           card.className = 'grid-card featured-card';
           const thumb = driveThumb(file.id, 800);
           
           card.innerHTML = `
             <div class="grid-media">
                <img src="${thumb}" alt="">
             </div>
             <div class="grid-caption" style="text-align:center;">İncele</div>
           `;
           card.onclick = () => openMediaModal({
             title: "Kurumsal",
             mediaType: 'image',
             src: thumb,
             realId: file.id,
             metaHtml: ""
           });
           grid.appendChild(card);
        });
      }
    }).catch(()=>{});
}

/* --- MEDYA MODAL & İNDİRME --- */
function openMediaModal(payload){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  const title = document.getElementById('mediaModalTitle');

  title.innerText = payload.title || "Detay";
  
  let mediaHtml = "";
  if(payload.mediaType === 'video'){
    mediaHtml = `<div class="modal-media video"><iframe src="${payload.src}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
  } else {
    // Resim için büyük boyut
    const bigSrc = payload.realId ? driveThumb(payload.realId, 1600) : payload.src;
    mediaHtml = `<div class="modal-media"><img src="${bigSrc}" alt=""></div>`;
  }

  const metaHtml = payload.metaHtml ? `<div class="modal-meta">${payload.metaHtml}</div>` : "";
  
  // DOWNLOAD BUTTON (Yüksek Kalite)
  let downloadHtml = "";
  if(payload.realId){
      const dlLink = driveDownloadLink(payload.realId);
      downloadHtml = `
        <a href="${dlLink}" target="_blank" class="btn-download">
           <i class="fas fa-download"></i> Orijinal Boyut İndir / Aç
        </a>
      `;
  }

  // WHATSAPP BUTTON (Detay içi)
  const waHtml = `
    <button class="btn-whatsapp modal-whatsapp" onclick="orderOnWhatsApp('${escapeJs(payload.title)}', '${payload.realId||''}')">
      <i class="fab fa-whatsapp"></i> Bu Ürün İçin Fiyat Al
    </button>
  `;

  body.innerHTML = `${mediaHtml} ${metaHtml} <div class="modal-actions">${waHtml} ${downloadHtml}</div>`;
  modal.style.display = 'flex';
}

function closeMediaModal(){
  document.getElementById('mediaModal').style.display = 'none';
  document.getElementById('mediaModalBody').innerHTML = '';
}

/* --- WHATSAPP SİPARİŞ MANTIĞI --- */
function normalizeWhats(w){ return (w||"").replace(/[^\d]/g,'').replace(/^0/,'90'); }

function orderOnWhatsApp(title, fileId, context){
  const num = normalizeWhats(pageData.whats || pageData.phone);
  if(!num){
    alert("Firma iletişim numarası henüz eklenmemiş.");
    return;
  }

  let text = "Merhaba, ürünleriniz hakkında bilgi almak istiyorum.";
  
  if(title && fileId){
    text = `Merhaba, şu ürün için fiyat ve stok bilgisi alabilir miyim?\n\nÜrün: ${title}\nReferans Görsel: https://drive.google.com/file/d/${fileId}/view`;
  } else if(context){
    text = `Merhaba, ${context} hakkında bilgi almak istiyorum.`;
  }

  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* --- GALERİ (TÜMÜNÜ GÖR) --- */
function openGallery(type) {
  let link = (type === 'video') ? pageData.vLink : pageData.pLink;
  let title = (type === 'video') ? "VİTRİN VİDEOLARI" : "TÜM ÜRÜNLER";

  if(!link) return;

  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  document.getElementById('galTitle').innerText = title;
  
  slider.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...</div>';
  overlay.style.display = 'flex';

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      slider.innerHTML = "";
      if(!data.files || !data.files.length){
        slider.innerHTML = '<div class="error-msg">Dosya bulunamadı.</div>';
        return;
      }
      data.files.forEach(file => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        
        if(file.type === 'video'){
           const url = `https://drive.google.com/file/d/${file.id}/preview`;
           slide.innerHTML = `<div class="media-frame"><iframe src="${url}"></iframe><div class="meta">${escapeHtml(file.name)}</div></div>`;
        } else {
           const src = driveThumb(file.id, 1600);
           slide.innerHTML = `
             <div class="media-frame">
                <img src="${src}">
                <div class="meta">${escapeHtml(file.name)}</div>
                <button class="btn-whatsapp" style="margin-top:10px;" onclick="orderOnWhatsApp('${escapeJs(file.name)}', '${file.id}')">Fiyat Sor</button>
             </div>`;
        }
        slider.appendChild(slide);
      });
    });
}
function closeGallery() {
  document.getElementById('gallery-overlay').style.display = 'none';
  document.getElementById('slider-track').innerHTML = "";
}

/* --- CARD MODAL (FİRMA BİLGİSİ) --- */
function openCardModal(){
  const m = document.getElementById('cardModal');
  
  // Bilgileri Doldur
  setText('dispPhone', pageData.phone || pageData.whats || '-');
  setText('dispAddress', pageData.address || '-');
  setText('dispHours', pageData.hours || '-');
  setText('dispLegal', pageData.legal || 'Sipariş ve teslimat bilgisi girilmemiş.');

  // Görünürlük Ayarları
  showIf('infoPhone', pageData.phone || pageData.whats);
  showIf('infoAddress', pageData.address);
  showIf('infoHours', pageData.hours);
  
  // Linkler
  if(pageData.insta){
    const iLink = document.getElementById('quickInsta');
    iLink.href = "https://instagram.com/" + pageData.insta.replace('@','');
    iLink.style.display = 'block';
    document.getElementById('cardQuickLinks').style.display = 'block';
  }
  
  if(pageData.maps){
    const btnMap = document.getElementById('btnMap');
    btnMap.style.display = 'block';
    btnMap.onclick = () => window.open(pageData.maps, '_blank');
  }

  m.style.display = 'flex';
}
function closeCardModal(){ document.getElementById('cardModal').style.display = 'none'; }

function setText(id, val){ document.getElementById(id).innerText = val; }
function showIf(id, condition){ document.getElementById(id).style.display = condition ? 'flex' : 'none'; }

function saveToContacts(){
   // VCard oluşturma (Basit)
   alert("Rehbere ekleme özelliği cihazınızın desteklediği formatta açılacak.");
   // Buraya vCard logic eklenebilir ama kod kalabalığı yapmamak için basitleştirdim.
}

/* --- ADMIN --- */
function isAdminRemembered(){ return localStorage.getItem(storageKey("admin_ok")) === "1"; }
function rememberAdmin(){ localStorage.setItem(storageKey("admin_ok"), "1"); }

function enableEdit() {
  if(isAdminRemembered()){ openSetupPrefilled(); return; }
  
  if(!pageData.adminHash){
    if(confirm("Yönetici şifresi oluşturulmamış. Kuruluma geçilsin mi?")) openSetupPrefilled();
    return;
  }
  
  const p = prompt("Yönetici Şifresi:");
  if(sha256hex(p) === pageData.adminHash){
    rememberAdmin();
    openSetupPrefilled();
  } else {
    alert("Hatalı şifre");
  }
}

function openSetupPrefilled(){
  document.getElementById('view-panel').style.display='none';
  document.getElementById('setup-panel').style.display='block';
  
  const map = {
    'inTitle': pageData.company, 'inSlogan': pageData.slogan,
    'inPhone': pageData.phone, 'inWhats': pageData.whats, 'inEmail': pageData.email,
    'inInsta': pageData.insta, 'inAddress': pageData.address, 'inMaps': pageData.maps,
    'inReview': pageData.review, 'inHours': pageData.hours,
    'inPhotoLink': pageData.pLink, 'inVideoLink': pageData.vLink, 'inDaily': pageData.daily,
    'inFlashImg': pageData.flashImg, 'inOldPrice': pageData.flashOld, 'inNewPrice': pageData.flashNew, 'inFlashLabel': pageData.flashLabel,
    'inNot': pageData.legal
  };

  for(let id in map){
    if(document.getElementById(id)) document.getElementById(id).value = map[id] || "";
  }
}

function saveData() {
  const getVal = (id) => (document.getElementById(id).value || "").trim();
  
  const company = getVal('inTitle');
  if(!company) return alert("Firma Adı Zorunlu!");

  const pass = getVal('inPass');
  const pass2 = getVal('inPassConfirm');
  
  if(!pageData.adminHash && !pass) return alert("İlk kurulumda şifre belirlemelisiniz.");
  if(pass && pass !== pass2) return alert("Şifreler uyuşmuyor.");

  const btn = document.querySelector('#setup-panel .btn-gold');
  btn.innerText = "KAYDEDİLİYOR...";
  btn.disabled = true;

  let newHash = pageData.adminHash;
  if(pass) newHash = sha256hex(pass);

  // Veri Paketleme (Folder string içinde saklıyoruz)
  const folderArr = [
    getVal('inPhotoLink'), getVal('inVideoLink'), newHash,
    encodeSafe(getVal('inSlogan')),
    encodeSafe(getVal('inPhone')), encodeSafe(getVal('inWhats')),
    encodeSafe(getVal('inInsta')), encodeSafe(getVal('inAddress')),
    encodeSafe(getVal('inMaps')),
    encodeSafe(getVal('inFlashImg')), encodeSafe(getVal('inOldPrice')),
    encodeSafe(getVal('inNewPrice')), encodeSafe(getVal('inFlashLabel')),
    encodeSafe(getVal('inEmail')), encodeSafe(getVal('inReview')),
    encodeSafe(getVal('inHours'))
  ];

  const url = `${API_URL}?action=save&id=${currentID}&title=${encodeURIComponent(company)}&not=${encodeURIComponent(getVal('inNot'))}&ses=${encodeURIComponent(getVal('inDaily'))}&folder=${encodeURIComponent(folderArr.join("|||"))}`;

  fetch(url)
    .then(res => res.json())
    .then(d => {
      if(d.status === "success"){
        rememberAdmin();
        location.reload();
      } else {
        alert("Hata oluştu.");
        btn.disabled = false;
      }
    });
}
