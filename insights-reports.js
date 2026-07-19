(()=>{
  const esc=window.escapeHtml||((v='')=>String(v));
  const fmt=n=>Number.isFinite(n)?n.toFixed(2):'—';
  const score=p=>{const m=metrics(p);return m.score||0};
  const monthKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`};

  function ensureInsightsUI(){
    const dashboard=document.querySelector('#dashboard');
    if(dashboard&&!document.querySelector('#executiveInsights')){
      const section=document.createElement('div');section.id='executiveInsights';section.className='insights-grid';
      section.innerHTML='<article class="panel"><div class="panel-head"><div><small>الاتجاه الشهري</small><h3>متوسط الرضا خلال 6 أشهر</h3></div></div><div id="monthlySatisfaction" class="mini-bars"></div></article><article class="panel"><div class="panel-head"><div><small>المقارنة</small><h3>هذا الشهر مقابل السابق</h3></div></div><div id="monthComparison" class="comparison-box"></div></article><article class="panel"><div class="panel-head"><div><small>توزيع التنفيذ</small><h3>البرامج حسب النوع</h3></div></div><div id="typeDistribution" class="distribution-list"></div></article>';
      const anchor=dashboard.querySelector('.table-panel');dashboard.insertBefore(section,anchor);
    }
    const tools=document.querySelector('#reports .section-tools');
    if(tools&&!document.querySelector('#reportExportMenu')){
      const wrap=document.createElement('div');wrap.id='reportExportMenu';wrap.className='inline-actions report-actions';
      wrap.innerHTML='<button class="secondary-btn" id="exportExcel">تصدير Excel</button><button class="secondary-btn" id="annualReport">تقرير سنوي</button><button class="secondary-btn" id="trainerReport">تقرير مدرب</button>';
      tools.appendChild(wrap);
      wrap.querySelector('#exportExcel').onclick=exportExcel;
      wrap.querySelector('#annualReport').onclick=printAnnualReport;
      wrap.querySelector('#trainerReport').onclick=printTrainerReport;
    }
  }

  function renderInsights(){
    const now=new Date(),months=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:monthKey(d),label:new Intl.DateTimeFormat('ar-SA',{month:'short'}).format(d)});}
    const monthly=months.map(m=>{const list=db.evaluations.filter(e=>monthKey(e.createdAt)===m.key);return {...m,count:list.length,value:list.length?overall(list):0}});
    const chart=document.querySelector('#monthlySatisfaction');
    if(chart)chart.innerHTML=monthly.map(m=>`<div title="${m.label}: ${m.value?m.value.toFixed(2):'لا توجد بيانات'}"><strong>${m.value?m.value.toFixed(1):'—'}</strong><span style="height:${m.value?Math.max(10,m.value/5*100):4}%"></span><small>${m.label}</small></div>`).join('');
    const current=monthly.at(-1),previous=monthly.at(-2),delta=(current?.value||0)-(previous?.value||0),responsesDelta=(current?.count||0)-(previous?.count||0);
    const cmp=document.querySelector('#monthComparison');if(cmp)cmp.innerHTML=`<div><small>متوسط الرضا</small><strong>${current?.value?current.value.toFixed(2):'—'}</strong><em class="${delta>=0?'positive':'negative'}">${delta>=0?'↑':'↓'} ${Math.abs(delta).toFixed(2)}</em></div><div><small>عدد التقييمات</small><strong>${current?.count||0}</strong><em class="${responsesDelta>=0?'positive':'negative'}">${responsesDelta>=0?'↑':'↓'} ${Math.abs(responsesDelta)}</em></div>`;
    const map={};db.programs.forEach(p=>map[p.type]=(map[p.type]||0)+1);const max=Math.max(1,...Object.values(map));const dist=document.querySelector('#typeDistribution');if(dist)dist.innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div><span>${esc(name)}</span><div><i style="width:${count/max*100}%"></i></div><strong>${count}</strong></div>`).join('')||'<p class="muted">لا توجد برامج.</p>';
  }

  function activeProgramsForReport(){
    const from=document.querySelector('#reportFrom')?.value,to=document.querySelector('#reportTo')?.value,type=document.querySelector('#reportType')?.value||'all',trainer=document.querySelector('#reportTrainer')?.value||'all',organizer=document.querySelector('#reportOrganizer')?.value||'all';
    return db.programs.filter(p=>(!from||p.date>=from)&&(!to||p.date<=to)&&(type==='all'||p.type===type)&&(trainer==='all'||p.trainer===trainer)&&(organizer==='all'||p.organizer===organizer));
  }

  function exportExcel(){
    const programs=activeProgramsForReport();
    const rows=programs.map(p=>{const m=metrics(p);return `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${esc(p.date)}</td><td>${esc(p.trainer)}</td><td>${p.participants}</td><td>${m.list.length}</td><td>${m.response}%</td><td>${m.score?m.score.toFixed(2):''}</td></tr>`}).join('');
    const html=`<html dir="rtl"><head><meta charset="utf-8"></head><body><table border="1"><tr><th>رقم البرنامج</th><th>اسم البرنامج</th><th>النوع</th><th>التاريخ</th><th>المدرب</th><th>المشاركون</th><th>الردود</th><th>نسبة الاستجابة</th><th>متوسط الرضا</th></tr>${rows}</table></body></html>`;
    download('\ufeff'+html,'iec-report.xls','application/vnd.ms-excel');window.addActivity?.('تصدير تقرير Excel',`${programs.length} برنامج`);
  }

  function printDocument(title,subtitle,body){
    const w=window.open('','_blank','width=1000,height=800');if(!w){showToast('اسمح بالنوافذ المنبثقة لإنشاء التقرير');return}
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Tajawal,Arial;padding:36px;color:#17351e}h1{margin-bottom:4px}p{color:#607064}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #d9e2da;padding:10px;text-align:right}th{background:#eef4ef}.summary{display:flex;gap:14px;flex-wrap:wrap;margin:20px 0}.summary div{border:1px solid #d9e2da;border-radius:10px;padding:14px;min-width:150px}.summary strong{display:block;font-size:22px;margin-top:6px}@media print{button{display:none}}</style></head><body><h1>${esc(title)}</h1><p>${esc(subtitle)}</p>${body}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  }

  function printAnnualReport(){
    const years=[...new Set(db.programs.map(p=>String(p.date).slice(0,4)))].sort().reverse();const year=prompt('أدخل السنة المطلوبة:',years[0]||new Date().getFullYear());if(!year)return;
    const programs=db.programs.filter(p=>String(p.date).startsWith(year)),evals=db.evaluations.filter(e=>programs.some(p=>p.id===e.programId)),participants=programs.reduce((s,p)=>s+Number(p.participants||0),0),rate=participants?Math.round(evals.length/participants*100):0;
    const rows=programs.sort((a,b)=>a.date.localeCompare(b.date)).map(p=>{const m=metrics(p);return `<tr><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${esc(p.date)}</td><td>${esc(p.trainer)}</td><td>${p.participants}</td><td>${m.list.length}</td><td>${m.response}%</td><td>${fmt(m.score)}</td></tr>`}).join('');
    printDocument(`التقرير السنوي ${year}`,db.settings.centerName,`<div class="summary"><div>عدد البرامج<strong>${programs.length}</strong></div><div>المشاركون<strong>${participants}</strong></div><div>التقييمات<strong>${evals.length}</strong></div><div>نسبة الاستجابة<strong>${rate}%</strong></div><div>متوسط الرضا<strong>${evals.length?overall(evals).toFixed(2):'—'}</strong></div></div><table><tr><th>البرنامج</th><th>النوع</th><th>التاريخ</th><th>المدرب</th><th>المشاركون</th><th>الردود</th><th>الاستجابة</th><th>الرضا</th></tr>${rows}</table>`);window.addActivity?.('إنشاء تقرير سنوي',year);
  }

  function printTrainerReport(){
    const trainers=[...new Set(db.programs.map(p=>p.trainer).filter(Boolean))].sort();const trainer=prompt(`اكتب اسم المدرب:\n${trainers.join('، ')}`,trainers[0]||'');if(!trainer)return;
    const programs=db.programs.filter(p=>p.trainer===trainer),evals=db.evaluations.filter(e=>programs.some(p=>p.id===e.programId));
    const rows=programs.map(p=>{const m=metrics(p);return `<tr><td>${esc(p.name)}</td><td>${esc(p.date)}</td><td>${p.participants}</td><td>${m.list.length}</td><td>${m.response}%</td><td>${fmt(m.score)}</td></tr>`}).join('');
    printDocument(`تقرير المدرب: ${trainer}`,db.settings.centerName,`<div class="summary"><div>عدد البرامج<strong>${programs.length}</strong></div><div>عدد التقييمات<strong>${evals.length}</strong></div><div>متوسط التقييم<strong>${evals.length?overall(evals).toFixed(2):'—'}</strong></div></div><table><tr><th>البرنامج</th><th>التاريخ</th><th>المشاركون</th><th>الردود</th><th>الاستجابة</th><th>الرضا</th></tr>${rows}</table>`);window.addActivity?.('إنشاء تقرير مدرب',trainer);
  }

  window.printProgramReport=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;const m=metrics(p);const axes=questions.map(([k,label])=>`<tr><td>${esc(label)}</td><td>${m.list.length?avg(m.list,k).toFixed(2):'—'}</td></tr>`).join('');printDocument(`تقرير البرنامج: ${p.name}`,`${p.date} — ${p.trainer}`,`<div class="summary"><div>المشاركون<strong>${p.participants}</strong></div><div>الردود<strong>${m.list.length}</strong></div><div>الاستجابة<strong>${m.response}%</strong></div><div>الرضا<strong>${fmt(m.score)}</strong></div></div><table><tr><th>المحور</th><th>المتوسط</th></tr>${axes}</table>`);window.addActivity?.('إنشاء تقرير برنامج',p.name)};

  window.cloneProgramWithDate=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;const date=prompt('أدخل تاريخ النسخة الجديدة بصيغة YYYY-MM-DD:',p.date);if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)){if(date)showToast('صيغة التاريخ غير صحيحة');return}const copy=structuredClone(p);copy.id='PRG-'+Date.now();copy.name=p.name+' — نسخة';copy.date=date;copy.settings={...(copy.settings||{}),archived:false,evaluationOpen:true};db.programs.unshift(copy);save();renderPrograms();renderDashboard();window.addActivity?.('نسخ برنامج بتاريخ جديد',copy.name);openProgram(copy.id)};

  window.scheduleRecurring=id=>{const p=db.programs.find(x=>x.id===id);if(!p)return;const input=prompt('أدخل التواريخ مفصولة بفاصلة، مثال:\n2026-08-01, 2026-08-08');if(!input)return;const dates=input.split(',').map(x=>x.trim()).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));if(!dates.length){showToast('لم يتم إدخال تواريخ صحيحة');return}dates.forEach((date,i)=>{const copy=structuredClone(p);copy.id='PRG-'+Date.now()+'-'+i;copy.name=p.name;copy.date=date;copy.settings={...(copy.settings||{}),archived:false,evaluationOpen:true};db.programs.unshift(copy)});save();renderPrograms();renderDashboard();window.addActivity?.('جدولة برنامج متكرر',`${p.name} — ${dates.length} مواعيد`);showToast(`تم إنشاء ${dates.length} مواعيد`)};

  function enhanceProgramDetails(){const root=document.querySelector('#programDetails');if(!root||!currentProgramId)return;const actions=root.querySelector('.section-tools .inline-actions');if(actions&&!actions.querySelector('.insight-action')){actions.insertAdjacentHTML('afterbegin',`<button class="secondary-btn insight-action" onclick="printProgramReport('${currentProgramId}')">تقرير البرنامج</button><button class="secondary-btn insight-action" onclick="cloneProgramWithDate('${currentProgramId}')">نسخ بتاريخ جديد</button><button class="secondary-btn insight-action" onclick="scheduleRecurring('${currentProgramId}')">جدولة متكررة</button>`);}}

  const oldDashboard=window.renderDashboard||renderDashboard;window.renderDashboard=function(){oldDashboard();ensureInsightsUI();renderInsights()};
  const oldOpen=window.openProgram||openProgram;window.openProgram=function(id){oldOpen(id);setTimeout(enhanceProgramDetails,0)};
  setTimeout(()=>{ensureInsightsUI();renderInsights();if(currentProgramId)enhanceProgramDetails();const oldNav=window.navigate||navigate;window.navigate=function(id){oldNav(id);ensureInsightsUI();if(id==='dashboard')renderInsights();if(id==='program-details')setTimeout(enhanceProgramDetails,0)};},200);
})();