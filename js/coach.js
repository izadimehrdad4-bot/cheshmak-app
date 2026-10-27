/* ==============================
   چشمک - بخش مخصوص مربی
   ============================== */

// ==============================
// 🏋️ تشخیص حالت مربی
// ==============================
function isCoachJob(jobText) {
  if (!jobText || typeof jobText !== 'string') return false;
  let j = jobText.trim();
  j = j.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  return j.includes('مربی');
}

// ==============================
// 🏋️ مودال نوع مربیگری
// ==============================
function askCoachType() {
  return new Promise((resolve) => {
    const overlay = showModal(`
      <h3 class="modal-title">🏋️ نوع مربیگری</h3>
      <p style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:14px;line-height:1.8">
        لطفاً نوع مربیگری خود را وارد کنید.<br>
        <span style="font-size:11px">مثلاً: بدنسازی، بوکس، شنا، فوتبال، یوگا و...</span>
      </p>
      <div class="form-group">
        <label>نوع مربیگری *</label>
        <input type="text" id="coach-type-input" placeholder="مثلاً: بدنسازی">
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="coach-type-cancel">انصراف</button>
        <button class="btn-primary" id="coach-type-confirm">تأیید</button>
      </div>
    `, { center: true, noCloseOnOverlay: true });

    const input = overlay.querySelector('#coach-type-input');
    input.focus();

    const confirm = () => {
      const val = input.value.trim();
      if (!val) {
        toast('نوع مربیگری را وارد کنید', 'error');
        return;
      }
      closeModal(overlay);
      resolve(val);
    };

    overlay.querySelector('#coach-type-confirm').onclick = confirm;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
    });
    overlay.querySelector('#coach-type-cancel').onclick = () => {
      closeModal(overlay);
      resolve(null);
    };
  });
}

// ==============================
// 🏋️ اسم خطاب مشتری در حالت مربی
// ==============================
function getCoachCustomerTitle() {
  // اگه کاربر مربی نیست → همون عنوان قبلی
  if (!state.business || state.business.bizType !== 'coach') {
    return getCustomerTitle();
  }
  // اگه مربی هست → عنوان انتخابی یا پیش‌فرض «شاگرد»
  return state.business.customerTitle || 'شاگرد';
}

// ==============================
// 🏋️ گزینه‌های اسم خطاب مربی
// ==============================
function getCoachTitleOptions() {
  return [
    { value: 'شاگرد', label: '🏋️ شاگرد' },
    { value: 'هنرجو', label: '🎓 هنرجو' },
    { value: 'ورزشکار', label: '🏆 ورزشکار' },
  ];
}

function getCoachExtraFieldsHtml(editing = null) {
  const height = editing ? (editing.height || '') : '';
  const weight = editing ? (editing.weight || '') : '';
  const medals = editing ? (editing.medals || '') : '';
  const trainingStart = editing ? (editing.trainingStart || '') : '';
  const tuition = editing ? (editing.tuition || '') : '';
  const totalSessions = editing ? (editing.totalSessions || '') : '';
  const lastPaymentDate = editing ? (editing.lastPaymentDate || '') : '';
  const tuitionPaid = editing ? (editing.tuitionPaid === true) : false;
  const image = editing ? (editing.image || '') : '';

  const validityPeriod = editing ? (editing.validityPeriod || { amount: 1, unit: 'month' }) : { amount: 1, unit: 'month' };
  const validityAmount = validityPeriod.amount || 1;
  const validityUnit = validityPeriod.unit || 'month';

  const validityOptions = [
    { value: '1d', label: '۱ روز', amount: 1, unit: 'day' },
    { value: '3d', label: '۳ روز', amount: 3, unit: 'day' },
    { value: '1w', label: '۱ هفته', amount: 1, unit: 'week' },
    { value: '2w', label: '۲ هفته', amount: 2, unit: 'week' },
    { value: '1m', label: '۱ ماه', amount: 1, unit: 'month' },
    { value: '2m', label: '۲ ماه', amount: 2, unit: 'month' },
    { value: '3m', label: '۳ ماه', amount: 3, unit: 'month' },
    { value: '6m', label: '۶ ماه', amount: 6, unit: 'month' },
    { value: '1y', label: '۱ سال', amount: 12, unit: 'month' },
    { value: 'custom', label: '⚙️ سفارشی', amount: validityAmount, unit: validityUnit },
  ];

  const currentValidityValue = `${validityAmount}${validityUnit === 'day' ? 'd' : validityUnit === 'week' ? 'w' : 'm'}`;
  const isCustom = !validityOptions.some(o => o.value === currentValidityValue && o.value !== 'custom');

  return `

      <!-- 📷 عکس شاگرد -->
      <div style="text-align:center;margin-bottom:16px">
        <label for="cust-image-input" style="cursor:pointer;display:inline-block;position:relative">
          <div id="cust-image-circle" style="width:90px;height:90px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-size:36px;overflow:hidden;border:3px solid #3B82F6">
            ${image
              ? `<img id="cust-image-preview" src="${image}" style="width:100%;height:100%;object-fit:cover">`
              : `<span id="cust-image-icon">🏋️</span><img id="cust-image-preview" src="" style="width:100%;height:100%;object-fit:cover;display:none">`}
          </div>
          <div style="position:absolute;bottom:0;right:0;width:30px;height:30px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);color:#fff">📷</div>
        </label>
        <input type="file" id="cust-image-input" accept="image/*" hidden>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">برای انتخاب عکس کلیک کنید</p>
      </div>

    <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border-color)">
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;text-align:center">🏋️ اطلاعات ورزشی</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group" style="margin-bottom:0">
          <label>قد (سانتی‌متر)</label>
          <input type="number" id="cust-height" value="${height}" inputmode="numeric" placeholder="مثلاً: 175">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>وزن (کیلوگرم)</label>
          <input type="number" id="cust-weight" value="${weight}" inputmode="numeric" placeholder="مثلاً: 70">
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label>مدال / قهرمانی</label>
        <textarea id="cust-medals" rows="2" placeholder="مثلاً: مدال طلای کشوری ۱۴۰۲" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical">${escapeHtml(medals)}</textarea>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label>تاریخ شروع تمرین</label>
        <input type="text" id="cust-training-start" value="${trainingStart}" placeholder="برای انتخاب کلیک کنید" readonly style="cursor:pointer">
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border-color)">
        <p style="font-size:12px;color:#10B981;margin-bottom:10px;text-align:center;font-weight:700">💰 اطلاعات شهریه</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="form-group" style="margin-bottom:0">
            <label>مبلغ شهریه (تومان)</label>
            <input type="number" id="cust-tuition" value="${tuition}" inputmode="numeric" placeholder="۵۰۰۰۰۰">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>تعداد جلسه</label>
            <input type="number" id="cust-total-sessions" value="${totalSessions}" inputmode="numeric" placeholder="مثلاً: ۱۲">
          </div>
        </div>

        <div class="form-group" style="margin-top:12px">
          <label>⏰ مدت اعتبار</label>
          <select id="cust-validity" style="width:100%">
            ${validityOptions.map(o =>
              `<option value="${o.value}" ${o.value === currentValidityValue ? 'selected' : ''}>${o.label}</option>`
            ).join('')}
          </select>
        </div>

        <div id="cust-validity-custom" style="display:${isCustom ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          <div class="form-group" style="margin-bottom:0">
            <label>عدد</label>
            <input type="number" id="cust-validity-amount" value="${validityAmount}" inputmode="numeric" placeholder="مثلاً: ۴۵">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>واحد</label>
            <select id="cust-validity-unit">
              <option value="day" ${validityUnit === 'day' ? 'selected' : ''}>روز</option>
              <option value="week" ${validityUnit === 'week' ? 'selected' : ''}>هفته</option>
              <option value="month" ${validityUnit === 'month' ? 'selected' : ''}>ماه</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top:12px">
          <label>📅 تاریخ پرداخت (شروع دوره)</label>
          <input type="text" id="cust-last-payment-date" value="${lastPaymentDate}" placeholder="برای انتخاب کلیک کنید" readonly style="cursor:pointer">
          <p style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.6">
            💡 هر بار شاگرد شهریه داد، این تاریخ و مدت اعتبار رو به‌روز کن.
          </p>
        </div>

        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;background:rgba(16,185,129,0.08);border-radius:10px;margin-top:12px">
          <input type="checkbox" id="cust-tuition-paid" style="width:18px;height:18px;cursor:pointer" ${tuitionPaid ? 'checked' : ''}>
          <span style="font-size:13px">✅ شهریه پرداخت شده</span>
        </label>

        
        <!-- 💰 دکمه‌ی ثبت پرداخت جدید -->
        <button type="button" id="cust-add-payment" style="width:100%;margin-top:12px;padding:12px;font-size:14px;font-weight:700;border:none;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;cursor:pointer;font-family:inherit">
          💰 ثبت پرداخت جدید (امروز)
        </button>
        <p style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.6;text-align:center">
          💡 هر بار شاگرد شهریه داد، این دکمه رو بزن.
        </p>
      </div>
    </div>
  `;
}
// ==============================
// 🏋️ اتصال انتخابگرهای تاریخ فیلدهای ورزشی
// ==============================
function bindCoachDatePickers(overlay) {
  const trainingStartField = overlay.querySelector('#cust-training-start');
  if (trainingStartField) {
    trainingStartField.addEventListener('click', async () => {
      const result = await showShamsiDatePicker(trainingStartField.value, 'تاریخ شروع تمرین');
      if (result) trainingStartField.value = result;
    });
  }

  const lastPaymentField = overlay.querySelector('#cust-last-payment-date');
  if (lastPaymentField) {
    lastPaymentField.addEventListener('click', async () => {
      const result = await showShamsiDatePicker(lastPaymentField.value, 'تاریخ پرداخت');
      if (result) lastPaymentField.value = result;
    });
  }

  // 📷 آپلود عکس شاگرد
  const imageInput = overlay.querySelector('#cust-image-input');
  const imagePreview = overlay.querySelector('#cust-image-preview');
  const imageIcon = overlay.querySelector('#cust-image-icon');

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (imagePreview) {
          imagePreview.src = ev.target.result;
          imagePreview.style.display = 'block';
        }
        if (imageIcon) imageIcon.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  // ⏰ مدت اعتبار سفارشی
  const validitySelect = overlay.querySelector('#cust-validity');
  const validityCustom = overlay.querySelector('#cust-validity-custom');
  if (validitySelect && validityCustom) {
    validitySelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        validityCustom.style.display = 'grid';
      } else {
        validityCustom.style.display = 'none';
      }
    });
  }


  // 💰 ثبت پرداخت جدید
  const addPaymentBtn = overlay.querySelector('#cust-add-payment');
  if (addPaymentBtn) {
    addPaymentBtn.onclick = () => {
      // 🔥 پرداخت‌های قبلی رو نگه دار
      const existing = window._pendingPayments || [];

      // 🔥 مودال جدا برای ثبت پرداخت
      const payOverlay = showModal(`
        <h3 class="modal-title">💰 ثبت پرداخت جدید</h3>
        <div class="form-group">
          <label>📅 تاریخ پرداخت</label>
          <input type="text" id="new-pay-date" value="${getTodayShamsi()}" readonly style="cursor:pointer">
        </div>
        <div class="form-group">
          <label>💰 مبلغ (تومان)</label>
          <input type="number" id="new-pay-amount" value="${parseInt((overlay.querySelector('#cust-tuition')?.value || '').replace(/\D/g, '')) || 0}" inputmode="numeric">
        </div>
        <div class="form-group">
          <label>📝 یادداشت (اختیاری)</label>
          <input type="text" id="new-pay-note" placeholder="مثلاً: شهریه مهر">
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="new-pay-cancel">انصراف</button>
          <button class="btn-primary" id="new-pay-save">ثبت پرداخت</button>
        </div>
      `, { center: true });

      const payDateField = payOverlay.querySelector('#new-pay-date');
      payDateField.addEventListener('click', async () => {
        const result = await showShamsiDatePicker(payDateField.value, 'تاریخ پرداخت');
        if (result) payDateField.value = result;
      });

      payOverlay.querySelector('#new-pay-cancel').onclick = () => closeModal(payOverlay);

      payOverlay.querySelector('#new-pay-save').onclick = () => {
        const date = payDateField.value.trim();
        const amount = parseInt(payOverlay.querySelector('#new-pay-amount').value.replace(/\D/g, '')) || 0;
        const note = payOverlay.querySelector('#new-pay-note').value.trim();

        if (!date) {
          toast('تاریخ پرداخت را انتخاب کنید', 'error');
          return;
        }
        if (amount <= 0) {
          toast('مبلغ را وارد کنید', 'error');
          return;
        }

        // 🔥 ذخیره‌ی پرداخت موقت
        if (!window._pendingPayments) window._pendingPayments = [];
        window._pendingPayments.push({
          id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          date: date,
          amount: amount,
          note: note,
          createdAt: new Date().toISOString(),
        });

        // پیش‌نمایش
        let preview = overlay.querySelector('#cust-payments-preview');
        if (!preview) {
          preview = document.createElement('div');
          preview.id = 'cust-payments-preview';
          preview.style.cssText = 'margin-top:10px;padding:10px;background:rgba(16,185,129,0.08);border-radius:10px;font-size:11px;line-height:1.8;color:#10B981;text-align:center';
          addPaymentBtn.parentNode.insertBefore(preview, addPaymentBtn.nextSibling);
        }
        const total = window._pendingPayments.reduce((s, p) => s + p.amount, 0);
        preview.innerHTML = `✅ <strong>${window._pendingPayments.length}</strong> پرداخت آماده‌ی ذخیره (مجموع: <strong>${total.toLocaleString()}</strong> تومان)`;

        closeModal(payOverlay);
        toast(`✅ پرداخت ${amount.toLocaleString()} تومان آماده شد`, 'success');
      };
    };
  }

}
// ==============================
// 🏋️ خواندن مقادیر فیلدهای ورزشی
// ==============================
function readCoachExtraFields(overlay, editing = null) {
    const heightEl = overlay.querySelector('#cust-height');
  if (!heightEl) return null; // کاربر مربی نیست

  const weightEl = overlay.querySelector('#cust-weight');
  const medalsEl = overlay.querySelector('#cust-medals');
  const trainingStartEl = overlay.querySelector('#cust-training-start');
  const tuitionEl = overlay.querySelector('#cust-tuition');
  const totalSessionsEl = overlay.querySelector('#cust-total-sessions');
  const validityEl = overlay.querySelector('#cust-validity');
  const validityAmountEl = overlay.querySelector('#cust-validity-amount');
  const validityUnitEl = overlay.querySelector('#cust-validity-unit');
  const lastPaymentDateEl = overlay.querySelector('#cust-last-payment-date');
  const tuitionPaidEl = overlay.querySelector('#cust-tuition-paid');
  const imageEl = overlay.querySelector('#cust-image-preview');
    // 💰 چک کن تاریخ پرداخت عوض شده یا نه
  const oldPaymentDate = editing ? (editing.lastPaymentDate || '') : '';
  const newPaymentDate = lastPaymentDateEl ? lastPaymentDateEl.value.trim() : '';
  const paymentDateChanged = newPaymentDate && newPaymentDate !== oldPaymentDate;
  // ⏰ مدت اعتبار
  let validityPeriod = { amount: 1, unit: 'month' };
  if (validityEl) {
    if (validityEl.value === 'custom') {
      validityPeriod = {
        amount: parseInt(validityAmountEl?.value) || 1,
        unit: validityUnitEl?.value || 'month',
      };
    } else {
      const map = {
        '1d': { amount: 1, unit: 'day' },
        '3d': { amount: 3, unit: 'day' },
        '1w': { amount: 1, unit: 'week' },
        '2w': { amount: 2, unit: 'week' },
        '1m': { amount: 1, unit: 'month' },
        '2m': { amount: 2, unit: 'month' },
        '3m': { amount: 3, unit: 'month' },
        '6m': { amount: 6, unit: 'month' },
        '1y': { amount: 12, unit: 'month' },
      };
      validityPeriod = map[validityEl.value] || { amount: 1, unit: 'month' };
    }
  }
  // 💰 پرداخت‌های موقت
  const pendingPayments = window._pendingPayments || [];
  // 📷 عکس
  let imageValue = null;
  if (imageEl && imageEl.src && imageEl.src.startsWith('data:image')) {
    imageValue = imageEl.src;
  }

  return {
    height: parseInt(heightEl.value) || 0,
    weight: parseInt(weightEl.value) || 0,
    medals: medalsEl ? medalsEl.value.trim() : '',
    trainingStart: trainingStartEl ? trainingStartEl.value.trim() : '',
    tuition: parseInt((tuitionEl ? tuitionEl.value : '').replace(/\D/g, '')) || 0,
    totalSessions: parseInt(totalSessionsEl?.value) || 0,
    validityPeriod: validityPeriod,
    lastPaymentDate: lastPaymentDateEl ? lastPaymentDateEl.value.trim() : '',
        _paymentDateChanged: paymentDateChanged,
    _newPaymentDate: newPaymentDate,
        _pendingPayments: pendingPayments,
    tuitionPaid: tuitionPaidEl ? tuitionPaidEl.checked : false,
    image: imageValue,
  };
}

