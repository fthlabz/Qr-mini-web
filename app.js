const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

const urlParams = new URLSearchParams(window.location.search);
const currentID = urlParams.get('id');

let pageData = {
  company: "", slogan: "",
  phone: "", email: "", whats: "", insta: "", address: "", maps: "", review: "", hours: "",
  legal: "",
  pLink: "", vLink: "",
  daily: "",
  adminHash: "",
  flashImg: "", flashOld: "", flashNew: "", flashLabel: ""
};

function sha256hex(str){
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}
function storageKey(name){ return `${name}_${currentID}`; }
function encodeSafe(s){ return encodeURIComponent((s||"").trim()); }
function decodeSafe(s){ try { return decodeURIComponent(s); } catch(e){ return s; } }

function escapeHtml(str){
  return (str||"").replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  }[m]));
}

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
  const codeHtml = meta.code ? `<div class="meta-code">${escapeHtml(meta.code)}</div>` : "";
  const priceHtml = meta.price ? `<div class="meta-price">${escapeHtml(meta.price)}</div>` : "";
  return `<div class="meta">${titleHtml}${codeHtml}${priceHtml}</div>`;
}

window.onload = function() {
  if (!currentID) { document.getElementById('loading').innerHTML = "ID Yok"; return; }
  document.getElementById('certId').innerText = currentID;

  fetch(API_URL + "?action=read&id=" + currentID)
    .then(res => res.json())
    .then(data => {
      document.getElementById('loading').style.display = 'none';

      if (data.status === "empty") {
        document.getElementById('companyName').innerText = "Yeni Katalog";
        document.getElementById('companySlogan').innerText = "Kurulum gerekli";
        document.getElementById('setup-panel').style.display = 'block';
        return;
      }

      const looksEncrypted = (v) => typeof v === 'string' && v.startsWith("U2FsdGVkX1");
      if (looksEncrypted(data.title) || looksEncrypted(data.not) || looksEncrypted(data.folder) || looksEncrypted(data.ses)) {
        document.getElementById('companyName').innerText = "Güncelleme Gerekli";
        document.getElementById('companySlogan').innerText = "Eski şifreli kayıt";
        document.getElementById('view-panel').style.display = 'block';

        document.getElementById('flashBox').style.display='none';
        return;
      }

      pageData.company = (data.title || "").trim();
      pageData.legal   = (data.not || "").trim();
      pageData.daily   = (data.ses || "").trim();

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

      document.getElementById('companyName').innerText = pageData.company || "Dijital Katalog";
      document.getElementById('companySlogan').innerText = pageData.slogan || "";

      // vcard: sadece isim
      const vcardName = document.getElementById('vcardName');
      if(vcardName) vcardName.innerText = pageData.company || "İşletme";

      renderFlash();
      renderGrids();
      renderFeatured();

      document.getElementById('view-panel').style.display = 'block';
    })
    .catch(() => alert("Bağlantı Hatası: URL'yi kontrol et."));
};

function getDriveId(link){
  const m = (link||"").match(/[-\w]{25,}/);
  return m ? m[0] : "";
}

