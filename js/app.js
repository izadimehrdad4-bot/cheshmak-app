/* ==============================
   چشمک - اپلیکیشن مدیریت هوشمند
   نسخه: 3.1 (اصلاح‌شده)
   ============================== */

// ==============================
// ذخیره‌سازی (localStorage)
// ==============================
const DB = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem('cheshmak_' + key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  },
    set(key, value) {
    try {
      localStorage.setItem('cheshmak_' + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
      // 🔥 اگر حافظه پر شده بود (QuotaExceededError)
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        if (typeof toast === 'function') {
          toast('⚠️ حافظه دستگاه پر شده است! لطفاً عکس‌های اضافی را حذف کنید تا اطلاعات جدید ذخیره شود.', 'error');
        } else {
          alert('⚠️ حافظه دستگاه پر شده است! اطلاعات ذخیره نشد.');
        }
      } else {
        if (typeof toast === 'function') {
          toast('⚠️ خطا در ذخیره‌سازی اطلاعات!', 'error');
        }
      }
    }
  },
  remove(key) {
    localStorage.removeItem('cheshmak_' + key);
  },
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('cheshmak_'))
      .forEach(k => localStorage.removeItem(k));
  }
};

// ==============================
// State اصلی اپ
// ==============================
const state = {
  business: null,
  customers: [],
  birthdayMessages: {},
  searchQuery: '',
};
// 🔐 تابع هش کردن رمز عبور
async function hashPassword(password) {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_CHESHMAK_SALT_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// ==============================
// عنوان خطاب مشتری
// ==============================
function getCustomerTitle() {
  return (state.business && state.business.customerTitle) || 'مهمان گرامی';
}

function getCustomerTitleOptions() {
  return [
    { value: 'مهمان گرامی', label: '🎁 مهمان گرامی' },
    { value: 'مهمان', label: '🎁 مهمان' },
    { value: 'همراه', label: '💫 همراه' },
    { value: 'همراه گرامی', label: '💫 همراه گرامی' },
    { value: 'مراجع', label: '📋 مراجع' },
    { value: 'عزیز', label: '💗 عزیز' },
  ];
}

// ==============================
// نرمال‌سازی نام و شماره
// ==============================
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  let n = name.trim();
  n = n.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  n = n.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  n = n.replace(/ي/g, 'ی');
  n = n.replace(/ك/g, 'ک');
  n = n.replace(/ة/g, 'ه');
  n = n.replace(/ۀ/g, 'ه');
  n = n.replace(/ؤ/g, 'و');
  n = n.replace(/إ|أ|ٱ/g, 'ا');
  n = n.replace(/\u200c/g, ' ');
  n = n.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  n = n.replace(/[.,،؛:!?؟«»"'`\-_ـ()\[\]{}]/g, ' ');
  const titles = ['آقای','آقا','خانم','خانوم','جناب','سرکار','مهندس','دکتر','استاد','جناب آقای','سرکار خانم','حاج','حاج آقا','حاج خانم','حاجیه','سید','سیده','میرزا','ملا','شیخ','امیر','شاهزاده'];
  const titlePattern = new RegExp('^(' + titles.join('|') + ')\\s+', 'g');
  for (let i = 0; i < 3; i++) n = n.replace(titlePattern, '');
  n = n.replace(/\s+/g, ' ');
  n = n.trim();
  n = n.toLowerCase();
  return n;
}

function normalizePhone(phone) {
  if (!phone) return '';
  let p = phone.toString();
  p = p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  p = p.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  p = p.replace(/\D/g, '');
  if (p.startsWith('0098')) p = p.substring(4);
  else if (p.startsWith('98') && p.length > 10) p = p.substring(2);
  if (p.startsWith('0')) p = p.substring(1);
  if (p.length > 10) p = p.slice(-10);
  return p;
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - (dist / maxLen);
}

function findSimilarCustomers(name, phone, excludeId = null) {
  const nName = normalizeName(name);
  const nPhone = normalizePhone(phone);
  const results = [];
  state.customers.forEach(c => {
    if (excludeId && c.id === excludeId) return;
    const cName = normalizeName(c.fullName);
    const cPhone1 = normalizePhone(c.phone1);
    const cPhone2 = normalizePhone(c.phone2);
    const matches = [];
    let score = 0;
    if (nName && cName) {
      if (nName === cName) {
        matches.push('نام دقیقاً یکسان');
        score = Math.max(score, 100);
      } else {
        const sim = stringSimilarity(nName, cName);
        if (sim >= 0.85) {
          matches.push(`نام مشابه (${Math.round(sim * 100)}%)`);
          score = Math.max(score, Math.round(sim * 100));
        }
      }
    }
    if (nPhone) {
      if (cPhone1 && nPhone === cPhone1) {
        matches.push('شماره اصلی یکسان');
        score = Math.max(score, 100);
      } else if (cPhone2 && nPhone === cPhone2) {
        matches.push('شماره با موبایل دوم مشتری یکسان');
        score = Math.max(score, 100);
      }
    }
    if (matches.length > 0) {
      results.push({ customer: c, matches, score });
    }
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ==============================
// توابع تاریخ شمسی
// ==============================
function getTodayShamsi() {
  const now = new Date();
  let gY = now.getFullYear();
  let gM = now.getMonth() + 1;
  let gD = now.getDate();
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((gY % 4 === 0 && gY % 100 !== 0) || (gY % 400 === 0)) gDaysInMonth[1] = 29;
  const gy2 = (gM > 2) ? (gY + 1) : gY;
  let days = 355666 + (365 * gY) + Math.floor((gy2 + 3) / 4)
           - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gD;
  for (let i = 0; i < gM - 1; i++) days += gDaysInMonth[i];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
}

function getTodayWeekday() {
  const w = new Date().getDay();
  const map = {0:'یکشنبه',1:'دوشنبه',2:'سه‌شنبه',3:'چهارشنبه',4:'پنجشنبه',5:'جمعه',6:'شنبه'};
  return map[w];
}

// 🔥 تشخیص سال کبیسه شمسی (الگوریتم استاندارد 33 ساله)
function isShamsiLeapYear(jy) {
  const r = jy % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
}

// 🔥 تعداد روزهای یه ماه شمسی با احتساب کبیسه
function shamsiMonthDays(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isShamsiLeapYear(jy) ? 30 : 29; // اسفند
}

function calculateAge(birthShamsi) {
  if (!birthShamsi) return null;
  const parts = birthShamsi.split('/');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const d = parseInt(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const today = getTodayShamsi().split('/');
  const ty = parseInt(today[0]);
  const tm = parseInt(today[1]);
  const td = parseInt(today[2]);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age;
}

function daysUntilBirthday(birthDate) {
  if (!birthDate) return null;
  const parts = birthDate.split('/');
  if (parts.length !== 3) return null;
  const by = parseInt(parts[0]);
  const bm = parseInt(parts[1]);
  const bd = parseInt(parts[2]);
  if (isNaN(bm) || isNaN(bd)) return null;

  const today = getTodayShamsi().split('/');
  const ty = parseInt(today[0]);
  const tm = parseInt(today[1]);
  const td = parseInt(today[2]);

  // 🔥 29 اسفند در سال غیرکبیسه → 30 اسفند
  const adjustDay = (year, month, day) => {
    const maxDay = shamsiMonthDays(year, month);
    return Math.min(day, maxDay);
  };

  if (bm === tm && adjustDay(ty, bm, bd) === td) return 0;

  // تبدیل تاریخ میلادی به شماره روز برای محاسبه دقیق
  const toDays = (y, m, d) => {
    let total = 0;
    // سال‌های قبل
    for (let i = 1300; i < y; i++) total += isShamsiLeapYear(i) ? 366 : 365;
    // ماه‌های قبل
    for (let i = 1; i < m; i++) total += shamsiMonthDays(y, i);
    total += d;
    return total;
  };

  const todayNum = toDays(ty, tm, td);
  let targetYear = ty;
  let targetDay = adjustDay(ty, bm, bd);

  // اگه امسال گذشته، برو سال بعد
  if (bm < tm || (bm === tm && targetDay < td)) {
    targetYear = ty + 1;
    targetDay = adjustDay(targetYear, bm, bd);
  }

  const targetNum = toDays(targetYear, bm, targetDay);
  return targetNum - todayNum;
}

function shamsiToNumber(shamsi) {
  if (!shamsi) return 0;
  const p = shamsi.split('/');
  if (p.length !== 3) return 0;
  const y = parseInt(p[0]) || 0;
  const m = parseInt(p[1]) || 0;
  const d = parseInt(p[2]) || 0;
  return y * 10000 + m * 100 + d;
}

function getShamsiDaysAgo(daysAgo) {
  const today = getTodayShamsi().split('/');
  let y = parseInt(today[0]);
  let m = parseInt(today[1]);
  let d = parseInt(today[2]);
  d -= daysAgo;
  while (d < 1) {
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    d += shamsiMonthDays(y, m); // 🔥 با احتساب کبیسه
  }
  return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
}

// ==============================
// ابزارهای کمکی
// ==============================
function bestTextOn(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
}

function toast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function formatPhone(phone) {
  return phone ? phone.toString().replace(/\D/g, '') : '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
// ==============================
// 🖼️ فشرده‌سازی هوشمند عکس پس‌زمینه
// ==============================
function compressBackgroundImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1400;
        const TARGET_SIZE = 300 * 1024; // 300 KB
        const MIN_QUALITY = 0.45;

        let w = img.width;
        let h = img.height;

        // کوچک کردن ابعاد
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round(h * MAX_DIM / w);
            w = MAX_DIM;
          } else {
            w = Math.round(w * MAX_DIM / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // تلاش اول با کیفیت 78%
        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // اگه حجیم‌تر از 300KB بود، فشرده‌تر کن
        let attempts = 0;
        while (dataUrl.length > TARGET_SIZE && quality > MIN_QUALITY && attempts < 8) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          attempts++;
        }

        // اگه هنوز بزرگه، ابعاد رو دوباره کم کن
        if (dataUrl.length > TARGET_SIZE) {
          const scale = Math.sqrt(TARGET_SIZE / dataUrl.length) * 0.95;
          const newW = Math.round(w * scale);
          const newH = Math.round(h * scale);
          canvas.width = newW;
          canvas.height = newH;
          const ctx2 = canvas.getContext('2d');
          ctx2.drawImage(img, 0, 0, newW, newH);
          dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        }

        resolve({
          dataUrl,
          sizeKB: Math.round(dataUrl.length / 1024),
          width: canvas.width,
          height: canvas.height,
        });
      };
      img.onerror = () => reject(new Error('خطا در بارگذاری عکس'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(file);
  });
}

// ==============================
// 🔆 محاسبه‌ی روشنایی عکس (0 تا 255)
// ==============================
function getImageBrightness(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const SAMPLE = 50; // نمونه‌ی کوچیک برای سرعت
      canvas.width = SAMPLE;
      canvas.height = SAMPLE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
      let totalBrightness = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 128) {
          totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;
          count++;
        }
      }
      resolve(count > 0 ? totalBrightness / count : 128);
    };
    img.onerror = () => resolve(128);
    img.src = dataUrl;
  });
}



// ==============================
// انتخابگر تاریخ شمسی
// ==============================
function showShamsiDatePicker(initialValue = '', title = 'انتخاب تاریخ') {
  return new Promise((resolve) => {
    let selectedDay = 1, selectedMonth = 1, selectedYear = 1375;
    if (initialValue) {
      const parts = initialValue.split('/');
      if (parts.length === 3) {
        selectedYear = parseInt(parts[0]) || 1375;
        selectedMonth = parseInt(parts[1]) || 1;
        selectedDay = parseInt(parts[2]) || 1;
      }
    }
    const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
        const todayParts = getTodayShamsi().split('/');
    const currentYear = parseInt(todayParts[0]) || 1404;
    const yearOptions = Array.from({ length: 100 }, (_, i) => (currentYear + 10) - i)
      .map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');
    const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1)
      .map(d => `<option value="${d}" ${d === selectedDay ? 'selected' : ''}>${d}</option>`).join('');
    const monthOptions = months.map((m, i) =>
      `<option value="${i + 1}" ${(i + 1) === selectedMonth ? 'selected' : ''}>${m}</option>`
    ).join('');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay center';
    overlay.style.zIndex = 2000;
    overlay.innerHTML = `
      <div class="modal center">
        <h3 class="modal-title">${title}</h3>
        <div style="display:grid;grid-template-columns:1fr 1.5fr 1.5fr;gap:8px;margin-bottom:16px">
          <div class="form-group" style="margin:0"><label>روز</label><select id="date-day">${dayOptions}</select></div>
          <div class="form-group" style="margin:0"><label>ماه</label><select id="date-month">${monthOptions}</select></div>
          <div class="form-group" style="margin:0"><label>سال</label><select id="date-year">${yearOptions}</select></div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="date-cancel">انصراف</button>
          <button class="btn-primary" id="date-confirm">تأیید</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const closeThis = () => overlay.remove();
    overlay.querySelector('#date-cancel').onclick = () => { closeThis(); resolve(null); };
    overlay.querySelector('#date-confirm').onclick = () => {
      const d = overlay.querySelector('#date-day').value.padStart(2, '0');
      const m = overlay.querySelector('#date-month').value.padStart(2, '0');
      const y = overlay.querySelector('#date-year').value;
      closeThis();
      resolve(`${y}/${m}/${d}`);
    };
  });
}

// ==============================
// ادیتور متن تمام‌صفحه
// ==============================
function openServiceEditor(initialText = '') {
  return new Promise((resolve) => {
    const overlay = showModal(`
      <h3 class="modal-title">نوع خدمت</h3>
      <textarea id="service-editor" rows="15" placeholder="شرح کامل خدمت را وارد کنید..." style="width:100%;padding:14px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:14px;line-height:1.8;resize:vertical;min-height:300px">${escapeHtml(initialText)}</textarea>
      <div class="modal-actions">
        <button class="btn-cancel" id="service-cancel">انصراف</button>
        <button class="btn-primary" id="service-save">ثبت</button>
      </div>
    `);
    const editor = overlay.querySelector('#service-editor');
    editor.focus();
    overlay.querySelector('#service-cancel').onclick = () => { closeModal(overlay); resolve(null); };
    overlay.querySelector('#service-save').onclick = () => {
      const text = editor.value.trim();
      closeModal(overlay);
      resolve(text);
    };
  });
}

// ==============================
// ویرایش پروفایل
// ==============================
function openEditProfile() {
  const b = state.business;
  if (!b) return;
  const logoPreviewSrc = b.logo || '';
  const overlay = showModal(`
    <h3 class="modal-title">${(state.business && state.business.bizType === 'coach') ? 'ویرایش پروفایل مربی' : 'ویرایش پروفایل کسب‌وکار'}</h3>
    <div style="text-align:center;margin-bottom:16px">
      <label for="edit-logo-input" style="cursor:pointer;display:inline-block;position:relative">
        <div id="edit-logo-circle" style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,var(--button-color),color-mix(in srgb,var(--button-color) 40%,transparent));display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden;box-shadow:0 0 25px color-mix(in srgb,var(--button-color) 40%,transparent)">
          ${logoPreviewSrc
            ? `<img id="edit-logo-preview" src="${logoPreviewSrc}" style="width:100%;height:100%;object-fit:cover">`
            : `<span id="edit-logo-icon">🏪</span><img id="edit-logo-preview" src="" style="width:100%;height:100%;object-fit:cover;display:none">`}
        </div>
        <div style="position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:var(--button-color);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📷</div>
      </label>
      <input type="file" id="edit-logo-input" accept="image/*" hidden>
      <p style="font-size:11px;color:var(--text-muted);margin-top:8px">برای تغییر لوگو کلیک کنید</p>
    </div>

    <div class="form-group"><label>شغل شما</label><input type="text" id="edit-job" value="${escapeHtml(b.job)}"></div>
    <div class="form-group"><label>${(state.business && state.business.bizType === 'coach') ? 'نام باشگاه / محل تمرین' : 'نام کسب‌وکار'}</label><input type="text" id="edit-name" value="${escapeHtml(b.name)}"></div>    <div class="form-group"><label>${(state.business && state.business.bizType === 'coach') ? 'نام باشگاه / محل تمرین' : 'نام کسب‌وکار'}</label><input type="text" id="edit-name" value="${escapeHtml(b.name)}"></div>    <div class="form-group"><label>نام و نام خانوادگی مدیر</label><input type="text" id="edit-manager" value="${escapeHtml(b.manager)}"></div>
    <div class="form-group"><label>شماره تماس</label><input type="tel" id="edit-phone" value="${escapeHtml(b.phone)}"></div>
    <div class="form-group"><label>تاریخ تولد</label><input type="text" id="edit-birth" value="${escapeHtml(b.birth || '')}" placeholder="برای انتخاب کلیک کنید" readonly style="cursor:pointer"></div>
    <div class="form-group"><label>رمز ورود عددی</label><input type="text" id="edit-pass" value="${escapeHtml(b.password)}" inputmode="numeric"></div>
    <div class="form-group"><label>شهر محل تولد (برای بازیابی رمز)</label><input type="text" id="edit-security" value="${escapeHtml(b.security)}"></div>

    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color)">
      <label style="font-size:13px;font-weight:700;display:block;margin-bottom:12px">📱 شبکه‌های اجتماعی (اختیاری)</label>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.6">${(state.business && state.business.bizType === 'coach') ? 'این اطلاعات پایین برنامه‌های تمرینی و پیام‌های تبریک تولد نشون داده می‌شن.' : 'این اطلاعات پایین فاکتورها نشون داده می‌شن.'} هر کدوم رو خواستی پر کن.</p>      <div class="form-group"><label>📸 اینستاگرام</label><input type="text" id="edit-instagram" value="${escapeHtml((b.social && b.social.instagram) || '')}" placeholder="مثلاً: cheshmak"></div>
      <div class="form-group"><label>📨 تلگرام</label><input type="text" id="edit-telegram" value="${escapeHtml((b.social && b.social.telegram) || '')}" placeholder="مثلاً: cheshmak"></div>
      <div class="form-group"><label>💬 واتساپ</label><input type="text" id="edit-whatsapp" value="${escapeHtml((b.social && b.social.whatsapp) || '')}" placeholder="مثلاً: 09121234567"></div>
      <div class="form-group"><label>🌐 وب‌سایت</label><input type="text" id="edit-website" value="${escapeHtml((b.social && b.social.website) || '')}" placeholder="مثلاً: cheshmak.ir"></div>
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="edit-cancel">انصراف</button>
      <button class="btn-primary" id="edit-save">ذخیره تغییرات</button>
    </div>
  `);

  const logoInput = overlay.querySelector('#edit-logo-input');
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = overlay.querySelector('#edit-logo-preview');
      const icon = overlay.querySelector('#edit-logo-icon');
      preview.src = ev.target.result;
      preview.style.display = 'block';
      if (icon) icon.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  const birthField = overlay.querySelector('#edit-birth');
  birthField.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(birthField.value, 'تاریخ تولد شما');
    if (result) birthField.value = result;
  });

  overlay.querySelector('#edit-cancel').onclick = () => closeModal(overlay);

  overlay.querySelector('#edit-save').onclick = () => {
    const job = overlay.querySelector('#edit-job').value.trim();
    const name = overlay.querySelector('#edit-name').value.trim();
    const manager = overlay.querySelector('#edit-manager').value.trim();
    const phone = overlay.querySelector('#edit-phone').value.trim();
    const birth = overlay.querySelector('#edit-birth').value.trim();
    const pass = overlay.querySelector('#edit-pass').value.trim();
    const security = overlay.querySelector('#edit-security').value.trim();
    const instagram = overlay.querySelector('#edit-instagram').value.trim();
    const telegram = overlay.querySelector('#edit-telegram').value.trim();
    const whatsapp = overlay.querySelector('#edit-whatsapp').value.trim();
    const website = overlay.querySelector('#edit-website').value.trim();
    const logoPreview = overlay.querySelector('#edit-logo-preview');
    const newLogo = (logoPreview && logoPreview.src && logoPreview.src !== window.location.href)
      ? logoPreview.src
      : b.logo;

    if (!job || !name || !manager || !phone || !pass) {
      toast('لطفاً همه‌ی فیلدهای ضروری را پر کنید', 'error');
      return;
    }

    b.job = job;
    b.name = name;
    b.manager = manager;
    b.phone = phone;
    b.birth = birth;
    b.password = pass;
    b.security = security;
    b.logo = newLogo;
    b.social = {
      instagram: instagram.replace(/^@/, ''),
      telegram: telegram.replace(/^@/, ''),
      whatsapp: whatsapp,
      website: website.replace(/^https?:\/\//, '').replace(/^www\./, '')
    };

    DB.set('business', b);
    toast('تغییرات ذخیره شد ✅', 'success');
    closeModal(overlay);
    setTimeout(() => { updateBusinessDisplay(); }, 200);
  };
}

// ==============================
// آپدیت نمایش اطلاعات
// ==============================
function updateBusinessDisplay() {
  const b = state.business;
  if (!b) return;
  const headerName = document.getElementById('header-business-name');
  const headerJob = document.getElementById('header-business-job');
  if (headerName) headerName.textContent = b.name;
  if (headerJob) headerJob.textContent = b.job;
  const headerLogo = document.getElementById('header-logo');
  const headerIcon = document.getElementById('header-icon');
  if (b.logo) {
    if (headerLogo) { headerLogo.src = b.logo; headerLogo.style.display = 'block'; }
    if (headerIcon) headerIcon.style.display = 'none';
  }
  const lockName = document.getElementById('lock-business-name');
  const lockJob = document.getElementById('lock-business-job');
  if (lockName) lockName.textContent = b.name;
  if (lockJob) lockJob.textContent = b.job;
  const lockLogo = document.getElementById('lock-logo');
  const lockIcon = document.getElementById('lock-icon');
  if (b.logo) {
    if (lockLogo) { lockLogo.src = b.logo; lockLogo.style.display = 'block'; }
    if (lockIcon) lockIcon.style.display = 'none';
  }
}

// ==============================
// رندر صفحات
// ==============================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderClock() {
  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('clock-time').textContent = `${hour}:${min}`;
  document.getElementById('clock-date').textContent = `${getTodayWeekday()} ${getTodayShamsi()}`;
}

function renderCustomers() {
  const list = document.getElementById('customers-list');
  const q = normalizeName(state.searchQuery);
  let filtered = q
    ? state.customers.filter(c => normalizeName(c.fullName).includes(q))
    : state.customers;

  // 🔍 فیلتر پیشرفته
  if (state.advancedFilter) {
    const f = state.advancedFilter;
    filtered = filtered.filter(c => {
      const h = c.height || 0;
      const w = c.weight || 0;
      const age = calculateAge(c.birthDate);

      if (f.heightMin !== '' && h < f.heightMin) return false;
      if (f.heightMax !== '' && h > f.heightMax) return false;

      if (f.weightMin !== '' && w < f.weightMin) return false;
      if (f.weightMax !== '' && w > f.weightMax) return false;

      if (f.ageMin !== '' && (age === null || age < f.ageMin)) return false;
      if (f.ageMax !== '' && (age === null || age > f.ageMax)) return false;

      return true;
    });
  }

  if (filtered.length === 0) {
    const customerLabel = (state.business && state.business.bizType === 'coach')
      ? getCoachCustomerTitle().replace(' گرامی', '')
      : getCustomerTitle().replace(' گرامی', '');
    
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>${state.customers.length === 0
          ? `هنوز ${customerLabel} ثبت نشده است.<br>روی «ثبت ${customerLabel}» بزنید.`
          : `${customerLabel} با این نام پیدا نشد.`}</p>
      </div>
    `;
    return;
  }
  list.innerHTML = filtered.map(c => {
    const bd = daysUntilBirthday(c.birthDate);
    const isBirthdaySoon = bd !== null && bd <= 7;

    const hasRealImage = c.image && (c.image.startsWith('data:image') || c.image.startsWith('http'));
    const avatar = hasRealImage
      ? `<img src="${c.image}" alt="">`
      : getRoseAvatarSvg(40);

    return `
      <div class="customer-card" data-id="${c.id}">
        <div class="customer-avatar" style="background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center">${avatar}</div>
        <div class="customer-info">
          <div class="customer-name">
            <span>${escapeHtml(c.fullName)}</span>
            ${isBirthdaySoon ? '<span class="customer-cake">🎂</span>' : ''}
          </div>
          <div class="customer-meta">📞 ${escapeHtml(c.phone1)}<br>آخرین مراجعه: ${c.lastVisit || 'بدون مراجعه'}</div>
        </div>
        <div class="customer-actions">
          <button data-edit="${c.id}">✏️</button>
          <button data-delete="${c.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.customer-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openCustomerProfile(card.dataset.id);
    });
  });
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openCustomerForm(btn.dataset.edit));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCustomer(btn.dataset.delete));
  });
}
// ==============================
// مودال پایه (🔥 اصلاح‌شده: پارامتر overlay اختیاری)
// ==============================
function showModal(contentHtml, options = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay' + (options.center ? ' center' : '');
  overlay.innerHTML = `<div class="modal${options.center ? ' center' : ''}">${contentHtml}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !options.noCloseOnOverlay) closeModal(overlay);
  });
  return overlay;
}

// 🔥 اگه overlay بدی، همون رو می‌بنده، وگرنه بالاترین مودال رو
function closeModal(overlay = null) {
  if (overlay) {
    overlay.remove();
    return;
  }
  const overlays = document.querySelectorAll('.modal-overlay');
  if (overlays.length > 0) overlays[overlays.length - 1].remove();
}

// ==============================
// صفحه راه‌اندازی
// ==============================
function initSetupScreen() {
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const logoIcon = document.getElementById('logo-icon');
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoPreview.src = ev.target.result;
      logoPreview.style.display = 'block';
      logoIcon.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
  const birthInput = document.getElementById('setup-birth');
  birthInput.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await showShamsiDatePicker(birthInput.value, 'تاریخ تولد شما');
    if (result) birthInput.value = result;
  });
   document.getElementById('btn-register').addEventListener('click', async () => {
    const job = document.getElementById('setup-job').value.trim();
    const name = document.getElementById('setup-name').value.trim();
    const manager = document.getElementById('setup-manager').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    const birth = document.getElementById('setup-birth').value.trim();
    const pass = document.getElementById('setup-pass').value.trim();
    const hashedPass = await hashPassword(pass);
    const security = document.getElementById('setup-security').value.trim();

    if (!job || !name || !manager || !phone || !pass) {
      toast('لطفاً همه‌ی فیلدهای ضروری را پر کنید', 'error');
      return;
    }

    // 🏋️ تشخیص حالت مربی
    const isCoach = isCoachJob(job);
    let coachType = '';

    if (isCoach) {
      const coachTypeResult = await askCoachType();
      if (coachTypeResult === null) return;
      coachType = coachTypeResult;
    }

    state.business = {
      job, name, manager, phone, birth, password: hashedPass, security,
      logo: logoPreview.src || null,
      buttonColor: '#14B8A6',
      backgroundColor: '#15161F',
      bizType: isCoach ? 'coach' : 'general',
      coachType: coachType,
      customerTitle: isCoach ? 'شاگرد' : 'مهمان گرامی',
    };
    DB.set('business', state.business);
    toast(
      isCoach ? 'کسب‌وکار ورزشی راه‌اندازی شد ✅' : 'کسب‌وکار با موفقیت راه‌اندازی شد ✅',
      'success'
    );
    setTimeout(() => {
      showWelcomeDialog();
      setTimeout(() => {
        showScreen('lock-screen');
        initLockScreen();
      }, 300);
    }, 300);
  });
  const btnRestoreSetup = document.getElementById('btn-restore-setup');
  if (btnRestoreSetup) btnRestoreSetup.addEventListener('click', () => openRestoreDialog(false));
}

function showWelcomeDialog() {
  const overlay = showModal(`
    <div style="text-align:center;padding:10px">
      <div style="width:80px;height:80px;margin:0 auto 16px">
        <img src="assets/icon-192.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
      </div>
      <h2 style="font-family:'IranNastaliq', serif;font-size:32px;margin-bottom:8px;color:#14B8A6">چشمک</h2>
      <div style="width:120px;height:2px;background:linear-gradient(90deg,transparent,#14B8A6,transparent);margin:12px auto"></div>
      <p style="font-size:15px;margin-bottom:8px">راه‌اندازی با موفقیت انجام شد</p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;line-height:1.8">از این پس، چشمک همراه شماست 🌹</p>
      <button class="btn-primary" id="welcome-ok" style="background:linear-gradient(135deg,#14B8A6,#0D9488);color:#fff">شروع کنیم</button>
    </div>
  `, { center: true, noCloseOnOverlay: true });
  overlay.querySelector('#welcome-ok').addEventListener('click', () => closeModal(overlay));
}