// ==============================
// 📅 ذخیره‌سازی حضور و غیاب
// ==============================
function getAttendanceKey() {
  return 'attendance_' + getTodayShamsi().replace(/\//g, '-');
}

function getTodayAttendance() {
  return DB.get(getAttendanceKey(), {});
}

function saveTodayAttendance(data) {
  DB.set(getAttendanceKey(), data);
}

// ==============================
// 📊 خلاصه‌ی پایان حضور و غیاب
// ==============================
function showAttendanceSummary() {
  const attendance = getTodayAttendance();
  const today = getTodayShamsi();

  let presentCount = 0;
  let absentCount = 0;
  const presentList = [];
  const absentList = [];

  state.customers.forEach(c => {
    const status = attendance[c.id];
    if (status === 'present') {
      presentCount++;
      presentList.push(c);
    } else if (status === 'absent') {
      absentCount++;
      absentList.push(c);
    }
  });

  const overlay = showModal(`
    <h3 class="modal-title">📊 خلاصه‌ی حضور و غیاب</h3>
    <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:18px">${today}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
      <div style="text-align:center;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:14px;padding:18px">
        <div style="font-size:36px;font-weight:800;color:#10B981">${presentCount}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">🟢 حاضر</div>
      </div>
      <div style="text-align:center;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:18px">
        <div style="font-size:36px;font-weight:800;color:#EF4444">${absentCount}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">🔴 غایب</div>
      </div>
    </div>

    ${presentCount > 0 ? `
      <h4 style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:8px">🟢 حاضران (${presentCount})</h4>
      <div style="max-height:150px;overflow-y:auto;margin-bottom:14px">
        ${presentList.map(c => `
          <div style="padding:8px 12px;background:rgba(16,185,129,0.08);border-radius:8px;margin-bottom:6px;font-size:12px">${escapeHtml(c.fullName)}</div>
        `).join('')}
      </div>
    ` : ''}

    ${absentCount > 0 ? `
      <h4 style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:8px">🔴 غایبان (${absentCount})</h4>
      <div style="max-height:150px;overflow-y:auto;margin-bottom:14px">
        ${absentList.map(c => `
          <div style="padding:8px 12px;background:rgba(239,68,68,0.08);border-radius:8px;margin-bottom:6px;font-size:12px">${escapeHtml(c.fullName)}</div>
        `).join('')}
      </div>
    ` : ''}

    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" id="att-sum-save" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;width:100%">✅ تأیید و ذخیره</button>
      <button class="btn-cancel" id="att-sum-close" style="width:100%">بستن</button>
    </div>
  `);

  // ✅ تأیید و ذخیره
  overlay.querySelector('#att-sum-save').onclick = () => {
    closeModal(overlay);
    toast('✅ حضور و غیاب امروز ذخیره شد', 'success');
  };

  // بستن
  overlay.querySelector('#att-sum-close').onclick = () => closeModal(overlay);
}
// ==============================
// 📅 صفحه‌ی حضور و غیاب (یکی یکی)
// ==============================
function openAttendancePage() {
  // اگه شاگردی نیست
  if (state.customers.length === 0) {
    const emptyOverlay = showModal(`
      <h3 class="modal-title">📅 حضور و غیاب</h3>
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:60px;margin-bottom:12px">📭</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.8">
          هنوز ${getCoachCustomerTitle().replace(' گرامی', '')} ثبت نکردی.
        </p>
      </div>
      <button class="btn-cancel" id="att-empty-close" style="width:100%">بستن</button>
    `, { center: true });
    emptyOverlay.querySelector('#att-empty-close').onclick = () => closeModal(emptyOverlay);
    return;
  }

  // گرفتن وضعیت امروز
  let attendance = getTodayAttendance();

  // ایندکس نفر جاری
  let currentIndex = 0;

  // پیدا کردن اولین نفری که ثبت نشده
  for (let i = 0; i < state.customers.length; i++) {
    if (!attendance[state.customers[i].id]) {
      currentIndex = i;
      break;
    }
  }

  const renderPage = () => {
    // حذف مودال قبلی اگه هست
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    const today = getTodayShamsi();

    // آمار کلی
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalUnpaid = 0;
    let remaining = 0;

    state.customers.forEach(c => {
      const status = attendance[c.id];
      if (status === 'present') totalPresent++;
      else if (status === 'absent') totalAbsent++;
      else remaining++;

      if (!c.tuitionPaid) totalUnpaid++;
    });

    // نفر جاری
    const c = state.customers[currentIndex];
    if (!c) return;

    const age = calculateAge(c.birthDate);
    const status = attendance[c.id];

    // اطلاعات ورزشی
    const infoParts = [];
          // 📊 وضعیت جلسات و اعتبار
      const sessionStatus = getCustomerSessionStatus(c);
            // ❄️ وضعیت فریز
      const currentFreeze = getCurrentFreeze(c);
      const isFrozen = currentFreeze !== null;
    if (age !== null) infoParts.push(`🎂 ${age} ساله`);
    if (c.height) infoParts.push(`📏 ${c.height} سانتی‌متر`);
    if (c.weight) infoParts.push(`⚖️ ${c.weight} کیلوگرم`);
    const infoHtml = infoParts.length > 0
      ? `<div style="font-size:14px;color:var(--text-muted);margin-top:8px;line-height:1.9;text-align:center">${infoParts.join(' • ')}</div>`
      : '';


      // 📊 HTML جلسات و اعتبار
      let sessionInfoHtml = '';
      if (sessionStatus.hasTuition) {
        const sessionColor = sessionStatus.sessionCritical ? '#EF4444' : (sessionStatus.sessionWarning ? '#F59E0B' : '#10B981');
        const timeColor = sessionStatus.timeCritical ? '#EF4444' : (sessionStatus.timeWarning ? '#F59E0B' : '#3B82F6');

        const sessionLine = sessionStatus.totalSessions > 0
          ? `📊 جلسات: <strong style="color:${sessionColor}">${sessionStatus.usedSessions} از ${sessionStatus.totalSessions}</strong> (تعداد جلسات مانده: <strong style="color:${sessionColor}">${sessionStatus.remainingSessions}</strong>)`
          : '';

        const expiryLine = sessionStatus.expiryDate
          ? `⏰ اعتبار: تا <strong style="color:${timeColor}">${sessionStatus.expiryDate}</strong>`
          : '';

        const warningLine = sessionStatus.sessionCritical
          ? `<div style="color:#EF4444;font-weight:700;margin-top:4px">🔴 جلسات تمام شده!</div>`
          : sessionStatus.timeCritical
            ? `<div style="color:#EF4444;font-weight:700;margin-top:4px">🔴 اعتبار تمام شده!</div>`
            : '';

        sessionInfoHtml = `
          <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:10px;margin-top:10px;font-size:12px;line-height:1.9;text-align:center">
            ${sessionLine ? `<div>${sessionLine}</div>` : ''}
            ${expiryLine ? `<div>${expiryLine}</div>` : ''}
            ${warningLine}
          </div>
        `;
      }

    // عکس شاگرد
    const hasRealImage = c.image && (c.image.startsWith('data:image') || c.image.startsWith('http'));
    const avatarHtml = hasRealImage
      ? `<img src="${c.image}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #3B82F6;display:block;margin:0 auto 14px">`
      : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:40px">🏋️</div>`;

    // badge وضعیت فعلی
    const statusBadgeHtml = status === 'present'
      ? `<div style="background:rgba(16,185,129,0.15);border:2px solid #10B981;color:#10B981;font-size:14px;font-weight:700;padding:6px 14px;border-radius:20px;display:inline-block;margin-bottom:12px">🟢 این نفر حاضر ثبت شده</div>`
      : status === 'absent'
        ? `<div style="background:rgba(239,68,68,0.15);border:2px solid #EF4444;color:#EF4444;font-size:14px;font-weight:700;padding:6px 14px;border-radius:20px;display:inline-block;margin-bottom:12px">🔴 این نفر غایب ثبت شده</div>`
        : '';

    // دکمه‌ی قبلی (اگه نفر اول نباشه)
    const prevBtnHtml = currentIndex > 0
      ? `<button class="btn-cancel" id="att-prev" style="padding:10px;font-size:14px;font-weight:700">⬅️ نفر قبل</button>`
      : `<button class="btn-cancel" id="att-prev-disabled" disabled style="padding:10px;font-size:14px;font-weight:700;opacity:0.3">⬅️ نفر قبل</button>`;

    // دکمه‌ی بعدی (اگه نفر آخر نباشه)
    const nextBtnHtml = currentIndex < state.customers.length - 1
      ? `<button class="btn-cancel" id="att-next" style="padding:10px;font-size:14px;font-weight:700">نفر بعد ➡️</button>`
      : `<button class="btn-cancel" id="att-next-disabled" disabled style="padding:10px;font-size:14px;font-weight:700;opacity:0.3">نفر بعد ➡️</button>`;

    const overlay = showModal(`
      <div style="position:relative;padding-top:10px">

        <!-- شماره‌ی بزرگ گوشه -->
        <div style="position:absolute;top:-8px;left:-8px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;border-radius:50%;width:60px;height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(59,130,246,0.4);z-index:10">
          <div style="font-size:20px;font-weight:800;line-height:1">${remaining}</div>
          <div style="font-size:9px;margin-top:1px">در انتظار</div>
        </div>

        <h3 class="modal-title" style="font-size:16px">📅 حضور و غیاب امروز</h3>
        <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:16px">${today}</p>

        <!-- شماره نفر / کل -->
        <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:10px">
          نفر ${currentIndex + 1} از ${state.customers.length}
        </p>
        <!-- 🔍 جستجو + دکمه‌های گروهی -->
        <div style="margin-bottom:14px">
          <div class="form-group" style="margin-bottom:8px">
            <input type="text" id="att-search" placeholder="🔍 جستجوی نام ورزشکار..." style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:10px;color:var(--text-color);font-family:inherit;font-size:13px">
          </div>
          <div id="att-search-results" style="display:none;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:10px;max-height:150px;overflow-y:auto;margin-bottom:8px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="btn-primary" id="att-all-present" style="padding:10px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#10B981,#059669);color:#fff">🟢 بقیه حاضر</button>
            <button class="btn-primary" id="att-all-absent" style="padding:10px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">🔴 بقیه غایب</button>
          </div>
        </div>
        <!-- کارت نفر جاری -->
        <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:20px 16px;margin-bottom:16px;text-align:center">
          ${avatarHtml}

          <div style="font-size:26px;font-weight:800;line-height:1.3;margin-bottom:4px;word-break:break-word">${escapeHtml(c.fullName)}</div>

          ${infoHtml}

          ${c.phone1 ? `<div style="font-size:13px;color:var(--text-muted);margin-top:8px">📞 ${escapeHtml(c.phone1)}</div>` : ''}

          <div style="margin-top:14px">${statusBadgeHtml}</div>
                    ${isFrozen ? `
            <div style="background:rgba(59,130,246,0.15);border:2px solid #3B82F6;border-radius:12px;padding:12px;margin-top:12px;text-align:center">
              <div style="font-size:16px;font-weight:800;color:#3B82F6;margin-bottom:4px">❄️ در حالت فریز</div>
              <div style="font-size:12px;color:var(--text-muted)">تا تاریخ ${currentFreeze.endDate}</div>
            </div>
          ` : ''}
                    ${sessionInfoHtml}
        </div>

        <!-- دکمه‌های حاضر / غایب بزرگ -->
                       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <button id="att-present-btn" ${isFrozen ? 'disabled' : ''} style="padding:24px 12px;font-size:20px;font-weight:800;border:none;border-radius:16px;background:${isFrozen ? '#94A3B8' : 'linear-gradient(135deg,#10B981,#059669)'};color:#fff;cursor:${isFrozen ? 'not-allowed' : 'pointer'};font-family:inherit;box-shadow:0 4px 15px rgba(16,185,129,0.35);opacity:${isFrozen ? '0.5' : '1'}">
            🟢 حاضر
          </button>
          <button id="att-absent-btn" ${isFrozen ? 'disabled' : ''} style="padding:24px 12px;font-size:20px;font-weight:800;border:none;border-radius:16px;background:${isFrozen ? '#94A3B8' : 'linear-gradient(135deg,#EF4444,#B91C1C)'};color:#fff;cursor:${isFrozen ? 'not-allowed' : 'pointer'};font-family:inherit;box-shadow:0 4px 15px rgba(239,68,68,0.35);opacity:${isFrozen ? '0.5' : '1'}">
            🔴 غایب
          </button>
        </div>

        <!-- دکمه‌های قبلی / بعدی -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          ${prevBtnHtml}
          ${nextBtnHtml}
        </div>

        <!-- خلاصه‌ی آمار کلی -->
        <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04));border:1px solid rgba(59,130,246,0.3);border-radius:14px;padding:12px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;color:#3B82F6;margin-bottom:8px;text-align:center">📊 خلاصه‌ی امروز</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div style="text-align:center;background:rgba(16,185,129,0.1);border-radius:10px;padding:8px">
              <div style="font-size:18px;font-weight:800;color:#10B981">${totalPresent}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">حاضر</div>
            </div>
            <div style="text-align:center;background:rgba(239,68,68,0.1);border-radius:10px;padding:8px">
              <div style="font-size:18px;font-weight:800;color:#EF4444">${totalAbsent}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">غایب</div>
            </div>
            <div style="text-align:center;background:rgba(245,158,11,0.1);border-radius:10px;padding:8px">
              <div style="font-size:18px;font-weight:800;color:#F59E0B">${totalUnpaid}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">شهریه نداده</div>
            </div>
          </div>
        </div>

        <button class="btn-cancel" id="att-close" style="width:100%">بستن</button>
      </div>
    `);

    // بستن
    overlay.querySelector('#att-close').onclick = () => closeModal(overlay);

    // 🔍 جستجوی زنده
    const searchInput = overlay.querySelector('#att-search');
    const searchResults = overlay.querySelector('#att-search-results');

    if (searchInput && searchResults) {
      searchInput.addEventListener('input', function() {
        const q = normalizeName(this.value.trim());
        if (!q) {
          searchResults.style.display = 'none';
          return;
        }

        const matches = state.customers
          .map((cust, idx) => ({ cust, idx }))
          .filter(({ cust }) => normalizeName(cust.fullName).includes(q))
          .slice(0, 8);

        if (matches.length === 0) {
          searchResults.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted);text-align:center">پیدا نشد</div>';
          searchResults.style.display = 'block';
          return;
        }

        searchResults.innerHTML = matches.map(({ cust, idx }) => {
          const st = attendance[cust.id];
          const badge = st === 'present'
            ? '<span style="background:#10B981;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:8px">🟢</span>'
            : st === 'absent'
              ? '<span style="background:#EF4444;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:8px">🔴</span>'
              : '<span style="background:#94A3B8;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:8px">⏳</span>';
          return `
            <div data-search-idx="${idx}" style="padding:10px 12px;border-bottom:1px solid var(--border-color);cursor:pointer;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px">${escapeHtml(cust.fullName)}</span>
              ${badge}
            </div>
          `;
        }).join('');
        searchResults.style.display = 'block';

        searchResults.querySelectorAll('[data-search-idx]').forEach(el => {
          el.onclick = () => {
            currentIndex = parseInt(el.dataset.searchIdx);
            searchInput.value = '';
            searchResults.style.display = 'none';
            renderPage();
          };
        });
      });
    }

    // 🟢 بقیه حاضر
    const allPresentBtn = overlay.querySelector('#att-all-present');
    if (allPresentBtn) {
      allPresentBtn.onclick = () => {
        if (!confirm('همه‌ی ثبت‌نشده‌ها «حاضر» ثبت بشن؟ (فریزی‌ها دست نمی‌خورن)')) return;

        state.customers.forEach(cc => {
          if (attendance[cc.id]) return; // قبلاً ثبت شده
          if (isCurrentlyFrozen(cc)) return; // فریز

          attendance[cc.id] = 'present';
          if (!cc.usedSessions) cc.usedSessions = 0;
          cc.usedSessions++;
        });
        DB.set('customers', state.customers);
        saveTodayAttendance(attendance);
        toast('✅ بقیه حاضر ثبت شدن', 'success');
        closeModal();
        setTimeout(() => showAttendanceSummary(), 200);
      };
    }

    // 🔴 بقیه غایب
    const allAbsentBtn = overlay.querySelector('#att-all-absent');
    if (allAbsentBtn) {
      allAbsentBtn.onclick = () => {
        if (!confirm('همه‌ی ثبت‌نشده‌ها «غایب» ثبت بشن؟ (فریزی‌ها دست نمی‌خورن)')) return;

        state.customers.forEach(cc => {
          if (attendance[cc.id]) return;
          if (isCurrentlyFrozen(cc)) return;

          attendance[cc.id] = 'absent';
        });
        saveTodayAttendance(attendance);
        toast('✅ بقیه غایب ثبت شدن', 'success');
        closeModal();
        setTimeout(() => showAttendanceSummary(), 200);
      };
    }
    
        // حاضر
    overlay.querySelector('#att-present-btn').onclick = () => {
      // ❄️ اگه توی فریزه، اجازه نده
      if (isFrozen) {
        toast('❄️ این شاگرد توی فریزه و نمی‌تونه حضور ثبت کنه', 'error');
        return;
      }

      const wasPresent = attendance[c.id] === 'present';
      attendance[c.id] = 'present';
      saveTodayAttendance(attendance);

      if (!wasPresent) {
        const customer = state.customers.find(x => x.id === c.id);
        if (customer) {
          customer.usedSessions = (customer.usedSessions || 0) + 1;
          DB.set('customers', state.customers);
        }
      }

            if (currentIndex < state.customers.length - 1) {
        currentIndex++;
        renderPage();
      } else {
        // آخرین نفر → خلاصه‌ی نهایی
        const allDone = state.customers.every(cc => attendance[cc.id]);
        if (allDone) {
          closeModal();
          setTimeout(() => showAttendanceSummary(), 200);
        } else {
          renderPage();
        }
      }
    };
    // غایب
      
        
    overlay.querySelector('#att-absent-btn').onclick = () => {
      // ❄️ اگه توی فریزه، اجازه نده
      if (isFrozen) {
        toast('❄️ این شاگرد توی فریزه', 'error');
        return;
      }

      const wasPresent = attendance[c.id] === 'present';
      attendance[c.id] = 'absent';
      saveTodayAttendance(attendance);

      if (wasPresent) {
        const customer = state.customers.find(x => x.id === c.id);
        if (customer && customer.usedSessions > 0) {
          customer.usedSessions = customer.usedSessions - 1;
          DB.set('customers', state.customers);
        }
      }
      if (currentIndex < state.customers.length - 1) {
        currentIndex++;
        renderPage();
      } else {
        // آخرین نفر → خلاصه‌ی نهایی
        const allDone = state.customers.every(cc => attendance[cc.id]);
        if (allDone) {
          closeModal();
          setTimeout(() => showAttendanceSummary(), 200);
        } else {
          renderPage();
        }
      }
    };

    // نفر قبلی
    const prevBtn = overlay.querySelector('#att-prev');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderPage();
        }
      };
    }

    // نفر بعدی
    const nextBtn = overlay.querySelector('#att-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentIndex < state.customers.length - 1) {
          currentIndex++;
          renderPage();
        }
      };
    }
  };

  renderPage();
}