function driveThumb(fileId, size=1200){
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

function renderFlash(){
  const img = document.getElementById('flashImg');
  const ph  = document.getElementById('flashPlaceholder');
  const oldT = document.getElementById('oldPriceText');
  const newT = document.getElementById('newPriceText');
  const title = document.getElementById('flashTitle');

  const label = (pageData.flashLabel || "FLAŞ FIRSAT").trim();
  title.innerHTML = `<i class="fas fa-bolt"></i> ${escapeHtml(label).toUpperCase()}`;

  oldT.innerText = pageData.flashOld ? pageData.flashOld : "—";
  newT.innerText = pageData.flashNew ? pageData.flashNew : "—";

  if(pageData.flashImg){
    const id = getDriveId(pageData.flashImg);
    const src = id ? (`https://lh3.googleusercontent.com/d/${id}=s2000`) : pageData.flashImg;
    img.src = src;
    img.style.display = 'block';
    ph.style.display = 'none';
  } else {
    img.style.display = 'none';
    ph.style.display = 'flex';
  }
}

/* GRID PLACEHOLDERS */
function buildGridPlaceholders(label, context){
  const cards = [];
  const count = context === 'featured' ? 4 : 6;
  for(let i = 0; i < count; i++){
    const extraClass = context === 'vitrin' ? ' vitrin-card' : '';
    cards.push(`
      <div class="grid-card placeholder-card${extraClass}">
        <div class="grid-media placeholder-media"></div>
        <div class="grid-caption">${label}</div>
      </div>
    `);
  }
  return cards.join("");
}

function renderGrids(){
  const productGrid = document.getElementById('productGrid');
  const vitrinGrid = document.getElementById('vitrinGrid');

  if(productGrid){
    renderGrid("product", pageData.pLink, productGrid, "Ürün");
  }
  if(vitrinGrid){
    renderGrid("vitrin", pageData.vLink, vitrinGrid, "Vitrin");
  }

  const modal = document.getElementById('mediaModal');
  if(modal && !modal.dataset.bound){
    modal.addEventListener('click', (event) => {
      if(event.target === modal){
        closeMediaModal();
      }
    });
    modal.dataset.bound = '1';
  }
}

function renderGrid(context, link, grid, label){
  if(!grid) return;

  grid.innerHTML = buildGridPlaceholders(label, context);
  if(!link) return;

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.status === "error" || !data.files || data.files.length === 0){
        grid.innerHTML = buildGridPlaceholders(label, context);
        return;
      }

      grid.innerHTML = "";
      data.files.forEach(file => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = context === 'vitrin' ? 'grid-card vitrin-card' : 'grid-card';

        const name = (file.name || "").trim();
        const meta = parseProductMeta(name);
        const productTitle = (meta && meta.title) ? meta.title : (name || label);

        if(context === 'vitrin'){
          const thumb = driveThumb(file.id, 1200);
          card.innerHTML = `
            <div class="grid-media vitrin-media">
              <img src="${thumb}" alt="">
              <span class="vitrin-play"><i class="fas fa-play"></i></span>
            </div>
            <div class="grid-caption">${escapeHtml(name || label)}</div>
          `;
          card.addEventListener('click', () => openGallery('video'));
          grid.appendChild(card);
          return;
        }

        // PRODUCTS
        if(file.type === 'image'){
          const proxyUrl = "https://lh3.googleusercontent.com/d/" + file.id + "=s1200";
          card.innerHTML = `
            <div class="grid-media">
              <img src="${proxyUrl}" alt="">
            </div>
            <div class="grid-caption">${escapeHtml(productTitle)}</div>
            <button class="grid-cta" type="button" data-cta="wa">
              <i class="fab fa-whatsapp"></i>
              WhatsApp ile teklif al
            </button>
          `;

          // kart tık: modal
          card.addEventListener('click', () => openMediaModal({
            context,
            title: productTitle,
            mediaType: 'image',
            src: proxyUrl,
            metaHtml: buildProductMeta(name)
          }));

          // buton tık: ürün bazlı whatsapp
          const waBtn = card.querySelector('[data-cta="wa"]');
          if(waBtn){
            waBtn.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              orderOnWhatsApp(productTitle, proxyUrl);
            });
          }
        } else if(file.type === 'video'){
          const videoUrl = `https://drive.google.com/file/d/${file.id}/preview`;
          const thumb = driveThumb(file.id, 1200);
          card.innerHTML = `
            <div class="grid-media">
              <img src="${thumb}" alt="">
            </div>
            <div class="grid-caption">${escapeHtml(productTitle)}</div>
            <button class="grid-cta" type="button" data-cta="wa">
              <i class="fab fa-whatsapp"></i>
              WhatsApp ile teklif al
            </button>
          `;

          card.addEventListener('click', () => openMediaModal({
            context,
            title: productTitle,
            mediaType: 'video',
            src: videoUrl,
            metaHtml: buildProductMeta(name)
          }));

          const waBtn = card.querySelector('[data-cta="wa"]');
          if(waBtn){
            waBtn.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              orderOnWhatsApp(productTitle, videoUrl);
            });
          }
        }

        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = buildGridPlaceholders(label, context);
    });
}

/* ÖNE ÇIKANLAR: 2'li grid (klasör veya tek dosya) */
function renderFeatured(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;

  grid.innerHTML = buildGridPlaceholders("Öne Çıkan", "featured");

  const link = (pageData.daily || "").trim();
  if(!link){
    grid.innerHTML = "";
    return;
  }

  // Önce klasör gibi dene (getFiles)
  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data && data.status !== "error" && Array.isArray(data.files) && data.files.length){
        grid.innerHTML = "";
        data.files.slice(0, 8).forEach(file => {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'grid-card';

          const name = (file.name || "").trim() || "Öne Çıkan";
          const thumb = driveThumb(file.id, 1400);

          card.innerHTML = `
            <div class="grid-media">
              <img src="${thumb}" alt="">
            </div>
            <div class="grid-caption">${escapeHtml(name)}</div>
          `;

          // tık: overlay preview
          card.addEventListener('click', () => openDrivePreview(file.id, name));
          grid.appendChild(card);
        });
        return;
      }

      // Klasör değilse: tek dosya linki
      renderFeaturedSingle(link, grid);
    })
    .catch(() => {
      renderFeaturedSingle(link, grid);
    });
}