// ==============================
// صفحه قفل
// ==============================
function initLockScreen() {
  const b = state.business;
  if (!b) return;
  document.getElementById('lock-business-name').textContent = b.name;
  document.getElementById('lock-business-job').textContent = b.job;
  const lockLogo = document.getElementById('lock-logo');
  const lockIcon = document.getElementById('lock-icon');
  if (b.logo) {
    lockLogo.src = b.logo;
    lockLogo.style.display = 'block';
    lockIcon.style.display = 'none';
  }
  applyColors(b.buttonColor, b.backgroundColor);
  const passInput = document.getElementById('lock-pass');
  passInput.value = '';
    const tryLogin = async () => {
    const hashedInput = await hashPassword(passInput.value.trim());
    if (hashedInput === b.password) {
      showScreen('dashboard-screen');
      initDashboard();
    } else {
      toast('رمز عبور اشتباه است!', 'error');
    }
  };

  document.getElementById('btn-login').onclick = tryLogin;

  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryLogin();
    }
  });
      document.getElementById('btn-forgot').onclick = () => {
      const overlay = showModal(`
        <h3 class="modal-title">بازیابی رمز عبور</h3>
        <div class="form-group"><label>شهر محل تولد ثبت‌شده:</label><input type="text" id="recover-input"></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="recover-cancel">انصراف</button>
          <button class="btn-primary" id="recover-submit">بررسی</button>
        </div>
      `, { center: true });
      overlay.querySelector('#recover-cancel').onclick = () => closeModal(overlay);
      overlay.querySelector('#recover-submit').onclick = async () => {
        const ans = overlay.querySelector('#recover-input').value.trim();
        if (normalizeName(ans) === normalizeName(b.security)) {
          closeModal(overlay);
          setTimeout(() => {
            const ov2 = showModal(`
              <h3 class="modal-title">تعیین رمز جدید</h3>
              <div class="form-group"><label>رمز جدید (عدد):</label><input type="text" id="new-pass-input" inputmode="numeric"></div>
              <button class="btn-primary" id="set-new-pass-btn" style="margin-top:16px">ذخیره رمز جدید</button>
            `, { center: true });
            
            ov2.querySelector('#set-new-pass-btn').onclick = async () => {
              const newPass = ov2.querySelector('#new-pass-input').value.trim();
              if (!newPass) { toast('رمز را وارد کنید', 'error'); return; }
              b.password = await hashPassword(newPass);
              DB.set('business', b);
              closeModal(ov2);
              toast('✅ رمز عبور با موفقیت تغییر کرد', 'success');
            };
          }, 200);
        } else {
          toast('پاسخ اشتباه است!', 'error');
        }
      };
    };
  const btnRestoreLock = document.getElementById('btn-restore-lock');
  if (btnRestoreLock) btnRestoreLock.addEventListener('click', () => openRestoreDialog(true));
}

// ==============================
// داشبورد
// ==============================
function initDashboard() {
    // 🔑 چک لایسنس
  if (typeof checkLicense === 'function') {
    if (!checkLicense()) return;
  }
  updateBusinessDisplay();
  const actionIcon = document.getElementById('action-icon-customer');
  if (actionIcon) {
    actionIcon.innerHTML = getRoseAvatarSvg(36);
  }
  const labelCustomer = document.getElementById('label-add-customer');
  if (labelCustomer) {
    const t = getCustomerTitle();
        const titleFn = (state.business && state.business.bizType === 'coach') ? getCoachCustomerTitle : getCustomerTitle;
    const t2 = titleFn();
    const shortTitle = t.replace(' گرامی', '');
    const shortTitle2 = t2.replace(' گرامی', '');
    labelCustomer.textContent = 'ثبت ' + shortTitle2;  }
   document.querySelectorAll('.action-btn').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      if (action === 'add-customer') openCustomerForm();
      else if (action === 'report') openReport();
      else if (action === 'birthdays') openBirthdays();
      else if (action === 'attendance') openAttendancePage();
      else if (action === 'attendance-history') openAttendanceHistory();
    };
  });

    // 🏋️ نمایش دکمه‌های حضور و غیاب توی حالت مربی
  const attendanceBtn = document.getElementById('btn-attendance-dashboard');
  const attendanceHistoryBtn = document.getElementById('btn-attendance-history');
  const quickActions = document.querySelector('.quick-actions');
  if (state.business && state.business.bizType === 'coach') {
    if (attendanceBtn) attendanceBtn.style.display = 'flex';
    if (attendanceHistoryBtn) attendanceHistoryBtn.style.display = 'flex';
    } else {
    if (attendanceBtn) attendanceBtn.style.display = 'none';
    if (attendanceHistoryBtn) attendanceHistoryBtn.style.display = 'none';
  
  }
  // 🏋️ تغییر placeholder جستجو
  const searchInput = document.getElementById('search-input');
  // 🔍 دکمه‌ی فیلتر پیشرفته (فقط مربی)
  const btnAdvancedFilter = document.getElementById('btn-advanced-filter');
  if (btnAdvancedFilter) {
    if (state.business && state.business.bizType === 'coach') {
      btnAdvancedFilter.style.display = 'block';
      btnAdvancedFilter.onclick = () => openAdvancedFilter();
    } else {
      btnAdvancedFilter.style.display = 'none';
    }
  }

  if (searchInput) {
      const titleForSearch = (state.business && state.business.bizType === 'coach')
    ? (state.business.customerTitle || 'شاگرد').replace(' گرامی', '')
    : 'مشتری';
  }

  document.getElementById('search-input').oninput = (e) => {
    state.searchQuery = e.target.value;
    renderCustomers();
  };
  document.getElementById('btn-settings').onclick = openSettings;

  const btnPending = document.getElementById('btn-pending');
  if (btnPending) {
    btnPending.onclick = openPendingList;
  }
  updatePendingBadge();
  updateBirthdayBadge();
  updateRetentionBox();
  checkAndShowOwnerBirthday();
  renderCustomers();
  renderClock();
}



// ==============================
// 🎉 چک و نمایش تبریک تولد به خود کاربر
// ==============================
function checkAndShowOwnerBirthday() {
  const b = state.business;
  if (!b || !b.birth) return;

  const today = getTodayShamsi().split('/');
  const birth = b.birth.split('/');
  if (today.length !== 3 || birth.length !== 3) return;

  const todayMonth = parseInt(today[1]);
  const todayDay = parseInt(today[2]);
  const birthMonth = parseInt(birth[1]);
  const birthDay = parseInt(birth[2]);

  if (todayMonth !== birthMonth || todayDay !== birthDay) return;

  showOwnerBirthdayBanner();
}

// ==============================
// 🎂 نمایش بنر تبریک به کاربر
// ==============================
function showOwnerBirthdayBanner() {
  const todayKey = 'birthdayShown_' + getTodayShamsi().replace(/\//g, '-');
  if (DB.get(todayKey)) return;
  DB.set(todayKey, true);

  const overlay = showModal(`
    <div style="text-align:center;padding:20px 10px">
      <div style="font-size:70px;margin-bottom:16px">🎂</div>

      <h2 style="font-family:'IranNastaliq', serif;font-size:32px;margin-bottom:12px;color:#EC4899">
        تولدت مبارک!
      </h2>

      <div style="width:100px;height:2px;background:linear-gradient(90deg,transparent,#EC4899,transparent);margin:12px auto"></div>

      <p style="font-size:15px;margin-bottom:8px;font-weight:700">${escapeHtml(state.business.manager || state.business.name)}</p>

      <p style="font-size:13px;color:var(--text-muted);line-height:2;margin-bottom:20px">
        امیدوارم سالی پر از شادی، سلامتی و موفقیت داشته باشی 🎈<br>
        و کسب‌وکارت روز به روز رونق بیشتری بگیره 💫
      </p>

      <div style="background:linear-gradient(135deg,rgba(236,72,153,0.1),rgba(236,72,153,0.05));border:1px solid rgba(236,72,153,0.3);border-radius:12px;padding:12px;margin-bottom:20px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">با آرزوی بهترین‌ها</div>
        <div style="font-size:13px;font-weight:700;color:#EC4899;display:flex;align-items:center;justify-content:center;gap:5px">تیم چشمک <img src="assets/icon-192.png" style="width:16px;height:16px;border-radius:50%"></div>
        </div>

      <button class="btn-primary" id="owner-bd-ok" style="background:linear-gradient(135deg,#EC4899,#DB2777);color:#fff;width:100%">
        ممنونم 💗
      </button>
    </div>
  `, { center: true, noCloseOnOverlay: true });

  overlay.querySelector('#owner-bd-ok').onclick = () => closeModal(overlay);
}



// ==============================
// ثبت/ویرایش مشتری
// ==============================
function openCustomerForm(id = null) {
    // 🔥 ریست پرداخت‌های موقت
  window._pendingPayments = [];
  const editing = id ? state.customers.find(c => c.id === id) : null;

  // 🏋️ اسم خطاب
  const customerLabel = (state.business && state.business.bizType === 'coach')
    ? getCoachCustomerTitle().replace(' گرامی', '')
    : getCustomerTitle().replace(' گرامی', '');

  const overlay = showModal(`
    <h3 class="modal-title">${editing ? 'ویرایش ' + customerLabel : 'ثبت ' + customerLabel + ' جدید'}</h3>
    <div class="form-group"><label>نام و نام خانوادگی *</label><input type="text" id="cust-name" value="${editing ? escapeHtml(editing.fullName) : ''}"></div>
    <div class="form-group"><label>شماره همراه اصلی *</label><input type="tel" id="cust-phone1" value="${editing ? editing.phone1 : ''}"></div>
    <div class="form-group"><label>شماره همراه دوم (اختیاری)</label><input type="tel" id="cust-phone2" value="${editing ? (editing.phone2 || '') : ''}"></div>
    <div class="form-group"><label>تاریخ تولد</label><input type="text" id="cust-birth" value="${editing ? (editing.birthDate || '') : ''}" placeholder="برای انتخاب کلیک کنید" readonly></div>
    <div class="form-group"><label>یادداشت</label><textarea id="cust-note" rows="2">${editing ? escapeHtml(editing.note || '') : ''}</textarea></div>
    ${(state.business && state.business.bizType === 'coach') ? getCoachExtraFieldsHtml(editing) : ''}
    <div id="dup-warning" style="display:none;margin-bottom:12px"></div>
    <div class="modal-actions">
      <button class="btn-cancel" id="cust-cancel">انصراف</button>
      <button class="btn-primary" id="cust-save">${editing ? 'ذخیره' : 'ثبت'}</button>
    </div>
  `, { center: true });

  const birthField = overlay.querySelector('#cust-birth');
  birthField.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(birthField.value, 'تاریخ تولد ' + customerLabel);
    if (result) birthField.value = result;
  });

  // 🏋️ اتصال انتخابگرهای تاریخ مربی
  if (state.business && state.business.bizType === 'coach') {
    bindCoachDatePickers(overlay);
  }

  const nameInput = overlay.querySelector('#cust-name');
  const phoneInput = overlay.querySelector('#cust-phone1');
  const dupWarning = overlay.querySelector('#dup-warning');

  const checkDuplicatesLive = () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    if (!name && !phone) { dupWarning.style.display = 'none'; return; }
    const similar = findSimilarCustomers(name, phone, editing ? editing.id : null);
    if (similar.length > 0) {
      const top = similar[0];
      dupWarning.style.display = 'block';
      dupWarning.innerHTML = `
        <div style="background:rgba(245,158,11,0.15);border:1px solid #F59E0B;border-radius:12px;padding:12px">
          <div style="font-size:13px;font-weight:700;color:#F59E0B;margin-bottom:6px">⚠️ ${customerLabel} مشابه پیدا شد</div>
          <div style="font-size:12px;line-height:1.7">
            <strong>${escapeHtml(top.customer.fullName)}</strong> — ${escapeHtml(top.customer.phone1)}
            <br>
            <span style="color:var(--text-muted);font-size:11px">${top.matches.join(' | ')}</span>
          </div>
          <button type="button" id="dup-view" style="margin-top:8px;background:transparent;border:1px solid #F59E0B;color:#F59E0B;padding:6px 12px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">مشاهده پروفایل</button>
        </div>
      `;
      const viewBtn = dupWarning.querySelector('#dup-view');
      if (viewBtn) viewBtn.onclick = () => {
        closeModal(overlay);
        setTimeout(() => openCustomerProfile(top.customer.id), 200);
      };
    } else {
      dupWarning.style.display = 'none';
    }
  };

    // 🔥 اضافه کردن debounce برای جلوگیری از لگ شدن
  let dupTimeout = null;
  const debouncedCheck = () => {
    clearTimeout(dupTimeout);
    dupTimeout = setTimeout(checkDuplicatesLive, 500); // نیم ثانیه صبر می‌کنه
  };
  
  nameInput.addEventListener('input', debouncedCheck);
  phoneInput.addEventListener('input', debouncedCheck);
  if (editing) checkDuplicatesLive();

  overlay.querySelector('#cust-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#cust-save').onclick = () => {
    const name = overlay.querySelector('#cust-name').value.trim();
    const phone1 = overlay.querySelector('#cust-phone1').value.trim();
    const phone2 = overlay.querySelector('#cust-phone2').value.trim();
    const birth = overlay.querySelector('#cust-birth').value.trim();
    const note = overlay.querySelector('#cust-note').value.trim();

    // 🏋️ اطلاعات ورزشی
    const coachData = readCoachExtraFields(overlay, editing);
    if (!name) { toast('نام ' + customerLabel + ' را وارد کنید', 'error'); return; }
    const similar = findSimilarCustomers(name, phone1, editing ? editing.id : null);
    if (similar.length > 0) {
      closeModal(overlay);
      setTimeout(() => {
        showDuplicateConfirmModal(similar, () => {
          saveCustomer(editing, { name, phone1, phone2, birth, note, coachData });
        });
      }, 150);
      return;
    }
    saveCustomer(editing, { name, phone1, phone2, birth, note, coachData });
  };
}

function saveCustomer(editing, data) {
  const { name, phone1, phone2, birth, note, coachData } = data;

  const customerLabel = (state.business && state.business.bizType === 'coach')
    ? getCoachCustomerTitle().replace(' گرامی', '')
    : getCustomerTitle().replace(' گرامی', '');

  // 🔥 مبلغ نهایی — از فرم خونده می‌شه (coachData.tuition)
  const finalTuition = coachData && coachData.tuition ? coachData.tuition : 0;

  // 🏋️ اطلاعات ورزشی
  const coachFields = coachData ? {
    height: coachData.height || 0,
    weight: coachData.weight || 0,
    medals: coachData.medals || '',
    trainingStart: coachData.trainingStart || '',
    tuition: finalTuition,
    totalSessions: coachData.totalSessions || 0,
    validityPeriod: coachData.validityPeriod || { amount: 1, unit: 'month' },
    lastPaymentDate: coachData.lastPaymentDate || '',
    tuitionPaid: coachData.tuitionPaid || false,
    image: coachData.image || null,
  } : {};


      // 💰 پرداخت‌های جدید که با دکمه‌ی «ثبت پرداخت» اضافه شدن
  let newPayments = null;
  if (coachData && coachData._pendingPayments && coachData._pendingPayments.length > 0) {
    const existing = editing && editing.payments ? editing.payments : [];
    newPayments = [...existing, ...coachData._pendingPayments];
    window._pendingPayments = [];
  }

  if (editing) {
    editing.fullName = name;
    editing.phone1 = phone1;
    editing.phone2 = phone2;
    editing.birthDate = birth;
    editing.note = note;
    Object.assign(editing, coachFields);
    if (newPayments) editing.payments = newPayments;
    toast('تغییرات ذخیره شد ✅', 'success');
  } else {
    state.customers.push({
      id: Date.now().toString(),
      fullName: name, phone1, phone2, birthDate: birth, note,
      image: null, history: [], lastVisit: '',
      usedSessions: 0,
      ...coachFields,
      payments: newPayments || [],
    });
    toast(customerLabel + ' ثبت شد ✅', 'success');
  }
  DB.set('customers', state.customers);
  renderCustomers();
  updateRetentionBox();

  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
}
function showDuplicateConfirmModal(similarCustomers, onConfirm) {
  const listHtml = similarCustomers.slice(0, 5).map((s) => `
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;margin-bottom:8px;text-align:right">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong style="font-size:13px">${escapeHtml(s.customer.fullName)}</strong>
        <span style="font-size:10px;background:rgba(239,68,68,0.2);color:#EF4444;padding:2px 8px;border-radius:10px;font-weight:700">${s.score}% تطابق</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.6">
        📞 ${escapeHtml(s.customer.phone1)}${s.customer.phone2 ? ' | ' + s.customer.phone2 : ''}<br>
        🎂 ${s.customer.birthDate || 'ثبت نشده'}<br>
        <span style="color:#F59E0B">${s.matches.join(' | ')}</span>
      </div>
      <button type="button" data-goto="${s.customer.id}" style="margin-top:8px;background:transparent;border:1px solid var(--button-color);color:var(--button-color);padding:5px 12px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">مشاهده پروفایل</button>
    </div>
  `).join('');
  const overlay = showModal(`
    <h3 class="modal-title" style="color:#F59E0B">⚠️ مشتری مشابه پیدا شد</h3>
    <p style="font-size:13px;line-height:1.8;text-align:center;margin-bottom:14px;color:var(--text-muted)">
      این مشتری با ${similarCustomers.length} مشتری موجود مشابه است.<br>
      آیا مطمئنید می‌خواهید مشتری جدید ثبت کنید؟
    </p>
    <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">${listHtml}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-cancel" id="dup-back" style="font-weight:700">↩️ برگشت و اصلاح</button>
      <button class="btn-primary" id="dup-confirm" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff">⚠️ بله، مشتری جدید ثبت کن</button>
    </div>
  `, { center: true });
  overlay.querySelector('#dup-back').onclick = () => closeModal(overlay);
  overlay.querySelector('#dup-confirm').onclick = () => {
    closeModal(overlay);
    setTimeout(() => onConfirm(), 150);
  };
  overlay.querySelectorAll('[data-goto]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.goto;
      closeModal(overlay);
      setTimeout(() => openCustomerProfile(id), 200);
    };
  });
}

function confirmDeleteCustomer(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;
  const overlay = showModal(`
    <h3 class="modal-title">حذف مشتری</h3>
    <p style="text-align:center;padding:16px">آیا از حذف «${escapeHtml(c.fullName)}» مطمئن هستید؟</p>
    <div class="modal-actions">
      <button class="btn-cancel" id="del-cancel">انصراف</button>
      <button class="btn-primary" id="del-confirm" style="background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">حذف شود</button>
    </div>
  `, { center: true });
  overlay.querySelector('#del-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#del-confirm').onclick = () => {
    state.customers = state.customers.filter(x => x.id !== id);
    DB.set('customers', state.customers);
    closeModal(overlay);
    renderCustomers();
    toast('مشتری حذف شد', 'success');
  };
}

