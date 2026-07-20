(()=>{
  const style=document.createElement('style');
  style.textContent=`
    /* النسخة الأولى: إدارة الورش والتقييمات فقط */
    .nav-item[data-view="reports"],
    .nav-item[data-view="settings"],
    #reports,
    #settings,
    #advancedDashboardKpis,
    #dataManagementCard,
    [data-feature="attendance"],
    [data-feature="certificates"],
    [data-feature="goals"],
    [data-feature="archive"]{display:none!important}
  `;
  document.head.appendChild(style);

  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

  function applyMvpCopy(){
    const hero=document.querySelector('#dashboard .hero-card');
    if(hero){
      setText(hero.querySelector('h2'),'إدارة الورش وقياس رضا المستفيدين');
      setText(hero.querySelector('p'),'أضف الورشة، شارك رابط التقييم، ثم ارجع لنتائجها في أي وقت.');
    }

    const sidebarStatus=document.querySelector('.sidebar-card small');
    if(sidebarStatus&&!sidebarStatus.textContent.includes('جارٍ')){
      setText(sidebarStatus,navigator.onLine?'متصل بقاعدة بيانات Google Sheets':'بانتظار الاتصال — البيانات محفوظة محليًا');
    }

    setText(document.querySelector('#programForm .form-intro p'),'بعد الحفظ سيُنشأ رابط Google Form خاص بهذه الورشة.');
    setText(document.querySelector('#evaluations .section-tools h2'),'تقييمات الورش والبرامج');
  }

  function protectCoreNavigation(){
    const active=document.querySelector('.view.active-view');
    if(active&&(active.id==='reports'||active.id==='settings'))window.navigate?.('dashboard');
  }

  function resetProgramFilters(){
    const search=document.querySelector('#programSearch');
    const type=document.querySelector('#typeFilter');
    const state=document.querySelector('#statusFilter');
    if(search)search.value='';
    if(type)type.value='all';
    if(state)state.value='all';
  }

  async function refreshAfterProgramSave(programId){
    resetProgramFilters();
    try{window.renderPrograms?.()}catch(_){ }
    window.navigate?.('programs');

    if(!window.IECCloud||!navigator.onLine)return;
    try{
      window.showToast?.('جارٍ تجهيز رابط Google Form…');
      await window.IECCloud.sync?.();
      await new Promise(resolve=>setTimeout(resolve,500));
      await window.IECCloud.refresh?.();
      resetProgramFilters();
      window.renderPrograms?.();
      window.renderEvaluations?.();
      window.renderDashboard?.();
      window.navigate?.('programs');
      const program=(window.db?.programs||db.programs||[]).find(item=>String(item.id)===String(programId));
      window.showToast?.(program?.evaluationUrl?'تم حفظ الورشة وتجهيز رابط Google Form':'تم حفظ الورشة، ويجري تجهيز رابط Google Form');
    }catch(error){
      console.error('Program post-save refresh failed',error);
      window.showToast?.('تم حفظ الورشة محليًا، وسيكتمل الربط عند عودة الاتصال');
    }
  }

  function installProgramSaveFix(){
    const form=document.querySelector('#programForm');
    if(!form||form.dataset.mvpSaveFix==='1')return;
    form.dataset.mvpSaveFix='1';
    form.addEventListener('submit',()=>{
      const existingId=form.querySelector('[name="id"]')?.value;
      const expectedId=existingId||null;
      setTimeout(()=>{
        const newest=expectedId||(db.programs||[])[0]?.id;
        if(newest)refreshAfterProgramSave(newest);
      },0);
    });
  }

  function installProgramOpenFix(){
    if(window.__mvpOpenProgramFix||typeof window.openProgram!=='function')return;
    window.__mvpOpenProgramFix=true;
    const original=window.openProgram;
    window.openProgram=async id=>{
      let program=(db.programs||[]).find(item=>String(item.id)===String(id));
      if(!program?.evaluationUrl&&window.IECCloud&&navigator.onLine){
        try{await window.IECCloud.sync?.();await window.IECCloud.refresh?.()}catch(_){ }
      }
      original(id);
      program=(db.programs||[]).find(item=>String(item.id)===String(id));
      if(!program?.evaluationUrl){
        const input=document.querySelector('#programDetails .link-input');
        if(input)input.value='جارٍ تجهيز رابط Google Form…';
      }
    };
  }

  function initialize(){
    applyMvpCopy();
    protectCoreNavigation();
    installProgramSaveFix();
    installProgramOpenFix();
  }

  initialize();
  const observer=new MutationObserver(initialize);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('online',initialize);
  window.addEventListener('offline',initialize);
})();