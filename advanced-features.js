(()=>{
  db.templates=Array.isArray(db.templates)?db.templates:[
    {id:'TPL-WORKSHOP',name:'ورشة عمل',type:'ورشة عمل',audience:'',participants:25,organizer:db.settings.centerName||'مركز الابتكار وريادة الأعمال',trainer:'',description:'ورشة تطبيقية تفاعلية.',settings:{evaluationOpen:true,preventDuplicate:true,showTrainer:true,showDescription:true,thankYouMessage:'شكرًا لمشاركتك في تقييم الورشة.',archived:false}},
    {id:'TPL-PROGRAM',name:'برنامج تدريبي',type:'برنامج',audience:'',participants:40,organizer:db.settings.centerName||'مركز الابتكار وريادة الأعمال',trainer:'',description:'برنامج تدريبي لتنمية المعارف والمهارات.',settings:{evaluationOpen:true,preventDuplicate:true,showTrainer:true,showDescription:true,thankYouMessage:'شكرًا لمشاركتك في تقييم البرنامج.',archived:false}},
    {id:'TPL-HACKATHON',name:'هاكاثون',type:'برنامج',audience:'الطلاب ورواد الأعمال',participants:100,organizer:db.settings.centerName||'مركز الابتكار وريادة الأعمال',trainer:'لجنة التحكيم والإرشاد',description:'تحدٍ ابتكاري لتطوير حلول قابلة للتطبيق.',settings:{evaluationOpen:true,preventDuplicate:true,showTrainer:true,showDescription:true,thankYouMessage:'شكرًا لمشاركتك في تقييم الهاكاثون.',archived:false}},
    {id:'TPL-SESSION',name:'جلسة حوارية',type:'جلسة',audience:'',participants:60,organizer:db.settings.centerName||'مركز الابتكار وريادة الأعمال',trainer:'',description:'جلسة حوارية لتبادل الخبرات والتجارب.',settings:{evaluationOpen:true,preventDuplicate:true,showTrainer:true,showDescription:true,thankYouMessage:'شكرًا لمشاركتك في تقييم الجلسة.',archived:false}}
  ];
  db.activityLog=Array.isArray(db.activityLog)?db.activityLog:[];
  const log=(action,details='')=>{db.activityLog.unshift({id:crypto.randomUUID(),action,details,createdAt:new Date().toISOString()});db.activityLog=db.activityLog.slice(0,200);save()};
  window.addActivity=log;
  save();

  function ensureTemplatesUI(){
    const settings=document.querySelector('#settings .settings-grid');
    if(settings&&!document.querySelector('#templatesCard')){
      const card=document.createElement('article');card.id='templatesCard';card.className='panel form-panel advanced-wide';
      card.innerHTML=`<div class="panel-head"><div><small>إنشاء أسرع للبرامج المتكررة</small><h3>قوالب البرامج</h3></div></div><div id="templatesList" class="template-grid"></div>`;
      settings.appendChild(card);
    }
    const reports=document.querySelector('#reports .section-tools');
    if(reports&&!document.querySelector('#exportPdf')){
      const actions=document.createElement('div');actions.className='inline-actions';actions.innerHTML='<button class="secondary-btn" id="exportPdf">تقرير PDF</button>';
      reports.appendChild(actions);document.querySelector('#exportPdf').onclick=()=>window.print();
    }
    const reportsSection=document.querySelector('#reports');
    if(reportsSection&&!document.querySelector('#advancedReportFilters')){
      const filters=document.createElement('div');filters.id='advancedReportFilters';filters.className='panel report-filter-grid';filters.innerHTML=`
        <label>من تاريخ<input type="date" id="reportFrom"></label><label>إلى تاريخ<input type="date" id="reportTo"></label>
        <label>نوع النشاط<select id="reportType"><option value="all">جميع الأنواع</option></select></label>
        <label>المدرب<select id="reportTrainer"><option value="all">جميع المدربين</option></select></label>
        <label>الجهة المنظمة<select id="reportOrganizer"><option value="all">جميع الجهات</option></select></label>
        <button class="secondary-btn" id="clearReportFilters">إعادة الضبط</button>`;
      reportsSection.insertBefore(filters,reportsSection.querySelector('.report-kpis'));
      filters.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',renderAdvancedReports));
      filters.querySelector('#clearReportFilters').onclick=()=>{filters.querySelectorAll('input').forEach(x=>x.value='');filters.querySelectorAll('select').forEach(x=>x.value='all');renderAdvancedReports()};
    }
    const topActions=document.querySelector('.topbar-actions');
    if(topActions&&!document.querySelector('#notificationBtn')){
      const wrap=document.createElement('div');wrap.className='notification-wrap';wrap.innerHTML='<button class="icon-btn notification-button" id="notificationBtn" title="الإشعارات">🔔<b id="notificationCount">0</b></button><div class="notification-panel" id="notificationPanel"><div class="panel-head"><h3>التنبيهات</h3></div><div id="notificationList"></div></div>';
      topActions.prepend(wrap);wrap.querySelector('#notificationBtn').onclick=()=>wrap.querySelector('#notificationPanel').classList.toggle('show');
    }
    if(settings&&!document.querySelector('#activityCard')){
      const card=document.createElement('article');card.id='activityCard';card.className='panel form-panel advanced-wide';card.innerHTML='<div class="panel-head"><div><small>آخر العمليات المحلية</small><h3>سجل النشاط</h3></div><button class="secondary-btn" id="clearActivity">مسح السجل</button></div><div id="activityList" class="activity-list"></div>';
      settings.appendChild(card);card.querySelector('#clearActivity').onclick=()=>{if(confirm('هل تريد مسح سجل النشاط؟')){db.activityLog=[];save();renderActivity()}};
    }
  }

  function renderTemplates(){const el=document.querySelector('#templatesList');if(!el)return;el.innerHTML=db.templates.map(t=>`<article class="template-card"><span class="type-chip">${escapeHtml(t.type)}</span><h4>${escapeHtml(t.name)}</h4><p>${escapeHtml(t.description)}</p><button class="primary-btn" onclick="createFromTemplate('${t.id}')">استخدام القالب</button></article>`).join('')}
  window.createFromTemplate=id=>{const t=db.templates.find(x=>x.id===id);if(!t)return;const p={id:'PRG-'+Date.now(),name:t.name+' جديد',type:t.type,date:new Date().toISOString().slice(0,10),audience:t.audience,participants:t.participants,organizer:t.organizer,trainer:t.trainer,description:t.description,settings:structuredClone(t.settings),questionnaireMode:'default'};db.programs.unshift(p);log('إنشاء برنامج من قالب',p.name);save();editProgram(p.id)};

  function filteredPrograms(){const from=document.querySelector('#reportFrom')?.value,to=document.querySelector('#reportTo')?.value,type=document.querySelector('#reportType')?.value||'all',trainer=document.querySelector('#reportTrainer')?.value||'all',organizer=document.querySelector('#reportOrganizer')?.value||'all';return db.programs.filter(p=>(!from||p.date>=from)&&(!to||p.date<=to)&&(type==='all'||p.type===type)&&(trainer==='all'||p.trainer===trainer)&&(organizer==='all'||p.organizer===organizer))}
  function fillReportOptions(){[['#reportType','type'],['#reportTrainer','trainer'],['#reportOrganizer','organizer']].forEach(([sel,key])=>{const el=document.querySelector(sel);if(!el)return;const selected=el.value;const first=el.options[0].outerHTML;el.innerHTML=first+[...new Set(db.programs.map(p=>p[key]).filter(Boolean))].sort().map(v=>`<option>${escapeHtml(v)}</option>`).join('');el.value=[...el.options].some(o=>o.value===selected)?selected:'all'})}
  function renderAdvancedReports(){fillReportOptions();const programs=filteredPrograms(),evals=db.evaluations.filter(e=>programs.some(p=>p.id===e.programId)),participants=programs.reduce((s,p)=>s+Number(p.participants||0),0),rate=participants?Math.round(evals.length/participants*100):0;const scored=programs.map(p=>({p,score:overall(evaluationsFor(p.id))})).filter(x=>x.score).sort((a,b)=>b.score-a.score);document.querySelector('#reportKpis').innerHTML=`<article class="kpi-card"><div><small>متوسط الرضا</small><strong>${evals.length?overall(evals).toFixed(2):'—'}</strong></div></article><article class="kpi-card"><div><small>نسبة المشاركة</small><strong>${rate}%</strong></div></article><article class="kpi-card"><div><small>أفضل برنامج</small><strong class="small-value">${scored[0]?escapeHtml(scored[0].p.name):'—'}</strong></div></article><article class="kpi-card"><div><small>عدد البرامج</small><strong>${programs.length}</strong></div></article>`;document.querySelector('#reportsTable').innerHTML=programs.map(p=>{const l=evaluationsFor(p.id);return `<tr><td>${escapeHtml(p.name)}</td>${questions.map(([k])=>`<td>${l.length?avg(l,k).toFixed(2):'—'}</td>`).join('')}<td><strong>${l.length?overall(l).toFixed(2):'—'}</strong></td></tr>`}).join('');const notes=evals.filter(e=>e.comment||e.strengths);document.querySelector('#commentsList').innerHTML=notes.slice().reverse().slice(0,20).map(e=>{const p=db.programs.find(x=>x.id===e.programId);return `<div class="comment-card"><small>${escapeHtml(p?.name||'برنامج محذوف')}</small>${e.strengths?`<strong>نقطة قوة: ${escapeHtml(e.strengths)}</strong>`:''}${e.comment?`<p>${escapeHtml(e.comment)}</p>`:''}</div>`}).join('')||'<p class="muted">لا توجد ملاحظات ضمن الفلاتر.</p>'}
  window.renderReports=renderAdvancedReports;

  function notifications(){const out=[];db.programs.forEach(p=>{const l=evaluationsFor(p.id),state=window.programState?programState(p):status(p);if(state==='مكتمل'&&p.settings?.evaluationOpen)out.push({level:'warning',text:`انتهى ${p.name} والتقييم ما زال مفتوحًا`});if(state==='مكتمل'&&!l.length)out.push({level:'danger',text:`لا توجد تقييمات لبرنامج ${p.name}`});const response=p.participants?Math.round(l.length/p.participants*100):0;if(l.length&&response<30)out.push({level:'warning',text:`نسبة الاستجابة منخفضة في ${p.name} (${response}%)`})});return out.slice(0,20)}
  function renderNotifications(){const data=notifications(),count=document.querySelector('#notificationCount'),list=document.querySelector('#notificationList');if(count)count.textContent=data.length;if(list)list.innerHTML=data.length?data.map(n=>`<div class="notification-item ${n.level}">${escapeHtml(n.text)}</div>`).join(''):'<p class="muted">لا توجد تنبيهات حاليًا.</p>'}
  function renderActivity(){const el=document.querySelector('#activityList');if(!el)return;el.innerHTML=db.activityLog.length?db.activityLog.slice(0,30).map(a=>`<div class="activity-item"><div><strong>${escapeHtml(a.action)}</strong><p>${escapeHtml(a.details||'')}</p></div><time>${new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(a.createdAt))}</time></div>`).join(''):'<p class="muted">لا توجد عمليات مسجلة بعد.</p>'}

  function wrapAction(name,label){const fn=window[name];if(typeof fn!=='function'||fn.__logged)return;const wrapped=function(...args){const p=db.programs.find(x=>x.id===args[0]);const result=fn.apply(this,args);log(label,p?.name||args[0]||'');renderActivity();renderNotifications();return result};wrapped.__logged=true;window[name]=wrapped}
  setTimeout(()=>{['duplicateProgram','toggleEvaluation','toggleArchive','saveProgramSettings'].forEach((n,i)=>wrapAction(n,['نسخ برنامج','تغيير حالة التقييم','تغيير الأرشفة','تحديث إعدادات برنامج'][i]));ensureTemplatesUI();renderTemplates();renderAdvancedReports();renderNotifications();renderActivity()},0);
  const oldNavigate=window.navigate;navigate=function(id){oldNavigate(id);if(id==='settings'){renderTemplates();renderActivity()}if(id==='reports')renderAdvancedReports();renderNotifications()};
})();