// ==============================
// پروفایل مشتری
// ==============================
function openCustomerProfile(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;

  const historyHtml = c.history && c.history.length > 0
    ? c.history.slice().reverse().map((h, reversedIdx) => {
        const originalIdx = c.history.length - 1 - reversedIdx;
        return `
        <div class="customer-card" style="cursor:default;flex-wrap:wrap">
          <div class="customer-info" style="flex:1;min-width:120px">
            <div class="customer-name" style="white-space:pre-wrap">${escapeHtml(h.serviceName)}</div>
            <div class="customer-meta">📅 ${h.dateShamsi}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div style="color:var(--button-color);font-weight:700">${h.cost.toLocaleString()} تومان</div>
            <button class="btn-cancel" style="padding:4px 10px;font-size:11px;width:auto" data-edit-service="${originalIdx}">✏️ ویرایش</button>
          </div>
        </div>
      `;
      }).join('')
    : '<p style="text-align:center;color:var(--text-muted);padding:16px">هنوز سابقه‌ای ثبت نشده</p>';

  const isCoach = state.business && state.business.bizType === 'coach';

  const overlay = showModal(`
    <h3 class="modal-title">${escapeHtml(c.fullName)}</h3>
    <div style="text-align:center;margin-bottom:12px">
      <div style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.06);display:inline-flex;align-items:center;justify-content:center">
        ${(c.image && (c.image.startsWith('data:image') || c.image.startsWith('http')))
          ? `<img src="${c.image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
          : getRoseAvatarSvg(60)}
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="margin-bottom:6px">📞 ${escapeHtml(c.phone1)}${c.phone2 ? ' | ' + c.phone2 : ''}</div>
      ${c.birthDate ? `<div style="margin-bottom:6px">🎂 ${c.birthDate}</div>` : ''}
      ${c.note ? `<div style="margin-bottom:6px">📝 ${escapeHtml(c.note)}</div>` : ''}
      <div>📅 آخرین مراجعه: ${c.lastVisit || 'ثبت نشده'}</div>
    </div>

    ${!isCoach ? `
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;background:rgba(20,184,166,0.08);border-radius:10px;margin-bottom:12px">
        <input type="checkbox" id="prof-show-prices" style="width:18px;height:18px;cursor:pointer">
        <span style="font-size:12px">💰 نمایش قیمت‌ها در فاکتور این مشتری</span>
      </label>
      <button class="btn-primary" id="prof-add-service" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff">➕ ثبت خدمت جدید</button>
      <button class="btn-primary" id="prof-invoice" style="margin-top:12px;background:linear-gradient(135deg,#10B981,#059669);color:#fff">📄 صدور فاکتور</button>
    ` : `
      <button class="btn-primary" id="prof-training-plan" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;margin-bottom:12px">📋 برنامه تمرینی</button>
      <button class="btn-primary" id="prof-plans-history" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;margin-bottom:12px">📚 تاریخچه برنامه‌ها</button>
      <button class="btn-primary" id="prof-freeze" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;margin-bottom:12px">❄️ مدیریت فریز</button>
       <button class="btn-primary" id="prof-payments" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;margin-bottom:12px">💰 تاریخچه‌ی پرداخت‌ها</button>
    `}

    <h4 style="margin:16px 0 8px;font-size:14px">سوابق:</h4>
    <div id="prof-history">${historyHtml}</div>

    <div class="modal-actions" style="margin-top:16px">
      <button class="btn-cancel" id="prof-close">بستن</button>
    </div>
  `);

  // 🏋️ دکمه‌های مخصوص مربی
  const trainingPlanBtn = overlay.querySelector('#prof-training-plan');
  if (trainingPlanBtn) {
    trainingPlanBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => {
        if (typeof openTrainingPlan === 'function') {
          openTrainingPlan(id);
        } else {
          toast('تابع برنامه تمرینی لود نشده', 'error');
        }
      }, 200);
    };
  }

  const plansHistoryBtn = overlay.querySelector('#prof-plans-history');
  if (plansHistoryBtn) {
    plansHistoryBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => {
        if (typeof openPlansHistory === 'function') {
          openPlansHistory(id);
        } else {
          toast('تابع تاریخچه لود نشده', 'error');
        }
      }, 200);
    };
  }

  // ❄️ دکمه‌ی فریز
  const freezeBtn = overlay.querySelector('#prof-freeze');
  if (freezeBtn) {
    freezeBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => {
        if (typeof openFreezeManager === 'function') {
          openFreezeManager(id);
        } else {
          toast('تابع فریز لود نشده', 'error');
        }
      }, 200);
    };
  }

  
  // 💰 دکمه‌ی تاریخچه‌ی پرداخت‌ها
  const paymentsBtn = overlay.querySelector('#prof-payments');
  if (paymentsBtn) {
    paymentsBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => {
        if (typeof openPaymentsHistory === 'function') {
          openPaymentsHistory(id);
        } else {
          toast('تابع تاریخچه پرداخت‌ها لود نشده', 'error');
        }
      }, 200);
    };
  }
  // 💰 نمایش قیمت‌ها (فقط حالت عمومی)
  const profShowPrices = overlay.querySelector('#prof-show-prices');
  if (profShowPrices) {
    const currentValue = c.showPrices !== undefined
      ? c.showPrices
      : (state.business.showPricesInInvoice !== false);
    profShowPrices.checked = currentValue;

    profShowPrices.addEventListener('change', function() {
      c.showPrices = this.checked;
      DB.set('customers', state.customers);
      toast(this.checked ? 'قیمت روشن شد ✅' : 'قیمت خاموش شد', 'success');
    });
  }

  // ➕ دکمه‌های حالت عمومی
  const profAddService = overlay.querySelector('#prof-add-service');
  if (profAddService) {
    profAddService.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openAddServiceDialog(id), 200);
    };
  }

  const profInvoice = overlay.querySelector('#prof-invoice');
  if (profInvoice) {
    profInvoice.onclick = () => {
      closeModal(overlay);
      setTimeout(() => generateInvoiceImage(id), 200);
    };
  }

  // بستن
  overlay.querySelector('#prof-close').onclick = () => {
    closeModal(overlay);
    setTimeout(() => checkAndAskSendInvoice(id), 200);
  };

  // ویرایش خدمت
  overlay.querySelectorAll('[data-edit-service]').forEach(btn => {
    btn.onclick = () => {
      const serviceIdx = parseInt(btn.dataset.editService);
      closeModal(overlay);
      setTimeout(() => openEditServiceDialog(id, serviceIdx), 200);
    };
  });
}

function openAddServiceDialog(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  const overlay = showModal(`
    <h3 class="modal-title">ثبت خدمت جدید</h3>
    <div class="form-group">
      <label>نوع خدمت *</label>
      <textarea id="new-service-name" rows="4" placeholder="شرح خدمت را وارد کنید..." style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:14px;line-height:1.8;resize:vertical"></textarea>
    </div>
    <div class="form-group">
      <label>مبلغ (تومان) *</label>
      <input type="number" id="new-service-cost" placeholder="مثلاً: 150000" inputmode="numeric">
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" id="new-service-cancel">انصراف</button>
      <button class="btn-primary" id="new-service-save">ثبت خدمت</button>
    </div>
  `, { center: true });

  const nameField = overlay.querySelector('#new-service-name');
  const costField = overlay.querySelector('#new-service-cost');
  nameField.focus();

  overlay.querySelector('#new-service-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(() => openCustomerProfile(customerId), 200);
  };

  overlay.querySelector('#new-service-save').onclick = () => {
    const serviceName = nameField.value.trim();
    const cost = parseInt(costField.value.replace(/\D/g, '')) || 0;
    if (!serviceName) { toast('شرح خدمت را وارد کنید', 'error'); return; }

    c.history = c.history || [];
    c.history.push({ serviceName: serviceName, cost: cost, dateShamsi: getTodayShamsi() });
    c.lastVisit = getTodayShamsi();
    DB.set('customers', state.customers);
    toast('خدمت ثبت شد ✅', 'success');
    updateRetentionBox();
    closeModal(overlay);
    setTimeout(() => openCustomerProfile(customerId), 200);
  };

  costField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      overlay.querySelector('#new-service-save').click();
    }
  });
}

// ==============================
// گزارش مالی
// ==============================
let reportRange = 'all';
let reportCustomFrom = '';
let reportCustomTo = '';

function openReport() {
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  const overlay = showModal(`
    <h3 class="modal-title">گزارش مالی</h3>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px" id="range-chips">
      <button class="range-chip" data-range="today">امروز</button>
      <button class="range-chip" data-range="week">این هفته</button>
      <button class="range-chip" data-range="month">این ماه</button>
      <button class="range-chip" data-range="custom">بازه‌ی دلخواه</button>
      <button class="range-chip" data-range="all">همه</button>
    </div>
    <div id="custom-range" style="display:none;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="form-group" style="margin:0"><label>از تاریخ</label><input type="text" id="range-from" placeholder="انتخاب..." readonly style="cursor:pointer"></div>
      <div class="form-group" style="margin:0"><label>تا تاریخ</label><input type="text" id="range-to" placeholder="انتخاب..." readonly style="cursor:pointer"></div>
    </div>
    <div id="report-content"></div>
    <button class="btn-cancel" id="rep-close" style="width:100%;margin-top:16px">بستن</button>
  `);
  const chips = overlay.querySelectorAll('.range-chip');
  const customRange = overlay.querySelector('#custom-range');
  const rangeFrom = overlay.querySelector('#range-from');
  const rangeTo = overlay.querySelector('#range-to');
  rangeFrom.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(rangeFrom.value, 'از تاریخ');
    if (result) { rangeFrom.value = result; reportCustomFrom = result; renderReportContent(overlay); }
  });
  rangeTo.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(rangeTo.value, 'تا تاریخ');
    if (result) { rangeTo.value = result; reportCustomTo = result; renderReportContent(overlay); }
  });
  chips.forEach(chip => {
    chip.onclick = () => {
      reportRange = chip.dataset.range;
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (reportRange === 'custom') {
        customRange.style.display = 'grid';
        rangeFrom.value = reportCustomFrom;
        rangeTo.value = reportCustomTo;
      } else {
        customRange.style.display = 'none';
      }
      renderReportContent(overlay);
    };
  });
  reportRange = 'all';
  chips.forEach(c => { if (c.dataset.range === 'all') c.classList.add('active'); });
  overlay.querySelector('#rep-close').onclick = () => closeModal(overlay);
  renderReportContent(overlay);
}

function renderReportContent(overlay) {
  const content = overlay.querySelector('#report-content');

  // ==============================
  // 🔥 ۱. درآمد فروش خودم (خدمات مشتریان)
  // ==============================
  const allLogs = [];
  state.customers.forEach(c => {
    (c.history || []).forEach(h => allLogs.push(h));
  });

  let filteredLogs = [];
  const todayNum = shamsiToNumber(getTodayShamsi());
  if (reportRange === 'all') filteredLogs = allLogs;
  else if (reportRange === 'today') filteredLogs = allLogs.filter(h => h.dateShamsi === getTodayShamsi());
  else if (reportRange === 'week') {
    const from = getShamsiDaysAgo(6);
    const fromNum = shamsiToNumber(from);
    filteredLogs = allLogs.filter(h => {
      const n = shamsiToNumber(h.dateShamsi);
      return n >= fromNum && n <= todayNum;
    });
  } else if (reportRange === 'month') {
    const from = getShamsiDaysAgo(29);
    const fromNum = shamsiToNumber(from);
    filteredLogs = allLogs.filter(h => {
      const n = shamsiToNumber(h.dateShamsi);
      return n >= fromNum && n <= todayNum;
    });
  } else if (reportRange === 'custom') {
    if (reportCustomFrom && reportCustomTo) {
      const fromNum = shamsiToNumber(reportCustomFrom);
      const toNum = shamsiToNumber(reportCustomTo);
      filteredLogs = allLogs.filter(h => {
        const n = shamsiToNumber(h.dateShamsi);
        return n >= fromNum && n <= toNum;
      });
    } else filteredLogs = [];
  }
  const salesIncome = filteredLogs.reduce((sum, h) => sum + h.cost, 0);
  // 🔥 اگه payments خالی بود ولی lastPaymentDate هست، یه رکورد موقت بساز
  state.customers.forEach(c => {
    if ((!c.payments || c.payments.length === 0) && c.lastPaymentDate && c.tuition) {
      c.payments = [{
        date: c.lastPaymentDate,
        amount: c.tuition,
        createdAt: new Date().toISOString(),
      }];
    }
  });



    // 🏋️ اگه مربی هست → درآمد از payments حساب کن
  let coachIncome = 0;
  let coachPaymentCount = 0;
  if (state.business && state.business.bizType === 'coach') {
    const allPayments = [];
    state.customers.forEach(c => {
      (c.payments || []).forEach(p => {
        allPayments.push({ ...p, customerName: c.fullName, customerId: c.id });
      });
    });

    // فیلتر بازه
    let filteredPayments = allPayments;
    if (reportRange === 'today') {
      const todayNorm = getTodayShamsi();
      filteredPayments = allPayments.filter(p => {
        const pDateNorm = p.date ? p.date.split('/').map((x, i) => i === 0 ? x : x.padStart(2, '0')).join('/') : '';
        return pDateNorm === todayNorm;
      });
    }else if (reportRange === 'week') {
      const fromNum = shamsiToNumber(getShamsiDaysAgo(6));
      filteredPayments = allPayments.filter(p => shamsiToNumber(p.date) >= fromNum && shamsiToNumber(p.date) <= todayNum);
    } else if (reportRange === 'month') {
      const fromNum = shamsiToNumber(getShamsiDaysAgo(29));
      filteredPayments = allPayments.filter(p => shamsiToNumber(p.date) >= fromNum && shamsiToNumber(p.date) <= todayNum);
    } else if (reportRange === 'custom') {
      if (reportCustomFrom && reportCustomTo) {
        const fromNum = shamsiToNumber(reportCustomFrom);
        const toNum = shamsiToNumber(reportCustomTo);
        filteredPayments = allPayments.filter(p => shamsiToNumber(p.date) >= fromNum && shamsiToNumber(p.date) <= toNum);
      } else filteredPayments = [];
    }

    coachIncome = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    coachPaymentCount = filteredPayments.length;
  }

  // ==============================
  // 🔥 ۲. درآمد از تبلیغات
  // ==============================
  const allIssuedInvoices = DB.get('issuedInvoices', []);

  // محاسبه‌ی بازه برای فاکتورها
  const isInRange = (shamsiDate) => {
    if (!shamsiDate) return false;
    const n = shamsiToNumber(shamsiDate);
    if (reportRange === 'all') return true;
    if (reportRange === 'today') return shamsiDate === getTodayShamsi();
    if (reportRange === 'week') {
      const fromNum = shamsiToNumber(getShamsiDaysAgo(6));
      return n >= fromNum && n <= todayNum;
    }
    if (reportRange === 'month') {
      const fromNum = shamsiToNumber(getShamsiDaysAgo(29));
      return n >= fromNum && n <= todayNum;
    }
    if (reportRange === 'custom') {
      if (!reportCustomFrom || !reportCustomTo) return false;
      const fromNum = shamsiToNumber(reportCustomFrom);
      const toNum = shamsiToNumber(reportCustomTo);
      return n >= fromNum && n <= toNum;
    }
    return true;
  };

  const adInvoices = allIssuedInvoices.filter(inv => inv.type === 'ad' && isInRange(inv.issuedAt));
  const adIncome = adInvoices.reduce((sum, inv) => sum + (inv.itemCost || 0), 0);

  // ==============================
  // 🔥 ۳. درآمد از اسپانسرهای تولد
  // ==============================
  const sponsorInvoices = allIssuedInvoices.filter(inv => inv.type === 'birthdaySponsor' && isInRange(inv.issuedAt));
  const sponsorIncome = sponsorInvoices.reduce((sum, inv) => sum + (inv.itemCost || 0), 0);

  // ==============================
  // 🔥 ۴. مجموع کل
  // ==============================
  const grandTotal = (state.business && state.business.bizType === 'coach')
    ? (coachIncome + sponsorIncome)
    : (salesIncome + adIncome + sponsorIncome);
  // ==============================
  // 📊 محاسبه‌ی آمار روزانه (فقط فروش)
  // ==============================
  const dailyIncome = {};
  filteredLogs.forEach(h => { dailyIncome[h.dateShamsi] = (dailyIncome[h.dateShamsi] || 0) + h.cost; });
  let bestDay = null, bestIncome = -1;
  let worstDay = null, worstIncome = Infinity;
  Object.entries(dailyIncome).forEach(([day, income]) => {
    if (income > bestIncome) { bestIncome = income; bestDay = day; }
    if (income < worstIncome) { worstIncome = income; worstDay = day; }
  });

  const dailyHtml = Object.entries(dailyIncome)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, income]) => `
      <div class="customer-card" style="cursor:default">
        <div class="customer-info"><div>📅 ${day}</div></div>
        <div style="color:var(--button-color);font-weight:700">${income.toLocaleString()} تومان</div>
      </div>
    `).join('');

  const rangeLabels = { today: 'امروز', week: 'این هفته', month: 'این ماه', custom: 'بازه‌ی دلخواه', all: 'همه' };

  // ==============================
  // 🎨 رندر نهایی
  // ==============================

    // 🔥 فیکس مبلغ‌های بزرگ (1e+24)
    // ==============================
  // 📊 آمار شاگردان / مشتریان
  // ==============================
  const totalCustomers = state.customers.length;

  // «امروز»
  let todayCount = 0;
  if (state.business && state.business.bizType === 'coach') {
    // مربی: از حضور و غیاب
    const attendance = DB.get('attendance_' + getTodayShamsi().replace(/\//g, '-'), {});
    todayCount = state.customers.filter(c => attendance[c.id] === 'present').length;
  } else {
    // عادی: از lastVisit
    todayCount = state.customers.filter(c => c.lastVisit === getTodayShamsi()).length;
  }

  // «فعال / غیرفعال» بر اساس retentionDays
  const retentionDays = (state.business && state.business.retentionDays) || 60;
  const retentionFromNum = shamsiToNumber(getShamsiDaysAgo(retentionDays));

  let activeCount = 0;
  let inactiveCount = 0;

  state.customers.forEach(c => {
    let lastDate = '';
    if (state.business && state.business.bizType === 'coach') {
      lastDate = c.lastVisit || '';
    } else {
      lastDate = c.lastVisit || '';
    }

    if (!lastDate) {
      // اگه هیچ مراجعه‌ای نداشته → غیرفعال
      inactiveCount++;
      return;
    }

    const lastNum = shamsiToNumber(lastDate);
    if (lastNum >= retentionFromNum && lastNum <= todayNum) {
      activeCount++;
    } else {
      inactiveCount++;
    }
  });

    const customerStatsLabel = (state.business && state.business.bizType === 'coach')
? getCoachCustomerTitle().replace(' گرامی', '')
: getCustomerTitle().replace(' گرامی', '');


  content.innerHTML = `
    <!-- 📊 آمار شاگردان / مشتریان -->
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04));border:1px solid rgba(59,130,246,0.3);border-radius:14px;padding:14px;margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;color:#3B82F6;margin-bottom:10px;text-align:center">📊 آمار ${customerStatsLabel}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="text-align:center;background:rgba(139,92,246,0.1);border-radius:10px;padding:10px">
          <div style="font-size:22px;font-weight:800;color:#8B5CF6">${totalCustomers}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">کل</div>
        </div>
        <div style="text-align:center;background:rgba(16,185,129,0.1);border-radius:10px;padding:10px">
          <div style="font-size:22px;font-weight:800;color:#10B981">${todayCount}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">امروز</div>
        </div>
        <div style="text-align:center;background:rgba(59,130,246,0.1);border-radius:10px;padding:10px">
          <div style="font-size:22px;font-weight:800;color:#3B82F6">${activeCount}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">فعال (${retentionDays} روز اخیر)</div>
        </div>
        <div style="text-align:center;background:rgba(245,158,11,0.1);border-radius:10px;padding:10px">
          <div style="font-size:22px;font-weight:800;color:#F59E0B">${inactiveCount}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">غیرفعال</div>
        </div>
      </div>
    </div>
    <!-- 🔥 مجموع کل -->
    <div style="background:linear-gradient(135deg,rgba(20,184,166,0.15),rgba(20,184,166,0.05));border:2px solid var(--button-color);border-radius:14px;padding:18px;text-align:center;margin-bottom:14px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">💵 مجموع کل درآمد (${rangeLabels[reportRange]})</div>
      <div style="font-size:30px;font-weight:800;color:var(--button-color)">${Number(grandTotal).toLocaleString('en-US')} تومان</div>
    </div>

        <!-- 💰 درآمد خودم / فروش خودم -->
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#10B981">💰 ${(state.business && state.business.bizType === 'coach') ? 'درآمد از شهریه‌ها' : 'فروش خودم'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${(state.business && state.business.bizType === 'coach') ? coachPaymentCount + ' پرداخت' : filteredLogs.length + ' خدمت'}</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:#10B981">${(state.business && state.business.bizType === 'coach') ? Number(coachIncome).toLocaleString('en-US') : Number(salesIncome).toLocaleString('en-US')} تومان</div>
    </div>
        ${(state.business && state.business.bizType !== 'coach' && filteredLogs.length > 0) ? `
      <button id="report-sales-detail" style="width:100%;padding:10px;background:rgba(16,185,129,0.08);border:1px dashed #10B981;border-radius:10px;color:#10B981;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:14px">👁️ مشاهده‌ی ریز فروش‌ها (${filteredLogs.length})</button>
    ` : ''}
    ${(state.business && state.business.bizType === 'coach' && coachPaymentCount > 0) ? `
      <button id="report-payments-detail" style="width:100%;padding:10px;background:rgba(16,185,129,0.08);border:1px dashed #10B981;border-radius:10px;color:#10B981;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:14px">👁️ مشاهده‌ی ریز پرداخت‌ها (${coachPaymentCount})</button>
    ` : ''}

        ${(state.business && state.business.bizType !== 'coach') ? `
    <!-- 📢 تبلیغات -->
    <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#8B5CF6">📢 درآمد از تبلیغات</div>
        <div style="font-size:11px;color:var(--text-muted)">${adInvoices.length} فاکتور</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:#8B5CF6">${Number(adIncome).toLocaleString('en-US')} تومان</div>
    </div>
    ` : ''}

    <!-- 🎂 اسپانسرهای تولد -->
    <div style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.3);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#EC4899">🎂 درآمد از اسپانسرها</div>
        <div style="font-size:11px;color:var(--text-muted)">${sponsorInvoices.length} فاکتور</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:#EC4899">${Number(sponsorIncome).toLocaleString('en-US')} تومان</div>
    </div>

    <!-- 📈 بهترین و بدترین روز (فقط فروش) -->
    ${bestDay ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:rgba(16,185,129,0.15);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px">📈 بیشترین فروش</div>
          <div style="font-size:14px;font-weight:700;color:#10B981;margin-top:4px">${bestIncome.toLocaleString()}</div>
          <div style="font-size:10px;color:var(--text-muted)">${bestDay}</div>
        </div>
        <div style="background:rgba(239,68,68,0.15);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px">📉 کمترین فروش</div>
          <div style="font-size:14px;font-weight:700;color:#EF4444;margin-top:4px">${worstIncome.toLocaleString()}</div>
          <div style="font-size:10px;color:var(--text-muted)">${worstDay}</div>
        </div>
      </div>
    ` : ''}

    <h4 style="margin-bottom:8px;font-size:14px">${(state.business && state.business.bizType === 'coach') ? 'درآمد روزانه' : 'فروش روزانه'}:</h4>        ${dailyHtml}
  `;
  
  // 💰 ریز پرداخت‌های مربی
  const paymentsDetailBtn = overlay.querySelector('#report-payments-detail');
  if (paymentsDetailBtn) {
    paymentsDetailBtn.onclick = () => {
      const detailPayments = [];
      state.customers.forEach(c => {
        (c.payments || []).forEach(p => {
          let inRange = false;
          if (reportRange === 'all') inRange = true;
          else if (reportRange === 'today') inRange = (p.date === getTodayShamsi());
          else if (reportRange === 'week') {
            const fromNum = shamsiToNumber(getShamsiDaysAgo(6));
            const n = shamsiToNumber(p.date);
            inRange = (n >= fromNum && n <= todayNum);
          } else if (reportRange === 'month') {
            const fromNum = shamsiToNumber(getShamsiDaysAgo(29));
            const n = shamsiToNumber(p.date);
            inRange = (n >= fromNum && n <= todayNum);
          } else if (reportRange === 'custom') {
            if (reportCustomFrom && reportCustomTo) {
              const fromNum = shamsiToNumber(reportCustomFrom);
              const toNum = shamsiToNumber(reportCustomTo);
              const n = shamsiToNumber(p.date);
              inRange = (n >= fromNum && n <= toNum);
            }
          }
          if (inRange) {
            detailPayments.push({
              ...p,
              customerName: c.fullName,
              customerId: c.id,
            });
          }
        });
      });

      detailPayments.sort((a, b) =>
        (b.date || '').localeCompare(a.date || '') ||
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );

      const rangeLabels = { today: 'امروز', week: 'این هفته', month: 'این ماه', custom: 'بازه‌ی دلخواه', all: 'همه' };

      const detailHtml = detailPayments.map(p => {
        const time = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '';
          const customerName = (() => {
          const found = state.customers.find(c => (c.history || []).includes(p));
          return found ? found.fullName : (p.customerName || 'نامشخص');
        })();
        return `
              
          <div style="padding:10px 12px;background:rgba(16,185,129,0.08);border-radius:10px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:13px;font-weight:700">${escapeHtml(customerName)}</div>
              <div style="font-size:13px;font-weight:700;color:#10B981">${Number(p.amount).toLocaleString('en-US')} تومان</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">
              📅 ${p.date}${time ? ' — 🕐 ' + time : ''}
              ${p.note ? '<br>📝 ' + escapeHtml(p.note) : ''}
            </div>
          </div>
        `;
      }).join('');

      const totalDetail = detailPayments.reduce((s, p) => s + (p.amount || 0), 0);

      const ov = showModal(`
        <h3 class="modal-title">💰 ریز پرداخت‌ها (${rangeLabels[reportRange]})</h3>
        <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:14px">
          تعداد: <strong>${detailPayments.length}</strong> — مجموع: <strong style="color:#10B981">${Number(totalDetail).toLocaleString('en-US')} تومان</strong>
        </p>
        <div style="max-height:400px;overflow-y:auto;margin-bottom:14px">
          ${detailHtml || '<p style="text-align:center;color:var(--text-muted);padding:20px">پرداختی توی این بازه نیست</p>'}
        </div>
        <button class="btn-cancel" id="detail-close" style="width:100%">بستن</button>
      `);
      ov.querySelector('#detail-close').onclick = () => closeModal(ov);
    };
  }
    // 💰 ریز فروش‌های حالت عادی
  const salesDetailBtn = overlay.querySelector('#report-sales-detail');
  if (salesDetailBtn) {
    salesDetailBtn.onclick = () => {
      const detailSales = filteredLogs.slice().sort((a, b) => 
        (b.dateShamsi || '').localeCompare(a.dateShamsi || '')
      );

      const detailHtml = detailSales.map(h => {
        const customer = state.customers.find(c => (c.history || []).includes(h));
        const customerName = customer ? customer.fullName : 'نامشخص';
        
        return `
          <div style="padding:10px 12px;background:rgba(16,185,129,0.08);border-radius:10px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:13px;font-weight:700">${escapeHtml(customerName)}</div>
              <div style="font-size:13px;font-weight:700;color:#10B981">${Number(h.cost).toLocaleString('en-US')} تومان</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6">
              📅 ${h.dateShamsi}
              <br>📋 ${escapeHtml(h.serviceName)}
            </div>
          </div>
        `;
      }).join('');

      const ov = showModal(`
        <h3 class="modal-title">💰 ریز فروش‌ها (${rangeLabels[reportRange]})</h3>
        <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:14px">
          تعداد: <strong>${filteredLogs.length}</strong> — مجموع: <strong style="color:#10B981">${Number(salesIncome).toLocaleString('en-US')} تومان</strong>
        </p>
        <div style="max-height:400px;overflow-y:auto;margin-bottom:14px">
          ${detailHtml || '<p style="text-align:center;color:var(--text-muted);padding:20px">فروشی توی این بازه نیست</p>'}
        </div>
        <button class="btn-cancel" id="detail-sales-close" style="width:100%">بستن</button>
      `);
      ov.querySelector('#detail-sales-close').onclick = () => closeModal(ov);
    };
  }
}
// ==============================
// تولدها
// ==============================
function openBirthdays() {
  const upcoming = state.customers
    .map(c => ({ c, days: daysUntilBirthday(c.birthDate) }))
    .filter(x => {
      const reminderDays = (state.business && state.business.birthdayReminderDays) || 7;
      return x.days !== null && x.days <= reminderDays;
    })    .sort((a, b) => a.days - b.days);
  const listHtml = upcoming.length === 0
    ? '<p style="text-align:center;color:var(--text-muted);padding:30px">توی ۷ روز آینده تولدی نداریم 🎈</p>'
    : upcoming.map(({ c, days }) => {
        const age = calculateAge(c.birthDate);
        const today = days === 0;
        return `
          <div class="customer-card" style="background:${today ? 'rgba(255,193,7,0.15)' : 'var(--surface-color)'}">
            <div class="customer-avatar" style="background:${today ? '#FFC107' : 'rgba(20,184,166,0.25)'};color:${today ? '#000' : 'var(--button-color)'}">
              ${today ? '🎉' : '🎂'}
            </div>
            <div class="customer-info">
              <div class="customer-name">${escapeHtml(c.fullName)}</div>
              <div class="customer-meta">📞 ${c.phone1}<br>🎂 ${c.birthDate}${age ? ` (${age} ساله)` : ''}</div>
            </div>
            <div style="text-align:left">
              <div style="font-size:12px;font-weight:700;color:${today ? '#FFC107' : 'var(--text-muted)'};margin-bottom:4px">${today ? 'امروز!' : `${days} روز`}</div>
              <button class="btn-primary" style="padding:6px 12px;font-size:11px;width:auto" data-congrat="${c.id}">تبریک</button>
            </div>
          </div>
        `;
      }).join('');

  const bdTitle = (state.business && state.business.bizType === 'coach')
    ? getCoachCustomerTitle().replace(' گرامی', '')
    : 'مشتری';

  const overlay = showModal(`
    <h3 class="modal-title">    <h3 class="modal-title">🎂 تولدهای نزدیک ${bdTitle} (${(state.business && state.business.birthdayReminderDays) || 7} روز آینده)</h3></h3>    <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:14px">تعداد: ${upcoming.length} نفر</p>
    <div>${listHtml}</div>
    <button class="btn-cancel" id="bd-close" style="width:100%;margin-top:16px">بستن</button>
  `);
  overlay.querySelector('#bd-close').onclick = () => closeModal(overlay);
  overlay.querySelectorAll('[data-congrat]').forEach(btn => {
    btn.onclick = () => openBirthdayMessage(btn.dataset.congrat);
  });
}