// ==============================
// 📅 محاسبه‌ی تاریخ انقضای شهریه
// ==============================
function calculateExpiryDate(startShamsi, validityPeriod) {
  if (!startShamsi || !validityPeriod) return null;
  const parts = startShamsi.split('/');
  if (parts.length !== 3) return null;

  let y = parseInt(parts[0]);
  let m = parseInt(parts[1]);
  let d = parseInt(parts[2]);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const amount = validityPeriod.amount || 1;
  const unit = validityPeriod.unit || 'month';

  let daysToAdd = 0;
  if (unit === 'day') daysToAdd = amount;
  else if (unit === 'week') daysToAdd = amount * 7;
  else if (unit === 'month') daysToAdd = amount * 30; // تقریبی

  d += daysToAdd;

  // تصحیح ماه و سال
  while (true) {
    const maxDay = shamsiMonthDays(y, m);
    if (d <= maxDay) break;
    d -= maxDay;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
}

// ==============================
// 📊 وضعیت جلسات و اعتبار
// ==============================
function getCustomerSessionStatus(c) {
  const today = getTodayShamsi();
  const todayNum = shamsiToNumber(today);

  // جلسات
  const totalSessions = c.totalSessions || 0;
  const usedSessions = c.usedSessions || 0;
  const remainingSessions = Math.max(0, totalSessions - usedSessions);

  // تاریخ انقضا
  let expiryDate = null;
  let daysUntilExpiry = null;
  let isExpired = false;

  if (c.lastPaymentDate && c.validityPeriod) {
    expiryDate = calculateExpiryDate(c.lastPaymentDate, c.validityPeriod);
    if (expiryDate) {
      const expiryNum = shamsiToNumber(expiryDate);
      daysUntilExpiry = daysBetweenShamsi(today, expiryDate);
      isExpired = todayNum > expiryNum;
    }
  }

  // هشدارها
  const sessionWarning = totalSessions > 0 && remainingSessions <= 2;
  const sessionCritical = totalSessions > 0 && remainingSessions === 0;
  const timeWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const timeCritical = isExpired;

  return {
    totalSessions,
    usedSessions,
    remainingSessions,
    expiryDate,
    daysUntilExpiry,
    isExpired,
    sessionWarning,
    sessionCritical,
    timeWarning,
    timeCritical,
    hasTuition: totalSessions > 0 || c.lastPaymentDate,
  };
}


// ==============================
// 📋 برنامه تمرینی — داده
// ==============================
function getTrainingPlans(customerId) {
  return DB.get('trainingPlans_' + customerId, []);
}

function saveTrainingPlans(customerId, plans) {
  DB.set('trainingPlans_' + customerId, plans);
}

// ==============================
// ⏰ برچسب مدت تمرین
// ==============================
function getDurationLabel(duration) {
  if (!duration) return '—';
  const { amount, unit } = duration;
  if (unit === 'day') return `${amount} روز`;
  if (unit === 'week') return `${amount} هفته`;
  if (unit === 'month') return `${amount} ماه`;
  return '—';
}

// ==============================
// 📋 صفحه‌ی برنامه تمرینی
// ==============================
function openTrainingPlan(customerId, planId = null) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('شاگرد پیدا نشد', 'error');
    return;
  }

  const plans = getTrainingPlans(customerId);
  let editingPlan = null;

  if (planId) {
    editingPlan = plans.find(p => p.id === planId);
  }

  const plan = editingPlan || {
    id: 'plan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    customerId: customerId,
    dateShamsi: getTodayShamsi(),
    duration: { amount: 1, unit: 'month' },
    exercises: [
      { name: '', sets: '', reps: '', note: '' },
    ],
    createdAt: new Date().toISOString(),
  };

  const renderPage = () => {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    const durationOptions = [
      { value: '1w', label: '۱ هفته', amount: 1, unit: 'week' },
      { value: '2w', label: '۲ هفته', amount: 2, unit: 'week' },
      { value: '1m', label: '۱ ماه', amount: 1, unit: 'month' },
      { value: '2m', label: '۲ ماه', amount: 2, unit: 'month' },
      { value: '3m', label: '۳ ماه', amount: 3, unit: 'month' },
      { value: '6m', label: '۶ ماه', amount: 6, unit: 'month' },
      { value: 'custom', label: '⚙️ سفارشی', amount: plan.duration.amount, unit: plan.duration.unit },
    ];

    const currentValidityValue = `${plan.duration.amount}${plan.duration.unit === 'day' ? 'd' : plan.duration.unit === 'week' ? 'w' : 'm'}`;
    const isCustom = !durationOptions.some(o => o.value === currentValidityValue && o.value !== 'custom');

    const rowsHtml = plan.exercises.map((ex, idx) => `
      <tr style="border-bottom:1px solid var(--border-color)">
        <td style="padding:8px;text-align:center;font-weight:700;color:var(--text-muted);width:40px">${idx + 1}</td>
        <td style="padding:8px">
          <input type="text" data-ex-idx="${idx}" data-field="name" value="${escapeHtml(ex.name)}" placeholder="نوع حرکت" style="width:100%;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:8px;color:var(--text-color);font-family:inherit;font-size:12px">
        </td>
        <td style="padding:8px;width:70px">
          <input type="text" data-ex-idx="${idx}" data-field="sets" value="${escapeHtml(ex.sets)}" placeholder="ست" style="width:100%;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:8px;color:var(--text-color);font-family:inherit;font-size:12px;text-align:center">
        </td>
        <td style="padding:8px;width:70px">
          <input type="text" data-ex-idx="${idx}" data-field="reps" value="${escapeHtml(ex.reps)}" placeholder="تکرار" style="width:100%;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:8px;color:var(--text-color);font-family:inherit;font-size:12px;text-align:center">
        </td>
        <td style="padding:8px">
          <input type="text" data-ex-idx="${idx}" data-field="note" value="${escapeHtml(ex.note)}" placeholder="توضیحات" style="width:100%;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:8px;color:var(--text-color);font-family:inherit;font-size:12px">
        </td>
        <td style="padding:8px;width:40px;text-align:center">
          <button data-ex-remove="${idx}" style="background:transparent;border:1px solid #EF4444;color:#EF4444;width:28px;height:28px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:14px">🗑️</button>
        </td>
      </tr>
    `).join('');

    const overlay = showModal(`
      <h3 class="modal-title">📋 برنامه تمرینی</h3>

      <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:12px;margin-bottom:14px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">${escapeHtml(c.fullName)}</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.8">
          ${c.height ? `📏 قد: ${c.height} سانتی‌متر` : ''}
          ${c.height && c.weight ? ' • ' : ''}
          ${c.weight ? `⚖️ وزن: ${c.weight} کیلوگرم` : ''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">📅 تاریخ برنامه: ${plan.dateShamsi}</div>
      </div>

      <div class="form-group" style="margin-bottom:12px">
        <label>⏰ مدت تمرین</label>
        <select id="plan-duration" style="width:100%">
          ${durationOptions.map(o =>
            `<option value="${o.value}" ${o.value === currentValidityValue ? 'selected' : ''}>${o.label}</option>`
          ).join('')}
        </select>
      </div>

      <div id="plan-duration-custom" style="display:${isCustom ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label>عدد</label>
          <input type="number" id="plan-duration-amount" value="${plan.duration.amount}" inputmode="numeric">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>واحد</label>
          <select id="plan-duration-unit">
            <option value="day" ${plan.duration.unit === 'day' ? 'selected' : ''}>روز</option>
            <option value="week" ${plan.duration.unit === 'week' ? 'selected' : ''}>هفته</option>
            <option value="month" ${plan.duration.unit === 'month' ? 'selected' : ''}>ماه</option>
          </select>
        </div>
      </div>

      <div style="overflow-x:auto;margin-bottom:12px;background:rgba(255,255,255,0.02);border-radius:12px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:rgba(139,92,246,0.15)">
              <th style="padding:8px;text-align:center;color:#8B5CF6;font-weight:700;font-size:11px">#</th>
              <th style="padding:8px;text-align:right;color:#8B5CF6;font-weight:700;font-size:11px">نوع حرکت</th>
              <th style="padding:8px;text-align:center;color:#8B5CF6;font-weight:700;font-size:11px">ست</th>
              <th style="padding:8px;text-align:center;color:#8B5CF6;font-weight:700;font-size:11px">تکرار</th>
              <th style="padding:8px;text-align:right;color:#8B5CF6;font-weight:700;font-size:11px">توضیحات</th>
              <th style="padding:8px;text-align:center;color:#8B5CF6;font-weight:700;font-size:11px">—</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <button id="plan-add-row" style="width:100%;padding:10px;background:rgba(139,92,246,0.1);border:1px dashed #8B5CF6;border-radius:10px;color:#8B5CF6;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px">➕ افزودن ردیف جدید</button>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" id="plan-save" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff">💾 ذخیره برنامه</button>
        <button class="btn-primary" id="plan-make-image" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff">📷 ساخت عکس برنامه</button>
        <button class="btn-cancel" id="plan-close" style="width:100%">بستن</button>
      </div>
    `);

    const durationSelect = overlay.querySelector('#plan-duration');
    const durationCustom = overlay.querySelector('#plan-duration-custom');
    durationSelect.onchange = function() {
      durationCustom.style.display = this.value === 'custom' ? 'grid' : 'none';
    };

    function saveCurrentValues() {
      overlay.querySelectorAll('[data-ex-idx]').forEach(input => {
        const idx = parseInt(input.dataset.exIdx);
        const field = input.dataset.field;
        if (plan.exercises[idx]) plan.exercises[idx][field] = input.value;
      });
    }

    overlay.querySelector('#plan-add-row').onclick = () => {
      saveCurrentValues();
      plan.exercises.push({ name: '', sets: '', reps: '', note: '' });
      renderPage();
    };

    overlay.querySelectorAll('[data-ex-remove]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.exRemove);
        saveCurrentValues();
        plan.exercises.splice(idx, 1);
        if (plan.exercises.length === 0) {
          plan.exercises.push({ name: '', sets: '', reps: '', note: '' });
        }
        renderPage();
      };
    });

    overlay.querySelector('#plan-save').onclick = () => {
      saveCurrentValues();
      const durVal = durationSelect.value;
      if (durVal === 'custom') {
        plan.duration = {
          amount: parseInt(overlay.querySelector('#plan-duration-amount').value) || 1,
          unit: overlay.querySelector('#plan-duration-unit').value || 'month',
        };
      } else {
        const map = {
          '1w': { amount: 1, unit: 'week' },
          '2w': { amount: 2, unit: 'week' },
          '1m': { amount: 1, unit: 'month' },
          '2m': { amount: 2, unit: 'month' },
          '3m': { amount: 3, unit: 'month' },
          '6m': { amount: 6, unit: 'month' },
        };
        plan.duration = map[durVal] || { amount: 1, unit: 'month' };
      }
      plan.exercises = plan.exercises.filter(ex => ex.name && ex.name.trim() !== '');
      if (plan.exercises.length === 0) {
        toast('حداقل یه تمرین وارد کن', 'error');
        return;
      }
      const allPlans = getTrainingPlans(customerId);
      const existingIdx = allPlans.findIndex(p => p.id === plan.id);
      if (existingIdx >= 0) allPlans[existingIdx] = plan;
      else allPlans.push(plan);
      saveTrainingPlans(customerId, allPlans);
      toast('برنامه تمرینی ذخیره شد ✅', 'success');
      closeModal(overlay);
      setTimeout(() => openCustomerProfile(customerId), 200);
    };

    overlay.querySelector('#plan-make-image').onclick = () => {
      saveCurrentValues();
      plan.exercises = plan.exercises.filter(ex => ex.name && ex.name.trim() !== '');
      if (plan.exercises.length === 0) {
        toast('حداقل یه تمرین وارد کن', 'error');
        return;
      }
      if (typeof generateTrainingPlanImage === 'function') {
        generateTrainingPlanImage(customerId, plan);
      } else {
        toast('تابع ساخت عکس لود نشده', 'error');
      }
    };

    overlay.querySelector('#plan-close').onclick = () => {
      closeModal(overlay);
      setTimeout(() => openCustomerProfile(customerId), 200);
    };
  };

  renderPage();
}