function renderFeaturedSingle(link, grid){
  const id = getDriveId(link);
  if(!id){
    grid.innerHTML = "";
    return;
  }
  grid.innerHTML = "";

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'grid-card';

  const name = "Öne Çıkan";
  const thumb = driveThumb(id, 1400);

  card.innerHTML = `
    <div class="grid-media">
      <img src="${thumb}" alt="">
    </div>
    <div class="grid-caption">${escapeHtml(name)}</div>
  `;
  card.addEventListener('click', () => openDrivePreview(id, name));
  grid.appendChild(card);
}

function openDrivePreview(fileId, title){
  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  const galTitle = document.getElementById('galTitle');

  if(galTitle) galTitle.innerText = title || "Öne Çıkan";
  slider.innerHTML = "";
  overlay.style.display = 'flex';

  const playerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  slider.innerHTML = `<div class="slide"><div class="video-wrapper"><iframe src="${playerUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe></div></div>`;
}

function openMediaModal(payload){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  const title = document.getElementById('mediaModalTitle');
  if(!modal || !body || !title) return;

  title.innerText = payload.title || (payload.context === 'vitrin' ? 'Vitrin' : '☑️');

  let mediaHtml = "";
  if(payload.mediaType === 'video'){
    mediaHtml = `<div class="modal-media video"><iframe src="${payload.src}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
  } else {
    mediaHtml = `<div class="modal-media"><img src="${payload.src}" alt=""></div>`;
  }

  const metaHtml = payload.metaHtml ? `<div class="modal-meta">${payload.metaHtml}</div>` : "";

  // ÜRÜN bazlı WhatsApp butonu: ürün adını + görsel linkini gönder
  const actionHtml = payload.context === 'product'
    ? `<button class="btn-whatsapp modal-whatsapp" onclick="orderOnWhatsApp('${escapeJs(payload.title||'Ürün')}', '${escapeJs(payload.src||'')}')">WhatsApp Teklif Al</button>`
    : "";

  body.innerHTML = `${mediaHtml}${metaHtml}${actionHtml}`;
  modal.style.display = 'flex';
}

function escapeJs(s){
  return (s||"").replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');
}

function closeMediaModal(){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  if(modal) modal.style.display = 'none';
  if(body) body.innerHTML = '';
}

/* GALERİ */
function openGallery(type) {
  let link = "";
  let title = "";
  if(type === 'video') { link = pageData.vLink; title = "Vitrin"; }
  if(type === 'photo') { link = pageData.pLink; title = "Ürünlerimiz"; }
  if(!link) return;

  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  document.getElementById('galTitle').innerText = title;
  slider.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch fa-spin"></i><br><span style="font-size:10px; letter-spacing:.12em; text-transform:uppercase;">Yükleniyor...</span></div>';
  overlay.style.display = 'flex';

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      slider.innerHTML = "";
      if(data.status === "error") {
        slider.innerHTML = `<div class="error-msg">⚠️ BAĞLANTI HATASI<br>${data.msg}</div>`;
        return;
      }
      if(!data.files || data.files.length === 0) {
        slider.innerHTML = '<div class="error-msg">Bu klasör boş görünüyor.</div>';
        return;
      }

      data.files.forEach(file => {
        const slide = document.createElement('div');
        slide.className = 'slide';

        if(file.type === 'image') {
          const proxyUrl = "https://lh3.googleusercontent.com/d/" + file.id + "=s2000";
          slide.innerHTML = `<img src="${proxyUrl}" loading="lazy">`;
        } else if (file.type === 'video') {
          const videoUrl = `https://drive.google.com/file/d/${file.id}/preview`;
          slide.innerHTML = `<div class="video-wrapper"><iframe src="${videoUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
        }

        slider.appendChild(slide);
      });
    });
}

function closeGallery() {
  document.getElementById('gallery-overlay').style.display = 'none';
  document.getElementById('slider-track').innerHTML = "";
}

/* NORMALIZE */
function normalizeHandle(h){ return (h||"").trim().replace(/^@/,'').replace(/\s+/g,''); }
function normalizeWhats(w){ return (w||"").replace(/[^\d]/g,'').replace(/^0/,'90'); }
function normalizeTel(t){ return (t||"").replace(/\s+/g,''); }

/* WhatsApp: ürün bazlı (title + link) veya genel */
function orderOnWhatsApp(productTitle = "", productLink = ""){
  const num = normalizeWhats(pageData.whats || pageData.phone);
  if(!num){
    alert("WhatsApp/Telefon numarası eklenmemiş. Yönetici panelinden ekleyin.");
    return;
  }

  const msgLines = [];
  msgLines.push(`Merhaba, Ürünleriniz hakkında bilgi almak istiyorum`);

  //if(productTitle){
  //  msgLines.push(`Ürün: ${productTitle}`);
  //}

  //if(productLink){
   // msgLines.push(`Ürün Linki: ${productLink}`);
  //}

  //if(pageData.flashNew || pageData.flashOld){
  // msgLines.push(`Anlık Kampanya: ${pageData.flashOld ? ("Eski: " + pageData.flashOld) : ""}${(pageData.flashOld && pageData.flashNew) ? " | " : ""}${pageData.flashNew ? ("Yeni: " + pageData.flashNew) : ""}`);
  //}

  //msgLines.push(`Katalog ID: ${currentID}`);

  const msg = encodeURIComponent(msgLines.join("\n"));
  const url = `https://wa.me/${num}?text=${msg}`;
  window.open(url, "_blank");
}

/* ADMIN */
function isAdminRemembered(){
  try{ return localStorage.getItem(storageKey("admin_ok")) === "1"; }
  catch(e){ return false; }
}
function rememberAdmin(){
  try{ localStorage.setItem(storageKey("admin_ok"), "1"); } catch(e){}
}

function enableEdit() {
  if(isAdminRemembered()){
    openSetupPrefilled();
    return;
  }

  if(!pageData.adminHash){
    const ok = confirm("Yönetici şifresi kaydı bulunamadı. Düzenlemeye geçilsin mi?");
    if(!ok) return;
    openSetupPrefilled();
    return;
  }

  const adminPass = prompt("Yönetici şifresi:");
  if(!adminPass) return;

  const h = sha256hex(adminPass);
  if(h !== pageData.adminHash){
    alert("Şifre yanlış!");
    return;
  }

  rememberAdmin();
  openSetupPrefilled();
}

function openSetupPrefilled(){
  document.getElementById('view-panel').style.display='none';
  document.getElementById('setup-panel').style.display='block';

  document.getElementById('inTitle').value = pageData.company || "";
  document.getElementById('inSlogan').value = pageData.slogan || "";

  document.getElementById('inPhone').value = pageData.phone || "";
  document.getElementById('inEmail').value = pageData.email || "";
  document.getElementById('inWhats').value = pageData.whats || "";
  document.getElementById('inInsta').value = pageData.insta || "";
  document.getElementById('inAddress').value = pageData.address || "";
  document.getElementById('inMaps').value = pageData.maps || "";
  document.getElementById('inReview').value = pageData.review || "";
  document.getElementById('inHours').value = pageData.hours || "";

  document.getElementById('inPhotoLink').value = pageData.pLink || "";
  document.getElementById('inVideoLink').value = pageData.vLink || "";
  document.getElementById('inDaily').value = pageData.daily || "";

  document.getElementById('inFlashImg').value = pageData.flashImg || "";
  document.getElementById('inOldPrice').value = pageData.flashOld || "";
  document.getElementById('inNewPrice').value = pageData.flashNew || "";
  document.getElementById('inFlashLabel').value = pageData.flashLabel || "";

  document.getElementById('inNot').value = pageData.legal || "";

  document.getElementById('inPass').value = "";
  document.getElementById('inPassConfirm').value = "";
}

function saveData() {
  const company = (document.getElementById('inTitle').value || "").trim();
  if(!company) return alert("Şirket adı boş olamaz.");

  const firstSetup = !pageData.adminHash;

  const pass = (document.getElementById('inPass').value || "");
  const pass2 = (document.getElementById('inPassConfirm').value || "");

  if(firstSetup){
    if(!pass) return alert("İlk kurulumda yönetici şifresi boş olamaz.");
    if(pass !== pass2) return alert("Şifreler uyuşmuyor.");
  } else {
    if(pass){
      if(pass !== pass2) return alert("Şifreler uyuşmuyor.");
    }
  }

  const btn = document.querySelector('#setup-panel .btn-gold');
  btn.innerText = "KAYDEDİLİYOR...";
  btn.disabled = true;

  const slogan  = (document.getElementById('inSlogan').value || "").trim();

  const phone   = (document.getElementById('inPhone').value || "").trim();
  const email   = (document.getElementById('inEmail').value || "").trim();
  const whats   = (document.getElementById('inWhats').value || "").trim();
  const insta   = (document.getElementById('inInsta').value || "").trim();
  const address = (document.getElementById('inAddress').value || "").trim();
  const maps    = (document.getElementById('inMaps').value || "").trim();
  const review  = (document.getElementById('inReview').value || "").trim();
  const hours   = (document.getElementById('inHours').value || "").trim();

  const pLink   = (document.getElementById('inPhotoLink').value || "").trim();
  const vLink   = (document.getElementById('inVideoLink').value || "").trim();
  const daily   = (document.getElementById('inDaily').value || "").trim();

  const flashImg   = (document.getElementById('inFlashImg').value || "").trim();
  const flashOld   = (document.getElementById('inOldPrice').value || "").trim();
  const flashNew   = (document.getElementById('inNewPrice').value || "").trim();
  const flashLabel = (document.getElementById('inFlashLabel').value || "").trim();

  const legal   = (document.getElementById('inNot').value || "").trim();

  let adminHash = pageData.adminHash || "";
  if(firstSetup || pass){
    adminHash = sha256hex(pass);
  }

  const folder = [
    pLink, vLink, adminHash,
    encodeSafe(slogan),
    encodeSafe(phone),
    encodeSafe(whats),
    encodeSafe(insta),
    encodeSafe(address),
    encodeSafe(maps),
    encodeSafe(flashImg),
    encodeSafe(flashOld),
    encodeSafe(flashNew),
    encodeSafe(flashLabel),
    encodeSafe(email),
    encodeSafe(review),
    encodeSafe(hours)
  ].join("|||");

  fetch(API_URL + `?action=save&id=${encodeURIComponent(currentID)}&title=${encodeURIComponent(company)}&not=${encodeURIComponent(legal)}&folder=${encodeURIComponent(folder)}&ses=${encodeURIComponent(daily)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        rememberAdmin();
        location.reload();
      } else {
        alert("Hata!");
        btn.disabled = false;
        btn.innerText = "KAYDET";
      }
    })
    .catch(() => {
      alert("Kaydetme hatası!");
      btn.disabled = false;
      btn.innerText = "KAYDET";
    });
}

/* CARD MODAL */
function openCardModal(){
  document.getElementById('cardModal').style.display = 'flex';
}
function closeCardModal(){
  document.getElementById('cardModal').style.display = 'none';
}

/* VCARD */
function sanitizeVCardValue(s){
  return (s||"").replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
}
function buildVCard(){
  const lines = [];
  const company = pageData.company || "İşletme";
  const slogan  = pageData.slogan || "";
  const phone   = pageData.phone || "";
  const email   = pageData.email || "";
  const address = pageData.address || "";
  const maps    = pageData.maps || "";
  const insta   = pageData.insta || "";
  const whats   = pageData.whats || "";
  const review  = pageData.review || "";
  const hours   = pageData.hours || "";

  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push(`FN:${sanitizeVCardValue(company)}`);
  lines.push(`ORG:${sanitizeVCardValue(company)}`);

  if(phone) lines.push(`TEL;TYPE=CELL,VOICE:${sanitizeVCardValue(phone)}`);
  if(email) lines.push(`EMAIL;TYPE=INTERNET:${sanitizeVCardValue(email)}`);
  if(address) lines.push(`ADR;TYPE=WORK:;;${sanitizeVCardValue(address)};;;;`);
  lines.push(`URL:${sanitizeVCardValue(window.location.href)}`);

  const noteParts = [];
  if(slogan) noteParts.push(slogan);
  if(hours) noteParts.push(`Çalışma Saatleri: ${hours}`);
  if(maps) noteParts.push(`Konum: ${maps}`);
  if(insta) noteParts.push(`Instagram: https://instagram.com/${normalizeHandle(insta)}`);
  if(review) noteParts.push(`Yorumlar: ${review}`);

  const w = normalizeWhats(whats || phone);
  if(w) noteParts.push(`WhatsApp: https://wa.me/${w}`);

  noteParts.push(`Katalog ID: ${currentID}`);
  if(noteParts.length){
    lines.push(`NOTE:${sanitizeVCardValue(noteParts.join("\n"))}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function saveToContacts(){
  const vcf = buildVCard();
  const filename = `${(pageData.company || "isletme").replace(/[^\w\d\-]+/g,'_')}_${currentID}.vcf`;

  try{
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1500);
  } catch(e){
    const dataUri = "data:text/vcard;charset=utf-8," + encodeURIComponent(vcf);
    window.location.href = dataUri;
  }
}