async function openBirthdayMessage(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  const age = calculateAge(c.birthDate);
  const isYouth = age !== null && age < 16;

  // 🔥 جمله‌ی رندوم تولد
  const birthdayQuote = await getRandomBirthdayQuote();

  // 🔥 پیام پیش‌فرض
  const saved = state.birthdayMessages[customerId];
  const defaultText = saved || (isYouth
    ? `🎉 ${c.fullName} عزیز،\nتولدت مبارک! 🎂🎈\nامیدوارم یه سال پر از شادی و خنده داشته باشی!`
    : `🎂 ${c.fullName} گرامی،\nفرا رسیدن سالروز تولدتان را تبریک عرض می‌کنیم.\nامیدواریم سالی سرشار از سلامتی، شادی و موفقیت پیش رو داشته باشید.`
  );

  // 🔥 عکس کیک پیش‌فرض (SVG)
  const cakeEmoji = `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="95" rx="45" ry="6" fill="#E8D5B7"/>
      <rect x="20" y="60" width="80" height="35" rx="4" fill="#F5E6D3"/>
      <rect x="20" y="55" width="80" height="10" rx="4" fill="#FFB6C1"/>
      <rect x="20" y="75" width="80" height="8" fill="#8B4513" opacity="0.7"/>
      <rect x="35" y="40" width="4" height="18" fill="#FFD700"/>
      <rect x="58" y="35" width="4" height="23" fill="#FF69B4"/>
      <rect x="81" y="40" width="4" height="18" fill="#87CEEB"/>
      <ellipse cx="37" cy="36" rx="3" ry="5" fill="#FF4500"/>
      <ellipse cx="37" cy="35" rx="2" ry="3" fill="#FFD700"/>
      <ellipse cx="60" cy="31" rx="3" ry="5" fill="#FF4500"/>
      <ellipse cx="60" cy="30" rx="2" ry="3" fill="#FFD700"/>
      <ellipse cx="83" cy="36" rx="3" ry="5" fill="#FF4500"/>
      <ellipse cx="83" cy="35" rx="2" ry="3" fill="#FFD700"/>
      <circle cx="30" cy="65" r="3" fill="#FF1493"/>
      <circle cx="45" cy="65" r="3" fill="#00CED1"/>
      <circle cx="60" cy="65" r="3" fill="#FFD700"/>
      <circle cx="75" cy="65" r="3" fill="#FF1493"/>
      <circle cx="90" cy="65" r="3" fill="#00CED1"/>
    </svg>
  `;

  // 🔥 عکس کیک سفارشی کاربر
  const cakeImage = state.business.birthdayImage
    ? `<img src="${state.business.birthdayImage}" style="width:150px;height:150px;object-fit:cover;border-radius:50%;box-shadow:0 4px 20px rgba(236,72,153,0.3)">`
    : cakeEmoji;

  closeModal();

  const overlay = showModal(`
    <h3 class="modal-title">🎂 تبریک تولد ${escapeHtml(c.fullName)}</h3>

    <div style="text-align:center;margin:16px 0">
      ${cakeImage}
    </div>

    <div id="bd-quote-box" style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:14px;margin-bottom:14px;text-align:center">
      <div style="font-size:13px;color:#555;line-height:2;font-style:italic">«${escapeHtml(birthdayQuote)}»</div>
    </div>

    <div class="form-group">
      <label style="font-size:12px">متن تبریک (قابل ویرایش):</label>
      <textarea id="bd-msg" rows="6" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8">${defaultText}</textarea>
    </div>

        <div style="display:flex;justify-content:space-around;margin-top:14px">
      <button class="btn-icon" id="bd-refresh-quote" title="جمله‌ی جدید">🔄</button>
      <button class="btn-icon" id="bd-save" title="ذخیره">💾</button>
      <button class="btn-icon" id="bd-copy" title="کپی">📋</button>
    </div>

    <button class="btn-primary" id="bd-make-image" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#EC4899,#DB2777);color:#fff">📷 ساخت عکس تبریک</button>

    <div class="modal-actions" style="margin-top:10px">
      <button class="btn-cancel" id="bd-msg-close" style="flex:1">بستن</button>
    </div>
  `, { center: true });

  overlay.querySelector('#bd-msg-close').onclick = () => closeModal(overlay);

  // 🔥 دکمه‌ی جمله‌ی جدید
  overlay.querySelector('#bd-refresh-quote').onclick = async () => {
    const newQuote = await getRandomBirthdayQuote();
    const quoteBox = overlay.querySelector('#bd-quote-box');
    if (quoteBox) {
      quoteBox.innerHTML = `<div style="font-size:13px;color:#555;line-height:2;font-style:italic">«${escapeHtml(newQuote)}»</div>`;
    }
  };

  // 🔥 ذخیره‌ی پیام
  overlay.querySelector('#bd-save').onclick = () => {
    state.birthdayMessages[customerId] = overlay.querySelector('#bd-msg').value;
    DB.set('birthdayMessages', state.birthdayMessages);
    toast('متن تبریک ذخیره شد ✅', 'success');
  };

  // 🔥 کپی
  overlay.querySelector('#bd-copy').onclick = () => {
    navigator.clipboard.writeText(overlay.querySelector('#bd-msg').value);
    toast('متن کپی شد ✅', 'success');
  };
  // 🔥 ساخت عکس تبریک
  overlay.querySelector('#bd-make-image').onclick = () => {
    const currentQuote = overlay.querySelector('#bd-quote-box')?.textContent?.replace(/[«»]/g, '').trim() || '';
    const currentMessage = overlay.querySelector('#bd-msg').value;
    closeModal(overlay);
    setTimeout(() => {
      generateBirthdayImage(customerId, currentQuote, currentMessage);
    }, 200);
  };


}
// ==============================
// تنظیمات
// ==============================
function openSettings() {


  const retTitle = (state.business && state.business.bizType === 'coach')
    ? getCoachCustomerTitle().replace(' گرامی', '')
    : getCustomerTitle().replace(' گرامی', '');
  const overlay = showModal(`
    <h3 class="modal-title">تنظیمات</h3>
    <h4 style="font-size:14px;margin-bottom:8px">${(state.business && state.business.bizType === 'coach') ? 'پروفایل مربی:' : 'پروفایل کسب‌وکار:'}</h4>       <button class="btn-cancel" id="edit-profile" style="width:100%;margin-bottom:16px">✏️ ${(state.business && state.business.bizType === 'coach') ? 'ویرایش اطلاعات مربی' : 'ویرایش اطلاعات کسب‌وکار'}</button>
    
    <h4 style="font-size:14px;margin-bottom:8px;color:#8B5CF6">🔑 شناسه‌ی دستگاه:</h4>
    <div style="margin-bottom:16px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:12px">
      <div style="text-align:center;direction:ltr;font-size:16px;font-weight:800;color:#8B5CF6;letter-spacing:2px;margin-bottom:8px" id="device-id-display">—</div>
      <button class="btn-cancel" id="copy-device-id-settings" style="width:100%;padding:8px;font-size:12px">📋 کپی شناسه‌ی دستگاه</button>
      <p style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.6;text-align:center">
        برای تمدید لایسنس، این شناسه رو برای پشتیبانی بفرستید.
      </p>
    </div>

  



        ${(state.business && state.business.bizType !== 'coach') ? `
    <h4 style="font-size:14px;margin-bottom:8px">📢 تبلیغات:</h4>
    <div style="margin-bottom:16px">
      <div id="ads-list" style="margin-bottom:8px"></div>
      <button class="btn-primary" id="add-ad-btn" style="width:100%;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff">➕ تبلیغ جدید</button>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        تبلیغات توی فاکتورها نمایش داده می‌شن. ۲ جایگاه داری: بالا و پایین.
      </p>
    </div>
    ` : ''}

    <h4 style="font-size:14px;margin-bottom:8px">🎂 اسپانسرهای تولد:</h4>
    <div style="margin-bottom:16px">
      <div id="birthday-sponsors-list" style="margin-bottom:8px"></div>
      <button class="btn-primary" id="add-birthday-sponsor-btn" style="width:100%;background:linear-gradient(135deg,#EC4899,#DB2777);color:#fff">➕ اسپانسر جدید</button>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        اسپانسرها توی پیام‌های تبریک تولد نمایش داده می‌شن. ۲ جایگاه داری: بالا و پایین.
      </p>
    </div>

    ${(state.business && state.business.bizType === 'coach') ? `
    <h4 style="font-size:14px;margin-bottom:8px">📋 اسپانسرهای برنامه تمرینی:</h4>
    <div style="margin-bottom:16px">
      <div id="training-sponsors-list" style="margin-bottom:8px"></div>
      <button class="btn-primary" id="add-training-sponsor-btn" style="width:100%;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff">➕ اسپانسر جدید</button>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        اسپانسرها توی برنامه‌های تمرینی نمایش داده می‌شن. ۲ جایگاه داری: بالا و پایین.
      </p>
    </div>
    ` : ''}


    <h4 style="font-size:14px;margin-bottom:8px">📄 فاکتورهای صادرشده:</h4>
    <div style="margin-bottom:16px">
      <div id="issued-invoices-list" style="margin-bottom:8px"></div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        فاکتورهایی که برای تبلیغ‌دهنده‌ها و اسپانسرها صادر کردی.
      </p>
    </div>


    <h4 style="font-size:14px;margin-bottom:8px">🔔 یادآوری ${retTitle} غایب:</h4>    <div style="margin-bottom:16px;padding:14px;background:rgba(59,130,246,0.08);border-radius:12px;border:1px solid rgba(59,130,246,0.2)">
      
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;background:rgba(59,130,246,0.1);border-radius:10px;margin-bottom:12px">
        <input type="checkbox" id="retention-enabled" style="width:18px;height:18px;cursor:pointer">
        <span style="font-size:13px;font-weight:700">فعال باشه</span>
      </label>

      <div class="form-group" style="margin-bottom:12px">
        <label style="font-size:12px">چند روز بعد از آخرین مراجعه خبرم کنی؟</label>
        <input type="number" id="retention-days" value="60" inputmode="numeric" placeholder="مثلاً: 60" style="width:100%">
      </div>

      <div class="form-group" style="margin-bottom:8px">
        <label style="font-size:12px">متن پیام پیش‌فرض:</label>
        <textarea id="retention-message" rows="4" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical"></textarea>
      </div>

      <button class="btn-cancel" id="retention-refresh" style="width:100%;font-size:12px">🔄 نمایش یه جمله‌ی دیگه</button>
    </div>


    <h4 style="font-size:14px;margin-bottom:8px">🎂 تنظیمات تولد:</h4>
    <div style="margin-bottom:16px">
      <div class="form-group" style="margin-bottom:8px">
        <label style="font-size:12px">چند روز قبل از تولد یادآوری کنم؟</label>
        <select id="birthday-reminder-days" style="width:100%">
          <option value="1">۱ روز قبل</option>
          <option value="2">۲ روز قبل</option>
          <option value="3">۳ روز قبل</option>
          <option value="5">۵ روز قبل</option>
          <option value="7">۷ روز قبل (پیش‌فرض)</option>
          <option value="10">۱۰ روز قبل</option>
          <option value="14">۱۴ روز قبل</option>
          <option value="30">۳۰ روز قبل</option>
        </select>
      </div>
      <p style="font-size:11px;color:var(--text-muted);line-height:1.6">
        تولدهایی که توی این بازه هستن، توی لیست «تولدها» و بج داشبورد نمایش داده می‌شن.
      </p>
    </div>



    <h4 style="font-size:14px;margin-bottom:8px">تنظیمات فاکتور:</h4>
    <div style="margin-bottom:16px">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px;background:rgba(20,184,166,0.08);border-radius:10px">
        <input type="checkbox" id="auto-save-invoice-toggle" style="width:18px;height:18px;cursor:pointer">
        <span style="font-size:13px">💾 ذخیره‌ی خودکار فاکتور در گالری</span>
      </label>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        وقتی تیک خورده باشه، هر بار که فاکتور ساخته می‌شه، خودکار توی Downloads ذخیره می‌شه.<br>
        اگه نمی‌خوای فاکتور خودکار ذخیره بشه، تیکش رو بردار. (می‌تونی بعداً دستی فاکتور بسازی)
      </p>
    </div>
    <div style="margin-bottom:16px">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px;background:rgba(20,184,166,0.08);border-radius:10px">
        <input type="checkbox" id="show-prices-toggle" style="width:18px;height:18px;cursor:pointer">
        <span style="font-size:13px">💰 نمایش قیمت‌ها در فاکتور</span>
      </label>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
        اگه تیک نخورده باشه، توی فاکتور فقط شرح خدمات نشون داده می‌شه (بدون قیمت و مجموع).<br>
        مناسب برای کافی‌شاپ و رستوران که نمی‌خوان مشتری قیمت‌ها رو ببینه.
      </p>
    </div>

  ${(state.business && state.business.bizType === 'coach') ? `
    <h4 style="font-size:14px;margin-bottom:8px">🏋️ اسم خطاب (حالت مربی):</h4>
    <div style="margin-bottom:16px">
      <div class="form-group" style="margin-bottom:8px">
        <select id="coach-title-select" style="width:100%"></select>
      </div>
      <p style="font-size:11px;color:var(--text-muted);line-height:1.6">
        این اسم توی کل اپ و فاکتورها استفاده می‌شه.
      </p>
    </div>
  ` : ''}




    <h4 style="font-size:14px;margin-bottom:8px">عنوان خطاب مشتری:</h4>
    <div style="margin-bottom:16px">
      <div class="form-group" style="margin-bottom:8px">
        <select id="customer-title-select" style="width:100%"></select>
      </div>
      <p style="font-size:11px;color:var(--text-muted);line-height:1.6">
        این عنوان توی فاکتورها و متن‌های ارسالی استفاده می‌شه.
      </p>
    </div>
    <h4 style="font-size:14px;margin-bottom:8px">جملات فاکتور:</h4>
    <div style="margin-bottom:16px">
      <div class="form-group" style="margin-bottom:8px">
        <label style="font-size:12px">دسته‌بندی جمله</label>
        <select id="quote-category" style="width:100%">
          <option value="all">🎲 همه (تصادفی)</option>
          <option value="success">💪 موفقیت و انگیزه</option>
          <option value="wisdom">📚 حکمت و شعر</option>
          <option value="kindness">💗 مهربانی</option>
          <option value="business">💼 کسب‌وکار</option>
          <option value="gratitude">🙏 سپاسگزاری</option>
        </select>
      </div>
      <div id="quote-preview" style="background:rgba(20,184,166,0.1);border-radius:10px;padding:12px;font-size:12px;line-height:1.8;text-align:center;font-style:italic;margin-bottom:8px">در حال بارگذاری...</div>
      <button class="btn-cancel" id="quote-refresh" style="width:100%;font-size:12px">🔄 نمایش یه جمله‌ی دیگه</button>
    </div>

    <h4 style="font-size:14px;margin-bottom:8px">رنگ دکمه‌ها:</h4>
    <div id="btn-colors" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px"></div>
    <h4 style="font-size:14px;margin-bottom:8px">رنگ پس‌زمینه:</h4>
    <div id="bg-colors" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px"></div>

<div style="margin-bottom:16px;padding:14px;background:rgba(139,92,246,0.08);border-radius:12px;border:1px solid rgba(139,92,246,0.2)">
  <h4 style="font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
    <span>📷</span>
    <span>عکس پس‌زمینه (اختیاری)</span>
  </h4>
  
  <div id="bg-image-preview" style="margin-bottom:12px;display:none">
    <img id="bg-image-img" src="" style="width:100%;height:120px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color)">
    <div id="bg-image-info" style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:6px"></div>
  </div>

  <input type="file" id="bg-image-input" accept="image/*" hidden>
  
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn-primary" id="bg-image-pick" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;font-size:13px">
      📷 انتخاب عکس از گالری
    </button>
    <button class="btn-cancel" id="bg-image-remove" style="font-size:13px;border-color:#EF4444;color:#EF4444;display:none">
      🗑️ حذف عکس پس‌زمینه
    </button>
  </div>

  <div id="bg-image-options" style="display:none;margin-top:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">📍 محل اعمال عکس:</label>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">
  📍 کجا اعمال بشه؟ <span style="font-weight:400;color:var(--text-muted);font-size:10px">(می‌تونی چند تا رو انتخاب کنی)</span>
</label>
<div style="display:grid;gap:6px;margin-bottom:14px">
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px">
    <input type="checkbox" class="bg-scope-cb" value="dashboard" style="cursor:pointer;accent-color:#8B5CF6;width:16px;height:16px">
    <span>🏠 داشبورد (صفحه اصلی)</span>
  </label>
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px">
    <input type="checkbox" class="bg-scope-cb" value="lock" style="cursor:pointer;accent-color:#8B5CF6;width:16px;height:16px">
    <span>🔒 صفحه قفل</span>
  </label>
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px">
    <input type="checkbox" class="bg-scope-cb" value="setup" style="cursor:pointer;accent-color:#8B5CF6;width:16px;height:16px">
    <span>🔐 صفحه راه‌اندازی</span>
  </label>
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px">
    <input type="checkbox" class="bg-scope-cb" value="invoice" style="cursor:pointer;accent-color:#8B5CF6;width:16px;height:16px">
    <span>🧾 فاکتور</span>
  </label>
</div>

   
  </div>
</div>

    <h4 style="font-size:14px;margin-bottom:8px">پشتیبان‌گیری:</h4>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-cancel" id="backup-export">📤 خروجی گرفتن (JSON)</button>
      <button class="btn-cancel" id="backup-import">📥 بازیابی از فایل</button>
      <input type="file" id="backup-file" accept=".json" hidden>
    </div>

    <h4 style="font-size:14px;margin:16px 0 8px;color:#EF4444">منطقه خطر:</h4>
    <button class="btn-cancel" id="reset-app" style="border-color:#EF4444;color:#EF4444">🗑️ پاک کردن همه‌چیز</button>
    <button class="btn-primary" id="settings-close" style="width:100%;margin-top:16px">بستن</button>
  `);
  const btnColors = ['#14B8A6','#10B981','#22C55E','#84CC16','#E6B325','#D4AF37','#F59E0B','#FACC15','#FB923C','#EA580C','#EF4444','#E63958','#EC4899','#FF6B9D','#8B5CF6','#A855F7','#6366F1','#3B82F6','#00D4FF','#06B6D4','#78716C','#64748B','#1E293B','#0F172A'];
  const bgColors = ['#15161F','#0B0B10','#0F172A','#1E1B4B','#1C1613','#18181B','#0F1A14','#1A1A2E','#16213E','#2D1B2E','#1F2937','#111827','#F7F8FA','#F4EFE7','#EDEFF3','#FAF5FF','#F0FDF4','#FEF3C7','#ECFDF5','#F1F5F9'];
  const renderColorChip = (color, selected, clickHandler) => {
    const el = document.createElement('button');
    el.style.cssText = `width:36px;height:36px;border-radius:50%;border:3px solid ${selected ? '#fff' : 'transparent'};background:${color};cursor:pointer;`;
    el.onclick = clickHandler;
    return el;
  };
  const btnContainer = overlay.querySelector('#btn-colors');
  const bgContainer = overlay.querySelector('#bg-colors');
  btnColors.forEach(color => {
    btnContainer.appendChild(renderColorChip(color, state.business.buttonColor === color, () => {
      state.business.buttonColor = color;
      applyColors(color, state.business.backgroundColor);
      DB.set('business', state.business);
      toast('رنگ دکمه اعمال شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 100);
    }));
  });
  bgColors.forEach(color => {
    bgContainer.appendChild(renderColorChip(color, state.business.backgroundColor === color, () => {
      state.business.backgroundColor = color;
      applyColors(state.business.buttonColor, color);
      DB.set('business', state.business);
      toast('رنگ پس‌زمینه اعمال شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 100);
    }));
  });
  overlay.querySelector('#settings-close').onclick = () => closeModal(overlay);
  overlay.querySelector('#edit-profile').onclick = () => {
    closeModal(overlay);
    setTimeout(openEditProfile, 150);
  };

  // 🔑 نمایش Device ID
  const deviceIdDisplay = overlay.querySelector('#device-id-display');
  if (deviceIdDisplay && typeof getOrCreateDeviceId === 'function') {
    deviceIdDisplay.textContent = getOrCreateDeviceId();
  }
  const copyDeviceIdBtn = overlay.querySelector('#copy-device-id-settings');
  if (copyDeviceIdBtn && typeof getOrCreateDeviceId === 'function') {
    copyDeviceIdBtn.onclick = () => {
      navigator.clipboard.writeText(getOrCreateDeviceId());
      toast('📋 شناسه کپی شد', 'success');
    };
  }

    // 🔔 منطق تنظیمات یادآوری مشتریان غایب
  const retentionEnabled = overlay.querySelector('#retention-enabled');
  const retentionDays = overlay.querySelector('#retention-days');
  const retentionMessage = overlay.querySelector('#retention-message');
  const retentionRefresh = overlay.querySelector('#retention-refresh');

  if (retentionEnabled) {
    // مقدار اولیه
    retentionEnabled.checked = state.business.retentionEnabled === true;
    retentionDays.value = state.business.retentionDays || 60;
    retentionMessage.value = state.business.retentionMessage || '';

    // اگه پیام خالیه، یه جمله‌ی پیش‌فرض از فایل بگیر
    if (!retentionMessage.value) {
      loadRetentionQuotes().then(quotes => {
        if (quotes.length > 0) {
          retentionMessage.value = quotes[0];
        }
      });
    }

    // فعال/غیرفعال
    retentionEnabled.addEventListener('change', function() {
      state.business.retentionEnabled = this.checked;
      DB.set('business', state.business);
      toast(this.checked ? 'یادآوری روشن شد ✅' : 'یادآوری خاموش شد', 'success');
      if (typeof updateRetentionBox === 'function') updateRetentionBox();
    });

    // بازه‌ی روز
    retentionDays.addEventListener('change', function() {
      const val = parseInt(this.value) || 60;
      state.business.retentionDays = val;
      DB.set('business', state.business);
      toast('بازه‌ی یادآوری ذخیره شد ✅', 'success');
      if (typeof updateRetentionBox === 'function') updateRetentionBox();
    });

    // متن پیام
    retentionMessage.addEventListener('change', function() {
      state.business.retentionMessage = this.value.trim();
      DB.set('business', state.business);
      toast('متن پیام ذخیره شد ✅', 'success');
    });

    // جمله‌ی جدید
    retentionRefresh.addEventListener('click', async () => {
      const quotes = await loadRetentionQuotes();
      if (quotes.length === 0) return;
      const randomIdx = Math.floor(Math.random() * quotes.length);
      retentionMessage.value = quotes[randomIdx];
      state.business.retentionMessage = quotes[randomIdx];
      DB.set('business', state.business);
      toast('جمله‌ی جدید اعمال شد ✅', 'success');
    });
  }

  // 🎂 تنظیمات روزهای یادآوری تولد
  const birthdayReminderSelect = overlay.querySelector('#birthday-reminder-days');
  if (birthdayReminderSelect) {
    const currentDays = state.business.birthdayReminderDays || 7;
    birthdayReminderSelect.value = String(currentDays);

    birthdayReminderSelect.addEventListener('change', function() {
      state.business.birthdayReminderDays = parseInt(this.value) || 7;
      DB.set('business', state.business);
      toast('تنظیمات ذخیره شد ✅', 'success');
      updateBirthdayBadge();
    });
  }

  const autoSaveToggle = overlay.querySelector('#auto-save-invoice-toggle');
  const showPricesToggle = overlay.querySelector('#show-prices-toggle');
  if (showPricesToggle) {
    showPricesToggle.checked = state.business.showPricesInInvoice !== false;
    showPricesToggle.addEventListener('change', function() {
      state.business.showPricesInInvoice = this.checked;
      DB.set('business', state.business);
      toast(this.checked ? 'نمایش قیمت‌ها روشن شد ✅' : 'نمایش قیمت‌ها خاموش شد', 'success');
    });
  }
  if (autoSaveToggle) {
    autoSaveToggle.checked = state.business.autoSaveInvoice !== false;
    autoSaveToggle.addEventListener('change', function() {
      state.business.autoSaveInvoice = this.checked;
      DB.set('business', state.business);
      toast(this.checked ? 'ذخیره‌ی خودکار روشن شد ✅' : 'ذخیره‌ی خودکار خاموش شد', 'success');
    });
  }

  renderAdsList(overlay.querySelector('#ads-list'));

    renderBirthdaySponsorsList(overlay.querySelector('#birthday-sponsors-list'));
    
    if (state.business && state.business.bizType === 'coach' && typeof renderTrainingSponsorsList === 'function') {
      renderTrainingSponsorsList(overlay.querySelector('#training-sponsors-list'));
    }
    renderIssuedInvoicesList(overlay.querySelector('#issued-invoices-list'));
  // ==============================
// 🖼️ مدیریت عکس پس‌زمینه
// ==============================
const bgImageInput = overlay.querySelector('#bg-image-input');
const bgImagePick = overlay.querySelector('#bg-image-pick');
const bgImageRemove = overlay.querySelector('#bg-image-remove');
const bgImagePreview = overlay.querySelector('#bg-image-preview');
const bgImageImg = overlay.querySelector('#bg-image-img');
const bgImageInfo = overlay.querySelector('#bg-image-info');
const bgImageOptions = overlay.querySelector('#bg-image-options');


// مقداردهی اولیه
if (state.business.backgroundImage) {
  bgImagePreview.style.display = 'block';
  bgImageImg.src = state.business.backgroundImage;
  bgImageOptions.style.display = 'block';
  bgImageRemove.style.display = 'block';

  const sizeKB = Math.round(state.business.backgroundImage.length / 1024);
  bgImageInfo.textContent = `✅ عکس فعال — حجم: ~${sizeKB} KB`;
}



// انتخاب scope (محل اعمال) — چک‌باکس‌های مستقل
const scopeCheckboxes = overlay.querySelectorAll('.bg-scope-cb');

// مقدار اولیه
let currentScopes = state.business.backgroundImageScopes || ['dashboard', 'lock'];
if (!Array.isArray(currentScopes)) {
  currentScopes = ['dashboard', 'lock'];
}

scopeCheckboxes.forEach(cb => {
  cb.checked = currentScopes.includes(cb.value);
  cb.addEventListener('change', function() {
    const selected = [];
    scopeCheckboxes.forEach(c => {
      if (c.checked) selected.push(c.value);
    });
    state.business.backgroundImageScopes = selected;
    DB.set('business', state.business);
    applyBackgroundImage();
    toast('محل اعمال عکس ذخیره شد ✅', 'success');
  });
});


// انتخاب عکس
if (bgImagePick) {
  bgImagePick.onclick = () => bgImageInput.click();
}

if (bgImageInput) {
  bgImageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast('در حال پردازش عکس...', 'info');

    try {
      const result = await compressBackgroundImage(file);
      
      state.business.backgroundImage = result.dataUrl;
      state.business.backgroundImageSizeKB = result.sizeKB;

      DB.set('business', state.business);

      // آپدیت پیش‌نمایش
      bgImagePreview.style.display = 'block';
      bgImageImg.src = result.dataUrl;
      bgImageInfo.textContent = `✅ عکس جدید اعمال شد — حجم: ~${result.sizeKB} KB`;
      bgImageOptions.style.display = 'block';
      bgImageRemove.style.display = 'block';

      applyBackgroundImage();
      toast(`عکس اعمال شد ✅ (${result.sizeKB} KB)`, 'success');
    } catch (err) {
      console.error(err);
      toast('خطا در پردازش عکس', 'error');
    }
  };
}

// حذف عکس
if (bgImageRemove) {
  bgImageRemove.onclick = () => {
    if (!confirm('عکس پس‌زمینه حذف بشه؟')) return;
    
    state.business.backgroundImage = null;
    DB.set('business', state.business);
    
    // برگردوندن رنگ قبلی
    applyColors(state.business.buttonColor, state.business.backgroundColor);
    
    bgImagePreview.style.display = 'none';
    bgImageOptions.style.display = 'none';
    bgImageRemove.style.display = 'none';
    bgImageInput.value = '';
    
    toast('عکس پس‌زمینه حذف شد ✅', 'success');
  };
}
    const addAdBtn = overlay.querySelector('#add-ad-btn');
  if (addAdBtn) {
    addAdBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openAdForm(), 200);
    };
  }

    const addBirthdaySponsorBtn = overlay.querySelector('#add-birthday-sponsor-btn');
  if (addBirthdaySponsorBtn) {
    addBirthdaySponsorBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openBirthdaySponsorForm(), 200);
    };
  }


  // 📋 اسپانسر برنامه تمرینی
  const addTrainingSponsorBtn = overlay.querySelector('#add-training-sponsor-btn');
  if (addTrainingSponsorBtn) {
    addTrainingSponsorBtn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => {
        if (typeof openTrainingSponsorForm === 'function') {
          openTrainingSponsorForm();
        } else {
          toast('تابع اسپانسر برنامه تمرینی لود نشده', 'error');
        }
      }, 200);
    };
  }
 
  const titleSelect = overlay.querySelector('#customer-title-select');
  if (titleSelect) {
    const titles = getCustomerTitleOptions();
    const currentTitle = getCustomerTitle();
    titleSelect.innerHTML = titles.map(t =>
      `<option value="${t.value}" ${t.value === currentTitle ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    titleSelect.addEventListener('change', function() {
      const newTitle = this.value;
      if (!state.business) state.business = {};
      state.business.customerTitle = newTitle;
      DB.set('business', state.business);

      const labelCustomer = document.getElementById('label-add-customer');
      if (labelCustomer) {
        const shortTitle = newTitle.replace(' گرامی', '');
        labelCustomer.textContent = 'ثبت ' + shortTitle;
      }

      toast('عنوان ذخیره شد: ' + newTitle, 'success');
    });
  }

  // 🏋️ دراپ‌دان اسم خطاب مربی
  const coachTitleSelect = overlay.querySelector('#coach-title-select');
  if (coachTitleSelect && state.business.bizType === 'coach') {
    const coachOptions = getCoachTitleOptions();
    const currentCoachTitle = getCoachCustomerTitle();
    coachTitleSelect.innerHTML = coachOptions.map(o =>
      `<option value="${o.value}" ${o.value === currentCoachTitle ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    coachTitleSelect.addEventListener('change', function() {
      state.business.customerTitle = this.value;
      DB.set('business', state.business);
      toast('اسم خطاب ذخیره شد: ' + this.value, 'success');
      const labelCustomer = document.getElementById('label-add-customer');
      if (labelCustomer) {
        labelCustomer.textContent = 'ثبت ' + this.value;
      }
    });
  }


  const quoteCatSelect = overlay.querySelector('#quote-category');
  const quotePreview = overlay.querySelector('#quote-preview');
  const quoteRefreshBtn = overlay.querySelector('#quote-refresh');
  if (quoteCatSelect) quoteCatSelect.value = state.business.quoteCategory || 'all';
  const updateQuotePreview = async () => {
    if (!quotePreview) return;
    quotePreview.textContent = 'در حال بارگذاری...';
    const quote = await getRandomQuote(quoteCatSelect ? quoteCatSelect.value : 'all');
    quotePreview.textContent = `«${quote}»`;
  };
  updateQuotePreview();
  if (quoteCatSelect) {
    quoteCatSelect.onchange = () => {
      state.business.quoteCategory = quoteCatSelect.value;
      DB.set('business', state.business);
      updateQuotePreview();
      toast('دسته ذخیره شد ✅', 'success');
    };
  }
  if (quoteRefreshBtn) quoteRefreshBtn.onclick = updateQuotePreview;

  overlay.querySelector('#backup-export').onclick = () => exportBackupFile();
  overlay.querySelector('#backup-import').onclick = () => overlay.querySelector('#backup-file').click();
  overlay.querySelector('#backup-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.business || !data.customers) throw new Error('فایل نامعتبر');
        state.business = data.business;
        state.customers = data.customers;
        state.birthdayMessages = data.birthdayMessages || {};
        DB.set('business', state.business);
        DB.set('customers', state.customers);
        DB.set('birthdayMessages', state.birthdayMessages);
        toast('اطلاعات بازیابی شد ✅', 'success');
        closeModal(overlay);
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        toast('فایل بکاپ نامعتبر است!', 'error');
      }
    };
    reader.readAsText(file);
  };
  overlay.querySelector('#reset-app').onclick = () => {
    closeModal(overlay);
    setTimeout(openResetDialog, 200);
  };
}

// ==============================
// خروجی بکاپ
// ==============================
function exportBackupFile() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    business: state.business,
    customers: state.customers,
    birthdayMessages: state.birthdayMessages,
    ads: getAds(),
    pendingInvoices: getPendingInvoices(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cheshmak-backup-${getTodayShamsi().replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('فایل پشتیبان ساخته شد ✅', 'success');
}

// ==============================
// اعمال رنگ‌ها
// ==============================
// ==============================
// 🎨 اعمال رنگ‌ها و عکس پس‌زمینه
// ==============================
function applyColors(btnColor, bgColor) {
  document.documentElement.style.setProperty('--button-color', btnColor);
  document.documentElement.style.setProperty('--background-color', bgColor);
  document.documentElement.style.setProperty('--text-on-button', bestTextOn(btnColor));

  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isDark = brightness < 128;

  document.documentElement.style.setProperty('--surface-color', isDark ? '#1F2130' : '#FFFFFF');
  document.documentElement.style.setProperty('--text-color', isDark ? '#FFFFFF' : '#000000');
  document.documentElement.style.setProperty('--text-muted', isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)');
  document.documentElement.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', bgColor);

  // 🔥 اعمال عکس پس‌زمینه (اگه وجود داشته باشه)
  applyBackgroundImage();
}

// ==============================
// 🖼️ اعمال عکس پس‌زمینه به صفحات مختلف
// ==============================
function applyBackgroundImage() {
  const b = state.business;
 

  // حذف استایل‌های قبلی از همه‌ی صفحات
  document.querySelectorAll('.screen').forEach(s => {
    s.style.backgroundImage = '';
    s.style.backgroundSize = '';
    s.style.backgroundPosition = '';
    s.style.backgroundRepeat = '';
    s.style.backgroundAttachment = '';
  });

  if (!b || !b.backgroundImage) return;

  // 🔥 پشتیبانی از هر دو فرمت (قدیمی: scope، جدید: scopes)
let scopes = b.backgroundImageScopes;
if (!Array.isArray(scopes)) {
  // مهاجرت از فرمت قدیمی
  const oldScope = b.backgroundImageScope || 'all';
  if (oldScope === 'dashboard') scopes = ['dashboard'];
  else if (oldScope === 'lock') scopes = ['lock'];
  else if (oldScope === 'all') scopes = ['dashboard', 'lock', 'setup'];
  else if (oldScope === 'all+invoice') scopes = ['dashboard', 'lock', 'setup', 'invoice'];
  else scopes = ['dashboard', 'lock'];
  b.backgroundImageScopes = scopes;
}


  // 🔥 نگاشت scope به screen id
const scopeToScreenMap = {
  'dashboard': 'dashboard-screen',
  'lock': 'lock-screen',
  'setup': 'setup-screen',
  // 'invoice' اینجا نیست چون فاکتور modal هست، جدا هندل می‌شه
};

const screensToStyle = scopes
  .filter(s => s !== 'invoice') // فاکتور جدا هندل می‌شه
  .map(s => scopeToScreenMap[s])
  .filter(Boolean);
  // 🔥 شفافیت متفاوت برای هر صفحه (حرفه‌ای‌تر)
  screensToStyle.forEach(screenId => {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  screen.style.backgroundImage = `url(${b.backgroundImage})`;
  screen.style.backgroundSize = 'cover';
  screen.style.backgroundPosition = 'center';
  screen.style.backgroundRepeat = 'no-repeat';
  screen.style.backgroundAttachment = 'fixed';
  screen.style.position = 'relative';
});
 
}

// ==============================
// شروع اپ
// ==============================
function init() {
  const savedBusiness = DB.get('business');
  const savedCustomers = DB.get('customers', []);
  const savedMessages = DB.get('birthdayMessages', {});

  state.customers = savedCustomers;
  state.birthdayMessages = savedMessages;

  if (!DB.get('pendingInvoices')) {
    DB.set('pendingInvoices', []);
  }
  if (!DB.get('ads')) {
    DB.set('ads', []);
  }

  if (savedBusiness) {
    state.business = savedBusiness;
    state.business.backgroundImage = state.business.backgroundImage || null;
    state.business.backgroundImageScope = state.business.backgroundImageScope || 'all';
    state.business.backgroundImageOpacity = state.business.backgroundImageOpacity || 65;
    state.business.backgroundTextColor = state.business.backgroundTextColor || 'auto';
    applyColors(savedBusiness.buttonColor || '#14B8A6', savedBusiness.backgroundColor || '#15161F');
    showScreen('lock-screen');
    initLockScreen();
  } else {
    showScreen('setup-screen');
    initSetupScreen();
  }
    // 🌊 مخفی کردن Splash بعد از init
  setTimeout(hideSplashScreen, 1500);
}

// ==============================
// PDF: فونت وزیرمتن
// ==============================
// 🔥 تبدیل اعداد به فارسی
function toFaDigits(input) {
  if (input === null || input === undefined) return '';
  const faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(input).replace(/\d/g, d => faDigits[+d]);
}

function faNum(n) {
  if (n === null || n === undefined || n === '') return '';
  return toFaDigits(n);
}

let _vazirFontBase64 = null;
let _vazirFontFailed = false; // 🔥 جلوگیری از تلاش مکرر

async function loadVazirFontForPdf() {
  if (_vazirFontBase64) return _vazirFontBase64;
  if (_vazirFontFailed) return null;
  const fontUrl = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Regular.ttf';
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    _vazirFontBase64 = btoa(binary);
    return _vazirFontBase64;
  } catch (e) {
    console.error('خطا در بارگذاری فونت:', e);
    _vazirFontFailed = true; // 🔥 علامت‌گذاری شکست
    return null;
  }
}