// ==============================
// 📚 تاریخچه برنامه‌ها
// ==============================
function openPlansHistory(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  const plans = getTrainingPlans(customerId);

  if (plans.length === 0) {
    const overlay = showModal(`
      <h3 class="modal-title">📚 تاریخچه برنامه‌ها</h3>
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:60px;margin-bottom:12px">📭</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.8">هنوز برنامه‌ای ثبت نشده.</p>
      </div>
      <button class="btn-cancel" id="ph-close" style="width:100%">بستن</button>
    `, { center: true });
    overlay.querySelector('#ph-close').onclick = () => closeModal(overlay);
    return;
  }

  const sorted = plans.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const listHtml = sorted.map(p => {
    const durationLabel = getDurationLabel(p.duration);
    const exerciseCount = (p.exercises || []).length;
    return `
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:14px;font-weight:700">📅 ${p.dateShamsi}</div>
          <span style="font-size:11px;background:rgba(139,92,246,0.2);color:#8B5CF6;padding:2px 8px;border-radius:10px;font-weight:700">${durationLabel}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📋 ${exerciseCount} تمرین</div>
        <div style="display:flex;gap:6px">
          <button class="btn-primary" style="flex:1;padding:8px;font-size:12px" data-plan-view="${p.id}">👁️ مشاهده</button>
          <button class="btn-primary" style="flex:1;padding:8px;font-size:12px;background:linear-gradient(135deg,#3B82F6,#2563EB)" data-plan-edit="${p.id}">✏️ ویرایش</button>
          <button class="btn-cancel" style="padding:8px;font-size:12px;border-color:#EF4444;color:#EF4444" data-plan-delete="${p.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const overlay = showModal(`
    <h3 class="modal-title">📚 تاریخچه برنامه‌های ${escapeHtml(c.fullName)}</h3>
    <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:14px">تعداد: ${plans.length} برنامه</p>
    <div style="max-height:400px;overflow-y:auto;margin-bottom:14px">${listHtml}</div>
    <button class="btn-cancel" id="ph-close" style="width:100%">بستن</button>
  `);

  overlay.querySelector('#ph-close').onclick = () => closeModal(overlay);

  overlay.querySelectorAll('[data-plan-view]').forEach(btn => {
    btn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openTrainingPlan(customerId, btn.dataset.planView), 200);
    };
  });

  overlay.querySelectorAll('[data-plan-edit]').forEach(btn => {
    btn.onclick = () => {
      closeModal(overlay);
      setTimeout(() => openTrainingPlan(customerId, btn.dataset.planEdit), 200);
    };
  });

  overlay.querySelectorAll('[data-plan-delete]').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('این برنامه حذف بشه؟')) return;
      const plans = getTrainingPlans(customerId);
      saveTrainingPlans(customerId, plans.filter(p => p.id !== btn.dataset.planDelete));
      toast('برنامه حذف شد', 'success');
      closeModal(overlay);
      setTimeout(() => openPlansHistory(customerId), 200);
    };
  });
}

// ==============================
// 📷 ساخت عکس برنامه تمرینی
// ==============================
async function generateTrainingPlanImage(customerId, plan) {
    const sponsorTop = getActiveTrainingSponsorForSlot('top');
  const sponsorBottom = getActiveTrainingSponsorForSlot('bottom');
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('شاگرد پیدا نشد', 'error');
    return;
  }

  toast('در حال ساخت عکس...', 'info');

  const b = state.business;
  const durationLabel = getDurationLabel(plan.duration);

  const rowsHtml = plan.exercises.map((ex, idx) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px;text-align:center;font-weight:700;color:#666;width:40px">${idx + 1}</td>
      <td style="padding:10px;text-align:right;font-size:13px;font-weight:600">${escapeHtml(ex.name)}</td>
      <td style="padding:10px;text-align:center;font-size:13px;color:#666">${escapeHtml(ex.sets)}</td>
      <td style="padding:10px;text-align:center;font-size:13px;color:#666">${escapeHtml(ex.reps)}</td>
      <td style="padding:10px;text-align:right;font-size:12px;color:#888">${escapeHtml(ex.note)}</td>
    </tr>
  `).join('');

  const logoHtml = b.logo
    ? `<img src="${b.logo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`
    : `<img src="assets/icon-192.png" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px">`;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
  container.innerHTML = `
    <div id="training-plan-canvas" style="width:700px;background:#ffffff;font-family:'Vazirmatn',Tahoma,sans-serif;color:#1a1a1a;padding:0;position:relative;direction:rtl;overflow:hidden">
      <div style="height:8px;background:linear-gradient(90deg,#8B5CF6,#A78BFA,#8B5CF6)"></div>
      <div style="padding: 30px 35px 25px 35px">
        <div style="text-align:center;margin-bottom:24px">
          ${logoHtml}
          <h1 style="font-size:22px;font-weight:800;margin:0 0 6px 0;color:#1a1a1a">${escapeHtml(b.name)}</h1>
          <div style="font-size:12px;color:#888;line-height:1.6">${escapeHtml(b.job || '')}</div>
        </div>
        <div style="height:2px;background:linear-gradient(90deg,transparent,#E5E7EB,transparent);margin-bottom:20px"></div>
                ${sponsorTop ? buildTrainingSponsorHtml(sponsorTop) : ''}
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:18px;font-weight:800;color:#8B5CF6;margin-bottom:8px">📋 برنامه تمرینی</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:6px">${escapeHtml(c.fullName)}</div>
          <div style="font-size:12px;color:#888">
            ${c.height ? `📏 قد: ${c.height} سانتی‌متر` : ''}
            ${c.height && c.weight ? ' • ' : ''}
            ${c.weight ? `⚖️ وزن: ${c.weight} کیلوگرم` : ''}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px;color:#666;background:#F9FAFB;border-radius:10px;padding:10px">
          <div>📅 تاریخ: <strong>${plan.dateShamsi}</strong></div>
          <div>⏰ مدت: <strong>${durationLabel}</strong></div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#F3F0FF">
              <th style="padding:10px;text-align:center;font-size:12px;color:#8B5CF6;font-weight:700;border-bottom:2px solid #8B5CF6;width:40px">#</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#8B5CF6;font-weight:700;border-bottom:2px solid #8B5CF6">نوع حرکت</th>
              <th style="padding:10px;text-align:center;font-size:12px;color:#8B5CF6;font-weight:700;border-bottom:2px solid #8B5CF6;width:60px">ست</th>
              <th style="padding:10px;text-align:center;font-size:12px;color:#8B5CF6;font-weight:700;border-bottom:2px solid #8B5CF6;width:60px">تکرار</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#8B5CF6;font-weight:700;border-bottom:2px solid #8B5CF6;width:180px">توضیحات</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
                ${sponsorBottom ? buildTrainingSponsorHtml(sponsorBottom) : ''}
        <div style="text-align:center;font-size:10px;color:#aaa">
          <div style="display:inline-flex;align-items:center;gap:5px;vertical-align:middle">
            <span>ساخته‌شده با</span>
            <img src="assets/icon-192.png" style="width:14px;height:14px;border-radius:50%">
            <span style="font-weight:700;color:#8B5CF6">چشمک</span>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 500));

  try {
    const target = container.querySelector('#training-plan-canvas');
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
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
      const fileName = `برنامه-${c.fullName}-${plan.dateShamsi.replace(/\//g, '-')}.png`;
            incrementTrainingSponsorShownCount(sponsorTop);
      incrementTrainingSponsorShownCount(sponsorBottom);
      
      container.remove();
      // پیش‌نمایش
      const url = URL.createObjectURL(blob);
      const ov = showModal(`
        <h3 class="modal-title">📷 عکس برنامه آماده شد</h3>
        <div style="text-align:center;margin-bottom:16px">
          <img src="${url}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(139,92,246,0.3)">
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn-primary" id="tpi-share" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff">📱 اشتراک‌گذاری</button>
          <button class="btn-cancel" id="tpi-download">💾 دانلود عکس</button>
          <button class="btn-cancel" id="tpi-close">بستن</button>
        </div>
      `);
      ov.querySelector('#tpi-close').onclick = () => { URL.revokeObjectURL(url); closeModal(ov); };
      ov.querySelector('#tpi-download').onclick = () => {
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      };
      ov.querySelector('#tpi-share').onclick = async () => {
        try {
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'برنامه تمرینی', text: `برنامه تمرینی ${c.fullName}` });
          } else {
            toast('اشتراک‌گذاری پشتیبانی نمی‌شه', 'error');
          }
        } catch (e) {
          if (e.name !== 'AbortError') console.error(e);
        }
      };
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    toast('خطا در ساخت عکس', 'error');
    container.remove();
  }
}


