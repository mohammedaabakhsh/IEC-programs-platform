(()=>{
  const ATTENDANCE_KEY='iec-attendance-v1';
  const GOALS_KEY='iec-kpi-goals-v1';
  const esc=window.escapeHtml||((v='')=>String(v));
  const getAttendance=()=>JSON.parse(localStorage.getItem(ATTENDANCE_KEY)||'{}');
  const saveAttendance=data=>localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(data));
  const defaultGoals={programs:120,participants:3000,satisfaction:4.7,response:80};
  const getGoals=()=>({...defaultGoals,...JSON.parse(localStorage.getItem(GOALS_KEY)||'{}')});
  const saveGoals=data=>localStorage.setItem(GOALS_KEY,JSON.stringify(data));
  const yearOf=p=>String(p.date||'').slice(0,4);
  const currentYear=()=>String(new Date().getFullYear());
  const programsForYear=year=>db.programs.filter(p=>yearOf(p)===String(year));
  const evaluationsForPrograms=programs=>db.evaluations.filter(e=>programs.some(p=>p.id===e.programId));
  const attendanceCount=id=>(getAttendance()[id]||[]).length;

  function addNav(id,label,icon){
    const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector(`[data-view="${id}"]`))return;
    const b=document.createElement('button');b.className='nav-item';b.dataset.view=id;b.innerHTML=`<span>${icon}</span> ${label}`;nav.appendChild(b);b.onclick=()=>navigate(id);
  }

  function addViews(){
    const main=document.querySelector('.main-content');if(!main)return;
    if(!document.querySelector('#strategic-dashboard')){
      const s=document.createElement('section');s.id='strategic-dashboard';s.className='view';s.innerHTML=`
      <div class="section-tools"><div><p class="eyebrow">الإدارة التنفيذية</p><h2>لوحة التنفيذ السنوية</h2></div><div class="inline-actions"><select id="strategicYear"></select><button class="secondary-btn" id="openTvMode">وضع الشاشة</button><button class="primary-btn" id="exportPowerPoint">تصدير PowerPoint</button></div></div>
      <div id="strategicAlerts"></div><div id="strategicKpis" class="kpi-grid"></div>
      <div class="strategic-grid"><article class="panel"><div class="panel-head"><h3>التقدم نحو الأهداف</h3><button class="text-btn" id="editGoals">تعديل الأهداف</button></div><div id="goalProgress"></div></article><article class="panel"><div class="panel-head"><h3>توزيع البرامج</h3></div><div id="annualDistribution"></div></article></div>
      <article class="panel table-panel"><div class="panel-head"><h3>البرامج السنوية</h3></div><div class="table-wrap"><table><thead><tr><th>البرنامج</th><th>النوع</th><th>المشاركون</th><th>الحضور</th><th>الردود</th><th>الاستجابة</th><th>الرضا</th><th>الحالة</th></tr></thead><tbody id="annualProgramsTable"></tbody></table></div></article>`;main.appendChild(s);
    }
    if(!document.querySelector('#year-archive')){
      const s=document.createElement('section');s.id='year-archive';s.className='view';s.innerHTML=`<div class="section-tools"><div><p class="eyebrow">السجل التاريخي</p><h2>أرشيف السنوات</h2></div></div><div id="archiveYears" class="archive-grid"></div><div id="archiveDetails"></div>`;main.appendChild(s);
    }
  }

  function years(){return [...new Set(db.programs.map(yearOf).filter(Boolean))].sort().reverse()}
  function populateYears(){const select=document.querySelector('#strategicYear');if(!select)return;const ys=years();if(!ys.includes(currentYear()))ys.unshift(currentYear());const existing=select.value;select.innerHTML=ys.map(y=>`<option value="${y}">${y}</option>`).join('');select.value=existing&&ys.includes(existing)?existing:ys[0];}

  function annualMetrics(year){
    const programs=programsForYear(year),evals=evaluationsForPrograms(programs),participants=programs.reduce((s,p)=>s+Number(p.participants||0),0),responses=evals.length,score=responses?overall(evals):0,response=participants?Math.round(responses/participants*100):0,attendance=programs.reduce((s,p)=>s+attendanceCount(p.id),0);
    return {programs,evals,participants,responses,score,response,attendance};
  }

  function renderAlerts(m){
    const alerts=[];
    m.programs.forEach(p=>{const x=metrics(p);if(status(p)==='مكتمل'&&!x.list.length)alerts.push({level:'danger',text:`${p.name}: لا توجد تقييمات`});else if(x.response<30&&status(p)==='مكتمل')alerts.push({level:'warn',text:`${p.name}: نسبة الاستجابة ${x.response}%`});if(x.score&&x.score<3.5)alerts.push({level:'danger',text:`${p.name}: متوسط الرضا ${x.score.toFixed(2)}`})});
    const el=document.querySelector('#strategicAlerts');if(el)el.innerHTML=alerts.length?`<div class="alert-strip">${alerts.slice(0,6).map(a=>`<div class="suite-alert ${a.level}"><span>${a.level==='danger'?'!':'⚠'}</span>${esc(a.text)}</div>`).join('')}</div>`:'<div class="suite-alert success"><span>✓</span> لا توجد تنبيهات حرجة لهذه السنة</div>';
  }

  function renderGoals(m){
    const goals=getGoals();
    const rows=[['عدد البرامج',m.programs.length,goals.programs,''],['عدد المشاركين',m.participants,goals.participants,''],['متوسط الرضا',m.score||0,goals.satisfaction,' / 5'],['نسبة الاستجابة',m.response,goals.response,'%']];
    const el=document.querySelector('#goalProgress');if(el)el.innerHTML=rows.map(([label,value,target,suffix])=>{const pct=Math.min(100,Math.round((Number(value)||0)/(Number(target)||1)*100));return `<div class="goal-row"><div><span>${label}</span><strong>${typeof value==='number'&&label==='متوسط الرضا'?value.toFixed(2):value}${suffix} / ${target}${suffix}</strong></div><div class="goal-track"><i style="width:${pct}%"></i></div><small>${pct}%</small></div>`}).join('');
  }

  function renderStrategic(){
    populateYears();const year=document.querySelector('#strategicYear')?.value||currentYear(),m=annualMetrics(year);
    const best=m.programs.filter(p=>metrics(p).score).sort((a,b)=>metrics(b).score-metrics(a).score)[0];
    const k=document.querySelector('#strategicKpis');if(k)k.innerHTML=`<article class="kpi-card"><div><small>البرامج المنفذة</small><strong>${m.programs.length}</strong></div></article><article class="kpi-card"><div><small>إجمالي المشاركين</small><strong>${m.participants}</strong></div></article><article class="kpi-card"><div><small>الحضور المسجل</small><strong>${m.attendance}</strong></div></article><article class="kpi-card"><div><small>متوسط الرضا</small><strong>${m.score?m.score.toFixed(2):'—'}</strong></div></article><article class="kpi-card"><div><small>نسبة الاستجابة</small><strong>${m.response}%</strong></div></article><article class="kpi-card"><div><small>أفضل برنامج</small><strong class="small-value">${best?esc(best.name):'—'}</strong></div></article>`;
    renderAlerts(m);renderGoals(m);
    const types={};m.programs.forEach(p=>types[p.type]=(types[p.type]||0)+1);const max=Math.max(1,...Object.values(types));const d=document.querySelector('#annualDistribution');if(d)d.innerHTML=Object.entries(types).map(([name,count])=>`<div class="distribution-row"><span>${esc(name)}</span><div><i style="width:${count/max*100}%"></i></div><strong>${count}</strong></div>`).join('')||'<p class="muted">لا توجد بيانات.</p>';
    const t=document.querySelector('#annualProgramsTable');if(t)t.innerHTML=m.programs.sort((a,b)=>a.date.localeCompare(b.date)).map(p=>{const x=metrics(p);return `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.type)}</td><td>${p.participants}</td><td>${attendanceCount(p.id)}</td><td>${x.list.length}</td><td>${x.response}%</td><td>${x.score?x.score.toFixed(2):'—'}</td><td>${status(p)}</td></tr>`}).join('')||'<tr><td colspan="8">لا توجد برامج في هذه السنة.</td></tr>';
  }

  function renderArchive(){
    const root=document.querySelector('#archiveYears');if(!root)return;root.innerHTML=years().map(y=>{const m=annualMetrics(y);return `<button class="archive-card" data-year="${y}"><strong>${y}</strong><span>${m.programs.length} برنامج</span><span>${m.participants} مشارك</span><span>${m.score?m.score.toFixed(2):'—'} رضا</span></button>`}).join('')||'<div class="empty-state"><h2>لا يوجد أرشيف بعد</h2></div>';root.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>showArchiveYear(b.dataset.year));
  }

  function showArchiveYear(year){const m=annualMetrics(year),el=document.querySelector('#archiveDetails');if(!el)return;el.innerHTML=`<article class="panel archive-summary"><div class="panel-head"><div><small>ملخص سنوي</small><h3>${year}</h3></div><button class="secondary-btn" onclick="window.printAnnualArchive('${year}')">طباعة الملخص</button></div><div class="kpi-grid"><article class="kpi-card"><div><small>البرامج</small><strong>${m.programs.length}</strong></div></article><article class="kpi-card"><div><small>المشاركون</small><strong>${m.participants}</strong></div></article><article class="kpi-card"><div><small>التقييمات</small><strong>${m.responses}</strong></div></article><article class="kpi-card"><div><small>الرضا</small><strong>${m.score?m.score.toFixed(2):'—'}</strong></div></article></div></article>`}

  function printHtml(title,body){const w=window.open('','_blank','width=1100,height=800');if(!w){showToast('اسمح بالنوافذ المنبثقة');return}w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Tajawal,Arial;padding:40px;color:#16351f}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ccd8ce;padding:9px;text-align:right}.certificate{border:10px double #356b3d;padding:60px;text-align:center;min-height:520px}.certificate h1{font-size:34px}.certificate h2{font-size:28px;margin:40px 0}.certificate .seal{font-size:70px}.meta{display:flex;justify-content:space-around;margin-top:60px}@media print{button{display:none}}</style></head><body>${body}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

  window.printAnnualArchive=year=>{const m=annualMetrics(year),rows=m.programs.map(p=>{const x=metrics(p);return `<tr><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${p.participants}</td><td>${x.list.length}</td><td>${x.response}%</td><td>${x.score?x.score.toFixed(2):'—'}</td></tr>`}).join('');printHtml(`ملخص ${year}`,`<h1>التقرير السنوي ${year}</h1><p>${esc(db.settings.centerName)}</p><table><tr><th>البرنامج</th><th>النوع</th><th>المشاركون</th><th>الردود</th><th>الاستجابة</th><th>الرضا</th></tr>${rows}</table>`)};
  window.issueCertificate=(id,type='attendance')=>{const p=db.programs.find(x=>x.id===id);if(!p)return;const recipient=prompt(type==='trainer'?'اسم المدرب في الشهادة:':'اسم المستفيد في الشهادة:',type==='trainer'?p.trainer:'');if(!recipient)return;const code=`CERT-${Date.now().toString(36).toUpperCase()}`;printHtml('شهادة',`<div class="certificate"><div class="seal">IEC</div><h1>${type==='trainer'?'شهادة تقديم برنامج':'شهادة حضور'}</h1><p>يشهد ${esc(db.settings.centerName)} بأن</p><h2>${esc(recipient)}</h2><p>${type==='trainer'?'قدّم':'حضر'} برنامج <strong>${esc(p.name)}</strong></p><p>بتاريخ ${esc(formatDate(p.date))}</p><div class="meta"><span>الرمز: ${code}</span><span>${esc(db.settings.universityName)}</span></div></div>`);window.addActivity?.('إصدار شهادة',`${recipient} — ${p.name}`)};

  window.openAttendance=(id)=>{const p=db.programs.find(x=>x.id===id);if(!p)return;const data=getAttendance(),list=data[id]||[];const name=prompt(`تسجيل حضور: ${p.name}\nاكتب اسم المشارك:`);if(!name)return;if(list.some(x=>x.name.trim()===name.trim())){showToast('الاسم مسجل مسبقًا');return}list.push({id:crypto.randomUUID(),name:name.trim(),createdAt:new Date().toISOString()});data[id]=list;saveAttendance(data);showToast('تم تسجيل الحضور');openProgram(id)};
  window.showAttendanceList=id=>{const p=db.programs.find(x=>x.id===id),list=getAttendance()[id]||[];printHtml(`سجل حضور ${p?.name||''}`,`<h1>سجل الحضور</h1><h2>${esc(p?.name||'')}</h2><table><tr><th>#</th><th>الاسم</th><th>وقت التسجيل</th></tr>${list.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${new Date(x.createdAt).toLocaleString('ar-SA')}</td></tr>`).join('')}</table>`)};

  function exportPowerPoint(){const year=document.querySelector('#strategicYear')?.value||currentYear(),m=annualMetrics(year);const slides=`<html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial}.slide{page-break-after:always;width:960px;height:540px;padding:50px;box-sizing:border-box}.kpis{display:flex;gap:20px;flex-wrap:wrap}.kpi{border:2px solid #356b3d;padding:24px;width:180px}.kpi strong{font-size:36px;display:block}</style></head><body><section class="slide"><h1>التقرير التنفيذي ${year}</h1><h2>${esc(db.settings.centerName)}</h2></section><section class="slide"><h1>المؤشرات الرئيسية</h1><div class="kpis"><div class="kpi">البرامج<strong>${m.programs.length}</strong></div><div class="kpi">المشاركون<strong>${m.participants}</strong></div><div class="kpi">التقييمات<strong>${m.responses}</strong></div><div class="kpi">الاستجابة<strong>${m.response}%</strong></div><div class="kpi">الرضا<strong>${m.score?m.score.toFixed(2):'—'}</strong></div></div></section></body></html>`;download('\ufeff'+slides,`IEC-${year}.ppt`,'application/vnd.ms-powerpoint');window.addActivity?.('تصدير PowerPoint',year)}

  function openTvMode(){const year=document.querySelector('#strategicYear')?.value||currentYear(),m=annualMetrics(year),w=window.open('','_blank');if(!w){showToast('اسمح بالنوافذ المنبثقة');return}w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>شاشة المؤشرات</title><style>body{margin:0;background:#102d18;color:white;font-family:Tajawal,Arial;display:grid;place-items:center;min-height:100vh}.wrap{width:90%;text-align:center}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:50px}.card{background:#fff;color:#17351e;border-radius:24px;padding:40px}.card strong{font-size:64px;display:block}h1{font-size:44px}p{font-size:24px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}</style></head><body><div class="wrap"><h1>${esc(db.settings.centerName)}</h1><p>المؤشرات التنفيذية ${year}</p><div class="grid"><div class="card">البرامج<strong>${m.programs.length}</strong></div><div class="card">المشاركون<strong>${m.participants}</strong></div><div class="card">الاستجابة<strong>${m.response}%</strong></div><div class="card">الرضا<strong>${m.score?m.score.toFixed(2):'—'}</strong></div></div></div><script>setInterval(()=>location.reload(),300000)<\/script></body></html>`);w.document.close()}

  function editGoals(){const g=getGoals(),programs=prompt('الهدف السنوي لعدد البرامج:',g.programs),participants=prompt('الهدف السنوي للمشاركين:',g.participants),satisfaction=prompt('هدف متوسط الرضا من 5:',g.satisfaction),response=prompt('هدف نسبة الاستجابة %:',g.response);if([programs,participants,satisfaction,response].some(v=>v===null))return;saveGoals({programs:Number(programs)||g.programs,participants:Number(participants)||g.participants,satisfaction:Number(satisfaction)||g.satisfaction,response:Number(response)||g.response});renderStrategic();showToast('تم حفظ أهداف KPI')}

  function enhanceProgram(){const root=document.querySelector('#programDetails');if(!root||!currentProgramId)return;const actions=root.querySelector('.section-tools .inline-actions');if(actions&&!actions.querySelector('.suite-action'))actions.insertAdjacentHTML('afterbegin',`<button class="secondary-btn suite-action" onclick="openAttendance('${currentProgramId}')">تسجيل حضور</button><button class="secondary-btn suite-action" onclick="showAttendanceList('${currentProgramId}')">سجل الحضور (${attendanceCount(currentProgramId)})</button><button class="secondary-btn suite-action" onclick="issueCertificate('${currentProgramId}','attendance')">شهادة حضور</button><button class="secondary-btn suite-action" onclick="issueCertificate('${currentProgramId}','trainer')">شهادة مدرب</button>`);
  }

  function bind(){
    addNav('strategic-dashboard','الإدارة التنفيذية','◈');addNav('year-archive','أرشيف السنوات','▣');addViews();populateYears();
    document.querySelector('#strategicYear')?.addEventListener('change',renderStrategic);document.querySelector('#editGoals')?.addEventListener('click',editGoals);document.querySelector('#exportPowerPoint')?.addEventListener('click',exportPowerPoint);document.querySelector('#openTvMode')?.addEventListener('click',openTvMode);
    const oldNavigate=window.navigate||navigate;window.navigate=function(id){oldNavigate(id);if(id==='strategic-dashboard'){document.querySelector('#pageTitle').textContent='الإدارة التنفيذية';renderStrategic()}if(id==='year-archive'){document.querySelector('#pageTitle').textContent='أرشيف السنوات';renderArchive()}};
    const oldOpen=window.openProgram||openProgram;window.openProgram=function(id){oldOpen(id);setTimeout(enhanceProgram,0)};
    renderStrategic();renderArchive();if(currentProgramId)setTimeout(enhanceProgram,0);
  }
  setTimeout(bind,350);
})();