// ==============================
// PDF مشتریان
// ==============================
async function generateCustomersPdf() {
  if (state.customers.length === 0) { toast('هنوز مشتری‌ای ثبت نشده است', 'error'); return; }
  toast('در حال آماده‌سازی فایل...', 'info');
  const { jsPDF } = window.jspdf;
  const fontBase64 = await loadVazirFontForPdf();
  if (!fontBase64) { toast('خطا در بارگذاری فونت', 'error'); return; }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Vazirmatn-Regular.ttf', fontBase64);
  doc.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
  doc.setFont('Vazirmatn');
  doc.setFontSize(18);
  doc.text('لیست مشتریان', 105, 15, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`کسب‌وکار: ${state.business.name}`, 105, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`تاریخ تهیه گزارش: ${getTodayShamsi()}`, 105, 30, { align: 'center' });
  const tableData = state.customers.map((c, i) => {
    const totalIncome = (c.history || []).reduce((sum, h) => sum + h.cost, 0);
    return [faNum(i + 1), c.fullName, c.phone1, c.phone2 || '—', c.birthDate || '—', c.lastVisit || '—', faNum(totalIncome.toLocaleString())];
  });
  doc.autoTable({
    startY: 36,
    head: [['#', 'نام و نام خانوادگی', 'موبایل ۱', 'موبایل ۲', 'تاریخ تولد', 'آخرین مراجعه', 'کل درآمد (تومان)']],
    body: tableData,
    styles: { font: 'Vazirmatn', fontSize: 9, halign: 'right', cellPadding: 2 },
    headStyles: { font: 'Vazirmatn', fillColor: [20, 184, 166], textColor: [255, 255, 255], halign: 'right', fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 36, right: 10, left: 10, bottom: 15 },
  });
  const fileName = `مشتریان-${getTodayShamsi().replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  toast('فایل PDF مشتریان آماده شد ✅', 'success');
}

// ==============================
// PDF گزارش مالی
// ==============================
async function generateFinancialPdf(fromDate = null, toDate = null, rangeLabel = 'همه') {
  const { jsPDF } = window.jspdf;
  toast('در حال آماده‌سازی فایل...', 'info');
  const fontBase64 = await loadVazirFontForPdf();
  if (!fontBase64) { toast('خطا در بارگذاری فونت', 'error'); return; }
  const allLogs = [];
  state.customers.forEach(c => {
    (c.history || []).forEach(h => allLogs.push({ ...h, customerName: c.fullName }));
  });
  let filteredLogs = allLogs;
  if (fromDate && toDate) {
    const fromNum = shamsiToNumber(fromDate);
    const toNum = shamsiToNumber(toDate);
    filteredLogs = allLogs.filter(h => {
      const n = shamsiToNumber(h.dateShamsi);
      return n >= fromNum && n <= toNum;
    });
  }
  const totalIncome = filteredLogs.reduce((sum, h) => sum + h.cost, 0);
  const dailyIncome = {};
  filteredLogs.forEach(h => {
    if (!dailyIncome[h.dateShamsi]) dailyIncome[h.dateShamsi] = { total: 0, count: 0 };
    dailyIncome[h.dateShamsi].total += h.cost;
    dailyIncome[h.dateShamsi].count++;
  });
  let bestDay = null, bestIncome = -1;
  let worstDay = null, worstIncome = Infinity;
  Object.entries(dailyIncome).forEach(([day, data]) => {
    if (data.total > bestIncome) { bestIncome = data.total; bestDay = day; }
    if (data.total < worstIncome) { worstIncome = data.total; worstDay = day; }
  });
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Vazirmatn-Regular.ttf', fontBase64);
  doc.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
  doc.setFont('Vazirmatn');
  doc.setFontSize(18);
  doc.text('گزارش مالی', 105, 15, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`کسب‌وکار: ${state.business.name}`, 105, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`تاریخ: ${getTodayShamsi()}`, 105, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`بازه‌ی گزارش: ${rangeLabel}`, 105, 38, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(20, 184, 166);
  doc.text(`مجموع درآمد: ${totalIncome.toLocaleString()} تومان`, 105, 46, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`تعداد خدمات: ${filteredLogs.length} مورد`, 105, 53, { align: 'center' });
  if (bestDay) {
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`بیشترین: ${bestDay} → ${bestIncome.toLocaleString()}`, 105, 61, { align: 'center' });
    doc.setTextColor(239, 68, 68);
    doc.text(`کمترین: ${worstDay} → ${worstIncome.toLocaleString()}`, 105, 67, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
  const dailyRows = Object.entries(dailyIncome)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, data]) => [day, faNum(data.count), faNum(data.total.toLocaleString())]);
  doc.autoTable({
    startY: 73,
    head: [['تاریخ', 'تعداد خدمات', 'مبلغ دریافتی (تومان)']],
    body: dailyRows,
    styles: { font: 'Vazirmatn', fontSize: 9, halign: 'right', cellPadding: 2 },
    headStyles: { font: 'Vazirmatn', fillColor: [20, 184, 166], textColor: [255, 255, 255], halign: 'right' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 73, right: 10, left: 10, bottom: 15 },
  });
  if (filteredLogs.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('ریز خدمات', 105, 15, { align: 'center' });
    const detailRows = filteredLogs
      .slice()
      .sort((a, b) => b.dateShamsi.localeCompare(a.dateShamsi))
      .map(h => [
        h.dateShamsi,
        h.customerName,
        h.serviceName.length > 30 ? h.serviceName.substring(0, 30) + '...' : h.serviceName,
        faNum(h.cost.toLocaleString()),
      ]);
    doc.autoTable({
      startY: 22,
      head: [['تاریخ', 'مشتری', 'نوع خدمت', 'مبلغ (تومان)']],
      body: detailRows,
      styles: { font: 'Vazirmatn', fontSize: 8, halign: 'right', cellPadding: 2 },
      headStyles: { font: 'Vazirmatn', fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'right' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 22, right: 10, left: 10, bottom: 15 },
      columnStyles: { 2: { cellWidth: 60 } },
    });
  }
  const fileName = `گزارش-مالی-${getTodayShamsi().replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  toast('فایل PDF گزارش مالی آماده شد ✅', 'success');
}

// ==============================
// ریست
// ==============================
function openResetDialog() {
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  const overlay = showModal(`
    <h3 class="modal-title" style="color:#EF4444">🗑️ پاک کردن همه‌چیز</h3>
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px;margin-bottom:16px">
      <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">با این کار تمام اطلاعات کسب‌وکار شما<br>برای همیشه پاک خواهند شد.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn-primary" id="rst-backup" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff">📥 بکاپ می‌گیرم</button>
      <button class="btn-cancel" id="rst-cancel">انصراف</button>
      <button class="btn-cancel" id="rst-confirm" style="border-color:#EF4444;color:#EF4444;font-weight:700">⚠️ بدون بکاپ پاک کن</button>
    </div>
  `);
  overlay.querySelector('#rst-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#rst-backup').onclick = () => { closeModal(overlay); setTimeout(() => openBackupBeforeReset(), 150); };
  overlay.querySelector('#rst-confirm').onclick = () => { closeModal(overlay); setTimeout(() => openFinalResetWarning(), 150); };
}

function openBackupBeforeReset() {
  const overlay = showModal(`
    <h3 class="modal-title">تهیه‌ی نسخه‌ی پشتیبان</h3>
    <p style="font-size:13px;line-height:1.9;text-align:center;margin-bottom:16px;color:var(--text-muted)">هر سه نسخه توصیه می‌شود.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn-cancel" id="bk-customers" style="text-align:right;padding:14px"><div style="font-weight:700;margin-bottom:4px">📄 فایل PDF لیست مشتریان</div></button>
      <button class="btn-cancel" id="bk-financial" style="text-align:right;padding:14px"><div style="font-weight:700;margin-bottom:4px">📊 فایل PDF گزارش مالی</div></button>
      <button class="btn-cancel" id="bk-json" style="text-align:right;padding:14px"><div style="font-weight:700;margin-bottom:4px">💾 فایل بکاپ کامل (JSON)</div></button>
    </div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn-cancel" id="bk-close" style="flex:1">بستن</button>
      <button class="btn-primary" id="bk-continue" style="flex:1;background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">ادامه و پاک کردن</button>
    </div>
  `);
  overlay.querySelector('#bk-close').onclick = () => closeModal(overlay);
  overlay.querySelector('#bk-customers').onclick = () => generateCustomersPdf();
  overlay.querySelector('#bk-financial').onclick = () => generateFinancialPdf();
  overlay.querySelector('#bk-json').onclick = () => exportBackupFile();
  overlay.querySelector('#bk-continue').onclick = () => { closeModal(overlay); setTimeout(() => openFinalResetWarning(), 150); };
}

function openFinalResetWarning() {
  const overlay = showModal(`
    <h3 class="modal-title" style="color:#EF4444">🚨 هشدار نهایی</h3>
    <div style="background:rgba(239,68,68,0.15);border:2px solid #EF4444;border-radius:12px;padding:16px;margin-bottom:16px">
      <p style="font-size:14px;line-height:1.9;margin:0;text-align:center;font-weight:600">شما در حال پاک کردن تمام اطلاعات هستید.</p>
    </div>
    <p style="font-size:13px;text-align:center;margin-bottom:16px">مطمئنید؟</p>
    <div style="display:flex;gap:8px">
      <button class="btn-cancel" id="fw-cancel" style="flex:1">انصراف</button>
      <button class="btn-primary" id="fw-confirm" style="flex:1;background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">بله، پاک شود</button>
    </div>
  `, { center: true });
  overlay.querySelector('#fw-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#fw-confirm').onclick = () => {
    DB.clearAll();
    closeModal(overlay);
    toast('تمام اطلاعات پاک شد', 'success');
    setTimeout(() => location.reload(), 800);
  };
}

// ==============================
// بازیابی
// ==============================
function openRestoreDialog(fromLockScreen = false) {
  const overlay = showModal(`
    <h3 class="modal-title">📥 بازیابی از فایل پشتیبان</h3>
    <div style="background:rgba(20,184,166,0.1);border:1px solid rgba(20,184,166,0.3);border-radius:12px;padding:14px;margin-bottom:16px">
      <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">یک فایل پشتیبان (JSON) انتخاب کنید.</p>
    </div>
    <input type="file" id="restore-file" accept=".json,.cheshmak" hidden>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn-primary" id="restore-pick">📂 انتخاب فایل</button>
      <button class="btn-cancel" id="restore-cancel">انصراف</button>
    </div>
  `, { center: true });
  const fileInput = overlay.querySelector('#restore-file');
  overlay.querySelector('#restore-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#restore-pick').onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
        reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        
        // 🔥 اعتبارسنجی فایل بکاپ
        if (!data.business || typeof data.business !== 'object') {
          toast('فایل نامعتبر است: اطلاعات کسب‌وکار یافت نشد', 'error');
          return;
        }
        if (!Array.isArray(data.customers)) {
          toast('فایل نامعتبر است: لیست مشتریان باید آرایه باشد', 'error');
          return;
        }
        if (data.customers.length > 0 && !data.customers[0].fullName) {
          toast('فایل نامعتبر است: ساختار مشتریان اشتباه است', 'error');
          return;
        }

        closeModal(overlay);
        setTimeout(() => openRestorePreview(data), 150);
      } catch (err) {
        toast('خطا در خواندن فایل! فایل JSON معتبر نیست.', 'error');
      }
    };
    reader.readAsText(file);
  };
}

function openRestorePreview(data) {
  const customerCount = (data.customers || []).length;
  let totalIncome = 0;
  (data.customers || []).forEach(c => {
    (c.history || []).forEach(h => { totalIncome += h.cost || 0; });
  });
  const overlay = showModal(`
    <h3 class="modal-title">📋 پیش‌نمایش</h3>
    <div style="background:rgba(20,184,166,0.1);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="display:grid;gap:10px;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span>نام:</span><strong>${escapeHtml(data.business?.name || '—')}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>مشتریان:</span><strong>${customerCount} نفر</strong></div>
        <div style="display:flex;justify-content:space-between"><span>مجموع درآمد:</span><strong>${totalIncome.toLocaleString()}</strong></div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-cancel" id="rp-cancel" style="flex:1">انصراف</button>
      <button class="btn-primary" id="rp-confirm" style="flex:1">بازیابی کن</button>
    </div>
  `, { center: true });
  overlay.querySelector('#rp-cancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#rp-confirm').onclick = () => {
// 🔥 حفظ اطلاعات لایسنس موقع بازیابی
const savedDeviceId = DB.get('deviceId');
const savedLicenseStart = DB.get('licenseStart');
const savedLicenseEnd = DB.get('licenseEnd');

// 🔥 برگرداندن اطلاعات لایسنس
if (savedDeviceId) DB.set('deviceId', savedDeviceId);
if (savedLicenseStart) DB.set('licenseStart', savedLicenseStart);
if (savedLicenseEnd) DB.set('licenseEnd', savedLicenseEnd);    DB.set('business', data.business);
    DB.set('customers', data.customers || []);
    DB.set('birthdayMessages', data.birthdayMessages || {});
    if (data.ads) DB.set('ads', data.ads);
    if (data.pendingInvoices) DB.set('pendingInvoices', data.pendingInvoices);
    toast('اطلاعات بازیابی شد ✅', 'success');
    closeModal(overlay);
    setTimeout(() => location.reload(), 800);
  };
}

// ==============================
// 📖 جملات زیبا
// ==============================
let _quotesCache = null;
async function loadQuotes() {
  if (_quotesCache) return _quotesCache;
  try {
    const response = await fetch('./data/quotes.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    _quotesCache = await response.json();
    return _quotesCache;
  } catch (e) {
    console.error('خطا در بارگذاری جملات:', e);
    _quotesCache = {
      success: ['موفقیت، جمع کارهای کوچک است.'],
      wisdom: ['به نام آن که جان را فکرت آموخت.'],
      kindness: ['مهربانی، زبانی است که همه می‌فهمند.'],
      business: ['مشتری، پادشاه است.'],
      gratitude: ['سپاسگزاری، کلید خوشبختی است.']
    };
    return _quotesCache;
  }
}

async function getRandomQuote(category = 'all') {
  const quotes = await loadQuotes();
  let pool = [];
  if (category === 'all') {
    Object.values(quotes).forEach(arr => { pool = pool.concat(arr); });
  } else if (quotes[category]) {
    pool = quotes[category];
  } else {
    Object.values(quotes).forEach(arr => { pool = pool.concat(arr); });
  }
  if (pool.length === 0) return '';
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ==============================
// 🎂 جمله‌ی رندوم تولد
// ==============================
let _birthdayQuotesCache = null;
async function loadBirthdayQuotes() {
  if (_birthdayQuotesCache) return _birthdayQuotesCache;
  try {
    const response = await fetch('./data/birthday-quotes.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    _birthdayQuotesCache = data.birthdayQuotes || [];
    return _birthdayQuotesCache;
  } catch (e) {
    console.error('خطا در بارگذاری جملات تولد:', e);
    _birthdayQuotesCache = [
      'تولدت مبارک! امیدوارم سالی پر از شادی داشته باشی 🎂',
      'بهترین آرزوها برای سال جدید زندگیت 💫',
    ];
    return _birthdayQuotesCache;
  }
}

async function getRandomBirthdayQuote() {
  const quotes = await loadBirthdayQuotes();
  if (quotes.length === 0) return '';
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

// ==============================
// 💤 جملات یادآوری مشتریان غایب
// ==============================
let _retentionQuotesCache = null;
async function loadRetentionQuotes() {
  if (_retentionQuotesCache) return _retentionQuotesCache;
  try {
    const response = await fetch('./data/retention-quotes.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    _retentionQuotesCache = data.retentionQuotes || [];
    return _retentionQuotesCache;
  } catch (e) {
    console.error('خطا در بارگذاری جملات یادآوری:', e);
    _retentionQuotesCache = [
      'شما انسان فوق‌العاده‌ای هستید و به همین دلیل ما به یاد شما هستیم 🌸',
      'همیشه خوشحالیم که شما را در کنار خود داریم 💫',
    ];
    return _retentionQuotesCache;
  }
}

async function getRandomRetentionQuote() {
  const quotes = await loadRetentionQuotes();
  if (quotes.length === 0) return '';
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

// ==============================
// 💤 محاسبه‌ی مشتریان غایب
// ==============================
function getAbsentCustomers() {
  const b = state.business;
  if (!b || !b.retentionEnabled) return [];

  const retentionDays = parseInt(b.retentionDays) || 60;
  const todayNum = shamsiToNumber(getTodayShamsi());
  const todayFull = getTodayShamsi();

  const absentList = [];

  state.customers.forEach(c => {
    // اگه مشتری هیچ سابقه‌ای نداره، نادیده بگیر
    if (!c.history || c.history.length === 0) return;

    // آخرین تاریخ مراجعه
    const lastDate = c.lastVisit || c.history[c.history.length - 1].dateShamsi;
    if (!lastDate) return;

    const lastNum = shamsiToNumber(lastDate);
    if (lastNum === 0) return;

    // تعداد روزهای غیبت
    const daysAbsent = daysBetweenShamsi(lastDate, todayFull);
    if (daysAbsent === null) return;

    // اگه کمتر از بازه باشه، یعنی هنوز غایب نیست
    if (daysAbsent <= retentionDays) return;

    // اضافه‌بار غیبت (چقدر بیشتر از بازه)
    const extraDays = daysAbsent - retentionDays;

    // تعیین شدت
    let severity = 'warning';  // 🟡
    let severityLabel = 'هشدار';
    let severityColor = '#F59E0B';
    if (extraDays > 60) {
      severity = 'critical';
      severityLabel = 'بحرانی';
      severityColor = '#EF4444';
    } else if (extraDays > 30) {
      severity = 'concern';
      severityLabel = 'نگران‌کننده';
      severityColor = '#FB923C';
    }

    absentList.push({
      customer: c,
      daysAbsent,
      extraDays,
      retentionDays,
      severity,
      severityLabel,
      severityColor,
      lastVisit: lastDate,
    });
  });

  // مرتب‌سازی: بحرانی‌تر اول
  absentList.sort((a, b) => b.daysAbsent - a.daysAbsent);

  return absentList;
}

// ==============================
// 📅 محاسبه‌ی تعداد روز بین دو تاریخ شمسی
// ==============================
function daysBetweenShamsi(fromShamsi, toShamsi) {
  if (!fromShamsi || !toShamsi) return null;
  const fromParts = fromShamsi.split('/');
  const toParts = toShamsi.split('/');
  if (fromParts.length !== 3 || toParts.length !== 3) return null;

  const fy = parseInt(fromParts[0]);
  const fm = parseInt(fromParts[1]);
  const fd = parseInt(fromParts[2]);
  const ty = parseInt(toParts[0]);
  const tm = parseInt(toParts[1]);
  const td = parseInt(toParts[2]);

  if (isNaN(fy) || isNaN(fm) || isNaN(fd) || isNaN(ty) || isNaN(tm) || isNaN(td)) return null;

  // تابع تبدیل تاریخ شمسی به شماره‌ی روز مطلق
  const toAbsoluteDays = (y, m, d) => {
    let total = 0;
    // تعداد روزهای سال‌های قبل
    for (let i = 1300; i < y; i++) total += isShamsiLeapYear(i) ? 366 : 365;
    // تعداد روزهای ماه‌های قبل
    for (let i = 1; i < m; i++) total += shamsiMonthDays(y, i);
    total += d;
    return total;
  };

  const fromNum = toAbsoluteDays(fy, fm, fd);
  const toNum = toAbsoluteDays(ty, tm, td);

  return toNum - fromNum;
}


// ==============================
// 🎨 ایموجی و رنگ شدت غیبت
// ==============================
function getSeverityIcon(severity) {
  if (severity === 'critical') return '🔴';
  if (severity === 'concern') return '🟠';
  return '🟡';
}

// ==============================
// 💤 آپدیت باکس یادآوری مشتریان غایب
// ==============================
function updateRetentionBox() {
  const box = document.getElementById('retention-box');
  if (!box) return;

  const b = state.business;
  if (!b || !b.retentionEnabled) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const absentList = getAbsentCustomers();

  if (absentList.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const customerTitle = getCustomerTitle();
  const shortTitle = customerTitle.replace(' گرامی', '');

  // ۵ مشتری اول
  const topFive = absentList.slice(0, 5);

  const listHtml = topFive.map(item => {
    const c = item.customer;
    const icon = getSeverityIcon(item.severity);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(59,130,246,0.06);border-radius:10px;margin-bottom:8px">
        <div style="font-size:20px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.fullName)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${item.daysAbsent} روز غیبت</div>
        </div>
        <button class="btn-primary" style="padding:6px 10px;font-size:11px;width:auto;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff" data-retention-msg="${c.id}">📱 پیام</button>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04));border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">💤</span>
          <span style="font-size:14px;font-weight:700;color:#3B82F6">یادآوری ${shortTitle} غایب</span>
        </div>
        <span style="background:#3B82F6;color:#fff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;min-width:22px;text-align:center">${absentList.length}</span>
      </div>
      ${listHtml}
      ${absentList.length > 5 ? `
<button class="btn-cancel" id="retention-view-all" style="width:100%;font-size:12px;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:5px"><img src="assets/icon-192.png" style="width:16px;height:16px;border-radius:50%"> مشاهده‌ی همه (${absentList.length})</button>      ` : ''}
    </div>
  `;

  box.style.display = 'block';

  // دکمه‌های پیام
  box.querySelectorAll('[data-retention-msg]').forEach(btn => {
    btn.onclick = () => openRetentionMessageForm(btn.dataset.retentionMsg);
  });

  // دکمه‌ی مشاهده‌ی همه
  const viewAllBtn = box.querySelector('#retention-view-all');
  if (viewAllBtn) {
    viewAllBtn.onclick = () => openAllAbsentCustomersModal(absentList);
  }
}

// ==============================
// 💤 مودال لیست کامل مشتریان غایب
// ==============================
function openAllAbsentCustomersModal(absentList) {
  if (!absentList || absentList.length === 0) {
    toast('مشتری غایبی وجود نداره', 'info');
    return;
  }

  const customerTitle = getCustomerTitle();
  const shortTitle = customerTitle.replace(' گرامی', '');

  const listHtml = absentList.map(item => {
    const c = item.customer;
    const icon = getSeverityIcon(item.severity);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:8px">
        <div style="font-size:22px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700">${escapeHtml(c.fullName)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px;line-height:1.6">
            📅 آخرین مراجعه: ${item.lastVisit}<br>
            💤 ${item.daysAbsent} روز غیبت
            <span style="color:${item.severityColor};font-weight:700"> (${item.severityLabel})</span>
          </div>
        </div>
        <button class="btn-primary" style="padding:7px 12px;font-size:11px;width:auto;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff" data-retention-msg-all="${c.id}">📱 پیام</button>
      </div>
    `;
  }).join('');

  const overlay = showModal(`
    <h3 class="modal-title">💤 یادآوری ${shortTitle} غایب (${absentList.length})</h3>
    <div style="max-height:420px;overflow-y:auto;margin-bottom:16px">
      ${listHtml}
    </div>
    <button class="btn-cancel" id="absent-all-close" style="width:100%">بستن</button>
  `);

  overlay.querySelector('#absent-all-close').onclick = () => closeModal(overlay);

  overlay.querySelectorAll('[data-retention-msg-all]').forEach(btn => {
    btn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openRetentionMessageForm(btn.dataset.retentionMsgAll), 200);
    };
  });
}

// ==============================
// 💤 فرم ارسال پیام به مشتری غایب
// ==============================
async function openRetentionMessageForm(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('مشتری پیدا نشد', 'error');
    return;
  }

  const b = state.business;
  const absentList = getAbsentCustomers();
  const absentItem = absentList.find(item => item.customer.id === customerId);

  if (!absentItem) {
    toast('این مشتری الان غایب نیست', 'info');
    return;
  }

  // متن پیش‌فرض: اول پیام ذخیره‌شده برای این مشتری، بعد پیام تنظیمات، بعد یه جمله‌ی رندوم
  const savedMessage = b.retentionMessages && b.retentionMessages[customerId];
  let defaultText = savedMessage || b.retentionMessage || '';

  if (!defaultText) {
    defaultText = await getRandomRetentionQuote();
  }

  // اگه متن پیام شامل placeholder باشه، جایگزین کن
  const buildMessage = (text) => {
    return text
      .replace(/\{name\}/g, c.fullName)
      .replace(/\{customerTitle\}/g, getCustomerTitle())
      .replace(/\{businessName\}/g, b.name || '')
      .replace(/\{days\}/g, absentItem.daysAbsent)
      .replace(/\{lastVisit\}/g, absentItem.lastVisit);
  };

  const overlay = showModal(`
    <h3 class="modal-title">📱 ارسال پیام به ${escapeHtml(c.fullName)}</h3>

    <!-- اطلاعات مشتری -->
    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:24px">${getSeverityIcon(absentItem.severity)}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${escapeHtml(c.fullName)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">📞 ${escapeHtml(c.phone1)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);line-height:1.8">
        <span>📅 آخرین مراجعه: ${absentItem.lastVisit}</span>
        <span style="color:${absentItem.severityColor};font-weight:700">💤 ${absentItem.daysAbsent} روز غیبت (${absentItem.severityLabel})</span>
      </div>
    </div>

    <!-- متن پیام -->
    <div class="form-group">
      <label style="font-size:12px">متن پیام (قابل ویرایش):</label>
      <textarea id="retention-msg-text" rows="6" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical">${escapeHtml(buildMessage(defaultText))}</textarea>
    </div>

    <!-- دکمه‌های ابزار -->
    <div style="display:flex;justify-content:space-around;margin-top:14px">
      <button class="btn-icon" id="retention-refresh" title="جمله‌ی جدید">🔄</button>
      <button class="btn-icon" id="retention-save" title="ذخیره برای این مشتری">💾</button>
      <button class="btn-icon" id="retention-copy" title="کپی متن">📋</button>
    </div>

    <!-- دکمه‌ی ساخت عکس -->
    <button class="btn-primary" id="retention-make-image" style="width:100%;margin-top:14px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff">📷 ساخت عکس پیام</button>

    <div class="modal-actions" style="margin-top:10px">
      <button class="btn-cancel" id="retention-close" style="flex:1">بستن</button>
    </div>
  `, { center: true });

  const textarea = overlay.querySelector('#retention-msg-text');

  // 🔄 جمله‌ی جدید
  overlay.querySelector('#retention-refresh').onclick = async () => {
    const newQuote = await getRandomRetentionQuote();
    textarea.value = buildMessage(newQuote);
    toast('جمله‌ی جدید اعمال شد ✅', 'success');
  };

  // 💾 ذخیره برای این مشتری
  overlay.querySelector('#retention-save').onclick = () => {
    if (!b.retentionMessages) b.retentionMessages = {};
    b.retentionMessages[customerId] = textarea.value;
    DB.set('business', state.business);
    toast('متن پیام برای این مشتری ذخیره شد ✅', 'success');
  };

  // 📋 کپی
  overlay.querySelector('#retention-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      toast('متن کپی شد ✅', 'success');
    } catch (e) {
      // fallback برای مرورگرهای قدیمی
      textarea.select();
      document.execCommand('copy');
      toast('متن کپی شد ✅', 'success');
    }
  };

  // 📷 ساخت عکس
  overlay.querySelector('#retention-make-image').onclick = () => {
    const currentText = textarea.value;
    closeModal(overlay);
    setTimeout(() => {
      generateRetentionImage(customerId, currentText);
    }, 200);
  };

  // بستن
  overlay.querySelector('#retention-close').onclick = () => closeModal(overlay);
}

// ==============================
// 📷 ساخت عکس پیام یادآوری
// ==============================
async function generateRetentionImage(customerId, messageText) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('مشتری پیدا نشد', 'error');
    return;
  }

  toast('در حال ساخت عکس...', 'info');

  const b = state.business;
  const today = getTodayShamsi();

  // 🔥 لوگو کسب‌وکار
  const logoHtml = b.logo
    ? `<img src="${b.logo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`
       : `<img src="assets/icon-192.png" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`;

  // 🔥 متن پیام
  const messageHtml = escapeHtml(messageText).replace(/\n/g, '<br>');

  // 🔥 container مخفی
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
  container.innerHTML = `
    <div id="retention-canvas" style="
      width: 500px;
      background: linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%);
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      color: #1a1a1a;
      padding: 0;
      position: relative;
      direction: rtl;
      overflow: hidden;
    ">
      <div style="height:8px;background:linear-gradient(90deg,#3B82F6,#60A5FA,#3B82F6)"></div>

      <div style="padding: 35px 40px 30px 40px; position: relative; z-index: 1">
        <div style="text-align:center;margin-bottom:26px">
          ${logoHtml}
          <div style="font-size:16px;font-weight:800;color:#1a1a1a">${escapeHtml(b.name || '')}</div>
          <div style="font-size:11px;color:#999;margin-top:3px">${escapeHtml(b.job || '')}</div>
        </div>

        <div style="text-align:center;margin:20px 0 24px 0">
          <div style="font-size:46px">💙</div>
        </div>

        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:20px;font-weight:800;color:#3B82F6;margin-bottom:8px">
            به یادت هستیم
          </div>
          <div style="font-size:13px;color:#666">${escapeHtml(c.fullName)} عزیز</div>
        </div>

        <div style="background:#FFFFFF;border:1px solid #DBEAFE;border-radius:14px;padding:20px;margin:20px 0;text-align:center;box-shadow:0 2px 10px rgba(59,130,246,0.06)">
          <div style="font-size:14px;color:#333;line-height:2.2">${messageHtml}</div>
        </div>

        <div style="text-align:center;font-size:11px;color:#aaa;margin-top:20px">
          📅 ${today}
        </div>

        <div style="height:1px;background:linear-gradient(90deg,transparent,#DBEAFE,transparent);margin:18px 0 14px 0"></div>
        <div style="text-align:center;font-size:10px;color:#aaa">
         <div style="display:inline-flex;align-items:center;gap:5px;vertical-align:middle">
  <span>ساخته‌شده با</span>
  <img src="assets/icon-192.png" style="width:14px;height:14px;border-radius:50%;vertical-align:middle">
  <span style="font-weight:700;color:#3B82F6">چشمک</span>
</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 500));

  try {
    const target = container.querySelector('#retention-canvas');
    const canvas = await html2canvas(target, {
      backgroundColor: '#EFF6FF',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast('خطا در ساخت عکس', 'error');
        container.remove();
        return;
      }

      const fileName = `یادآوری-${c.fullName}-${today.replace(/\//g, '-')}.png`;

      container.remove();
      showRetentionImagePreview(blob, fileName, c);
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    toast('خطا در ساخت عکس', 'error');
    container.remove();
  }
}