// ==============================
// ❄️ توابع فریز
// ==============================

// محاسبه‌ی تعداد روز بین دو تاریخ شمسی
function daysBetweenShamsiSimple(fromShamsi, toShamsi) {
  if (!fromShamsi || !toShamsi) return 0;
  const fromParts = fromShamsi.split('/');
  const toParts = toShamsi.split('/');
  if (fromParts.length !== 3 || toParts.length !== 3) return 0;

  const fy = parseInt(fromParts[0]);
  const fm = parseInt(fromParts[1]);
  const fd = parseInt(fromParts[2]);
  const ty = parseInt(toParts[0]);
  const tm = parseInt(toParts[1]);
  const td = parseInt(toParts[2]);

  const toAbs = (y, m, d) => {
    let total = 0;
    for (let i = 1300; i < y; i++) total += isShamsiLeapYear(i) ? 366 : 365;
    for (let i = 1; i < m; i++) total += shamsiMonthDays(y, i);
    total += d;
    return total;
  };

  return toAbs(ty, tm, td) - toAbs(fy, fm, fd);
}

// جمع کل روزهای فریز یه شاگرد
function getTotalFreezeDays(c) {
  if (!c.freezes || c.freezes.length === 0) return 0;
  return c.freezes.reduce((sum, f) => sum + (f.days || 0), 0);
}

// آیا الان توی فریزه؟
function isCurrentlyFrozen(c) {
  if (!c.freezes || c.freezes.length === 0) return false;
  const today = getTodayShamsi();
  const todayNum = shamsiToNumber(today);
  return c.freezes.some(f => {
    const startNum = shamsiToNumber(f.startDate);
    const endNum = shamsiToNumber(f.endDate);
    return todayNum >= startNum && todayNum <= endNum;
  });
}

// فریز فعلی (اگه هست)
function getCurrentFreeze(c) {
  if (!c.freezes || c.freezes.length === 0) return null;
  const today = getTodayShamsi();
  const todayNum = shamsiToNumber(today);
  return c.freezes.find(f => {
    const startNum = shamsiToNumber(f.startDate);
    const endNum = shamsiToNumber(f.endDate);
    return todayNum >= startNum && todayNum <= endNum;
  }) || null;
}

// تاریخ انقضای اعتبار با احتساب فریز
function getExpiryWithFreezes(c) {
  if (!c.lastPaymentDate || !c.validityPeriod) return null;

  const baseExpiry = calculateExpiryDate(c.lastPaymentDate, c.validityPeriod);
  if (!baseExpiry) return null;

  const totalFreezeDays = getTotalFreezeDays(c);
  if (totalFreezeDays === 0) return baseExpiry;

  // اضافه کردن روزهای فریز به تاریخ انقضا
  const parts = baseExpiry.split('/');
  let y = parseInt(parts[0]);
  let m = parseInt(parts[1]);
  let d = parseInt(parts[2]);

  d += totalFreezeDays;
  while (true) {
    const maxDay = shamsiMonthDays(y, m);
    if (d <= maxDay) break;
    d -= maxDay;
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
}

// ==============================
// ❄️ صفحه‌ی مدیریت فریز
// ==============================
function openFreezeManager(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('شاگرد پیدا نشد', 'error');
    return;
  }

  const renderPage = () => {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    const freezes = c.freezes || [];
    const totalDays = getTotalFreezeDays(c);
    const baseExpiry = c.lastPaymentDate && c.validityPeriod
      ? calculateExpiryDate(c.lastPaymentDate, c.validityPeriod)
      : null;
    const newExpiry = getExpiryWithFreezes(c);

    // لیست فریزها
    const listHtml = freezes.length === 0
      ? '<p style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">هنوز فریزی ثبت نشده</p>'
      : freezes.slice().reverse().map((f, revIdx) => {
          const realIdx = freezes.length - 1 - revIdx;
          const today = getTodayShamsi();
          const todayNum = shamsiToNumber(today);
          const startNum = shamsiToNumber(f.startDate);
          const endNum = shamsiToNumber(f.endDate);
          const isActive = todayNum >= startNum && todayNum <= endNum;
          const isPast = todayNum > endNum;

          const statusLabel = isActive
            ? '<span style="background:#3B82F6;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">❄️ فعال</span>'
            : isPast
              ? '<span style="background:#94A3B8;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">گذشته</span>'
              : '<span style="background:#F59E0B;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">آینده</span>';

          return `
            <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:10px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-size:12px;font-weight:700">${f.startDate} → ${f.endDate}</div>
                ${statusLabel}
              </div>
              <div style="font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:6px">
                📊 تعداد روز: <strong>${f.days}</strong>
                ${f.reason ? `<br>📝 ${escapeHtml(f.reason)}` : ''}
              </div>
              <button class="btn-cancel" style="width:100%;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-freeze-delete="${realIdx}">🗑️ حذف</button>
            </div>
          `;
        }).join('');

    const overlay = showModal(`
      <h3 class="modal-title">❄️ مدیریت فریز</h3>

      <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:12px;margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;margin-bottom:6px">${escapeHtml(c.fullName)}</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.9">
          📊 مجموع روزهای فریز: <strong>${totalDays}</strong>
          ${baseExpiry ? `<br>📅 اعتبار اصلی: <strong>${baseExpiry}</strong>` : ''}
          ${newExpiry && totalDays > 0 ? `<br>📅 اعتبار جدید: <strong style="color:#10B981">${newExpiry}</strong>` : ''}
        </div>
      </div>

      <h4 style="font-size:13px;font-weight:700;margin-bottom:8px">➕ فریز جدید</h4>

      <div class="form-group" style="margin-bottom:12px">
        <label>📅 تاریخ پایان فریز</label>
        <input type="text" id="freeze-end-date" placeholder="برای انتخاب کلیک کنید" readonly style="cursor:pointer">
        <p style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.6">
          💡 فریز از امروز (${getTodayShamsi()}) شروع می‌شه.
        </p>
      </div>

      <div class="form-group" style="margin-bottom:12px">
        <label>📝 دلیل (اختیاری)</label>
        <input type="text" id="freeze-reason" placeholder="مثلاً: مریضی، سفر">
      </div>

      <button class="btn-primary" id="freeze-add" style="width:100%;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;margin-bottom:16px">➕ افزودن فریز</button>

      <h4 style="font-size:13px;font-weight:700;margin-bottom:8px">📋 لیست فریزها (${freezes.length})</h4>
      <div style="max-height:250px;overflow-y:auto;margin-bottom:14px">${listHtml}</div>

      <button class="btn-cancel" id="freeze-close" style="width:100%">بستن</button>
    `);

    // انتخابگر تاریخ پایان
    const endDateField = overlay.querySelector('#freeze-end-date');
    endDateField.addEventListener('click', async () => {
      const result = await showShamsiDatePicker('', 'تاریخ پایان فریز');
      if (result) endDateField.value = result;
    });

    // افزودن فریز
    overlay.querySelector('#freeze-add').onclick = () => {
      const endDate = endDateField.value.trim();
      const reason = overlay.querySelector('#freeze-reason').value.trim();

      if (!endDate) {
        toast('تاریخ پایان فریز را انتخاب کنید', 'error');
        return;
      }

      const startDate = getTodayShamsi();
      const days = daysBetweenShamsiSimple(startDate, endDate);

      if (days <= 0) {
        toast('تاریخ پایان باید بعد از امروز باشه', 'error');
        return;
      }

      if (!c.freezes) c.freezes = [];
      c.freezes.push({
        id: 'freeze_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        startDate: startDate,
        endDate: endDate,
        days: days,
        reason: reason,
        createdAt: new Date().toISOString(),
      });

      DB.set('customers', state.customers);
      toast(`❄️ فریز ${days} روزه ثبت شد ✅`, 'success');
      renderPage();
    };

    // حذف فریز
    overlay.querySelectorAll('[data-freeze-delete]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.freezeDelete);
        if (!confirm('این فریز حذف بشه؟')) return;
        c.freezes.splice(idx, 1);
        DB.set('customers', state.customers);
        toast('فریز حذف شد', 'success');
        renderPage();
      };
    });

    // بستن
    overlay.querySelector('#freeze-close').onclick = () => {
      closeModal(overlay);
      setTimeout(() => openCustomerProfile(customerId), 200);
    };
  };

  renderPage();
}


