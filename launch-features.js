(()=>{
  const VERSION='1.0.0-rc.2';
  const ROLE_KEY='iec-active-role';
  const THEME_KEY='iec-theme';
  const roles={admin:'مدير النظام',supervisor:'مشرف',employee:'موظف',viewer:'قارئ فقط'};
  const permissions={
    admin:{write:true,delete:true,settings:true,reports:true},
    supervisor:{write:true,delete:true,settings:false,reports:true},
    employee:{write:true,delete:false,settings:false,reports:true},
    viewer:{write:false,delete:false,settings:false,reports:true}
  };
  let role=localStorage.getItem(ROLE_KEY)||'admin';
  db.settings={...(db.settings||{}),systemVersion:VERSION};save();

  const esc=window.escapeHtml||((v='')=>String(v));
  const can=k=>Boolean(permissions[role]?.[k]);

  function ensureUi(){
    document.documentElement.dataset.theme=localStorage.getItem(THEME_KEY)||'light';
    const top=document.querySelector('.topbar-actions');
    if(top&&!document.querySelector('#launchControls')){
      const controls=document.createElement('div');controls.id='launchControls';controls.className='launch-controls';
      controls.innerHTML=`<button class="icon-btn" id="themeToggle" title="الوضع الداكن">◐</button><label class="role-control"><span>الصلاحية</span><select id="roleSelect">${Object.entries(roles).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>`;
      top.prepend(controls);controls.querySelector('#roleSelect').value=role;
      controls.querySelector('#roleSelect').onchange=e=>{role=e.target.value;localStorage.setItem(ROLE_KEY,role);applyPermissions();window.addActivity?.('تغيير الصلاحية المحلية',roles[role]);showToast(`تم التبديل إلى ${roles[role]}`)};
      controls.querySelector('#themeToggle').onclick=toggleTheme;
    }
    const nav=document.querySelector('.nav-list');
    if(nav&&!document.querySelector('[data-view="system-info"]')){
      const b=document.createElement('button');b.className='nav-item';b.dataset.view='system-info';b.innerHTML='<span>ⓘ</span> عن النظام';nav.appendChild(b);b.onclick=()=>navigate('system-info');
    }
    const main=document.querySelector('.main-content');
    if(main&&!document.querySelector('#system-info')){
      const section=document.createElement('section');section.id='system-info';section.className='view';
      section.innerHTML=`<div class="section-tools"><div><p class="eyebrow">جاهزية الإطلاق</p><h2>عن النظام وحالته</h2></div><span class="type-chip">الإصدار ${VERSION}</span></div>
      <div class="system-grid">
        <article class="panel form-panel"><h3>منصة برامج مركز الابتكار وريادة الأعمال</h3><p class="muted">إدارة البرامج والتقييمات والتقارير من واجهة عربية موحدة.</p><dl class="system-dl"><div><dt>الإصدار</dt><dd>${VERSION}</dd></div><div><dt>التخزين الحالي</dt><dd>محلي على هذا الجهاز</dd></div><div><dt>الربط السحابي</dt><dd>المرحلة التالية: Google Sheets</dd></div><div><dt>الصلاحية الحالية</dt><dd id="currentRoleLabel"></dd></div></dl></article>
        <article class="panel form-panel"><div class="panel-head"><h3>فحص حالة النظام</h3><button class="secondary-btn" id="runHealthCheck">إعادة الفحص</button></div><div id="healthResults" class="health-list"></div></article>
        <article class="panel form-panel advanced-wide"><h3>سجل الإصدارات</h3><div class="release-list"><div><strong>${VERSION}</strong><p>لوحة التنفيذ السنوية، الحضور، الشهادات، مؤشرات KPI، التنبيهات، وضع الشاشة، الأرشيف وتصدير PowerPoint.</p></div><div><strong>1.0.0-rc.1</strong><p>التقارير المتقدمة، الجدولة، سلة المحذوفات، الصلاحيات المحلية، الوضع الداكن، PWA وصفحة حالة النظام.</p></div><div><strong>0.9.0</strong><p>بنك الأسئلة، تخصيص التقييم، القوالب، التنبيهات وسجل النشاط.</p></div></div></article>
        <article class="panel form-panel advanced-wide"><h3>اختصارات لوحة المفاتيح</h3><div class="shortcut-grid"><span><kbd>Alt</kbd> + <kbd>N</kbd> إضافة برنامج</span><span><kbd>Alt</kbd> + <kbd>D</kbd> لوحة المتابعة</span><span><kbd>Alt</kbd> + <kbd>R</kbd> التقارير</span><span><kbd>Alt</kbd> + <kbd>/</kbd> البحث</span></div></article>
      </div>`;
      main.appendChild(section);section.querySelector('#runHealthCheck').onclick=renderHealth;
    }
    applyPermissions();renderHealth();registerPwa();loadStrategicSuite();
  }

  function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem(THEME_KEY,next)}

  function applyPermissions(){
    document.querySelector('#currentRoleLabel')?.replaceChildren(document.createTextNode(roles[role]));
    document.querySelectorAll('[data-go="new-program"], #programForm button[type="submit"]').forEach(el=>{el.disabled=!can('write');el.classList.toggle('permission-hidden',!can('write'))});
    document.querySelectorAll('.danger-link,.danger-btn').forEach(el=>{if(!el.closest('#trashList')){el.disabled=!can('delete');el.classList.toggle('permission-hidden',!can('delete'))}});
    const settingsNav=document.querySelector('[data-view="settings"]');if(settingsNav)settingsNav.classList.toggle('permission-hidden',!can('settings'));
    document.querySelectorAll('#settings input,#settings select,#settings textarea,#settings button').forEach(el=>{if(!can('settings'))el.disabled=true;else el.disabled=false});
    document.querySelectorAll('#reports button').forEach(el=>el.disabled=!can('reports'));
  }

  function renderHealth(){
    const el=document.querySelector('#healthResults');if(!el)return;
    let storage=true;try{localStorage.setItem('__iec_test','1');localStorage.removeItem('__iec_test')}catch{storage=false}
    const checks=[
      ['التخزين المحلي',storage],
      ['بيانات البرامج',Array.isArray(db.programs)],
      ['بيانات التقييمات',Array.isArray(db.evaluations)],
      ['بنك الأسئلة',Array.isArray(db.questionBank)&&db.questionBank.length>0],
      ['سجل النشاط',Array.isArray(db.activityLog)],
      ['الاتصال بالإنترنت',navigator.onLine],
      ['Service Worker','serviceWorker' in navigator]
    ];
    el.innerHTML=checks.map(([name,ok])=>`<div class="health-item ${ok?'ok':'warn'}"><span>${ok?'✓':'!'}</span><strong>${esc(name)}</strong><small>${ok?'يعمل':'يحتاج مراجعة'}</small></div>`).join('');
  }

  function registerPwa(){
    if(!document.querySelector('link[rel="manifest"]')){const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l)}
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  function loadStrategicSuite(){
    if(!document.querySelector('link[href="strategic-suite.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='strategic-suite.css';document.head.appendChild(l)}
    if(!document.querySelector('script[src="strategic-suite.js"]')){const s=document.createElement('script');s.src='strategic-suite.js';document.body.appendChild(s)}
  }

  const originalNavigate=window.navigate||navigate;
  window.navigate=function(id){if(id==='settings'&&!can('settings')){showToast('هذه الصفحة متاحة لمدير النظام فقط');return}originalNavigate(id);if(id==='system-info'){document.querySelector('#pageTitle').textContent='عن النظام';renderHealth()}applyPermissions()};

  const originalEdit=window.editProgram;window.editProgram=function(id){if(!can('write')){showToast('لا تملك صلاحية التعديل');return}return originalEdit?.(id)};
  const originalDelete=window.askDelete;window.askDelete=function(id){if(!can('delete')){showToast('لا تملك صلاحية الحذف');return}return originalDelete?.(id)};
  const form=document.querySelector('#programForm');if(form)form.addEventListener('submit',e=>{if(!can('write')){e.preventDefault();e.stopImmediatePropagation();showToast('لا تملك صلاحية الحفظ')}},true);

  document.addEventListener('keydown',e=>{if(!e.altKey)return;const k=e.key.toLowerCase();if(k==='n'){e.preventDefault();if(can('write'))navigate('new-program')}if(k==='d'){e.preventDefault();navigate('dashboard')}if(k==='r'){e.preventDefault();navigate('reports')}if(k==='/'){e.preventDefault();navigate('programs');setTimeout(()=>document.querySelector('#programSearch')?.focus(),50)}});
  window.addEventListener('online',renderHealth);window.addEventListener('offline',renderHealth);
  setTimeout(ensureUi,150);
})();