// ==============================
// 📷 پیش‌نمایش عکس پیام یادآوری
// ==============================
function showRetentionImagePreview(blob, fileName, customer) {
  const url = URL.createObjectURL(blob);

  const overlay = showModal(`
    <h3 class="modal-title">💙 عکس پیام آماده شد</h3>
    <div style="text-align:center;margin-bottom:16px">
      <img src="${url}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(59,130,246,0.25)">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="ri-share" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 اشتراک‌گذاری</button>
      <button class="btn-cancel" id="ri-download">💾 دانلود عکس</button>
      <button class="btn-cancel" id="ri-close">بستن</button>
    </div>
  `);

  overlay.querySelector('#ri-close').onclick = () => {
    URL.revokeObjectURL(url);
    closeModal(overlay);
  };

  overlay.querySelector('#ri-download').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  overlay.querySelector('#ri-share').onclick = async () => {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'یادآوری',
          text: `یادآوری برای ${customer.fullName}`,
        });
      } else {
        toast('اشتراک‌گذاری پشتیبانی نمی‌شه', 'error');
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };
}



// ==============================
// 📄 فاکتور به‌صورت عکس
// ==============================
async function generateInvoiceImage(customerId, serviceIndex = null) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('مشتری پیدا نشد', 'error');
    return;
  }

  if (!c.history || c.history.length === 0) {
    toast('این مشتری هنوز خدمتی نداره', 'error');
    return;
  }

  toast('در حال ساخت فاکتور...', 'info');

  const b = state.business;
  const quoteCat = b.quoteCategory || 'all';
  const quote = await getRandomQuote(quoteCat);
  const customerName = c.fullName;
  const showPrices = c.showPrices !== undefined
    ? c.showPrices
    : (b.showPricesInInvoice !== false);
  let selectedService;
  if (serviceIndex !== null && serviceIndex >= 0 && serviceIndex < c.history.length) {
    selectedService = c.history[serviceIndex];
  } else {
    selectedService = c.history[c.history.length - 1];
  }

  const total = selectedService.cost || 0;
  const today = selectedService.dateShamsi || getTodayShamsi();
  const adTop = getActiveAdForSlot('top');
  const adBottom = getActiveAdForSlot('bottom');
  const servicesHtml = `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${escapeHtml(selectedService.serviceName)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;font-size:12px;color:#888">${selectedService.dateShamsi}</td>
      ${showPrices ? `<td style="padding:10px;border-bottom:1px solid #eee;text-align:left;font-size:11px;font-weight:600;color:#999">${(selectedService.cost || 0).toLocaleString()}</td>` : ''}
    </tr>
  `;

  const social = b.social || {};
  const socialItems = [];
  if (social.instagram) socialItems.push({ icon: '📸', label: 'اینستاگرام', value: social.instagram });
  if (social.telegram) socialItems.push({ icon: '📨', label: 'تلگرام', value: social.telegram });
  if (social.whatsapp) socialItems.push({ icon: '💬', label: 'واتساپ', value: social.whatsapp });
  if (social.website) socialItems.push({ icon: '🌐', label: 'وب‌سایت', value: social.website });

  const socialHtml = socialItems.length > 0
    ? `
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;font-size:11px;color:#666;margin-bottom:14px">
        ${socialItems.map(item => `
          <div style="display:flex;align-items:center;gap:4px">
            <span>${item.icon}</span>
            <span style="color:#888">${item.label}:</span>
            <span style="font-weight:600;color:#333">${escapeHtml(item.value)}</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const logoHtml = b.logo
    ? `<img src="${b.logo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`
     : `<img src="assets/icon-192.png" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`;

  const flowerSvg = `
    <svg width="150" height="150" viewBox="0 0 150 150" style="position:absolute;top:-5px;left:-5px;opacity:0.9">
      <path d="M 30 60 Q 15 75 20 95 Q 35 85 40 70 Z" fill="#A5D6A7" opacity="0.7"/>
      <path d="M 45 75 Q 35 95 45 115 Q 55 100 55 80 Z" fill="#81C784" opacity="0.7"/>
      <path d="M 25 50 Q 10 55 8 70 Q 22 68 30 55 Z" fill="#C8E6C9" opacity="0.8"/>
      <g transform="translate(40,40)">
        <ellipse cx="0" cy="-15" rx="14" ry="10" fill="#F8BBD0" transform="rotate(0)"/>
        <ellipse cx="0" cy="-15" rx="14" ry="10" fill="#F48FB1" transform="rotate(72)"/>
        <ellipse cx="0" cy="-15" rx="14" ry="10" fill="#F8BBD0" transform="rotate(144)"/>
        <ellipse cx="0" cy="-15" rx="14" ry="10" fill="#F48FB1" transform="rotate(216)"/>
        <ellipse cx="0" cy="-15" rx="14" ry="10" fill="#F8BBD0" transform="rotate(288)"/>
        <ellipse cx="0" cy="-9" rx="9" ry="7" fill="#F06292" transform="rotate(36)"/>
        <ellipse cx="0" cy="-9" rx="9" ry="7" fill="#EC407A" transform="rotate(108)"/>
        <ellipse cx="0" cy="-9" rx="9" ry="7" fill="#F06292" transform="rotate(180)"/>
        <ellipse cx="0" cy="-9" rx="9" ry="7" fill="#EC407A" transform="rotate(252)"/>
        <circle cx="0" cy="0" r="5" fill="#FFF59D"/>
        <circle cx="0" cy="0" r="3" fill="#FFEB3B"/>
      </g>
    </svg>
  `;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
  container.innerHTML = `
   <div id="invoice-canvas" style="
  width: 600px;
  background: #ffffff;
  font-family: 'Vazirmatn', Tahoma, sans-serif;
  color: #1a1a1a;
  padding: 0;
  position: relative;
  direction: rtl;
  overflow: hidden;
  ${(b.backgroundImage && Array.isArray(b.backgroundImageScopes) && b.backgroundImageScopes.includes('invoice')) 
    ? `background-image: url(${b.backgroundImage}); background-size: cover; background-position: center;` 
    : ''}
">
      ${flowerSvg}

      <div style="padding: 45px 40px 30px 40px; position: relative; z-index: 1">
    
        <div style="text-align:center;margin-bottom:24px">
          ${logoHtml}
          <h1 style="font-size:22px;font-weight:800;margin:0 0 6px 0;color:#1a1a1a">${escapeHtml(b.name)}</h1>
          <div style="font-size:12px;color:#888;line-height:1.6">${escapeHtml(b.job)}</div>
        </div>

        <div style="height:2px;background:linear-gradient(90deg,transparent,#E5E7EB,transparent);margin-bottom:24px"></div>
        ${adTop ? buildAdHtml(adTop) : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px">
          <div>
            <div style="color:#888;font-size:11px;margin-bottom:4px">${escapeHtml(getCustomerTitle())}</div>
            <div style="font-weight:700;font-size:16px">${escapeHtml(customerName)}</div>
            ${c.phone1 ? `<div style="color:#888;font-size:11px;margin-top:3px">${escapeHtml(c.phone1)}</div>` : ''}
          </div>
          <div style="text-align:left">
            <div style="color:#888;font-size:11px;margin-bottom:4px">تاریخ صدور</div>
            <div style="font-weight:700">${today}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:10px;text-align:right;font-size:12px;color:#666;font-weight:600;border-bottom:2px solid #E5E7EB">شرح خدمات</th>
              <th style="padding:10px;text-align:center;font-size:12px;color:#666;font-weight:600;border-bottom:2px solid #E5E7EB;width:90px">تاریخ</th>
              ${showPrices ? `<th style="padding:10px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:2px solid #E5E7EB;width:100px">مبلغ (تومان)</th>` : ''}
            </tr>
          </thead>
          <tbody>${servicesHtml}</tbody>
        </table>

        ${showPrices ? `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;margin-bottom:20px;border-top:2px solid #1a1a1a;border-bottom:2px solid #1a1a1a">
    <div style="font-size:14px;font-weight:700;color:#1a1a1a">مجموع کل</div>
    <div style="font-size:17px;font-weight:800;color:#1a1a1a">${total.toLocaleString()} تومان</div>
  </div>
` : ''}
        <div style="height:1px;background:#E5E7EB;margin-bottom:20px"></div>

        <div style="text-align:center;padding:0 20px 20px 20px">
          <div style="font-size:13px;line-height:2;color:#555;font-style:italic">«${escapeHtml(quote)}»</div>
        </div>
        ${adBottom ? buildAdHtml(adBottom) : ''}
        <div style="height:1px;background:#E5E7EB;margin-bottom:16px"></div>

        ${socialHtml}

        <div style="height:1px;background:#E5E7EB;margin-bottom:12px"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;margin-bottom:8px">
  <div>با تشکر از اعتماد شما 🌸</div>
  <div style="display:flex;align-items:center;gap:4px">
  <span>ساخته‌شده با</span>
  <img src="assets/icon-192.png" style="width:14px;height:14px;border-radius:50%">
  <span style="font-weight:700;color:#3B82F6">چشمک</span>
</div>
</div>

<div style="display:flex;justify-content:center;align-items:center;gap:6px;font-size:10px;color:#888;padding-top:8px;border-top:1px dashed #E5E7EB">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#229ED9"/>
    <path d="M5.5 11.5L17.5 7L15.5 17.5L11.5 14L9 16L9.5 12.5L16 8.5L7.5 12.5L5.5 11.5Z" fill="#FFFFFF"/>
  </svg>
  <span style="color:#229ED9;font-weight:700">پشتیبانی چشمک:</span>
  <span dir="ltr" style="color:#555;font-weight:600">@cheshmak_help</span>
</div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 400));

  try {
    const target = container.querySelector('#invoice-canvas');
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast('خطا در ساخت فاکتور', 'error');
        container.remove();
        return;
      }
      const fileName = `فاکتور-${customerName}-${today.replace(/\//g, '-')}.png`;

      if (state.business.autoSaveInvoice !== false) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // 🔥 افزایش shownCount تبلیغات
      incrementAdShownCount(adTop);
      incrementAdShownCount(adBottom);

      if (serviceIndex === null || serviceIndex === c.history.length - 1) {
        addPendingInvoice(customerId);
        updatePendingBadge();
      }

      container.remove();
      showInvoicePreview(blob, fileName, c);
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    toast('خطا در ساخت فاکتور', 'error');
    container.remove();
  }
}

// 🔥 افزایش شمارنده نمایش تبلیغ
function incrementAdShownCount(ad) {
  if (!ad) return;
  const ads = getAds();
  const target = ads.find(a => a.id === ad.id);
  if (!target) return;
  target.shownCount = (target.shownCount || 0) + 1;
  saveAds(ads);
  // چک کن اگه به سقف رسید، رزرو بعدی رو فعال کن
  if (target.shownCount >= target.totalShows) {
    checkAndActivateReserved();
  }
}

// ==============================
// پیش‌نمایش فاکتور
// ==============================
function showInvoicePreview(blob, fileName, customer) {
  const url = URL.createObjectURL(blob);
  const overlay = showModal(`
    <h3 class="modal-title">📄 فاکتور آماده شد</h3>
    <div style="text-align:center;margin-bottom:16px">
      <img src="${url}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="inv-share" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 ارسال با واتساپ</button>
      <button class="btn-cancel" id="inv-download">💾 دانلود عکس</button>
      <button class="btn-cancel" id="inv-close">بستن</button>
    </div>
  `);
  overlay.querySelector('#inv-close').onclick = () => { URL.revokeObjectURL(url); closeModal(overlay); };
  overlay.querySelector('#inv-download').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };
  overlay.querySelector('#inv-share').onclick = async () => {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'فاکتور',
          text: `فاکتور ${customer.fullName}`,
        });
      } else {
        toast('اشتراک‌گذاری پشتیبانی نمی‌شه', 'error');
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };
}


// ==============================
// 📄 صدور فاکتور برای تبلیغ‌دهنده / اسپانسر
// ==============================
async function generateIssuedInvoice(type, itemId) {
  // type: 'ad' یا 'birthdaySponsor'
  // itemId: آیدی آیتم توی آرایه

  let item, itemName, itemPhone, itemDesc, itemCount, itemCost;
  const b = state.business;

  if (type === 'ad') {
    const ads = getAds();
    item = ads.find(a => a.id === itemId);
    if (!item) { toast('تبلیغ پیدا نشد', 'error'); return; }
    itemName = item.name;
    itemPhone = item.phone;
    itemDesc = item.text || 'تبلیغ در فاکتور';
    itemCount = `${item.totalShows} نمایش`;
    itemCost = item.totalCost || 0;
  } else if (type === 'birthdaySponsor') {
    const sponsors = getBirthdaySponsors();
    item = sponsors.find(s => s.id === itemId);
    if (!item) { toast('اسپانسر پیدا نشد', 'error'); return; }
    itemName = item.name;
    itemPhone = item.phone;
    itemDesc = item.text || 'اسپانسر تولد';
    itemCount = `${item.totalShows} تولد`;
    itemCost = item.totalCost || 0;
} else if (type === 'trainingSponsor') {
    const sponsors = getTrainingSponsors();
    item = sponsors.find(s => s.id === itemId);
       itemName = item.name;
    itemPhone = item.phone;
    itemDesc = item.text || 'اسپانسر برنامه تمرینی';
    itemCount = `${item.totalShows} برنامه`;
    itemCost = item.totalCost || 0;
  } else {
    toast('نوع نامعتبر', 'error');
    return;
  }

  toast('در حال ساخت فاکتور...', 'info');

  const today = getTodayShamsi();
  const typeLabel = type === 'ad' ? '📢 تبلیغ در فاکتور' : (type === 'birthdaySponsor' ? '🎂 اسپانسر تولد' : '📋 اسپانسر برنامه تمرینی');
  // لوگوی کسب‌وکار
  const logoHtml = b.logo
    ? `<img src="${b.logo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`
     : `<img src="assets/icon-192.png" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`;
  // شبکه‌های اجتماعی کسب‌وکار
  const social = b.social || {};
  const socialItems = [];
  if (social.instagram) socialItems.push({ icon: '📸', label: 'اینستاگرام', value: social.instagram });
  if (social.telegram) socialItems.push({ icon: '📨', label: 'تلگرام', value: social.telegram });
  if (social.whatsapp) socialItems.push({ icon: '💬', label: 'واتساپ', value: social.whatsapp });
  if (social.website) socialItems.push({ icon: '🌐', label: 'وب‌سایت', value: social.website });

  const socialHtml = socialItems.length > 0
    ? `
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;font-size:11px;color:#666;margin-bottom:14px">
        ${socialItems.map(item => `
          <div style="display:flex;align-items:center;gap:4px">
            <span>${item.icon}</span>
            <span style="color:#888">${item.label}:</span>
            <span style="font-weight:600;color:#333">${escapeHtml(item.value)}</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
  container.innerHTML = `
    <div id="issued-invoice-canvas" style="
      width: 600px;
      background: #ffffff;
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      color: #1a1a1a;
      padding: 0;
      position: relative;
      direction: rtl;
      overflow: hidden;
    ">
      <div style="padding: 45px 40px 30px 40px; position: relative; z-index: 1">

        <div style="text-align:center;margin-bottom:24px">
          ${logoHtml}
          <h1 style="font-size:22px;font-weight:800;margin:0 0 6px 0;color:#1a1a1a">${escapeHtml(b.name)}</h1>
          <div style="font-size:12px;color:#888;line-height:1.6">${escapeHtml(b.job)}</div>
        </div>

        <div style="height:2px;background:linear-gradient(90deg,transparent,#E5E7EB,transparent);margin-bottom:24px"></div>

        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:18px;font-weight:800;color:#14B8A6;margin-bottom:4px">فاکتور خدمات تبلیغاتی</div>
          <div style="font-size:11px;color:#888">${typeLabel}</div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px">
          <div>
            <div style="color:#888;font-size:11px;margin-bottom:4px">صادرشده برای:</div>
            <div style="font-weight:700;font-size:16px">${escapeHtml(itemName)}</div>
            ${itemPhone ? `<div style="color:#888;font-size:11px;margin-top:3px">📞 ${escapeHtml(itemPhone)}</div>` : ''}
          </div>
          <div style="text-align:left">
            <div style="color:#888;font-size:11px;margin-bottom:4px">تاریخ صدور</div>
            <div style="font-weight:700">${today}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:10px;text-align:right;font-size:12px;color:#666;font-weight:600;border-bottom:2px solid #E5E7EB">شرح خدمات</th>
              <th style="padding:10px;text-align:center;font-size:12px;color:#666;font-weight:600;border-bottom:2px solid #E5E7EB;width:110px">تعداد</th>
              <th style="padding:10px;text-align:left;font-size:11px;color:#999;font-weight:600;border-bottom:2px solid #E5E7EB;width:120px">مبلغ (تومان)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:right;font-size:13px">
                <div style="font-weight:700;margin-bottom:4px">${escapeHtml(itemDesc)}</div>
                <div style="font-size:11px;color:#888">${typeLabel}</div>
              </td>
              <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:center;font-size:12px;color:#666">${itemCount}</td>
              <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:left;font-size:12px;font-weight:600;color:#333">${itemCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;margin-bottom:24px;border-top:2px solid #1a1a1a;border-bottom:2px solid #1a1a1a">
          <div style="font-size:14px;font-weight:700;color:#1a1a1a">مجموع کل</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a1a">${itemCost.toLocaleString()} تومان</div>
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;margin-bottom:24px;text-align:center">
          <div style="font-size:12px;color:#166534;line-height:1.8">
            با تشکر از همکاری شما 🌸<br>
            این فاکتور به مناسبت ${typeLabel} صادر شده است.
          </div>
        </div>

        <div style="height:1px;background:#E5E7EB;margin-bottom:16px"></div>
        ${socialHtml}
        <div style="height:1px;background:#E5E7EB;margin-bottom:12px"></div>

        <div style="display:flex;justify-content:center;align-items:center;gap:6px;font-size:10px;color:#888;padding-top:8px">
          <span>صادرشده با</span>
<img src="assets/icon-192.png" style="width:14px;height:14px;border-radius:50%">
<span style="font-weight:700;color:#3B82F6">چشمک</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 400));

  try {
    const target = container.querySelector('#issued-invoice-canvas');
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast('خطا در ساخت فاکتور', 'error');
        container.remove();
        return;
      }

      const fileName = `فاکتور-${typeLabel.replace(/[^\u0600-\u06FF]/g, '').trim()}-${itemName}-${today.replace(/\//g, '-')}.png`;

      // ذخیره‌ی متادیتا توی localStorage
      saveIssuedInvoice({
        type,
        itemId,
        itemName,
        itemPhone,
        itemDesc,
        itemCount,
        itemCost,
        issuedAt: today,
      });

      container.remove();
      showIssuedInvoicePreview(blob, fileName, itemName, itemCost, type);
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    toast('خطا در ساخت فاکتور', 'error');
    container.remove();
  }
}

// ==============================
// 💾 ذخیره‌ی متادیتای فاکتور صادرشده
// ==============================
function saveIssuedInvoice(meta) {
  const invoices = DB.get('issuedInvoices', []);
  invoices.push({
    id: 'issued_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    ...meta,
    createdAt: new Date().toISOString(),
  });
  DB.set('issuedInvoices', invoices);
}

// ==============================
// 📄 پیش‌نمایش فاکتور صادرشده
// ==============================
function showIssuedInvoicePreview(blob, fileName, recipientName, totalCost, type) {
  const url = URL.createObjectURL(blob);
  const typeLabel = type === 'ad' ? '📢 تبلیغ' : '🎂 اسپانسر تولد';

  const overlay = showModal(`
    <h3 class="modal-title">📄 فاکتور ${typeLabel} آماده شد</h3>
    <div style="text-align:center;margin-bottom:16px">
      <img src="${url}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">
    </div>
    <div style="background:rgba(20,184,166,0.08);border-radius:10px;padding:12px;margin-bottom:16px;text-align:center">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">فاکتور صادرشده برای</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px">${escapeHtml(recipientName)}</div>
      <div style="font-size:13px;font-weight:700;color:var(--button-color)">${totalCost.toLocaleString()} تومان</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="inv-share" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 ارسال با واتساپ</button>
      <button class="btn-cancel" id="inv-download">💾 دانلود عکس</button>
      <button class="btn-cancel" id="inv-close">بستن</button>
    </div>
  `);
  overlay.querySelector('#inv-close').onclick = () => { URL.revokeObjectURL(url); closeModal(overlay); };
  overlay.querySelector('#inv-download').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };
  overlay.querySelector('#inv-share').onclick = async () => {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'فاکتور',
          text: `فاکتور ${recipientName}`,
        });
      } else {
        toast('اشتراک‌گذاری پشتیبانی نمی‌شه', 'error');
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };
}
// ==============================
// 🌹 آیکون گل رز SVG (پیش‌فرض مشتری)
// ==============================
function getRoseAvatarSvg(size = 40) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M 8 22 Q 3 26 5 32 Q 11 29 13 25 Z" fill="#66BB6A"/>
      <path d="M 32 22 Q 37 26 35 32 Q 29 29 27 25 Z" fill="#66BB6A"/>
      <path d="M 12 30 Q 10 35 14 38 Q 18 34 16 30 Z" fill="#81C784"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#EF5350"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#E53935" transform="rotate(60 20 18)"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#EF5350" transform="rotate(120 20 18)"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#E53935" transform="rotate(180 20 18)"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#EF5350" transform="rotate(240 20 18)"/>
      <ellipse cx="20" cy="9" rx="7" ry="5" fill="#E53935" transform="rotate(300 20 18)"/>
      <ellipse cx="20" cy="14" rx="5" ry="3.5" fill="#C62828" transform="rotate(0 20 18)"/>
      <ellipse cx="20" cy="14" rx="5" ry="3.5" fill="#D32F2F" transform="rotate(72 20 18)"/>
      <ellipse cx="20" cy="14" rx="5" ry="3.5" fill="#C62828" transform="rotate(144 20 18)"/>
      <ellipse cx="20" cy="14" rx="5" ry="3.5" fill="#D32F2F" transform="rotate(216 20 18)"/>
      <ellipse cx="20" cy="14" rx="5" ry="3.5" fill="#C62828" transform="rotate(288 20 18)"/>
      <circle cx="20" cy="18" r="3" fill="#B71C1C"/>
      <circle cx="20" cy="18" r="1.5" fill="#FFCDD2"/>
    </svg>
  `;
}

// ==============================
// 📥 سبد ارسال فاکتور
// ==============================
function addPendingInvoice(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  if (!c.history || c.history.length === 0) {
    return;
  }

  let pending = DB.get('pendingInvoices', []);
  pending = pending.filter(p => p.customerId !== customerId);

  const lastService = c.history[c.history.length - 1];

  pending.push({
    id: 'inv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    customerId: customerId,
    customerName: c.fullName,
    customerPhone: c.phone1 || '',
    lastServiceDate: lastService.dateShamsi,
    lastServiceName: lastService.serviceName,
    lastServiceCost: lastService.cost || 0,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });

  DB.set('pendingInvoices', pending);
  return true;
}

function getPendingInvoices() {
  return DB.get('pendingInvoices', []);
}

function getPendingCount() {
  return getPendingInvoices().length;
}

function removePendingInvoice(invoiceId) {
  let pending = DB.get('pendingInvoices', []);
  pending = pending.filter(p => p.id !== invoiceId);
  DB.set('pendingInvoices', pending);
}

// ==============================
// 📥 آپدیت بج سبد ارسال
// ==============================
function updatePendingBadge() {
  const badge = document.getElementById('pending-badge');
  const btn = document.getElementById('btn-pending');
  if (!badge || !btn) return;

  const count = getPendingCount();

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}


// ==============================
// 🎂 آپدیت بج تولدهای نزدیک
// ==============================
function updateBirthdayBadge() {
  const badge = document.getElementById('birthday-badge');
  if (!badge) return;

  const reminderDays = (state.business && state.business.birthdayReminderDays) || 7;

  const upcoming = state.customers.filter(c => {
    if (!c.birthDate) return false;
    
    // 🔥 محاسبه‌ی دقیق روزهای باقی‌مانده تا تولد
    const days = daysUntilBirthday(c.birthDate);
    
    // چک کردن دقیق: اگه روزها معتبر بود و توی بازه بود (حتی امروز با 0 روز)
    return days !== null && days >= 0 && days <= reminderDays;
  });

  const count = upcoming.length;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}


// ==============================
// 📥 باز کردن سبد ارسال
// ==============================
function openPendingList() {
  const pending = getPendingInvoices();

  if (pending.length === 0) {
    const overlay = showModal(`
      <h3 class="modal-title">📥 فاکتورهای ارسال‌نشده</h3>
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:60px;margin-bottom:12px">✅</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.8">
          همه‌ی فاکتورها ارسال شدن!<br>
          سبد خالیه.
        </p>
      </div>
      <button class="btn-primary" id="pend-close" style="width:100%">بستن</button>
    `);
    overlay.querySelector('#pend-close').onclick = () => closeModal(overlay);
    return;
  }

  const listHtml = pending.map(p => `
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:14px">${escapeHtml(p.customerName)}</strong>
        <span style="font-size:11px;color:var(--text-muted)">${escapeHtml(p.lastServiceDate)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.7;margin-bottom:8px">
        📋 ${escapeHtml(p.lastServiceName)}<br>
        💰 ${(p.lastServiceCost || 0).toLocaleString()} تومان<br>
        📞 ${escapeHtml(p.customerPhone || '—')}
      </div>
      <button class="btn-primary" style="padding:8px 12px;font-size:12px;width:100%;background:linear-gradient(135deg,#10B981,#059669);color:#fff" data-send="${p.id}">
        📱 ارسال فاکتور
      </button>
    </div>
  `).join('');

  const overlay = showModal(`
    <h3 class="modal-title">📥 فاکتورهای ارسال‌نشده (${pending.length})</h3>
    <div style="max-height:400px;overflow-y:auto;margin-bottom:16px">
      ${listHtml}
    </div>
    <button class="btn-cancel" id="pend-close" style="width:100%">بستن</button>
  `);

  overlay.querySelector('#pend-close').onclick = () => closeModal(overlay);

  overlay.querySelectorAll('[data-send]').forEach(btn => {
    btn.onclick = () => {
      const invId = btn.dataset.send;
      const invoice = pending.find(p => p.id === invId);
      if (!invoice) return;
      closeModal(overlay);
      setTimeout(() => generateInvoiceImage(invoice.customerId), 200);
    };
  });
}

// ==============================
// 📤 پرسیدن ارسال فاکتور موقع خروج از پروفایل
// ==============================
function checkAndAskSendInvoice(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  if (!c.history || c.history.length === 0) return;

  const pending = getPendingInvoices();
  const lastService = c.history[c.history.length - 1];
  const pendingInvoice = pending.find(p =>
    p.customerId === customerId &&
    p.lastServiceDate === lastService.dateShamsi
  );

  if (pendingInvoice) {
    const overlay = showModal(`
      <h3 class="modal-title">📤 فاکتور ارسال شد؟</h3>
      <div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:16px">
        <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
          فاکتور <strong>${escapeHtml(c.fullName)}</strong> هنوز ارسال نشده.<br>
          می‌خوای الان بفرستی؟
        </p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" id="ask-send-now" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 بله، الان می‌فرستم</button>
        <button class="btn-cancel" id="ask-send-later">⏳ بعداً می‌فرستم</button>
        <button class="btn-cancel" id="ask-send-delete" style="border-color:#EF4444;color:#EF4444">❌ نمی‌خوام، از سبد حذف کن</button>
      </div>
    `, { center: true });

    overlay.querySelector('#ask-send-now').onclick = () => {
      closeModal(overlay);
      setTimeout(() => generateInvoiceImage(customerId), 200);
    };
    overlay.querySelector('#ask-send-later').onclick = () => {
      closeModal(overlay);
      toast('فاکتور توی سبد موند', 'info');
      updatePendingBadge();
    };
    overlay.querySelector('#ask-send-delete').onclick = () => {
      removePendingInvoice(pendingInvoice.id);
      updatePendingBadge();
      closeModal(overlay);
      toast('فاکتور از سبد حذف شد', 'success');
    };
    return;
  }

  const overlay = showModal(`
    <h3 class="modal-title">📄 فاکتور بسازم؟</h3>
    <div style="background:rgba(59,130,246,0.1);border:1px solid #3B82F6;border-radius:12px;padding:14px;margin-bottom:16px">
      <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
        برای <strong>${escapeHtml(c.fullName)}</strong> فاکتور ساخته نشده.<br>
        می‌خوای همین الان بسازم؟
      </p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="ask-make-now" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff">📄 بله، فاکتور بساز</button>
      <button class="btn-cancel" id="ask-make-no">❌ نه، لازم نیست</button>
    </div>
  `, { center: true });

  overlay.querySelector('#ask-make-now').onclick = () => {
    closeModal(overlay);
    setTimeout(() => generateInvoiceImage(customerId), 200);
  };
  overlay.querySelector('#ask-make-no').onclick = () => closeModal(overlay);
}

// ==============================
// ✏️ ویرایش خدمت
// ==============================
function openEditServiceDialog(customerId, serviceIdx) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  const h = c.history[serviceIdx];
  if (!h) return;

  const overlay = showModal(`
    <h3 class="modal-title">✏️ ویرایش خدمت</h3>

    <div class="form-group">
      <label>شرح خدمت</label>
      <textarea id="edit-service-name" rows="4" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:14px;line-height:1.8;resize:vertical">${escapeHtml(h.serviceName)}</textarea>
    </div>

    <div class="form-group">
      <label>مبلغ (تومان)</label>
      <input type="number" id="edit-service-cost" value="${h.cost || 0}" inputmode="numeric">
    </div>

    <div class="form-group">
      <label>تاریخ (برای تغییر کلیک کنید)</label>
      <input type="text" id="edit-service-date" value="${h.dateShamsi || ''}" readonly style="cursor:pointer">
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="edit-svc-cancel">انصراف</button>
      <button class="btn-primary" id="edit-svc-save">ذخیره</button>
    </div>
  `, { center: true });

  const dateField = overlay.querySelector('#edit-service-date');
  dateField.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(dateField.value, 'تاریخ خدمت');
    if (result) dateField.value = result;
  });

  overlay.querySelector('#edit-svc-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(() => openCustomerProfile(customerId), 200);
  };

  overlay.querySelector('#edit-svc-save').onclick = () => {
    const newName = overlay.querySelector('#edit-service-name').value.trim();
    const newCost = parseInt(overlay.querySelector('#edit-service-cost').value.replace(/\D/g, '')) || 0;
    const newDate = overlay.querySelector('#edit-service-date').value.trim();

    if (!newName) {
      toast('شرح خدمت را وارد کنید', 'error');
      return;
    }

    c.history[serviceIdx].serviceName = newName;
    c.history[serviceIdx].cost = newCost;
    c.history[serviceIdx].dateShamsi = newDate;

    if (serviceIdx === c.history.length - 1) {
      c.lastVisit = newDate;
    }

    DB.set('customers', state.customers);
    toast('خدمت ویرایش شد ✅', 'success');
    closeModal(overlay);
    setTimeout(() => openCustomerProfile(customerId), 200);
  };
}

// ==============================
// 📢 تبلیغات
// ==============================
function getAds() {
  return DB.get('ads', []);
}

function saveAds(ads) {
  DB.set('ads', ads);
}

// 🔥 نرمال‌سازی جایگاه: 'A' → 'top'، 'C' → 'bottom'
function normalizeSlot(slot) {
  if (slot === 'A' || slot === 'top') return 'top';
  if (slot === 'C' || slot === 'bottom') return 'bottom';
  return 'top';
}

function renderAdsList(container) {
  if (!container) return;

  const ads = getAds();

  if (ads.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:12px;color:var(--text-muted)">
        هنوز تبلیغی نداری
      </div>
    `;
    return;
  }

  const activeAds = ads.filter(ad => ad.status === 'active' && (ad.shownCount || 0) < (ad.totalShows || 0));

  const reservedAds = ads
    .filter(ad => ad.status === 'reserved')
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  let html = '';

  if (activeAds.length > 0) {
    html += `<div style="font-size:11px;color:#10B981;margin-bottom:6px;font-weight:700">🟢 فعال (${activeAds.length})</div>`;
    html += activeAds.map(ad => {
      const idx = ads.indexOf(ad);
      return renderAdCard(ad, idx, false);
    }).join('');
  }

  if (reservedAds.length > 0) {
    html += `<div style="font-size:11px;color:#F59E0B;margin:12px 0 6px 0;font-weight:700">⏳ رزرو شده (${reservedAds.length} از ۱۰)</div>`;
    html += reservedAds.map((ad, i) => {
      const idx = ads.indexOf(ad);
      const canUp = i > 0;
      const canDown = i < reservedAds.length - 1;
      return renderAdCard(ad, idx, true, canUp, canDown);
    }).join('');
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-edit-ad]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.editAd);
      closeModal();
      setTimeout(() => openAdForm(idx), 200);
    };
  });

  container.querySelectorAll('[data-delete-ad]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.deleteAd);
      if (!confirm('این تبلیغ حذف بشه؟')) return;
      const ads = getAds();
      ads.splice(idx, 1);
      saveAds(ads);
      checkAndActivateReserved();
      toast('تبلیغ حذف شد', 'success');
      renderAdsList(container);
    };
  });

  container.querySelectorAll('[data-issue-invoice-ad]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.issueInvoiceAd);
      const ads = getAds();
      const ad = ads[idx];
      if (!ad) return;

      // چک کن که تبلیغ حذف نشده باشه
      if (!ad.id) {
        toast('تبلیغ پیدا نشد', 'error');
        return;
      }

      // اگه قبلاً فاکتور صادر شده، تایید بگیر
      const issuedInvoices = DB.get('issuedInvoices', []);
      const alreadyIssued = issuedInvoices.find(inv => inv.itemId === ad.id && inv.type === 'ad');

      if (alreadyIssued) {
        if (!confirm(`برای این تبلیغ قبلاً فاکتور صادر شده (تاریخ: ${alreadyIssued.issuedAt}).\nدوباره صادر بشه؟`)) return;
      }

      closeModal();
      setTimeout(() => generateIssuedInvoice('ad', ad.id), 200);
    };
  });

  container.querySelectorAll('[data-priority-up]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityUp);
      swapPriority(idx, 'up');
      renderAdsList(container);
    };
  });

  container.querySelectorAll('[data-priority-down]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityDown);
      swapPriority(idx, 'down');
      renderAdsList(container);
    };
  });
}