// ==============================
// 📊 تاریخچه‌ی حضور و غیاب
// ==============================
function openAttendanceHistory() {
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cheshmak_attendance_')) {
      allKeys.push(key);
    }
  }

  if (allKeys.length === 0) {
    const overlay = showModal(`
      <h3 class="modal-title">📊 تاریخچه‌ی حضور و غیاب</h3>
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:60px;margin-bottom:12px">📭</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.8">
          هنوز حضور و غیابی ثبت نشده.
        </p>
      </div>
      <button class="btn-cancel" id="ath-close" style="width:100%">بستن</button>
    `, { center: true });
    overlay.querySelector('#ath-close').onclick = () => closeModal(overlay);
    return;
  }

  // استخراج تاریخ‌ها
  const dates = allKeys.map(k => {
    const raw = k.replace('cheshmak_attendance_', '');
    return raw.replace(/-/g, '/');
  }).sort((a, b) => shamsiToNumber(b) - shamsiToNumber(a)); // جدید به قدیم

  // محاسبه‌ی آمار هر روز
  const dayStats = dates.map(date => {
    const key = 'attendance_' + date.replace(/\//g, '-');
    const data = DB.get(key, {});

    let present = 0;
    let absent = 0;
    let frozen = 0;

    state.customers.forEach(c => {
      const st = data[c.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;

      // چک فریز
      if (isCurrentlyFrozen(c)) frozen++;
    });

    return { date, present, absent, frozen, raw: data };
  });

  const listHtml = dayStats.map(d => `
    <div data-history-date="${d.date}" style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:12px;margin-bottom:10px;cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:14px;font-weight:700">📅 ${d.date}</div>
        <div style="font-size:11px;color:var(--text-muted)">👁️ مشاهده</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div style="text-align:center;background:rgba(16,185,129,0.15);border-radius:8px;padding:6px">
          <div style="font-size:16px;font-weight:800;color:#10B981">${d.present}</div>
          <div style="font-size:10px;color:var(--text-muted)">🟢 حاضر</div>
        </div>
        <div style="text-align:center;background:rgba(239,68,68,0.15);border-radius:8px;padding:6px">
          <div style="font-size:16px;font-weight:800;color:#EF4444">${d.absent}</div>
          <div style="font-size:10px;color:var(--text-muted)">🔴 غایب</div>
        </div>
        <div style="text-align:center;background:rgba(59,130,246,0.15);border-radius:8px;padding:6px">
          <div style="font-size:16px;font-weight:800;color:#3B82F6">${d.frozen}</div>
          <div style="font-size:10px;color:var(--text-muted)">❄️ فریز</div>
        </div>
      </div>
    </div>
  `).join('');

  const overlay = showModal(`
    <h3 class="modal-title">📊 تاریخچه‌ی حضور و غیاب</h3>
    <p style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:14px">
      تعداد روزها: ${dayStats.length}
    </p>
    <div style="max-height:400px;overflow-y:auto;margin-bottom:14px">
      ${listHtml}
    </div>
    <button class="btn-cancel" id="ath-close" style="width:100%">بستن</button>
  `);

  overlay.querySelector('#ath-close').onclick = () => closeModal(overlay);

  // کلیک روی هر روز → خلاصه
  overlay.querySelectorAll('[data-history-date]').forEach(el => {
    el.onclick = () => {
      const date = el.dataset.historyDate;
      const key = 'attendance_' + date.replace(/\//g, '-');
      const data = DB.get(key, {});
      closeModal(overlay);
      setTimeout(() => showDaySummary(date, data), 200);
    };
  });
}

// ==============================
// 📊 خلاصه‌ی یه روز خاص
// ==============================
function showDaySummary(date, data) {
  const presentList = [];
  const absentList = [];
  const frozenList = [];
  const notRecordedList = [];

  state.customers.forEach(c => {
    const st = data[c.id];
    if (st === 'present') presentList.push(c);
    else if (st === 'absent') absentList.push(c);
    else if (isCurrentlyFrozen(c)) frozenList.push(c);
    else notRecordedList.push(c);
  });

  const renderList = (list, color, icon, title) => {
    if (list.length === 0) return '';
    return `
      <h4 style="font-size:13px;font-weight:700;color:${color};margin:14px 0 8px 0">${icon} ${title} (${list.length})</h4>
      <div style="max-height:150px;overflow-y:auto;margin-bottom:10px">
        ${list.map(c => `
          <div style="padding:8px 12px;background:${color}15;border-radius:8px;margin-bottom:6px;font-size:12px">${escapeHtml(c.fullName)}</div>
        `).join('')}
      </div>
    `;
  };

  const overlay = showModal(`
    <h3 class="modal-title">📊 خلاصه‌ی ${date}</h3>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
      <div style="text-align:center;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:12px">
        <div style="font-size:28px;font-weight:800;color:#10B981">${presentList.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">🟢 حاضر</div>
      </div>
      <div style="text-align:center;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:12px">
        <div style="font-size:28px;font-weight:800;color:#EF4444">${absentList.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">🔴 غایب</div>
      </div>
      <div style="text-align:center;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px">
        <div style="font-size:28px;font-weight:800;color:#3B82F6">${frozenList.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">❄️ فریز</div>
      </div>
    </div>

    ${renderList(presentList, '#10B981', '🟢', 'حاضران')}
    ${renderList(absentList, '#EF4444', '🔴', 'غایبان')}
    ${renderList(frozenList, '#3B82F6', '❄️', 'فریزی‌ها')}
    ${renderList(notRecordedList, '#94A3B8', '⏳', 'ثبت‌نشده')}

    <button class="btn-cancel" id="day-sum-close" style="width:100%;margin-top:14px">بستن</button>
  `);

  overlay.querySelector('#day-sum-close').onclick = () => closeModal(overlay);
}

// ==============================
// 💰 تاریخچه‌ی پرداخت‌ها
// ==============================
function openPaymentsHistory(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) {
    toast('شاگرد پیدا نشد', 'error');
    return;
  }

  const renderPage = () => {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    const payments = c.payments || [];
    const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);

    // مرتب‌سازی جدید به قدیم
    const sorted = payments.slice().sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    const listHtml = sorted.length === 0
      ? '<p style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">هنوز پرداختی ثبت نشده</p>'
      : sorted.map((p) => {
          const realIdx = payments.indexOf(p);
          const time = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '';
          return `
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:10px;padding:10px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-size:13px;font-weight:700;color:#10B981">💰 ${Number(p.amount || 0).toLocaleString('en-US')} تومان</div>
                <div style="font-size:11px;color:var(--text-muted)">📅 ${p.date || '—'}${time ? ' — ' + time : ''}</div>
              </div>
              ${p.note ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📝 ${escapeHtml(p.note)}</div>` : ''}
              <div style="display:flex;gap:6px">
                <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px" data-payment-edit="${realIdx}">✏️ ویرایش</button>
                <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-payment-delete="${realIdx}">🗑️ حذف</button>
              </div>
            </div>
          `;
        }).join('');

    const overlay = showModal(`
      <h3 class="modal-title">💰 تاریخچه‌ی پرداخت‌ها</h3>

      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px;margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;margin-bottom:6px">${escapeHtml(c.fullName)}</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.9">
          📊 تعداد پرداخت‌ها: <strong>${payments.length}</strong><br>
          💰 مجموع: <strong style="color:#10B981">${Number(totalAmount).toLocaleString('en-US')} تومان</strong>
        </div>
      </div>

      <button class="btn-primary" id="payment-add" style="width:100%;background:linear-gradient(135deg,#10B981,#059669);color:#fff;margin-bottom:14px">➕ افزودن پرداخت جدید</button>

      <div style="max-height:350px;overflow-y:auto;margin-bottom:14px">${listHtml}</div>

      <button class="btn-cancel" id="payment-close" style="width:100%">بستن</button>
    `);

    // افزودن پرداخت
    overlay.querySelector('#payment-add').onclick = () => {
      closeModal(overlay);
      setTimeout(() => openPaymentForm(customerId), 200);
    };

    // ویرایش
    overlay.querySelectorAll('[data-payment-edit]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.paymentEdit);
        closeModal(overlay);
        setTimeout(() => openPaymentForm(customerId, idx), 200);
      };
    });

    // حذف
    overlay.querySelectorAll('[data-payment-delete]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.paymentDelete);
        if (!confirm('این پرداخت حذف بشه؟')) return;
        c.payments.splice(idx, 1);
        DB.set('customers', state.customers);
        toast('پرداخت حذف شد', 'success');
        renderPage();
      };
    });

    // بستن
    overlay.querySelector('#payment-close').onclick = () => {
      closeModal(overlay);
      setTimeout(() => openCustomerProfile(customerId), 200);
    };
  };

  renderPage();
}

// ==============================
// 💰 فرم افزودن/ویرایش پرداخت
// ==============================
function openPaymentForm(customerId, editIdx = null) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  const editing = editIdx !== null ? (c.payments || [])[editIdx] : null;

  const overlay = showModal(`
    <h3 class="modal-title">${editing ? '✏️ ویرایش پرداخت' : '➕ افزودن پرداخت'}</h3>

    <div class="form-group">
      <label>📅 تاریخ پرداخت *</label>
      <input type="text" id="pay-date" value="${editing ? (editing.date || '') : getTodayShamsi()}" readonly style="cursor:pointer">
    </div>

    <div class="form-group">
      <label>💰 مبلغ (تومان) *</label>
      <input type="number" id="pay-amount" value="${editing ? (editing.amount || '') : (c.tuition || '')}" inputmode="numeric" placeholder="مثلاً: ۵۰۰۰۰۰">
    </div>

    <div class="form-group">
      <label>📝 یادداشت (اختیاری)</label>
      <input type="text" id="pay-note" value="${editing ? (editing.note || '') : ''}" placeholder="مثلاً: شهریه مهر">
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="pay-cancel">انصراف</button>
      <button class="btn-primary" id="pay-save">${editing ? 'ذخیره' : 'ثبت'}</button>
    </div>
  `, { center: true });

  // انتخابگر تاریخ
  const dateField = overlay.querySelector('#pay-date');
  dateField.addEventListener('click', async () => {
    const result = await showShamsiDatePicker(dateField.value, 'تاریخ پرداخت');
    if (result) dateField.value = result;
  });

  // انصراف
  overlay.querySelector('#pay-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(() => openPaymentsHistory(customerId), 200);
  };

  // ذخیره
  overlay.querySelector('#pay-save').onclick = () => {
    const date = dateField.value.trim();
    const amount = parseInt(overlay.querySelector('#pay-amount').value.replace(/\D/g, '')) || 0;
    const note = overlay.querySelector('#pay-note').value.trim();

    if (!date) {
      toast('تاریخ پرداخت را انتخاب کنید', 'error');
      return;
    }
    if (amount <= 0) {
      toast('مبلغ پرداخت را وارد کنید', 'error');
      return;
    }

    if (!c.payments) c.payments = [];

    if (editing) {
      // ویرایش
      c.payments[editIdx] = {
        ...c.payments[editIdx],
        date: date,
        amount: amount,
        note: note,
      };
      toast('پرداخت ویرایش شد ✅', 'success');
    } else {
      // افزودن جدید
      c.payments.push({
        id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        date: date,
        amount: amount,
        note: note,
        createdAt: new Date().toISOString(),
      });
      toast('پرداخت ثبت شد ✅', 'success');
    }

    DB.set('customers', state.customers);
    closeModal(overlay);
    setTimeout(() => openPaymentsHistory(customerId), 200);
  };
}

// ==============================
// 📋 اسپانسرهای برنامه تمرینی
// ==============================
function getTrainingSponsors() {
  return DB.get('trainingSponsors', []);
}

function saveTrainingSponsors(sponsors) {
  DB.set('trainingSponsors', sponsors);
}

// ==============================
// 📋 رندر لیست اسپانسرهای برنامه تمرینی
// ==============================
function renderTrainingSponsorsList(container) {
  if (!container) return;

  const sponsors = getTrainingSponsors();

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
      return renderTrainingSponsorCard(sponsor, idx, false);
    }).join('');
  }

  if (reservedSponsors.length > 0) {
    html += `<div style="font-size:11px;color:#F59E0B;margin:12px 0 6px 0;font-weight:700">⏳ رزرو شده (${reservedSponsors.length} از ۱۰)</div>`;
    html += reservedSponsors.map((sponsor, i) => {
      const idx = sponsors.indexOf(sponsor);
      const canUp = i > 0;
      const canDown = i < reservedSponsors.length - 1;
      return renderTrainingSponsorCard(sponsor, idx, true, canUp, canDown);
    }).join('');
  }

  container.innerHTML = html;

  // ویرایش
  container.querySelectorAll('[data-edit-tsponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.editTsponsor);
      closeModal();
      setTimeout(() => openTrainingSponsorForm(idx), 200);
    };
  });

  // حذف
  container.querySelectorAll('[data-delete-tsponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.deleteTsponsor);
      if (!confirm('این اسپانسر حذف بشه؟')) return;
      const sponsors = getTrainingSponsors();
      sponsors.splice(idx, 1);
      saveTrainingSponsors(sponsors);
      checkAndActivateTrainingSponsorReserved();
      toast('اسپانسر حذف شد', 'success');
      renderTrainingSponsorsList(container);
    };
  });

  // صدور فاکتور
  container.querySelectorAll('[data-issue-invoice-tsponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.issueInvoiceTsponsor);
      const sponsors = getTrainingSponsors();
      const sponsor = sponsors[idx];
      if (!sponsor) return;

      const issuedInvoices = DB.get('issuedInvoices', []);
      const alreadyIssued = issuedInvoices.find(inv => inv.itemId === sponsor.id && inv.type === 'trainingSponsor');

      if (alreadyIssued) {
        if (!confirm(`برای این اسپانسر قبلاً فاکتور صادر شده (تاریخ: ${alreadyIssued.issuedAt}).\nدوباره صادر بشه؟`)) return;
      }

      closeModal();
      setTimeout(() => generateIssuedInvoice('trainingSponsor', sponsor.id), 200);
    };
  });

  // اولویت
  container.querySelectorAll('[data-priority-up-tsponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityUpTsponsor);
      swapTrainingSponsorPriority(idx, 'up');
      renderTrainingSponsorsList(container);
    };
  });

  container.querySelectorAll('[data-priority-down-tsponsor]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.priorityDownTsponsor);
      swapTrainingSponsorPriority(idx, 'down');
      renderTrainingSponsorsList(container);
    };
  });
}

// ==============================
// 📋 کارت اسپانسر برنامه تمرینی
// ==============================
function renderTrainingSponsorCard(sponsor, idx, isReserved, canUp = false, canDown = false) {
  const slotLabel = normalizeSlot(sponsor.slot) === 'top' ? 'بالا' : 'پایین';
  const remaining = (sponsor.totalShows || 0) - (sponsor.shownCount || 0);

  return `
    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:13px">📋 ${escapeHtml(sponsor.name)}</strong>
        <span style="font-size:10px;background:rgba(139,92,246,0.25);color:#8B5CF6;padding:2px 8px;border-radius:10px;font-weight:700">
          ${slotLabel} ${isReserved ? '• اولویت ' + sponsor.priority : ''}
        </span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:8px">
        ${escapeHtml((sponsor.text || '').substring(0, 50))}${(sponsor.text || '').length > 50 ? '...' : ''}<br>
        📞 ${escapeHtml(sponsor.phone || '—')}<br>
        💰 ${(sponsor.totalCost || 0).toLocaleString()} تومان | 📋 ${sponsor.shownCount || 0} از ${sponsor.totalShows || 0} ${isReserved ? `(وقتی فعال شد، ${remaining} برنامه داره)` : `(${remaining} مونده)`}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${isReserved ? `
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canUp ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-up-tsponsor="${idx}">▲</button>
          <button class="btn-cancel" style="padding:6px 10px;font-size:12px;${!canDown ? 'opacity:0.3;pointer-events:none' : ''}" data-priority-down-tsponsor="${idx}">▼</button>
        ` : ''}
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px" data-edit-tsponsor="${idx}">✏️ ویرایش</button>
        <button class="btn-cancel" style="flex:1;padding:6px;font-size:11px;border-color:#EF4444;color:#EF4444" data-delete-tsponsor="${idx}">🗑️ حذف</button>
        <button class="btn-primary" style="flex-basis:100%;padding:8px;font-size:11px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;margin-top:4px" data-issue-invoice-tsponsor="${idx}">📄 صدور فاکتور</button>
      </div>
    </div>
  `;
}

// ==============================
// 📋 جابه‌جایی اولویت اسپانسرهای برنامه تمرینی
// ==============================
function swapTrainingSponsorPriority(idx, direction) {
  const sponsors = getTrainingSponsors();
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

  saveTrainingSponsors(sponsors);
  toast('اولویت تغییر کرد', 'success');
}

// ==============================
// 📋 فرم تعریف اسپانسر برنامه تمرینی
// ==============================
// ==============================
// 📋 فرم تعریف اسپانسر برنامه تمرینی
// ==============================
function openTrainingSponsorForm(editIdx = null) {
  const sponsors = getTrainingSponsors();
  const editing = editIdx !== null ? sponsors[editIdx] : null;

  const overlay = showModal(`
    <h3 class="modal-title">${editing ? '✏️ ویرایش اسپانسر' : '➕ اسپانسر جدید'}</h3>

    <div class="form-group">
      <label>نام اسپانسر *</label>
      <input type="text" id="tsponsor-name" value="${editing ? escapeHtml(editing.name) : ''}" placeholder="مثلاً: فروشگاه ورزشی">
    </div>

    <div class="form-group">
      <label>متن هدیه/تخفیف</label>
      <textarea id="tsponsor-text" rows="3" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:13px;line-height:1.8;resize:vertical" placeholder="مثلاً: ۲۰٪ تخفیف مکمل ورزشی">${editing ? escapeHtml(editing.text || '') : ''}</textarea>
    </div>

    <div class="form-group">
      <label>شماره تماس</label>
      <input type="tel" id="tsponsor-phone" value="${editing ? escapeHtml(editing.phone || '') : ''}" placeholder="09121234567">
    </div>

    <div class="form-group">
      <label>عکس اسپانسر (اختیاری)</label>
      <input type="file" id="tsponsor-image-input" accept="image/*" hidden>
      <button type="button" class="btn-cancel" id="tsponsor-image-btn" style="width:100%;padding:10px;font-size:12px">
        📷 ${editing && editing.image ? 'تغییر عکس' : 'انتخاب عکس'}
      </button>
      <div id="tsponsor-image-preview" style="text-align:center;margin-top:10px;${editing && editing.image ? '' : 'display:none'}">
        <img id="tsponsor-image-img" src="${editing && editing.image ? editing.image : ''}" style="max-width:120px;max-height:120px;border-radius:10px;border:1px solid var(--border-color)">
        <button type="button" id="tsponsor-image-remove" style="display:block;margin:8px auto 0;background:transparent;border:1px solid #EF4444;color:#EF4444;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">🗑️ حذف عکس</button>
      </div>
    </div>
    
    <div class="form-group">
      <label>جایگاه نمایش</label>
      <select id="tsponsor-slot" style="width:100%">
        <option value="top" ${editing && normalizeSlot(editing.slot) === 'top' ? 'selected' : ''}>🟣 بالا</option>
        <option value="bottom" ${!editing || normalizeSlot(editing.slot) === 'bottom' ? 'selected' : ''}>🟣 پایین</option>
      </select>
    </div>

    <div class="form-group">
      <label>تعداد برنامه هدف *</label>
      <input type="number" id="tsponsor-shows" value="${editing ? editing.totalShows || 50 : 50}" inputmode="numeric" placeholder="مثلاً: 50">
    </div>

    <div class="form-group">
      <label>مبلغ کل (تومان)</label>
      <input type="number" id="tsponsor-cost" value="${editing ? editing.totalCost || 0 : 0}" inputmode="numeric" placeholder="مثلاً: 1000000">
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="tsponsor-cancel">انصراف</button>
      <button class="btn-primary" id="tsponsor-save">${editing ? 'ذخیره' : 'ثبت اسپانسر'}</button>
    </div>
  `, { center: true });

    // 📷 آپلود عکس اسپانسر تمرینی
  let tsponsorImageData = editing ? (editing.image || null) : null;
  const tsponsorImageInput = overlay.querySelector('#tsponsor-image-input');
  const tsponsorImageBtn = overlay.querySelector('#tsponsor-image-btn');
  const tsponsorImagePreview = overlay.querySelector('#tsponsor-image-preview');
  const tsponsorImageImg = overlay.querySelector('#tsponsor-image-img');
  const tsponsorImageRemove = overlay.querySelector('#tsponsor-image-remove');

  if (tsponsorImageBtn && tsponsorImageInput) {
    tsponsorImageBtn.onclick = () => tsponsorImageInput.click();
    tsponsorImageInput.onchange = (e) => {
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
          tsponsorImageData = canvas.toDataURL('image/jpeg', 0.7);
          if (tsponsorImageImg) tsponsorImageImg.src = tsponsorImageData;
          if (tsponsorImagePreview) tsponsorImagePreview.style.display = 'block';
          if (tsponsorImageBtn) tsponsorImageBtn.textContent = '📷 تغییر عکس';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  if (tsponsorImageRemove) {
    tsponsorImageRemove.onclick = () => {
      tsponsorImageData = null;
      if (tsponsorImagePreview) tsponsorImagePreview.style.display = 'none';
      if (tsponsorImageInput) tsponsorImageInput.value = '';
      if (tsponsorImageBtn) tsponsorImageBtn.textContent = '📷 انتخاب عکس';
    };
  }

  overlay.querySelector('#tsponsor-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };
  overlay.querySelector('#tsponsor-cancel').onclick = () => {
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };
  
  overlay.querySelector('#tsponsor-save').onclick = () => {
    const name = overlay.querySelector('#tsponsor-name').value.trim();
    const text = overlay.querySelector('#tsponsor-text').value.trim();
    const phone = overlay.querySelector('#tsponsor-phone').value.trim();
    const slot = normalizeSlot(overlay.querySelector('#tsponsor-slot').value);
    const totalShows = parseInt(overlay.querySelector('#tsponsor-shows').value) || 0;
    const totalCost = parseInt(overlay.querySelector('#tsponsor-cost').value.replace(/\D/g, '')) || 0;

    if (!name) {
      toast('نام اسپانسر را وارد کنید', 'error');
      return;
    }
    if (totalShows <= 0) {
      toast('تعداد برنامه را وارد کنید', 'error');
      return;
    }

    // حالت ویرایش
    if (editing) {
      const currentSponsors = getTrainingSponsors();
      currentSponsors[editIdx] = {
        ...currentSponsors[editIdx],
        name, text, phone, slot, totalShows, totalCost,
        image: tsponsorImageData,
      };
      saveTrainingSponsors(currentSponsors);
      toast('اسپانسر ویرایش شد ✅', 'success');
      closeModal(overlay);
      setTimeout(openSettings, 150);
      return;
    }

    // چک جایگاه
    const sponsorsNow = getTrainingSponsors();
    const activeInSlot = sponsorsNow.find(s =>
      normalizeSlot(s.slot) === slot &&
      s.status === 'active' &&
      (s.shownCount || 0) < (s.totalShows || 0)
    );

    if (activeInSlot) {
      const slotLabel = slot === 'top' ? 'بالا' : 'پایین';
      const otherSlot = slot === 'top' ? 'bottom' : 'top';
      const otherSlotLabel = otherSlot === 'top' ? 'بالا' : 'پایین';
      
      const otherActiveSponsor = sponsorsNow.find(s =>
        normalizeSlot(s.slot) === otherSlot &&
        s.status === 'active' &&
        (s.shownCount || 0) < (s.totalShows || 0)
      );

      closeModal(overlay);
      setTimeout(() => {
        const warnOverlay = showModal(`
          <h3 class="modal-title" style="color:#F59E0B">⚠️ جایگاه ${slotLabel} اشغال است</h3>
          <div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:16px">
            <p style="font-size:13px;line-height:1.9;margin:0;text-align:center">
              الان اسپانسر <strong>${escapeHtml(activeInSlot.name)}</strong> توی جایگاه ${slotLabel} فعاله.<br>
              <span style="font-size:11px;color:var(--text-muted)">${(activeInSlot.totalShows || 0) - (activeInSlot.shownCount || 0)} برنامه دیگه مونده.</span>
            </p>
          </div>
          
          ${!otherActiveSponsor ? `
            <div style="background:rgba(16,185,129,0.1);border:1px solid #10B981;border-radius:12px;padding:12px;margin-bottom:14px;text-align:center">
              <div style="font-size:13px;color:#10B981;font-weight:700">🟢 جایگاه ${otherSlotLabel} خالیه!</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">می‌تونی اسپانسر رو اونجا بذاری</div>
            </div>
          ` : ''}
          
          <p style="font-size:13px;line-height:1.9;text-align:center;margin-bottom:14px">می‌خوای چیکار کنی؟</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${!otherActiveSponsor ? `
              <button class="btn-primary" id="twarn-switch" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff">🟢 انتقال به جایگاه ${otherSlotLabel}</button>
            ` : ''}
            <button class="btn-primary" id="twarn-reserve" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff">⏳ رزرو کن (توی صف بمونه)</button>
            <button class="btn-primary" id="twarn-replace" style="background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff">🗑️ قبلی رو پاک کن و جاش بذار</button>
            <button class="btn-cancel" id="twarn-cancel">انصراف</button>
          </div>
        `, { center: true });

        // انتقال به جایگاه دیگه
        const switchBtn = warnOverlay.querySelector('#twarn-switch');
        if (switchBtn) {
          switchBtn.onclick = () => {
            closeModal(warnOverlay);
            const newSponsor = {
              name, text, phone, image: tsponsorImageData,
              slot: otherSlot,
              totalShows, totalCost,
              id: 'tsp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              status: 'active', priority: null, shownCount: 0,
              createdAt: new Date().toISOString()
            };
            const sponsorsNow2 = getTrainingSponsors();
            sponsorsNow2.push(newSponsor);
            saveTrainingSponsors(sponsorsNow2);
            toast('✅ اسپانسر توی جایگاه ' + otherSlotLabel + ' ثبت شد', 'success');
            setTimeout(openSettings, 200);
          };
        }

        // رزرو
        warnOverlay.querySelector('#twarn-reserve').onclick = () => {
          closeModal(warnOverlay);
          const result = addTrainingSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: tsponsorImageData });
          if (result.error) { toast(result.error, 'error'); return; }
          toast(`⏳ رزرو شد (اولویت ${result.priority})`, 'success');
          setTimeout(openSettings, 200);
        };

        // حذف قبلی و جایگزینی
        warnOverlay.querySelector('#twarn-replace').onclick = () => {
          closeModal(warnOverlay);
          let sponsorsNow2 = getTrainingSponsors();
          sponsorsNow2 = sponsorsNow2.filter(s => s.id !== activeInSlot.id);
          sponsorsNow2.push({
            name, text, phone, image: tsponsorImageData,
            slot, totalShows, totalCost,
            id: 'tsp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            status: 'active', priority: null, shownCount: 0,
            createdAt: new Date().toISOString()
          });
          saveTrainingSponsors(sponsorsNow2);
          toast('✅ اسپانسر قبلی پاک شد و اسپانسر جدید جایگزین شد', 'success');
          setTimeout(openSettings, 200);
        };

        warnOverlay.querySelector('#twarn-cancel').onclick = () => {
          closeModal(warnOverlay);
          setTimeout(openSettings, 150);
        };
      }, 150);
      return;
    }

    // جایگاه خالی → مستقیم فعال
    const result = addTrainingSponsorWithReservation({ name, text, phone, slot, totalShows, totalCost, image: tsponsorImageData });
    if (result.error) { toast(result.error, 'error'); return; }
    toast('اسپانسر ثبت و فعال شد ✅', 'success');
    closeModal(overlay);
    setTimeout(openSettings, 150);
  };
}

// ==============================
// 📋 اضافه کردن اسپانسر با رزرو
// ==============================
function addTrainingSponsorWithReservation(sponsorData) {
  const sponsors = getTrainingSponsors();
  const slot = normalizeSlot(sponsorData.slot);

  const activeInSlot = sponsors.find(s =>
    normalizeSlot(s.slot) === slot &&
    s.status === 'active' &&
    (s.shownCount || 0) < (s.totalShows || 0)
  );

  const reservedInSlot = sponsors.filter(s =>
    normalizeSlot(s.slot) === slot && s.status === 'reserved'
  );

  if (activeInSlot) {
    if (reservedInSlot.length >= 10) {
      return { error: 'حداکثر ۱۰ اسپانسر رزرو' };
    }
    const maxPriority = reservedInSlot.reduce((max, s) => Math.max(max, s.priority || 0), 0);
    sponsors.push({
      ...sponsorData,
      slot,
      id: 'tsp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      status: 'reserved',
      priority: maxPriority + 1,
      shownCount: 0,
      createdAt: new Date().toISOString()
    });
    saveTrainingSponsors(sponsors);
    return { success: true, reserved: true, priority: maxPriority + 1 };
  }

  sponsors.push({
    ...sponsorData,
    slot,
    id: 'tsp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    status: 'active',
    priority: null,
    shownCount: 0,
    createdAt: new Date().toISOString()
  });
  saveTrainingSponsors(sponsors);
  return { success: true, reserved: false };
}

// ==============================
// 📋 بررسی رزروهای اسپانسر برنامه تمرینی
// ==============================
function checkAndActivateTrainingSponsorReserved() {
  const sponsors = getTrainingSponsors();
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
      }
    }
  });

  if (changed) saveTrainingSponsors(sponsors);
}

// ==============================
// 📋 انتخاب اسپانسر فعال برنامه تمرینی
// ==============================
function getActiveTrainingSponsorForSlot(slot) {
  const normSlot = normalizeSlot(slot);
  const sponsors = getTrainingSponsors();
  const activeSponsors = sponsors.filter(s =>
    normalizeSlot(s.slot) === normSlot &&
    s.status === 'active' &&
    (s.shownCount || 0) < (s.totalShows || 0)
  );
  if (activeSponsors.length === 0) return null;
  return activeSponsors[0];
}

// ==============================
// 📋 افزایش شمارنده اسپانسر برنامه تمرینی
// ==============================
function incrementTrainingSponsorShownCount(sponsor) {
  if (!sponsor) return;
  const sponsors = getTrainingSponsors();
  const target = sponsors.find(s => s.id === sponsor.id);
  if (!target) return;
  target.shownCount = (target.shownCount || 0) + 1;
  saveTrainingSponsors(sponsors);
  if (target.shownCount >= target.totalShows) {
    checkAndActivateTrainingSponsorReserved();
  }
}

// ==============================
// 📋 ساخت HTML اسپانسر برنامه تمرینی
// ==============================
function buildTrainingSponsorHtml(sponsor) {
  if (!sponsor) return '';

  // 🔥 اگه عکس داره → با عکس
  if (sponsor.image) {
    return `
      <div style="margin:14px 0;padding:10px 0;border-top:1px solid #F0F0F0">
        <div style="font-size:11px;color:#8B5CF6;font-weight:700;text-align:right;margin-bottom:8px">
          ⭐ پیشنهاد ویژه‌ی ${escapeHtml(sponsor.name)}
        </div>
        <div style="display:flex;align-items:center;gap:12px;direction:rtl">
          <img src="${sponsor.image}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;flex-shrink:0">
          <div style="flex:1;text-align:right">
            <div style="font-size:13px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(sponsor.name)}</div>
            ${sponsor.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(sponsor.text)}</div>` : ''}
            ${sponsor.phone ? `<div style="font-size:11px;color:#8B5CF6;font-weight:700">📞 ${escapeHtml(sponsor.phone)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // 🔥 بدون عکس
  return `
    <div style="margin:14px 0;padding:10px 0;border-top:1px solid #F0F0F0">
      <div style="font-size:11px;color:#8B5CF6;font-weight:700;text-align:right;margin-bottom:8px">
        ⭐ پیشنهاد ویژه‌ی ${escapeHtml(sponsor.name)}
      </div>
      <div style="text-align:center">
        <div style="font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:4px">${escapeHtml(sponsor.name)}</div>
        ${sponsor.text ? `<div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:6px">${escapeHtml(sponsor.text)}</div>` : ''}
        ${sponsor.phone ? `<div style="font-size:11px;color:#8B5CF6;font-weight:700">📞 ${escapeHtml(sponsor.phone)}</div>` : ''}
      </div>
    </div>
  `;
}

// ==============================
// 🔑 سیستم لایسنس و فعال‌سازی
// ==============================

// 🔥 Secret Key (توی ابزار جداگانه هم همین باشه)
const PUBLIC_KEY_PEM = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwtTABhKcHsaWUl+T9iB0
vdU0eMhYwy9oxGVu6B6I3QsCU4J3nnme+uBeCHQ+vM1vH76LkF8bbyHMTwpm+En/
CAQDGEqeCxaa5rWQ4meRmjoZV3fUUDLgwjyAEfyskO66HuqD+pcC++ZkSrOvQlMU
dF1CjVCejH3QqI3uL9Xrffc7ICIdbNJo3DR/62vVPjfVQjlzOIvxqT2JbDtmzI5M
K2DuILQVuGQDpiMKTV7I76wrsVmUktPTg2N757xEDfyi2X06cff8mPn6kYcpG+O4
5DSflEAjIpi14e6uHPkTEv8bjwQNXyDDYn4CnUjxnuiX7hhtGQqSdhkLfut+OJ9+
EwIDAQAB
-----END PUBLIC KEY-----


`;

// تولید Device ID یکتا
function getOrCreateDeviceId() {
  let deviceId = DB.get('deviceId');
  if (!deviceId) {
    deviceId = 'DEV-' + 
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    DB.set('deviceId', deviceId);
  }
  return deviceId;
}

// تاریخ شروع (اولین نصب)
function getLicenseStart() {
  let start = DB.get('licenseStart');
  if (!start) {
    start = getTodayShamsi();
    DB.set('licenseStart', start);
  }
  return start;
}

// تاریخ پایان (start + 1 سال)
function getLicenseEnd() {
  let end = DB.get('licenseEnd');
  if (!end) {
    const start = getLicenseStart();
    // 🔥 Trial = ۱۰ روز
    end = addDaysToShamsi(start, 10);
    DB.set('licenseEnd', end);
  }
  return end;
}
// اضافه کردن روز به تاریخ شمسی
function addDaysToShamsi(shamsiDate, days) {
  const parts = shamsiDate.split('/');
  if (parts.length !== 3) return shamsiDate;
  
  let y = parseInt(parts[0]);
  let m = parseInt(parts[1]);
  let d = parseInt(parts[2]) + days;
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return shamsiDate;
  
  let iterations = 0;
  while (true) {
    iterations++;
    if (iterations > 1000) break;
    
    const maxDay = shamsiMonthDays(y, m);
    if (isNaN(maxDay) || maxDay <= 0) break;
    
    if (d <= maxDay) break;
    d -= maxDay;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return shamsiDate;
  return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
}
// اضافه کردن سال به تاریخ شمسی
function addYearsToShamsi(shamsiDate, years) {
  const parts = shamsiDate.split('/');
  if (parts.length !== 3) return shamsiDate;
  const y = parseInt(parts[0]) + years;
  const m = parts[1];
  const d = parts[2];
  return `${y}/${m}/${d}`;
}

// چک کن لایسنس معتبره یا نه
function isLicenseValid() {
  const end = getLicenseEnd();
  const todayNum = shamsiToNumber(getTodayShamsi());
  const endNum = shamsiToNumber(end);
  return todayNum <= endNum;
}

// تولید کد فعال‌سازی (همین الگوریتم توی ابزار جداگانه هم هست)
function generateActivationCode(deviceId, years = 1) {
  const raw = deviceId + LICENSE_SECRET + years;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
  // فرمت: CHK-XXXX-XXXX-Y
  const part1 = code.substring(0, 4);
  const part2 = code.substring(4, 8);
  return `CHK-${part1}-${part2}-${years}`;
}

 async function validateActivationCode(code) {
  try {
    const parts = code.trim().split('-');
    if (parts.length !== 3 || parts[0] !== 'CHK') return false;
    
    const suffix = parts[1];
    const signatureBase64 = parts[2];
    const deviceId = getOrCreateDeviceId();
    
    const dataToVerify = deviceId + suffix;

    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = PUBLIC_KEY_PEM.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
    const binaryDerString = window.atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      "spki",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const data = new TextEncoder().encode(dataToVerify);

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      data
    );
    
    return isValid;
    
  } catch (e) {
    console.error("License validation error:", e);
    return false;
  }
}

 async function activateLicense(code) {
  if (!await validateActivationCode(code)) {
    return { success: false, error: 'کد فعال‌سازی نامعتبر است' };
  }
  
  const parts = code.trim().split('-');
  const suffix = parts[1];
  
  const amount = parseInt(suffix.substring(1));
  const isYears = suffix.startsWith('Y');

  const todayNum = shamsiToNumber(getTodayShamsi());
  const currentEndNum = shamsiToNumber(getLicenseEnd());
  const baseDate = currentEndNum > todayNum ? getLicenseEnd() : getTodayShamsi();
  
  let newEnd = '';
  if (isYears) {
    newEnd = addYearsToShamsi(baseDate, amount);
  } else {
    newEnd = addDaysToShamsi(baseDate, amount);
  }
  
  DB.set('licenseEnd', newEnd);
  return { success: true, newEnd: newEnd, isYears: isYears, amount: amount };
}
// 🔥 استایل انیمیشن
if (typeof document !== 'undefined' && !document.getElementById('license-spin-style')) {
  const style = document.createElement('style');
  style.id = 'license-spin-style';
  style.textContent = `
    @keyframes license-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// نمایش مودال قفل
function showLicenseLockModal() {
  const deviceId = getOrCreateDeviceId();
  const end = getLicenseEnd();
  
  const overlay = showModal(`
    <div style="text-align:center;padding:20px 10px">
      <div style="font-size:70px;margin-bottom:16px">⏰</div>
      
           <h2 style="font-family:'IranNastaliq', serif;font-size:28px;margin-bottom:12px;color:#EF4444">
        دوره‌ی شما تمام شد
      </h2>>
      
      <div style="width:100px;height:2px;background:linear-gradient(90deg,transparent,#EF4444,transparent);margin:12px auto"></div>
      
              <div style="font-size:13px;color:#999;margin-bottom:6px">لایسنس شما در تاریخ <strong>${escapeHtml(end)}</strong> منقضی شده.<br>
        برای ادامه‌ی استفاده، با پشتیبانی تماس بگیرید:
      </p>
      
      <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:13px;margin-bottom:6px">📱 تلگرام پشتیبانی:</div>
        <div style="font-size:15px;font-weight:700;color:#229ED9;direction:ltr">@cheshmak_help</div>
      </div>
      
      <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📱 شناسه‌ی دستگاه شما:</div>
        <div style="font-size:14px;font-weight:700;color:#8B5CF6;direction:ltr;letter-spacing:2px">${escapeHtml(deviceId)}</div>        <button id="copy-device-id" style="margin-top:8px;background:transparent;border:1px solid #8B5CF6;color:#8B5CF6;padding:4px 12px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">📋 کپی</button>
      </div>
      
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px">این شناسه را برای پشتیبانی بفرستید</p>
      
      <div class="form-group" style="margin-bottom:14px">
        <label style="font-size:12px">کد فعال‌سازی:</label>
        <input type="text" id="activation-code-input" placeholder="CHK-XXXX-XXXX-1" style="width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:12px;color:var(--text-color);font-family:inherit;font-size:14px;text-align:center;direction:ltr;letter-spacing:1px">
      </div>
      
      <button class="btn-primary" id="activation-submit" style="width:100%">✅ تأیید کد</button>
    </div>
  `, { center: true, noCloseOnOverlay: true });
  
  // کپی Device ID
  overlay.querySelector('#copy-device-id').onclick = () => {
    navigator.clipboard.writeText(deviceId);
    toast('شناسه کپی شد ✅', 'success');
  };
  
  // تأیید کد
overlay.querySelector('#activation-submit').onclick = async () => {
      const code = overlay.querySelector('#activation-code-input').value.trim();
    if (!code) {
      toast('کد را وارد کنید', 'error');
      return;
    }
    
const result = await activateLicense(code);
        if (result.success) {
      closeModal(overlay);

      const successOverlay = showModal(`
        <div style="text-align:center;padding:40px 20px">
          <div style="position:relative;width:120px;height:120px;margin:0 auto 24px">
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;border:4px solid rgba(20,184,166,0.2);border-radius:50%"></div>
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;border:4px solid transparent;border-top-color:#14B8A6;border-radius:50%;animation:license-spin 1s linear infinite"></div>
<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px">
  <img src="assets/icon-192.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
</div>          </div>

          <h3 style="font-size:20px;color:#14B8A6;margin-bottom:8px;font-weight:800">✅ لایسنس فعال شد</h3>
<p style="font-size:13px;color:#999;margin-bottom:6px">لایسنس شما ${result.amount} ${result.isYears ? 'سال' : 'روز'} تمدید شد</p>          <p style="font-size:12px;color:#666">تا تاریخ <strong>${result.newEnd}</strong></p>
        </div>
      `, { center: true, noCloseOnOverlay: true });

      setTimeout(() => {
        closeModal(successOverlay);
        toast(`🎉 لایسنس تا ${result.newEnd} فعال شد`, 'success');
        setTimeout(() => location.reload(), 800);
      }, 10000);
    } else {
      toast(result.error, 'error');
    }
  };
}

// چک لایسنس و قفل اگه لازم بود
function checkLicense() {
  function checkLicense() {
  // 🔥 ذخیره آخرین زمان معتبر (جلوگیری از عقب بردن ساعت)
  const lastKnownDate = DB.get('lastKnownDate');
  const today = getTodayShamsi();
  const todayNum = shamsiToNumber(today);

  if (lastKnownDate) {
    const lastNum = shamsiToNumber(lastKnownDate);
    // اگر ساعت عقب رفته باشه (تاریخ امروز از آخرین تاریخ کمتر باشه)
    if (todayNum < lastNum) {
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      showModal(`
        <div style="text-align:center;padding:20px">
          <div style="font-size:60px;margin-bottom:12px">⚠️</div>
          <h3 style="color:#EF4444;margin-bottom:12px">خطای امنیتی</h3>
          <p style="font-size:14px;line-height:1.8;color:var(--text-muted)">تاریخ دستگاه شما به عقب برگشته است.<br>لطفاً تاریخ گوشی/کامپیوتر خود را اصلاح کنید.</p>
          <button class="btn-primary" onclick="location.reload()" style="margin-top:16px">تلاش مجدد</button>
        </div>
      `, { center: true, noCloseOnOverlay: true });
      return false;
    }
  }
  
  // ذخیره تاریخ امروز به عنوان آخرین تاریخ معتبر
  DB.set('lastKnownDate', today);

  if (!isLicenseValid()) {
    // ... بقیه کد
  if (!isLicenseValid()) {
    // قفل
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    showLicenseLockModal();
    return false;
  }
  return true;
}

// ==============================
// 🔍 فیلتر پیشرفته (قد، وزن، سن)
// ==============================
function openAdvancedFilter() {
  const currentFilter = state.advancedFilter || {
    heightMin: '', heightMax: '',
    weightMin: '', weightMax: '',
    ageMin: '', ageMax: '',
  };

  const overlay = showModal(`
    <h3 class="modal-title">🔍 فیلتر پیشرفته</h3>
    <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-bottom:16px;line-height:1.6">
      هر فیلد رو خالی بذاری، نادیده گرفته می‌شه.
    </p>

    <h4 style="font-size:13px;font-weight:700;color:#3B82F6;margin-bottom:8px">📏 قد (سانتی‌متر)</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">از</label>
        <input type="number" id="f-height-min" value="${currentFilter.heightMin}" placeholder="مثلاً: ۱۷۰" inputmode="numeric">
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">تا</label>
        <input type="number" id="f-height-max" value="${currentFilter.heightMax}" placeholder="مثلاً: ۱۸۰" inputmode="numeric">
      </div>
    </div>

    <h4 style="font-size:13px;font-weight:700;color:#F59E0B;margin-bottom:8px">⚖️ وزن (کیلوگرم)</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">از</label>
        <input type="number" id="f-weight-min" value="${currentFilter.weightMin}" placeholder="مثلاً: ۵۰" inputmode="numeric">
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">تا</label>
        <input type="number" id="f-weight-max" value="${currentFilter.weightMax}" placeholder="مثلاً: ۸۰" inputmode="numeric">
      </div>
    </div>

    <h4 style="font-size:13px;font-weight:700;color:#EC4899;margin-bottom:8px">🎂 سن (سال)</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">از</label>
        <input type="number" id="f-age-min" value="${currentFilter.ageMin}" placeholder="مثلاً: ۱۸" inputmode="numeric">
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px">تا</label>
        <input type="number" id="f-age-max" value="${currentFilter.ageMax}" placeholder="مثلاً: ۳۰" inputmode="numeric">
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn-cancel" id="f-clear" style="flex:1;border-color:#EF4444;color:#EF4444">🗑️ حذف فیلتر</button>
      <button class="btn-primary" id="f-apply" style="flex:1">✅ اعمال فیلتر</button>
    </div>
  `, { center: true });

  overlay.querySelector('#f-clear').onclick = () => {
    state.advancedFilter = null;
    closeModal(overlay);
    renderCustomers();
    toast('فیلتر حذف شد', 'success');
  };

  overlay.querySelector('#f-apply').onclick = () => {
        const hMin = parseInt(overlay.querySelector('#f-height-min').value);
    const hMax = parseInt(overlay.querySelector('#f-height-max').value);
    const wMin = parseInt(overlay.querySelector('#f-weight-min').value);
    const wMax = parseInt(overlay.querySelector('#f-weight-max').value);
    const aMin = parseInt(overlay.querySelector('#f-age-min').value);
    const aMax = parseInt(overlay.querySelector('#f-age-max').value);

    // اگه همه خالی بود → حذف فیلتر
    if (isNaN(hMin) && isNaN(hMax) && isNaN(wMin) && isNaN(wMax) && isNaN(aMin) && isNaN(aMax)) {
      state.advancedFilter = null;
    } else {
      state.advancedFilter = {
        heightMin: isNaN(hMin) ? '' : hMin,
        heightMax: isNaN(hMax) ? '' : hMax,
        weightMin: isNaN(wMin) ? '' : wMin,
        weightMax: isNaN(wMax) ? '' : wMax,
        ageMin: isNaN(aMin) ? '' : aMin,
        ageMax: isNaN(aMax) ? '' : aMax,
      };
    }

    closeModal(overlay);
    renderCustomers();
    toast('فیلتر اعمال شد ✅', 'success');

    // اگه همه خالی بود → حذف فیلتر
    if (isNaN(hMin) && isNaN(hMax) && isNaN(wMin) && isNaN(wMax) && isNaN(aMin) && isNaN(aMax)) {
      state.advancedFilter = null;
    } else {
      state.advancedFilter = {
        heightMin: isNaN(hMin) ? '' : hMin,
        heightMax: isNaN(hMax) ? '' : hMax,
        weightMin: isNaN(wMin) ? '' : wMin,
        weightMax: isNaN(wMax) ? '' : wMax,
        ageMin: isNaN(aMin) ? '' : aMin,
        ageMax: isNaN(aMax) ? '' : aMax,
      };
    }

    closeModal(overlay);
    renderCustomers();
    toast('فیلتر اعمال شد ✅', 'success');
  };
}
