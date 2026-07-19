(()=>{
  db.trash=Array.isArray(db.trash)?db.trash:[];
  save();

  const esc=window.escapeHtml||((v='')=>String(v));
  const scoreOf=p=>{const m=metrics(p);return m.score||0};
  const stateOf=p=>window.programState?programState(p):status(p);

  function ensureCompletionUI(){
    const dashboard=document.querySelector('#dashboard');
    if(dashboard&&!document.querySelector('#advancedDashboardKpis')){
      const box=document.createElement('div');box.id='advancedDashboardKpis';box.className='kpi-grid completion-kpis';
      const anchor=dashboard.querySelector('.dashboard-grid');dashboard.insertBefore(box,anchor);
    }
    const settings=document.querySelector('#settings .settings-grid');
    if(settings&&!document.querySelector('#dataManagementCard')){
      const card=document.createElement('article');card.id='dataManagementCard';card.className='panel form-panel advanced-wide';
      card.innerHTML=`<div class="panel-head"><div><small>الاستيراد والأرشفة والاستعادة</small><h3>إدارة البيانات</h3></div></div>
      <div class="completion-actions"><label class="secondary-btn file-button">استيراد نسخة JSON<input id="importJson" type="file" accept="application/json,.json"></label><button class="secondary-btn" id="archivePreviousYears">أرشفة السنوات السابقة</button></div>
      <div class="panel-head trash-head"><div><small>البرامج المحذوفة مؤقتًا</small><h3>سلة المحذوفات</h3></div><span id="trashCount" class="type-chip">0</span></div><div id="trashList" class="trash-list"></div>`;
      settings.appendChild(card);
      card.querySelector('#importJson').onchange=importJson;
      card.querySelector('#archivePreviousYears').onclick=archivePreviousYears;
    }
    const reports=document.querySelector('#advancedReportFilters');
    if(reports&&!document.querySelector('#reportSort')){
      const label=document.createElement('label');label.innerHTML='الترتيب<select id="reportSort"><option value="date-desc">الأحدث أولًا</option><option value="score-desc">الأعلى تقييمًا</option><option value="response-desc">الأعلى استجابة</option><option value="name-asc">الاسم</option></select>';
      reports.insertBefore(label,reports.lastElementChild);label.querySelector('select').onchange=()=>renderReports();
    }
  }

  function renderCompletionDashboard(){
    const el=document.querySelector('#advancedDashboardKpis');if(!el)return;
    const scored=db.programs.map(p=>({p,score:scoreOf(p)})).filter(x=>x.score).sort((a,b)=>b.score-a.score);
    const trainerMap={};db.programs.forEach(p=>{if(!p.trainer)return;const s=scoreOf(p);if(!s)return;(trainerMap[p.trainer]??=[]).push(s)});
    const trainers=Object.entries(trainerMap).map(([name,list])=>({name,score:list.reduce((a,b)=>a+b,0)/list.length,count:list.length})).sort((a,b)=>b.score-a.score);
    const typeMap={};db.programs.forEach(p=>typeMap[p.type]=(typeMap[p.type]||0)+1);const common=Object.entries(typeMap).sort((a,b)=>b[1]-a[1])[0];
    const now=new Date(),month=db.evaluations.filter(e=>{const d=new Date(e.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
    el.innerHTML=`<article class="kpi-card"><div><small>أفضل برنامج</small><strong class="small-value">${scored[0]?esc(scored[0].p.name):'—'}</strong><em>${scored[0]?scored[0].score.toFixed(2)+' من 5':'لا توجد تقييمات'}</em></div></article>
    <article class="kpi-card"><div><small>أقل برنامج تقييمًا</small><strong class="small-value">${scored.length?esc(scored[scored.length-1].p.name):'—'}</strong><em>${scored.length?scored[scored.length-1].score.toFixed(2)+' من 5':'لا توجد تقييمات'}</em></div></article>
    <article class="kpi-card"><div><small>أعلى مدرب تقييمًا</small><strong class="small-value">${trainers[0]?esc(trainers[0].name):'—'}</strong><em>${trainers[0]?trainers[0].score.toFixed(2)+' من 5':'لا توجد بيانات'}</em></div></article>
    <article class="kpi-card"><div><small>الأكثر تنفيذًا</small><strong class="small-value">${common?esc(common[0]):'—'}</strong><em>${common?common[1]+' برامج':'لا توجد بيانات'}</em></div></article>
    <article class="kpi-card"><div><small>ردود هذا الشهر</small><strong>${month.length}</strong><em>تقييم مستلم</em></div></article>`;
  }

  function moveToTrash(id){
    const p=db.programs.find(x=>x.id===id);if(!p)return;
    const evals=db.evaluations.filter(e=>e.programId===id);
    db.trash.unshift({program:structuredClone(p),evaluations:structuredClone(evals),deletedAt:new Date().toISOString()});
    db.programs=db.programs.filter(x=>x.id!==id);db.evaluations=db.evaluations.filter(e=>e.programId!==id);save();
    document.querySelector('#confirmModal')?.classList.remove('show');renderPrograms();renderDashboard();renderEvaluations();renderReports();renderTrash();window.addActivity?.('نقل برنامج إلى سلة المحذوفات',p.name);showToast('تم نقل البرنامج إلى سلة المحذوفات');
  }
  function renderTrash(){const list=document.querySelector('#trashList'),count=document.querySelector('#trashCount');if(!list)return;if(count)count.textContent=db.trash.length;list.innerHTML=db.trash.length?db.trash.map((x,i)=>`<div class="trash-item"><div><strong>${esc(x.program.name)}</strong><small>${new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(x.deletedAt))}</small></div><div class="inline-actions"><button class="secondary-btn" onclick="restoreTrash(${i})">استعادة</button><button class="danger-btn" onclick="deleteTrashPermanently(${i})">حذف نهائي</button></div></div>`).join(''):'<p class="muted">سلة المحذوفات فارغة.</p>'}
  window.restoreTrash=i=>{const x=db.trash[i];if(!x)return;db.programs.unshift(x.program);db.evaluations.push(...x.evaluations);db.trash.splice(i,1);save();renderTrash();renderPrograms();renderDashboard();window.addActivity?.('استعادة برنامج',x.program.name);showToast('تمت استعادة البرنامج')};
  window.deleteTrashPermanently=i=>{const x=db.trash[i];if(!x||!confirm('حذف البرنامج نهائيًا؟ لا يمكن التراجع.'))return;db.trash.splice(i,1);save();renderTrash();window.addActivity?.('حذف نهائي',x.program.name);showToast('تم الحذف النهائي')};

  async function importJson(e){const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.programs)||!Array.isArray(data.evaluations))throw new Error();if(!confirm('سيتم استبدال البيانات الحالية بالنسخة المستوردة.'))return;db=data;db.trash=Array.isArray(db.trash)?db.trash:[];save();location.reload()}catch{showToast('ملف النسخة الاحتياطية غير صالح')}finally{e.target.value=''}}
  function archivePreviousYears(){const year=new Date().getFullYear();let count=0;db.programs.forEach(p=>{if(Number(String(p.date).slice(0,4))<year){p.settings={...(p.settings||{}),archived:true};count++}});save();renderPrograms();renderDashboard();window.addActivity?.('أرشفة سنوية',`${count} برنامج`);showToast(count?`تمت أرشفة ${count} برنامج`:'لا توجد برامج من سنوات سابقة')}

  const oldConfirm=document.querySelector('#confirmDelete');if(oldConfirm)oldConfirm.onclick=()=>moveToTrash(window.deleteTarget||deleteTarget);
  const oldDashboard=window.renderDashboard||renderDashboard;window.renderDashboard=function(){oldDashboard();renderCompletionDashboard()};
  const oldReports=window.renderReports||renderReports;window.renderReports=function(){oldReports();const sort=document.querySelector('#reportSort')?.value;if(!sort)return;const body=document.querySelector('#reportsTable');if(!body)return;const rows=[...body.rows];rows.sort((a,b)=>{if(sort==='name-asc')return a.cells[0].textContent.localeCompare(b.cells[0].textContent,'ar');const pa=db.programs.find(p=>p.name===a.cells[0].textContent),pb=db.programs.find(p=>p.name===b.cells[0].textContent);if(sort==='score-desc')return scoreOf(pb)-scoreOf(pa);if(sort==='response-desc')return metrics(pb).response-metrics(pa).response;return (pb?.date||'').localeCompare(pa?.date||'')});rows.forEach(r=>body.appendChild(r))};

  setTimeout(()=>{ensureCompletionUI();renderCompletionDashboard();renderTrash();const oldNav=window.navigate||navigate;window.navigate=function(id){oldNav(id);ensureCompletionUI();if(id==='dashboard')renderCompletionDashboard();if(id==='settings')renderTrash()};},100);
})();
if(!document.querySelector('link[href="insights-reports.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='insights-reports.css';document.head.appendChild(l)}
if(!document.querySelector('script[src="insights-reports.js"]')){const s=document.createElement('script');s.src='insights-reports.js';document.body.appendChild(s)}
if(!document.querySelector('link[href="launch-features.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='launch-features.css';document.head.appendChild(l)}
if(!document.querySelector('script[src="launch-features.js"]')){const s=document.createElement('script');s.src='launch-features.js';document.body.appendChild(s)}