// ==============================
// 📢 رندر کارت تبلیغ
// ==============================
function renderAdCard(ad, idx, isReserved, canUp = false, canDown = false) {
  const slotLabel = normalizeSlot(ad.slot) === 'top' ? 'بالا' : 'پایین';
  const remaining = (ad.totalShows || 0) - (ad.shownCount || 0);

  return `
    <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:13px">${escapeHtml(ad.name)}</strong>
        <span style="font-size:10px;background:rgba(139,92,246,0.3);color:#8B5CF6;padding:2px 8px;border-radius:10px;font-weight:700">
          ${slotLabel} ${isReserved ? '• اولویت ' + ad.priority : ''}
        </span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:8px">
        ${escapeHtml((ad.text || '').substring(0, 50))}${(ad.text || '').length > 50 ? '...' : ''}<br>
        📞 ${escapeHtml(ad.phone || '—')}<br>
        💰 ${(ad.totalCost || 0).toLocaleString()} تومان | 📊 ${ad.shownCount || 0} از ${ad.totalShows || 0} ${isReserved ? `(وقتی فعال شد، ${remaining} نمایش داره)` : `(${remaining} مونده)`}
      </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${isReserved ? `
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canUp ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-up="${idx}">▲</button>
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canDown ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-down="${idx}">▼</button>
        ` : ''}
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px" data-edit-ad="${idx}">✏️ ویرایش</button>
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-delete-ad="${idx}">🗑️ حذف</button>
        <button class="btn-primary" style="flex-basis:100%;padding:8px;font-size:11px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;margin-top:4px" data-issue-invoice-ad="${idx}">📄 صدور فاکتور</button>
      </div>
    </div>
  `;
}

// ==============================
// 📢 جابه‌جایی اولویت (🔥 اصلاح‌شده)
// ==============================
function swapPriority(idx, direction) {
  const ads = getAds();
  const ad = ads[idx];
  if (!ad || ad.status !== 'reserved') return;

  const slot = normalizeSlot(ad.slot);
  const slotReserved = ads
    .filter(a => normalizeSlot(a.slot) === slot && a.status === 'reserved')
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  const currentPos = slotReserved.indexOf(ad);
  const targetPos = direction === 'up' ? currentPos - 1 : currentPos + 1;

  if (targetPos < 0 || targetPos >= slotReserved.length) return;

  const targetAd = slotReserved[targetPos];

  // 🔥 به جای جابه‌جایی اولویت‌ها (که ممکنه تکراری بشه)، همه رو دوباره شماره‌گذاری کن
  const newOrder = slotReserved.slice();
  newOrder.splice(currentPos, 1);
  newOrder.splice(targetPos, 0, ad);

  newOrder.forEach((a, i) => {
    a.priority = i + 1;
  });

  saveAds(ads);
  toast('اولویت تغییر کرد', 'success');
}

