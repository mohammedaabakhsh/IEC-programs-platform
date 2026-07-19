(()=>{
  const defaults={evaluationOpen:true,preventDuplicate:true,showTrainer:true,showDescription:true,thankYouMessage:'تم استلام تقييمك بنجاح، ومشاركتك تساعدنا على تطوير جودة البرامج.',archived:false};
  db.programs.forEach(p=>p.settings={...defaults,...(p.settings||{})});
  save();

  window.programState=p=>{
    if(p.settings?.archived)return 'مؤرشف';
    const today=new Date();today.setHours(0,0,0,0);
    const d=new Date(p.date+'T00:00:00');
    if(d.getTime()===today.getTime())return 'جارٍ';
    return d>today?'قادم':'مكتمل';
  };
  const stateClass=s=>({قادم:'upcoming','جارٍ':'running',مكتمل:'done',مؤرشف:'archived'})[s]||'done';
  const ensureSettings=p=>p.settings={...defaults,...(p.settings||{})};

  window.duplicateProgram=id=>{
    const source=db.programs.find(p=>p.id===id);if(!source)return;
    const copy=structuredClone(source);
    copy.id='PRG-'+Date.now();copy.name=source.name+' — نسخة';copy.date=new Date().toISOString().slice(0,10);copy.settings={...defaults,...copy.settings,archived:false};
    db.programs.unshift(copy);save();renderPrograms();renderDashboard();showToast('تم نسخ البرنامج دون التقييمات');openProgram(copy.id);
  };
  window.toggleEvaluation=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;ensureSettings(p);p.settings.evaluationOpen=!p.settings.evaluationOpen;save();showToast(p.settings.evaluationOpen?'تم فتح التقييم':'تم إغلاق التقييم');openProgram(id)};
  window.toggleArchive=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;ensureSettings(p);p.settings.archived=!p.settings.archived;save();renderPrograms();renderDashboard();showToast(p.settings.archived?'تمت أرشفة البرنامج':'تمت استعادة البرنامج');openProgram(id)};

  window.saveProgramSettings=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;ensureSettings(p);p.settings.preventDuplicate=document.querySelector('#preventDuplicate')?.checked??true;p.settings.showTrainer=document.querySelector('#showTrainer')?.checked??true;p.settings.showDescription=document.querySelector('#showDescription')?.checked??true;p.settings.thankYouMessage=document.querySelector('#thankYouMessage')?.value.trim()||defaults.thankYouMessage;save();showToast('تم حفظ إعدادات البرنامج');openProgram(id)};

  window.renderPrograms=(list=db.programs)=>{const grid=document.querySelector('#programGrid');if(!grid)return;grid.innerHTML=list.map(p=>{ensureSettings(p);const m=metrics(p),s=programState(p);return `<article class="program-card"><div class="program-card-top"><span class="type-chip">${escapeHtml(p.type)}</span><span class="status ${stateClass(s)}">${s}</span></div><h3>${escapeHtml(p.name)}</h3><p>المقدم: ${escapeHtml(p.trainer)}</p><p>التاريخ: ${formatDate(p.date)}</p><p>المشاركون: ${p.participants}</p><div class="program-card-footer"><span>الاستجابة ${m.response}%</span><span class="evaluation-state ${p.settings.evaluationOpen?'is-open':'is-closed'}">${p.settings.evaluationOpen?'التقييم مفتوح':'التقييم مغلق'}</span></div><div class="card-actions"><button onclick="openProgram('${p.id}')">عرض التفاصيل</button><button onclick="editProgram('${p.id}')">تعديل</button><button onclick="duplicateProgram('${p.id}')">نسخ</button><button class="danger-link" onclick="askDelete('${p.id}')">حذف</button></div></article>`}).join('')||'<div class="empty-state"><h2>لا توجد نتائج</h2></div>'};

  window.openProgram=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;ensureSettings(p);currentProgramId=id;const m=metrics(p),s=programState(p),link=`${location.href.split('#')[0]}#evaluate=${encodeURIComponent(id)}`;document.querySelector('#programDetails').innerHTML=`
  <div class="section-tools"><div><p class="eyebrow">${p.id}</p><h2>${escapeHtml(p.name)}</h2><div class="program-badges"><span class="status ${stateClass(s)}">${s}</span><span class="evaluation-state ${p.settings.evaluationOpen?'is-open':'is-closed'}">${p.settings.evaluationOpen?'التقييم مفتوح':'التقييم مغلق'}</span></div></div><div class="inline-actions"><button class="secondary-btn" onclick="editProgram('${p.id}')">تعديل</button><button class="secondary-btn" onclick="duplicateProgram('${p.id}')">نسخ البرنامج</button><button class="secondary-btn" onclick="toggleArchive('${p.id}')">${p.settings.archived?'إلغاء الأرشفة':'أرشفة'}</button><button class="primary-btn" onclick="openEvaluation('${p.id}')">فتح نموذج التقييم</button></div></div>
  <div class="detail-grid"><article class="panel detail-card"><h3>بيانات البرنامج</h3><dl><div><dt>النوع</dt><dd>${escapeHtml(p.type)}</dd></div><div><dt>التاريخ</dt><dd>${formatDate(p.date)}</dd></div><div><dt>الفئة المستهدفة</dt><dd>${escapeHtml(p.audience)}</dd></div><div><dt>عدد المشاركين</dt><dd>${p.participants}</dd></div><div><dt>الجهة المنظمة</dt><dd>${escapeHtml(p.organizer)}</dd></div><div><dt>المدرب</dt><dd>${escapeHtml(p.trainer)}</dd></div></dl><p class="muted">${escapeHtml(p.description||'لا يوجد وصف.')}</p></article><article class="panel detail-card"><h3>رابط التقييم</h3><div class="qr-box"><img alt="QR" src="https://quickchart.io/qr?size=180&text=${encodeURIComponent(link)}"><div><input class="link-input" value="${escapeHtml(link)}" readonly><div class="inline-actions"><button class="secondary-btn" onclick="copyLink('${encodeURIComponent(link)}')">نسخ الرابط</button><button class="primary-btn" onclick="shareLink('${p.id}')">مشاركة</button></div></div></div></article></div>
  <article class="panel program-settings"><div class="panel-head"><div><small>التحكم بالنموذج</small><h3>إعدادات البرنامج</h3></div><button class="${p.settings.evaluationOpen?'danger-btn':'primary-btn'}" onclick="toggleEvaluation('${p.id}')">${p.settings.evaluationOpen?'إغلاق التقييم':'فتح التقييم'}</button></div><div class="settings-options"><label><input id="preventDuplicate" type="checkbox" ${p.settings.preventDuplicate?'checked':''}> منع التقييم المكرر على الجهاز نفسه</label><label><input id="showTrainer" type="checkbox" ${p.settings.showTrainer?'checked':''}> إظهار اسم المدرب</label><label><input id="showDescription" type="checkbox" ${p.settings.showDescription?'checked':''}> إظهار وصف البرنامج</label><label class="full-setting">رسالة الشكر<textarea id="thankYouMessage" rows="3">${escapeHtml(p.settings.thankYouMessage)}</textarea></label></div><div class="form-actions"><button class="secondary-btn" onclick="openProgramQuestionnaire('${p.id}')">تخصيص أسئلة التقييم</button><button class="primary-btn" onclick="saveProgramSettings('${p.id}')">حفظ الإعدادات</button></div></article>
  <div class="kpi-grid"><article class="kpi-card"><div><small>عدد الردود</small><strong>${m.list.length}</strong></div></article><article class="kpi-card"><div><small>نسبة الاستجابة</small><strong>${m.response}%</strong></div></article><article class="kpi-card"><div><small>متوسط الرضا</small><strong>${m.score?m.score.toFixed(2):'—'}</strong></div></article><article class="kpi-card"><div><small>الحالة</small><strong class="small-value">${s}</strong></div></article></div>${renderProgramResults(p,m.list)}`;navigate('program-details')};

  const oldSubmit=document.querySelector('#programForm')?.onsubmit;
  if(oldSubmit)document.querySelector('#programForm').onsubmit=e=>{const id=new FormData(e.currentTarget).get('id');oldSubmit(e);setTimeout(()=>{const p=db.programs.find(x=>x.id===id)||db.programs[0];if(p){ensureSettings(p);save()}},0)};
  renderPrograms();
})();