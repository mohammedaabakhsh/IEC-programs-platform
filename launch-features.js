(()=>{
  const VERSION='2.2.0';
  const THEME_KEY='iec-theme';
  db.settings={...(db.settings||{}),systemVersion:VERSION};save();

  const esc=window.escapeHtml||((v='')=>String(v));

  function ensureUi(){
    document.documentElement.dataset.theme=localStorage.getItem(THEME_KEY)||'light';
    const top=document.querySelector('.topbar-actions');
    if(top&&!document.querySelector('#launchControls')){
      const controls=document.createElement('div');controls.id='launchControls';controls.className='launch-controls';
      controls.innerHTML='<button class="icon-btn" id="themeToggle" title="تبديل المظهر" aria-label="تبديل المظهر">◐</button>';
      top.prepend(controls);controls.querySelector('#themeToggle').onclick=toggleTheme;
    }
    const nav=document.querySelector('.nav-list');
    if(nav&&!document.querySelector('[data-view="system-info"]')){
      const b=document.createElement('button');b.className='nav-item';b.dataset.view='system-info';b.innerHTML='<span>ⓘ</span> عن النظام';nav.appendChild(b);b.onclick=()=>navigate('system-info');
    }
    const main=document.querySelector('.main-content');
    if(main&&!document.querySelector('#system-info')){
      const section=document.createElement('section');section.id='system-info';section.className='view';
      section.innerHTML=`<div class="section-tools"><div><p class="eyebrow">حالة المنصة</p><h2>عن النظام وحالته</h2></div><span class="type-chip">الإصدار ${VERSION}</span></div>
      <div class="system-grid">
        <article class="panel form-panel"><h3>منصة برامج مركز الابتكار وريادة الأعمال</h3><p class="muted">إدارة البرامج والتقييمات والتقارير من واجهة عربية موحدة.</p><dl class="system-dl"><div><dt>الإصدار</dt><dd>${VERSION}</dd></div><div><dt>التخزين</dt><dd>Google Sheets مع نسخة محلية مؤقتة</dd></div><div><dt>الاتصال السحابي</dt><dd id="cloudStateLabel">جارٍ التحقق…</dd></div></dl></article>
        <article class="panel form-panel"><div class="panel-head"><h3>فحص حالة النظام</h3><button class="secondary-btn" id="runHealthCheck">إعادة الفحص</button></div><div id="healthResults" class="health-list"></div></article>
        <article class="panel form-panel advanced-wide"><h3>سجل الإصدارات</h3><div class="release-list"><div><strong>${VERSION}</strong><p>إزالة الصلاحيات المحلية، تبسيط الاستخدام، وتحسين موثوقية الربط والتحديث.</p></div><div><strong>2.1.0</strong><p>تعريب قاعدة البيانات وربط Google Sheets.</p></div></div></article>
        <article class="panel form-panel advanced-wide"><h3>اختصارات لوحة المفاتيح</h3><div class="shortcut-grid"><span><kbd>Alt</kbd> + <kbd>N</kbd> إضافة برنامج</span><span><kbd>Alt</kbd> + <kbd>D</kbd> لوحة المتابعة</span><span><kbd>Alt</kbd> + <kbd>R</kbd> التقارير</span><span><kbd>Alt</kbd> + <kbd>/</kbd> البحث</span></div></article>
      </div>`;
      main.appendChild(section);section.querySelector('#runHealthCheck').onclick=renderHealth;
    }
    renderHealth();registerPwa();loadStrategicSuite();
  }

  function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem(THEME_KEY,next)}

  function renderHealth(){
    const el=document.querySelector('#healthResults');if(!el)return;
    let storage=true;try{localStorage.setItem('__iec_test','1');localStorage.removeItem('__iec_test')}catch{storage=false}
    const cloudText=document.querySelector('.sidebar-card small')?.textContent||'';
    const cloudOk=cloudText.includes('متصل');
    const cloudLabel=document.querySelector('#cloudStateLabel');if(cloudLabel)cloudLabel.textContent=cloudText||'غير معروف';
    const checks=[
      ['التخزين المحلي المؤقت',storage],
      ['بيانات البرامج',Array.isArray(db.programs)],
      ['بيانات التقييمات',Array.isArray(db.evaluations)],
      ['بنك الأسئلة',Array.isArray(db.questionBank)&&db.questionBank.length>0],
      ['سجل النشاط',Array.isArray(db.activityLog)],
      ['الاتصال بالإنترنت',navigator.onLine],
      ['الاتصال بقاعدة البيانات',cloudOk],
      ['دعم التثبيت كتطبيق','serviceWorker' in navigator]
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
  window.navigate=function(id){originalNavigate(id);if(id==='system-info'){document.querySelector('#pageTitle').textContent='عن النظام';renderHealth()}};

  document.addEventListener('keydown',e=>{if(!e.altKey)return;const k=e.key.toLowerCase();if(k==='n'){e.preventDefault();navigate('new-program')}if(k==='d'){e.preventDefault();navigate('dashboard')}if(k==='r'){e.preventDefault();navigate('reports')}if(k==='/'){e.preventDefault();navigate('programs');setTimeout(()=>document.querySelector('#programSearch')?.focus(),50)}});
  window.addEventListener('online',renderHealth);window.addEventListener('offline',renderHealth);
  setTimeout(ensureUi,150);
})();