// ==============================
// 📢 فرم تعریف تبلیغ (🔥 اصلاح‌شده: حذف بلوک تکراری)
// ==============================
function openAdForm(editIdx = null) {
  const ads = getAds();
  const editing = editIdx !== null ? ads[editIdx] : null;

  const overlay = showModal(`
    <h3 class="modal-title">${editing ? '✏️ ویرایش تبلیغ' : '➕ تبلیغ جدید'}</h3>

    <div class="form-group">
      <label>نام تبلیغ‌دهنده *</label>
      <input type="text" id="ad-name" value="${editing ? escapeHtml(editing.name) : ''}" placeholder="مثلاً: شامپوی گلستان">
    </div>

    <div class="form-group">
      <label>متن تبلیغ</label>
      <textarea id="ad-text" rows="3" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical" placeholder="متن تبلیغ...">${editing ? escapeHtml(editing.text || '') : ''}</textarea>
    </div>

    <div class="form-group">
      <label>شماره تماس</label>
      <input type="tel" id="ad-phone" value="${editing ? escapeHtml(editing.phone || '') : ''}" placeholder="09121234567">
    </div>

    
    <div class="form-group">
      <label>عکس تبلیغ (اختیاری)</label>
      <input type="file" id="ad-image-input" accept="image/*" hidden>
      <button type="button" class="btn-cancel" id="ad-image-btn" style="width:100%;padding:10px;font-size:12px">
        📷 ${editing && editing.image ? 'تغییر عکس' : 'انتخاب عکس'}
      </button>
      <div id="ad-image-preview" style="text-align:center;margin-top:10px;${editing && editing.image ? '' : 'display:none'}">
        <img id="ad-image-img" src="${editing && editing.image ? editing.image : ''}" style="max-width:120px;max-height:120px;border-radius:10px;border:1px solid var(--border-color)">
        <button type="button" id="ad-image-remove" style="display:block;margin:8px auto 0;background:transparent;border:1px solid #EF4444;color:#EF4444;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">🗑️ حذف عکس</button>
      </div>
    </div>

    <div class="form-group">
      <label>جایگاه نمایش</label>
      <select id="ad-slot" style="width:100%">
        <option value="top" ${editing && normalizeSlot(editing.slot) === 'top' ? 'selected' : ''}>🟣 بالا</option>
        <option value="bottom" ${!editing || normalizeSlot(editing.slot) === 'bottom' ? 'selected' : ''}>🟣 پایین</option>
      </select>
    </div>

    <div class="form-group">
      <label>تعداد نمایش هدف *</label>
      <input type="number" id="ad-shows" value="${editing ? editing.totalShows || 100 : 100}" inputmode="numeric" placeholder="مثلاً: 100">
    </div>

    <div class="form-group">
      <label>مبلغ کل (تومان)</label>
      <input type="number" id="ad-cost" value="${editing ? editing.totalCost || 0 : 0}" inputmode="numeric" placeholder="مثلاً: 500000">
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="ad-cancel">انصراف</button>
      <button class="btn-primary" id="ad-save">${editing ? 'ذخیره' : 'ثبت تبلیغ'}</button>
    </div>
  `, { center: true });

  // 🔥 آپلود عکس تبلیغ
  let adImageData = editing ? (editing.image || null) : null;
  const adImageInput = overlay.querySelector('#ad-image-input');
  const adImageBtn = overlay.querySelector('#ad-image-btn');
  const adImagePreview = overlay.querySelector('#ad-image-preview');
  const adImageImg = overlay.querySelector('#ad-image-img');
  const adImageRemove = overlay.querySelector('#ad-image-remove');

  if (adImageBtn) {
    adImageBtn.onclick = () => adImageInput.click();
  }

  if (adImageInput) {
    adImageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 400;
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > MAX) { h = h * MAX / w; w = MAX; }
          } else {
            if (h > MAX) { w = w * MAX / h; h = MAX; }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          adImageData = canvas.toDataURL('image/jpeg', 0.7);

          adImageImg.src = adImageData;
          adImagePreview.style.display = 'block';
          adImageBtn.textContent = '📷 تغییر عکس';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  if (adImageRemove) {
    adImageRemove.onclick = () => {
      adImageData = null;
      adImagePreview.style.display = 'none';
      adImageInput.value = '';
      adImageBtn.textContent = '📷 انتخاب عکس';
    };
  }
  overlay.querySelector('#ad-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };

  overlay.querySelector('#ad-save').onclick = () => {
    const name = overlay.querySelector('#ad-name').value.trim();
    const text = overlay.querySelector('#ad-text').value.trim();
    const phone = overlay.querySelector('#ad-phone').value.trim();
    const slot = normalizeSlot(overlay.querySelector('#ad-slot').value);
    const totalShows = parseInt(overlay.querySelector('#ad-shows').value) || 0;
    const totalCost = parseInt(overlay.querySelector('#ad-cost').value.replace(/\D/g, '')) || 0;

    if (!name) {
      toast('نام تبلیغ‌دهنده را وارد کنید', 'error');
      return;
    }
    if (totalShows <= 0) {
      toast('تعداد نمایش را وارد کنید', 'error');
      return;
    }

    // حالت ویرایش
    if (editing) {
      const currentAds = getAds();
      currentAds[editIdx] = {
        ...currentAds[editIdx],
        name, text, phone, slot, totalShows, totalCost,
                image: adImageData,
      };
      saveAds(currentAds);
      toast('تبلیغ ویرایش شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 150);
      return;
    }

    // چک کن جایگاه پر هست یا نه
    const adsNow = getAds();
    const activeInSlot = adsNow.find(ad =>
      normalizeSlot(ad.slot) === slot &&
      ad.status === 'active' &&
      (ad.shownCount || 0) < (ad.totalShows || 0)
    );

    if (activeInSlot) {
      const slotLabel = slot === 'top' ? 'بالا' : 'پایین';
      const remaining = (activeInSlot.totalShows || 0) - (activeInSlot.shownCount || 0);

      closeModal(overlay);
      setTimeout(() => {
        const warnOverlay = showModal(`
          <h3 class="modal-title" style="color:#F59E0B">⚠️ جایگاه ${slotLabel} اشغال است</h3>

          <div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:16px">
            <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
              الان تبلیغ <strong>${escapeHtml(activeInSlot.name)}</strong> توی جایگاه ${slotLabel} فعاله.<br>
              <span style="font-size:11px;color:var(--text-muted)">${remaining} نمایش دیگه مونده تا تموم بشه.</span>
            </p>
          </div>

          <p style="font-size:13px;line-height:1.9;text-align:center;margin-bottom:14px">می‌خوای چیکار کنی؟</p>

          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-primary" id="warn-reserve" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff">
              ⏳ رزرو کن (توی صف بمونه)
            </button>
            <button class="btn-primary" id="warn-replace" style="background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">
              🗑️ تبلیغ قبلی رو پاک کن
            </button>
            <button class="btn-cancel" id="warn-cancel">انصراف</button>
          </div>
        `, { center: true });

        warnOverlay.querySelector('#warn-reserve').onclick = () => {
          closeModal(warnOverlay);
          const result = addAdWithReservation({ name, text, phone, slot, totalShows, totalCost, image: adImageData })
          if (result.error) {
            toast(result.error, 'error');
            return;
          }
          toast(`رزرو شد (اولویت ${result.priority})`, 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#warn-replace').onclick = () => {
          closeModal(warnOverlay);
          const adsNow2 = getAds();
          const activeIdx = adsNow2.indexOf(activeInSlot);
          if (activeIdx >= 0) {
            adsNow2.splice(activeIdx, 1);
          }
          const newAd = {
            name, text, phone, slot, totalShows, totalCost,
          
            id: 'ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            status: 'active',
            priority: null,
            shownCount: 0,
            createdAt: new Date().toISOString()
          };
          adsNow2.push(newAd);
          saveAds(adsNow2);
          toast('تبلیغ جدید فعال شد ✅', 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#warn-cancel').onclick = () => {
          closeModal(warnOverlay);
          setTimeout(openSettings, 150);
        };
      }, 150);
      return;
    }

    // جایگاه خالی → مستقیم فعال
    const result = addAdWithReservation({ name, text, phone, slot, totalShows, totalCost, image: adImageData })
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('تبلیغ ثبت و فعال شد ✅', 'success');
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };
}

// ==============================
// 📢 انتخاب تبلیغ فعال برای یه جایگاه
// ==============================
function getActiveAdForSlot(slot) {
  const normSlot = normalizeSlot(slot);
  const ads = getAds();
  const activeAds = ads.filter(ad =>
    normalizeSlot(ad.slot) === normSlot &&
    ad.status === 'active' &&
    (ad.shownCount || 0) < (ad.totalShows || 0)
  );
  if (activeAds.length === 0) return null;
  return activeAds[0];
}

// ==============================
// 📢 ساخت HTML تبلیغ (با تیتر راست‌چین و لوگوی تلگرام)
// ==============================
function buildAdHtml(ad) {
  if (!ad) return '';

  // لوگوی تلگرام (SVG)
  const telegramIcon = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#229ED9"/>
      <path d="M5.5 11.5L17.5 7L15.5 17.5L11.5 14L9 16L9.5 12.5L16 8.5L7.5 12.5L5.5 11.5Z" fill="#FFFFFF"/>
    </svg>
  `;

  if (ad.image) {
    return `
      <div style="margin:14px 0;padding:10px 0;border-top:1px solid #F0F0F0">
        <div style="font-size:12px;color:#8B5CF6;font-weight:700;text-align:right;margin-bottom:8px">
          ⭐ پیشنهاد ما
        </div>
        <div style="display:flex;align-items:center;gap:12px;direction:rtl">
          <img src="${ad.image}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;flex-shrink:0">
          <div style="flex:1;text-align:right">
            <div style="font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(ad.name)}</div>
            ${ad.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(ad.text)}</div>` : ''}
            ${ad.phone ? `<div style="font-size:11px;color:#8B5CF6;font-weight:700">📞 ${escapeHtml(ad.phone)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="margin:14px 0;padding:10px 0;border-top:1px solid #F0F0F0">
      <div style="font-size:12px;color:#8B5CF6;font-weight:700;text-align:right;margin-bottom:8px">
        ⭐ پیشنهاد ما
      </div>
      <div style="text-align:center">
        <div style="font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(ad.name)}</div>
        ${ad.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(ad.text)}</div>` : ''}
        ${ad.phone ? `<div style="font-size:11px;color:#8B5CF6;font-weight:700">📞 ${escapeHtml(ad.phone)}</div>` : ''}
      </div>
    </div>
  `;
}
// ==============================
// 📢 اضافه کردن تبلیغ با منطق رزرو
// ==============================
function addAdWithReservation(adData) {
  const ads = getAds();
  const slot = normalizeSlot(adData.slot);

  const activeInSlot = ads.find(ad =>
    normalizeSlot(ad.slot) === slot &&
    ad.status === 'active' &&
    (ad.shownCount || 0) < (ad.totalShows || 0)
  );

  const reservedInSlot = ads.filter(ad =>
    normalizeSlot(ad.slot) === slot &&
    ad.status === 'reserved'
  );

  if (activeInSlot) {
    if (reservedInSlot.length >= 10) {
      return { error: 'حداکثر ۱۰ تبلیغ رزرو در این جایگاه می‌تونه باشه' };
    }

    const maxPriority = reservedInSlot.reduce((max, ad) =>
      Math.max(max, ad.priority || 0), 0
    );

    const newAd = {
      ...adData,
      slot,
      id: 'ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      status: 'reserved',
      priority: maxPriority + 1,
      shownCount: 0,
      createdAt: new Date().toISOString()
    };

    ads.push(newAd);
    saveAds(ads);
    return { success: true, reserved: true, priority: newAd.priority, activeAd: activeInSlot };
  }

  const newAd = {
    ...adData,
    slot,
    id: 'ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    status: 'active',
    priority: null,
    shownCount: 0,
    createdAt: new Date().toISOString()
  };

  ads.push(newAd);
  saveAds(ads);
  return { success: true, reserved: false };
}

// ==============================
// 📢 بررسی و فعال‌سازی رزروها
// ==============================
function checkAndActivateReserved() {
  const ads = getAds();
    // 🔥 اطمینان از اینکه در هر اسلات فقط یک تبلیغ active وجود دارد
  ['top', 'bottom'].forEach(slot => {
    const activeInSlot = ads.filter(ad => normalizeSlot(ad.slot) === slot && ad.status === 'active' && (ad.shownCount || 0) < (ad.totalShows || 0));
    if (activeInSlot.length > 1) {
      for (let i = 1; i < activeInSlot.length; i++) {
        activeInSlot[i].status = 'reserved';
        activeInSlot[i].priority = (activeInSlot[i].priority || 0) + 10;
      }
    }
  });

  let changed = false;

  ['top', 'bottom'].forEach(slot => {
    const activeInSlot = ads.find(ad =>
      normalizeSlot(ad.slot) === slot &&
      ad.status === 'active' &&
      (ad.shownCount || 0) < (ad.totalShows || 0)
    );

    if (!activeInSlot) {
      const nextReserved = ads
        .filter(ad => normalizeSlot(ad.slot) === slot && ad.status === 'reserved')
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];

      if (nextReserved) {
        nextReserved.status = 'active';
        nextReserved.priority = null;
        nextReserved.shownCount = nextReserved.shownCount || 0;
        changed = true;

        const remainingReserved = ads
          .filter(ad => normalizeSlot(ad.slot) === slot && ad.status === 'reserved')
          .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        remainingReserved.forEach((ad, i) => {
          ad.priority = i + 1;
        });

        setTimeout(() => {
          toast(`تبلیغ رزرو فعال شد: ${nextReserved.name}`, 'success');
        }, 500);
      }
    }
  });

  if (changed) {
    saveAds(ads);
  }
}

// ==============================
// 🎂 اسپانسرهای تولد — داده
// ==============================
function getBirthdaySponsors() {
  return DB.get('birthdaySponsors', []);
}

function saveBirthdaySponsors(sponsors) {
  DB.set('birthdaySponsors', sponsors);
}

// ==============================
// 🎂 رندر لیست اسپانسرها
// ==============================
function renderBirthdaySponsorsList(container) {
  if (!container) return;

  const sponsors = getBirthdaySponsors();

  if (sponsors.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:12px;color:var(--text-muted)">
        هنوز اسپانسری نداری
      </div>
    `;
    return;
  }

  const activeSponsors = sponsors.filter(s => s.status === 'active' && (s.shownCount || 0) < (s.totalShows || 0));
  const reservedSponsors = sponsors
    .filter(s => s.status === 'reserved')
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  let html = '';

  if (activeSponsors.length > 0) {
    html += `<div style="font-size:11px;color:#10B981;margin-bottom:6px;font-weight:700">🟢 فعال (${activeSponsors.length})</div>`;
    html += activeSponsors.map(sponsor => {
      const idx = sponsors.indexOf(sponsor);
      return renderBirthdaySponsorCard(sponsor, idx, false);
    }).join('');
  }

  if (reservedSponsors.length > 0) {
    html += `<div style="font-size:11px;color:#F59E0B;margin:12px 0 6px 0;font-weight:700">⏳ رزرو شده (${reservedSponsors.length} از ۱۰)</div>`;
    html += reservedSponsors.map((sponsor, i) => {
      const idx = sponsors.indexOf(sponsor);
      const canUp = i > 0;
      const canDown = i < reservedSponsors.length - 1;
      return renderBirthdaySponsorCard(sponsor, idx, true, canUp, canDown);
    }).join('');
  }

  container.innerHTML = html;

  // ویرایش
  container.querySelectorAll('[data-edit-sponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.editSponsor);
      closeModal();
      setTimeout(() => openBirthdaySponsorForm(idx), 200);
    };
  });

  // حذف
  container.querySelectorAll('[data-delete-sponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.deleteSponsor);
      if (!confirm('این اسپانسر حذف بشه؟')) return;
      const sponsors = getBirthdaySponsors();
      sponsors.splice(idx, 1);
      saveBirthdaySponsors(sponsors);
      checkAndActivateSponsorReserved();
      toast('اسپانسر حذف شد', 'success');
      renderBirthdaySponsorsList(container);
    };
  });

  // صدور فاکتور
  container.querySelectorAll('[data-issue-invoice-sponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.issueInvoiceSponsor);
      const sponsors = getBirthdaySponsors();
      const sponsor = sponsors[idx];
      if (!sponsor) return;

      const issuedInvoices = DB.get('issuedInvoices', []);
      const alreadyIssued = issuedInvoices.find(inv => inv.itemId === sponsor.id && inv.type === 'birthdaySponsor');

      if (alreadyIssued) {
        if (!confirm(`برای این اسپانسر قبلاً فاکتور صادر شده (تاریخ: ${alreadyIssued.issuedAt}).\nدوباره صادر بشه؟`)) return;
      }

      closeModal();
      setTimeout(() => generateIssuedInvoice('birthdaySponsor', sponsor.id), 200);
    };
  });

  // اولویت
  container.querySelectorAll('[data-priority-up-sponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityUpSponsor);
      swapSponsorPriority(idx, 'up');
      renderBirthdaySponsorsList(container);
    };
  });

  container.querySelectorAll('[data-priority-down-sponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityDownSponsor);
      swapSponsorPriority(idx, 'down');
      renderBirthdaySponsorsList(container);
    };
  });
}

// ==============================
// 🎂 رندر کارت اسپانسر
// ==============================
function renderBirthdaySponsorCard(sponsor, idx, isReserved, canUp = false, canDown = false) {
  const slotLabel = normalizeSlot(sponsor.slot) === 'top' ? 'بالا' : 'پایین';
  const remaining = (sponsor.totalShows || 0) - (sponsor.shownCount || 0);

  return `
    <div style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.25);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:13px">🎂 ${escapeHtml(sponsor.name)}</strong>
        <span style="font-size:10px;background:rgba(236,72,153,0.25);color:#EC4899;padding:2px 8px;border-radius:10px;font-weight:700">
          ${slotLabel} ${isReserved ? '• اولویت ' + sponsor.priority : ''}
        </span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:8px">
        ${escapeHtml((sponsor.text || '').substring(0, 50))}${(sponsor.text || '').length > 50 ? '...' : ''}<br>
        📞 ${escapeHtml(sponsor.phone || '—')}<br>
        💰 ${(sponsor.totalCost || 0).toLocaleString()} تومان | 🎂 ${sponsor.shownCount || 0} از ${sponsor.totalShows || 0} ${isReserved ? `(وقتی فعال شد، ${remaining} تولد داره)` : `(${remaining} مونده)`}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${isReserved ? `
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canUp ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-up-sponsor="${idx}">▲</button>
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canDown ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-down-sponsor="${idx}">▼</button>
        ` : ''}
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px" data-edit-sponsor="${idx}">✏️ ویرایش</button>
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-delete-sponsor="${idx}">🗑️ حذف</button>
        <button class="btn-primary" style="flex-basis:100%;padding:8px;font-size:11px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;margin-top:4px" data-issue-invoice-sponsor="${idx}">📄 صدور فاکتور</button>
      </div>
    </div>
  `;
}

// ==============================
// 🎂 جابه‌جایی اولویت اسپانسرها
// ==============================
function swapSponsorPriority(idx, direction) {
  const sponsors = getBirthdaySponsors();
  const sponsor = sponsors[idx];
  if (!sponsor || sponsor.status !== 'reserved') return;

  const slot = normalizeSlot(sponsor.slot);
  const slotReserved = sponsors
    .filter(s => normalizeSlot(s.slot) === slot && s.status === 'reserved')
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  const currentPos = slotReserved.indexOf(sponsor);
  const targetPos = direction === 'up' ? currentPos - 1 : currentPos + 1;

  if (targetPos < 0 || targetPos >= slotReserved.length) return;

  const newOrder = slotReserved.slice();
  newOrder.splice(currentPos, 1);
  newOrder.splice(targetPos, 0, sponsor);

  newOrder.forEach((s, i) => {
    s.priority = i + 1;
  });

  saveBirthdaySponsors(sponsors);
  toast('اولویت تغییر کرد', 'success');
}


// ==============================
// 🎂 فرم تعریف اسپانسر
// ==============================
// ==============================
// 🎂 فرم تعریف اسپانسر
// ==============================
function openBirthdaySponsorForm(editIdx = null) {
  const sponsors = getBirthdaySponsors();
  const editing = editIdx !== null ? sponsors[editIdx] : null;

  const overlay = showModal(`
    <h3 class="modal-title">${editing ? '✏️ ویرایش اسپانسر' : '➕ اسپانسر جدید'}</h3>

    <div class="form-group">
      <label>نام اسپانسر *</label>
      <input type="text" id="sponsor-name" value="${editing ? escapeHtml(editing.name) : ''}" placeholder="مثلاً: شیرینی‌فروشی گل‌ها">
    </div>

    <div class="form-group">
      <label>متن هدیه/تخفیف</label>
      <textarea id="sponsor-text" rows="3" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical" placeholder="مثلاً: ۳۰٪ تخفیف کیک تولد">${editing ? escapeHtml(editing.text || '') : ''}</textarea>
    </div>

    <div class="form-group">
      <label>شماره تماس</label>
      <input type="tel" id="sponsor-phone" value="${editing ? escapeHtml(editing.phone || '') : ''}" placeholder="09121234567">
    </div>

    <div class="form-group">
      <label>عکس اسپانسر (اختیاری)</label>
      <input type="file" id="sponsor-image-input" accept="image/*" hidden>
      <button type="button" class="btn-cancel" id="sponsor-image-btn" style="width:100%;padding:10px;font-size:12px">
        📷 ${editing && editing.image ? 'تغییر عکس' : 'انتخاب عکس'}
      </button>
      <div id="sponsor-image-preview" style="text-align:center;margin-top:10px;${editing && editing.image ? '' : 'display:none'}">
        <img id="sponsor-image-img" src="${editing && editing.image ? editing.image : ''}" style="max-width:120px;max-height:120px;border-radius:10px;border:1px solid var(--border-color)">
        <button type="button" id="sponsor-image-remove" style="display:block;margin:8px auto 0;background:transparent;border:1px solid #EF4444;color:#EF4444;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">🗑️ حذف عکس</button>
      </div>
    </div>

    <div class="form-group">
      <label>جایگاه نمایش</label>
      <select id="sponsor-slot" style="width:100%">
        <option value="top" ${editing && normalizeSlot(editing.slot) === 'top' ? 'selected' : ''}>🟣 بالا</option>
        <option value="bottom" ${!editing || normalizeSlot(editing.slot) === 'bottom' ? 'selected' : ''}>🟣 پایین</option>
      </select>
    </div>

    <div class="form-group">
      <label>تعداد تولد هدف *</label>
      <input type="number" id="sponsor-shows" value="${editing ? editing.totalShows || 50 : 50}" inputmode="numeric" placeholder="مثلاً: 50">
    </div>

    <div class="form-group">
      <label>مبلغ کل (تومان)</label>
      <input type="number" id="sponsor-cost" value="${editing ? editing.totalCost || 0 : 0}" inputmode="numeric" placeholder="مثلاً: 1000000">
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="sponsor-cancel">انصراف</button>
      <button class="btn-primary" id="sponsor-save">${editing ? 'ذخیره' : 'ثبت اسپانسر'}</button>
    </div>
  `, { center: true });

  // 📷 آپلود عکس اسپانسر تولد
  let sponsorImageData = editing ? (editing.image || null) : null;
  const sponsorImageInput = overlay.querySelector('#sponsor-image-input');
  const sponsorImageBtn = overlay.querySelector('#sponsor-image-btn');
  const sponsorImagePreview = overlay.querySelector('#sponsor-image-preview');
  const sponsorImageImg = overlay.querySelector('#sponsor-image-img');
  const sponsorImageRemove = overlay.querySelector('#sponsor-image-remove');

  if (sponsorImageBtn && sponsorImageInput) {
    sponsorImageBtn.onclick = () => sponsorImageInput.click();
    sponsorImageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
          else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          sponsorImageData = canvas.toDataURL('image/jpeg', 0.7);
          if (sponsorImageImg) sponsorImageImg.src = sponsorImageData;
          if (sponsorImagePreview) sponsorImagePreview.style.display = 'block';
          if (sponsorImageBtn) sponsorImageBtn.textContent = '📷 تغییر عکس';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  if (sponsorImageRemove) {
    sponsorImageRemove.onclick = () => {
      sponsorImageData = null;
      if (sponsorImagePreview) sponsorImagePreview.style.display = 'none';
      if (sponsorImageInput) sponsorImageInput.value = '';
      if (sponsorImageBtn) sponsorImageBtn.textContent = '📷 انتخاب عکس';
    };
  }

  overlay.querySelector('#sponsor-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };

  overlay.querySelector('#sponsor-save').onclick = () => {
    const name = overlay.querySelector('#sponsor-name').value.trim();
    const text = overlay.querySelector('#sponsor-text').value.trim();
    const phone = overlay.querySelector('#sponsor-phone').value.trim();
    const slot = normalizeSlot(overlay.querySelector('#sponsor-slot').value);
    const totalShows = parseInt(overlay.querySelector('#sponsor-shows').value) || 0;
    const totalCost = parseInt(overlay.querySelector('#sponsor-cost').value.replace(/\D/g, '')) || 0;

    if (!name) { toast('نام اسپانسر را وارد کنید', 'error'); return; }
    if (totalShows <= 0) { toast('تعداد تولد را وارد کنید', 'error'); return; }

    if (editing) {
      const currentSponsors = getBirthdaySponsors();
      currentSponsors[editIdx] = { ...currentSponsors[editIdx], name, text, phone, slot, totalShows, totalCost, image: sponsorImageData };
      saveBirthdaySponsors(currentSponsors);
      toast('اسپانسر ویرایش شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 150);
      return;
    }

    const sponsorsNow = getBirthdaySponsors();
    const activeInSlot = sponsorsNow.find(s => normalizeSlot(s.slot) === slot && s.status === 'active' && (s.shownCount || 0) < (s.totalShows || 0));

    if (activeInSlot) {
      const slotLabel = slot === 'top' ? 'بالا' : 'پایین';
      const remaining = (activeInSlot.totalShows || 0) - (activeInSlot.shownCount || 0);
      closeModal(overlay);
      setTimeout(() => {
        const warnOverlay = showModal(`
          <h3 class="modal-title" style="color:#F59E0B">⚠️ جایگاه ${slotLabel} اشغال است</h3>
          <div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:16px">
            <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
              الان اسپانسر <strong>${escapeHtml(activeInSlot.name)}</strong> توی جایگاه ${slotLabel} فعاله.<br>
              <span style="font-size:11px;color:var(--text-muted)">${remaining} تولد دیگه مونده تا تموم بشه.</span>
            </p>
          </div>
          <p style="font-size:13px;line-height:1.9;text-align:center;margin-bottom:14px">می‌خوای چیکار کنی؟</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-primary" id="warn-reserve" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff">⏳ رزرو کن</button>
            <button class="btn-primary" id="warn-replace" style="background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">🗑️ قبلی رو پاک کن</button>
            <button class="btn-cancel" id="warn-cancel">انصراف</button>
          </div>
        `, { center: true });

        warnOverlay.querySelector('#warn-reserve').onclick = () => {
          closeModal(warnOverlay);
          const result = addSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: sponsorImageData });
          if (result.error) { toast(result.error, 'error'); return; }
          toast(`رزرو شد (اولویت ${result.priority})`, 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#warn-replace').onclick = () => {
          closeModal(warnOverlay);
          const sponsorsNow2 = getBirthdaySponsors();
          const activeIdx = sponsorsNow2.indexOf(activeInSlot);
          if (activeIdx >= 0) sponsorsNow2.splice(activeIdx, 1);
          sponsorsNow2.push({ name, text, phone, slot, totalShows, totalCost, image: sponsorImageData, id: 'sp_' + Date.now(), status: 'active', priority: null, shownCount: 0, createdAt: new Date().toISOString() });
          saveBirthdaySponsors(sponsorsNow2);
          toast('اسپانسر جدید فعال شد ✅', 'success');
          setTimeout(openSettings, 200);
        };
        warnOverlay.querySelector('#warn-cancel').onclick = () => { closeModal(warnOverlay); setTimeout(openSettings, 150); };
      }, 150);
      return;
    }

    const result = addSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: sponsorImageData });
    if (result.error) { toast(result.error, 'error'); return; }
    toast('اسپانسر ثبت و فعال شد ✅', 'success');
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };


  overlay.querySelector('#sponsor-save').onclick = () => {
    const name = overlay.querySelector('#sponsor-name').value.trim();
    const text = overlay.querySelector('#sponsor-text').value.trim();
    const phone = overlay.querySelector('#sponsor-phone').value.trim();
    const slot = normalizeSlot(overlay.querySelector('#sponsor-slot').value);
    const totalShows = parseInt(overlay.querySelector('#sponsor-shows').value) || 0;
    const totalCost = parseInt(overlay.querySelector('#sponsor-cost').value.replace(/\D/g, '')) || 0;

    if (!name) {
      toast('نام اسپانسر را وارد کنید', 'error');
      return;
    }
    if (totalShows <= 0) {
      toast('تعداد تولد را وارد کنید', 'error');
      return;
    }

    // حالت ویرایش
    if (editing) {
      const currentSponsors = getBirthdaySponsors();
      currentSponsors[editIdx] = {
        ...currentSponsors[editIdx],
        name, text, phone, slot, totalShows, totalCost,
        image: sponsorImageData
      };
      saveBirthdaySponsors(currentSponsors);
      toast('اسپانسر ویرایش شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 150);
      return;
    }

    // چک کن جایگاه پر هست یا نه
    const sponsorsNow = getBirthdaySponsors();
    const activeInSlot = sponsorsNow.find(s =>
      normalizeSlot(s.slot) === slot &&
      s.status === 'active' &&
      (s.shownCount || 0) < (s.totalShows || 0)
    );

    if (activeInSlot) {
      const slotLabel = slot === 'top' ? 'بالا' : 'پایین';
      const remaining = (activeInSlot.totalShows || 0) - (activeInSlot.shownCount || 0);

      closeModal(overlay);
      setTimeout(() => {
        const warnOverlay = showModal(`
          <h3 class="modal-title" style="color:#F59E0B">⚠️ جایگاه ${slotLabel} اشغال است</h3>
          <div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:16px">
            <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
              الان اسپانسر <strong>${escapeHtml(activeInSlot.name)}</strong> توی جایگاه ${slotLabel} فعاله.<br>
              <span style="font-size:11px;color:var(--text-muted)">${remaining} تولد دیگه مونده تا تموم بشه.</span>
            </p>
          </div>
          <p style="font-size:13px;line-height:1.9;text-align:center;margin-bottom:14px">می‌خوای چیکار کنی؟</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-primary" id="warn-reserve" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff">⏳ رزرو کن (توی صف بمونه)</button>
            <button class="btn-primary" id="warn-replace" style="background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">🗑️ اسپانسر قبلی رو پاک کن</button>
            <button class="btn-cancel" id="warn-cancel">انصراف</button>
          </div>
        `, { center: true });

        warnOverlay.querySelector('#warn-reserve').onclick = () => {
          closeModal(warnOverlay);
          const result = addSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: sponsorImageData });
          if (result.error) { toast(result.error, 'error'); return; }
          toast(`رزرو شد (اولویت ${result.priority})`, 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#warn-replace').onclick = () => {
          closeModal(warnOverlay);
          const sponsorsNow2 = getBirthdaySponsors();
          const activeIdx = sponsorsNow2.indexOf(activeInSlot);
          if (activeIdx >= 0) sponsorsNow2.splice(activeIdx, 1);
          
          const newSponsor = {
            name, text, phone, slot, totalShows, totalCost, image: sponsorImageData,
            id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            status: 'active', priority: null, shownCount: 0,
            createdAt: new Date().toISOString()
          };
          sponsorsNow2.push(newSponsor);
          saveBirthdaySponsors(sponsorsNow2);
          toast('اسپانسر جدید فعال شد ✅', 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#warn-cancel').onclick = () => {
          closeModal(warnOverlay);
          setTimeout(openSettings, 150);
        };
      }, 150);
      return;
    }

    // جایگاه خالی → مستقیم فعال
    const result = addSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: sponsorImageData });
    if (result.error) { toast(result.error, 'error'); return; }
    toast('اسپانسر ثبت و فعال شد ✅', 'success');
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };
}


// ==============================
// 🎂 اضافه کردن اسپانسر با منطق رزرو
// ==============================
function addSponsorWithReservation(sponsorData) {
  const sponsors = getBirthdaySponsors();
  const slot = normalizeSlot(sponsorData.slot);

  const activeInSlot = sponsors.find(s =>
    normalizeSlot(s.slot) === slot &&
    s.status === 'active' &&
    (s.shownCount || 0) < (s.totalShows || 0)
  );

  const reservedInSlot = sponsors.filter(s =>
    normalizeSlot(s.slot) === slot &&
    s.status === 'reserved'
  );

  if (activeInSlot) {
    if (reservedInSlot.length >= 10) {
      return { error: 'حداکثر ۱۰ اسپانسر رزرو در این جایگاه می‌تونه باشه' };
    }

    const maxPriority = reservedInSlot.reduce((max, s) =>
      Math.max(max, s.priority || 0), 0
    );

    const newSponsor = {
      ...sponsorData,
      slot,
      id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      status: 'reserved',
      priority: maxPriority + 1,
      shownCount: 0,
      createdAt: new Date().toISOString()
    };

    sponsors.push(newSponsor);
    saveBirthdaySponsors(sponsors);
    return { success: true, reserved: true, priority: newSponsor.priority, activeSponsor: activeInSlot };
  }

  const newSponsor = {
    ...sponsorData,
    slot,
    id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    status: 'active',
    priority: null,
    shownCount: 0,
    createdAt: new Date().toISOString()
  };

  sponsors.push(newSponsor);
  saveBirthdaySponsors(sponsors);
  return { success: true, reserved: false };
}

// ==============================
// 🎂 بررسی و فعال‌سازی رزروهای اسپانسر
// ==============================
function checkAndActivateSponsorReserved() {
  const sponsors = getBirthdaySponsors();
  let changed = false;

  ['top', 'bottom'].forEach(slot => {
    const activeInSlot = sponsors.find(s =>
      normalizeSlot(s.slot) === slot &&
      s.status === 'active' &&
      (s.shownCount || 0) < (s.totalShows || 0)
    );

    if (!activeInSlot) {
      const nextReserved = sponsors
        .filter(s => normalizeSlot(s.slot) === slot && s.status === 'reserved')
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];

      if (nextReserved) {
        nextReserved.status = 'active';
        nextReserved.priority = null;
        nextReserved.shownCount = nextReserved.shownCount || 0;
        changed = true;

        const remainingReserved = sponsors
          .filter(s => normalizeSlot(s.slot) === slot && s.status === 'reserved')
          .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        remainingReserved.forEach((s, i) => {
          s.priority = i + 1;
        });

        setTimeout(() => {
          toast(`اسپانسر رزرو فعال شد: ${nextReserved.name}`, 'success');
        }, 500);
      }
    }
  });

  if (changed) {
    saveBirthdaySponsors(sponsors);
  }
}

// ==============================
// 📄 رندر لیست فاکتورهای صادرشده
// ==============================
function renderIssuedInvoicesList(container) {
  if (!container) return;

  const invoices = DB.get('issuedInvoices', []);

  if (invoices.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:12px;color:var(--text-muted)">
        هنوز فاکتوری صادر نکردی
      </div>
    `;
    return;
  }

  // مرتب‌سازی از جدیدترین
  const sorted = invoices.slice().sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  container.innerHTML = sorted.map((inv, idx) => {
    const isAd = inv.type === 'ad';
    const icon = isAd ? '📢' : '🎂';
    const label = isAd ? 'تبلیغ' : 'اسپانسر تولد';
    const color = isAd ? '#8B5CF6' : '#EC4899';
    const bgColor = isAd ? 'rgba(139,92,246,0.1)' : 'rgba(236,72,153,0.08)';
    const borderColor = isAd ? 'rgba(139,92,246,0.3)' : 'rgba(236,72,153,0.25)';

    const realIdx = invoices.indexOf(inv);

    return `
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong style="font-size:13px">${icon} ${escapeHtml(inv.itemName)}</strong>
          <span style="font-size:10px;background:${color}30;color:${color};padding:2px 8px;border-radius:10px;font-weight:700">
            ${label}
          </span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:8px">
          ${inv.itemDesc ? `📝 ${escapeHtml(inv.itemDesc)}<br>` : ''}
          📊 ${escapeHtml(inv.itemCount || '—')}<br>
          💰 ${(inv.itemCost || 0).toLocaleString()} تومان<br>
          📅 ${escapeHtml(inv.issuedAt || '—')}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-delete-issued="${realIdx}">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');

  // حذف
  container.querySelectorAll('[data-delete-issued]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.deleteIssued);
      if (!confirm('این فاکتور از تاریخچه حذف بشه؟ (عکسی که ذخیره کردی دست‌نخورده می‌مونه)')) return;
      const invoices = DB.get('issuedInvoices', []);
      invoices.splice(idx, 1);
      DB.set('issuedInvoices', invoices);
      toast('فاکتور از تاریخچه حذف شد', 'success');
      renderIssuedInvoicesList(container);
    };
  });
}

// ==============================
// 🎂 انتخاب اسپانسر فعال برای یه جایگاه
// ==============================
function getActiveSponsorForSlot(slot) {
  const normSlot = normalizeSlot(slot);
  const sponsors = getBirthdaySponsors();
  const activeSponsors = sponsors.filter(s =>
    normalizeSlot(s.slot) === normSlot &&
    s.status === 'active' &&
    (s.shownCount || 0) < (s.totalShows || 0)
  );
  if (activeSponsors.length === 0) return null;
  return activeSponsors[0];
}

// ==============================
// 🎂 ساخت HTML اسپانسر برای پیام تولد
// ==============================
function buildSponsorHtml(sponsor) {
  if (!sponsor) return '';

  if (sponsor.image) {
    return `
      <div style="margin:12px 0;padding:10px 0;border-top:1px solid #F0F0F0;border-bottom:1px solid #F0F0F0">
        <div style="font-size:11px;color:#EC4899;font-weight:700;text-align:right;margin-bottom:8px">
          🎁 هدیه‌ی ${escapeHtml(sponsor.name)}
        </div>
        <div style="display:flex;align-items:center;gap:12px;direction:rtl">
          <img src="${sponsor.image}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;flex-shrink:0">
          <div style="flex:1;text-align:right">
            <div style="font-size:13px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(sponsor.name)}</div>
            ${sponsor.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(sponsor.text)}</div>` : ''}
            ${sponsor.phone ? `<div style="font-size:11px;color:#EC4899;font-weight:700">📞 ${escapeHtml(sponsor.phone)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="margin:12px 0;padding:10px 0;border-top:1px solid #F0F0F0;border-bottom:1px solid #F0F0F0">
      <div style="font-size:11px;color:#EC4899;font-weight:700;text-align:right;margin-bottom:8px">
        🎁 هدیه‌ی ${escapeHtml(sponsor.name)}
      </div>
      <div style="text-align:center">
        <div style="font-size:13px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(sponsor.name)}</div>
        ${sponsor.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(sponsor.text)}</div>` : ''}
        ${sponsor.phone ? `<div style="font-size:11px;color:#EC4899;font-weight:700">📞 ${escapeHtml(sponsor.phone)}</div>` : ''}
      </div>
    </div>
  `;
}


// ==============================
// 📷 ساخت عکس پیام تبریک تولد
// ==============================
async function generateBirthdayImage(customerId, quoteText, messageText) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('مشتری پیدا نشد', 'error');
    return;
  }

  toast('در حال ساخت عکس...', 'info');

  const b = state.business;
  const age = calculateAge(c.birthDate);
  const today = getTodayShamsi();

  // 🔥 اسپانسرهای فعال
  const sponsorTop = getActiveSponsorForSlot('top');
  const sponsorBottom = getActiveSponsorForSlot('bottom');

  // 🔥 عکس کیک
  const cakeHtml = b.birthdayImage
    ? `<img src="${b.birthdayImage}" style="width:130px;height:130px;object-fit:cover;border-radius:50%;box-shadow:0 4px 20px rgba(236,72,153,0.3)">`
    : `
      <svg width="130" height="130" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="95" rx="45" ry="6" fill="#E8D5B7"/>
        <rect x="20" y="60" width="80" height="35" rx="4" fill="#F5E6D3"/>
        <rect x="20" y="55" width="80" height="10" rx="4" fill="#FFB6C1"/>
        <rect x="20" y="75" width="80" height="8" fill="#8B4513" opacity="0.7"/>
        <rect x="35" y="40" width="4" height="18" fill="#FFD700"/>
        <rect x="58" y="35" width="4" height="23" fill="#FF69B4"/>
        <rect x="81" y="40" width="4" height="18" fill="#87CEEB"/>
        <ellipse cx="37" cy="36" rx="3" ry="5" fill="#FF4500"/>
        <ellipse cx="37" cy="35" rx="2" ry="3" fill="#FFD700"/>
        <ellipse cx="60" cy="31" rx="3" ry="5" fill="#FF4500"/>
        <ellipse cx="60" cy="30" rx="2" ry="3" fill="#FFD700"/>
        <ellipse cx="83" cy="36" rx="3" ry="5" fill="#FF4500"/>
        <ellipse cx="83" cy="35" rx="2" ry="3" fill="#FFD700"/>
        <circle cx="30" cy="65" r="3" fill="#FF1493"/>
        <circle cx="45" cy="65" r="3" fill="#00CED1"/>
        <circle cx="60" cy="65" r="3" fill="#FFD700"/>
        <circle cx="75" cy="65" r="3" fill="#FF1493"/>
        <circle cx="90" cy="65" r="3" fill="#00CED1"/>
      </svg>
    `;

  // 🔥 لوگو کسب‌وکار
  const logoHtml = b.logo
    ? `<img src="${b.logo}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8px">`
        : `<img src="assets/icon-192.png" style="width:50px;height:50px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`;

  // 🔥 متن پیام
  const messageHtml = escapeHtml(messageText).replace(/\n/g, '<br>');

  // 🔥 container مخفی
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
  container.innerHTML = `
    <div id="birthday-canvas" style="
      width: 500px;
      background: linear-gradient(180deg, #FFF5F7 0%, #FFFFFF 100%);
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      color: #1a1a1a;
      padding: 0;
      position: relative;
      direction: rtl;
      overflow: hidden;
    ">
      <div style="height:8px;background:linear-gradient(90deg,#EC4899,#F472B6,#EC4899)"></div>

      <div style="padding: 30px 35px 25px 35px; position: relative; z-index: 1">
        <div style="text-align:center;margin-bottom:20px">
          ${logoHtml}
          <div style="font-size:14px;font-weight:700;color:#333">${escapeHtml(b.name)}</div>
          <div style="font-size:10px;color:#999;margin-top:2px">${escapeHtml(b.job)}</div>
        </div>

        <div style="text-align:center;margin:20px 0 24px 0">
          ${cakeHtml}
        </div>

        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:22px;font-weight:800;color:#EC4899;margin-bottom:6px">
            🎂 تولدت مبارک 🎂
          </div>
          <div style="font-size:14px;color:#666">${escapeHtml(c.fullName)}${age ? ` (${age} ساله)` : ''}</div>
        </div>

        ${sponsorTop ? buildSponsorHtml(sponsorTop) : ''}

        <div style="background:#FFFFFF;border:1px solid #FCE7F3;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
          <div style="font-size:13px;color:#444;line-height:2.2">${messageHtml}</div>
        </div>

        ${quoteText ? `
          <div style="background:rgba(236,72,153,0.08);border-radius:10px;padding:12px;margin:14px 0;text-align:center">
            <div style="font-size:12px;color:#666;font-style:italic;line-height:1.9">«${escapeHtml(quoteText)}»</div>
          </div>
        ` : ''}

        ${sponsorBottom ? buildSponsorHtml(sponsorBottom) : ''}

        <div style="text-align:center;font-size:10px;color:#aaa;margin-top:16px">
          📅 ${today}
        </div>

        <div style="height:1px;background:linear-gradient(90deg,transparent,#FCE7F3,transparent);margin:16px 0 12px 0"></div>
        <div style="text-align:center;font-size:10px;color:#aaa">
<div style="display:inline-flex;align-items:center;gap:5px;vertical-align:middle">
  <span>ساخته‌شده با</span>
  <img src="assets/icon-192.png" style="width:14px;height:14px;border-radius:50%;vertical-align:middle">
  <span style="font-weight:700;color:#EC4899">چشمک</span>
</div>        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 500));

  try {
    const target = container.querySelector('#birthday-canvas');
    const canvas = await html2canvas(target, {
      backgroundColor: '#FFF5F7',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast('خطا در ساخت عکس', 'error');
        container.remove();
        return;
      }

      const fileName = `تبریک-${c.fullName}-${today.replace(/\//g, '-')}.png`;

      incrementSponsorShownCount(sponsorTop);
      incrementSponsorShownCount(sponsorBottom);

      container.remove();
      showBirthdayImagePreview(blob, fileName, c);
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    toast('خطا در ساخت عکس', 'error');
    container.remove();
  }
}

// ==============================
// 📷 پیش‌نمایش عکس تبریک
// ==============================
function showBirthdayImagePreview(blob, fileName, customer) {
  const url = URL.createObjectURL(blob);

  const overlay = showModal(`
    <h3 class="modal-title">🎂 عکس تبریک آماده شد</h3>
    <div style="text-align:center;margin-bottom:16px">
      <img src="${url}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(236,72,153,0.3)">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="bdi-share" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 اشتراک‌گذاری</button>
      <button class="btn-cancel" id="bdi-download">💾 دانلود عکس</button>
      <button class="btn-cancel" id="bdi-close">بستن</button>
    </div>
  `);

  overlay.querySelector('#bdi-close').onclick = () => {
    URL.revokeObjectURL(url);
    closeModal(overlay);
  };

  overlay.querySelector('#bdi-download').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  overlay.querySelector('#bdi-share').onclick = async () => {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'تبریک تولد',
          text: `تبریک تولد ${customer.fullName}`,
        });
      } else {
        toast('اشتراک‌گذاری پشتیبانی نمی‌شه', 'error');
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };
}

// ==============================
// 🎂 افزایش شمارنده اسپانسر
// ==============================
function incrementSponsorShownCount(sponsor) {
  if (!sponsor) return;
  const sponsors = getBirthdaySponsors();
  const target = sponsors.find(s => s.id === sponsor.id);
  if (!target) return;
  target.shownCount = (target.shownCount || 0) + 1;
  saveBirthdaySponsors(sponsors);

  if (target.shownCount >= target.totalShows) {
    checkAndActivateSponsorReserved();
  }
}


// 🌊 مخفی کردن Splash Screen بعد از بارگذاری
function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      splash.remove();
    }, 400);
  }
}

// ==============================
// شروع
// ==============================
// ==============================
// شروع
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  init();                        // 🚀 اول init
  setTimeout(hideSplashScreen, 1500);  // 🌊 بعد از ۱.۵ ثانیه Splash رو مخفی کن
});

