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

  function applyMvpCopy(){
    const hero=document.querySelector('#dashboard .hero-card');
    if(hero){
      const title=hero.querySelector('h2');
      const text=hero.querySelector('p');
      if(title)title.textContent='إدارة الورش وقياس رضا المستفيدين';
      if(text)text.textContent='أضف الورشة، شارك رابط التقييم، ثم ارجع لنتائجها في أي وقت.';
    }

    const sidebarStatus=document.querySelector('.sidebar-card small');
    if(sidebarStatus&&!sidebarStatus.textContent.includes('جارٍ')){
      sidebarStatus.textContent=navigator.onLine?'متصل بقاعدة بيانات Google Sheets':'بانتظار الاتصال — البيانات محفوظة محليًا';
    }

    const addIntro=document.querySelector('#programForm .form-intro p');
    if(addIntro)addIntro.textContent='بعد الحفظ سيُنشأ رابط تقييم خاص بهذه الورشة.';

    const evaluationsHeading=document.querySelector('#evaluations .section-tools h2');
    if(evaluationsHeading)evaluationsHeading.textContent='تقييمات الورش والبرامج';
  }

  function protectCoreNavigation(){
    const active=document.querySelector('.view.active-view');
    if(active&&(active.id==='reports'||active.id==='settings')){
      window.navigate?.('dashboard');
    }
  }

  applyMvpCopy();
  protectCoreNavigation();

  const observer=new MutationObserver(()=>{
    applyMvpCopy();
    protectCoreNavigation();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('online',applyMvpCopy);
  window.addEventListener('offline',applyMvpCopy);
})();
