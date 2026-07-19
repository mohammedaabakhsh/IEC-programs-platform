(()=>{
  const sidebarStyle=document.createElement('style');
  sidebarStyle.textContent=`
    .sidebar{overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:24px}
    .brand{flex:0 0 auto}
    .nav-list{flex:0 0 auto}
    .sidebar-card{flex:0 0 auto;margin-top:28px}
    @media(min-width:821px){.sidebar{max-height:100dvh}}
    @media(max-width:820px){.sidebar{height:100dvh;max-height:100dvh;padding-bottom:max(24px,env(safe-area-inset-bottom))}}
  `;
  document.head.appendChild(sidebarStyle);

  const API_URL='https://script.google.com/macros/s/AKfycbzaruDNufAdhYJVZvuAGVMQzTvFGMfR2JSMNRZcuzPJRqqXbpeSB_xnieoRvpPKBqv4Pw/exec';
  const LOCAL_KEY=typeof DB_KEY==='string'?DB_KEY:'iec-platform-v2';
  let ready=false;
  let syncing=false;
  let pending=false;
  let snapshot={programs:[],evaluations:[],settings:{}};
  const originalSave=typeof save==='function'?save:null;

  function status(text,ok=true){
    const el=document.querySelector('.sidebar-card small');
    const dot=document.querySelector('.sidebar-card .status-dot');
    if(el)el.textContent=text;
    if(dot){dot.style.background=ok?'#22c55e':'#ef4444';dot.style.boxShadow=ok?'0 0 0 4px rgba(34,197,94,.15)':'0 0 0 4px rgba(239,68,68,.15)'}
  }

  async function request(action,data={}){
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,data})
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    if(!payload.ok)throw new Error(payload.error||'تعذر الاتصال بقاعدة البيانات');
    return payload.data;
  }

  const plain=value=>JSON.parse(JSON.stringify(value||null));
  const mapById=list=>new Map((list||[]).map(item=>[String(item.id),item]));
  const changed=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);

  function renderAll(){
    try{
      renderDashboard?.();renderPrograms?.();renderEvaluations?.();renderReports?.();
      const center=document.querySelector('#centerName');if(center)center.value=db.settings?.centerName||'';
      const university=document.querySelector('#universityName');if(university)university.value=db.settings?.universityName||'';
    }catch(error){console.warn('Cloud render warning',error)}
  }

  async function migrateLocal(){
    status('جارٍ نقل البيانات إلى Google Sheets…');
    for(const program of db.programs||[])await request('programs.save',program);
    for(const evaluation of db.evaluations||[])await request('evaluations.save',evaluation);
    if(db.settings)await request('settings.save',db.settings);
  }

  async function loadCloud(){
    status('جارٍ الاتصال بقاعدة البيانات…');
    const cloud=await request('bootstrap');
    const hasCloudData=Array.isArray(cloud.programs)&&cloud.programs.length>0;
    if(!hasCloudData&&Array.isArray(db.programs)&&db.programs.length){
      await migrateLocal();
      return request('bootstrap');
    }
    return cloud;
  }

  function applyCloud(cloud){
    const localExtras={
      questionBank:db.questionBank,
      users:db.users,
      notifications:db.notifications,
      annualGoals:db.annualGoals,
      archives:db.archives
    };
    db={...db,...localExtras,programs:cloud.programs||[],evaluations:cloud.evaluations||[],attendance:cloud.attendance||[],settings:{...(db.settings||{}),...(cloud.settings||{})},goals:cloud.goals||[],activityLog:cloud.activityLog||[]};
    localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
    snapshot=plain({programs:db.programs,evaluations:db.evaluations,settings:db.settings});
    renderAll();
  }

  async function syncChanges(){
    if(!ready||syncing){pending=true;return}
    syncing=true;pending=false;status('جارٍ حفظ التغييرات…');
    try{
      const oldPrograms=mapById(snapshot.programs),newPrograms=mapById(db.programs);
      for(const [id,item] of newPrograms){if(!oldPrograms.has(id)||changed(item,oldPrograms.get(id)))await request('programs.save',item)}
      for(const [id] of oldPrograms){if(!newPrograms.has(id))await request('programs.delete',{id})}

      const oldEvaluations=mapById(snapshot.evaluations);
      for(const item of db.evaluations||[]){if(!oldEvaluations.has(String(item.id)))await request('evaluations.save',item)}

      if(changed(db.settings||{},snapshot.settings||{}))await request('settings.save',db.settings||{});
      snapshot=plain({programs:db.programs,evaluations:db.evaluations,settings:db.settings});
      localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
      status('متصل بـ Google Sheets');
    }catch(error){
      console.error('Cloud sync failed',error);status('تعذر الحفظ السحابي — محفوظ محليًا',false);showToast?.('تعذر الاتصال مؤقتًا؛ تم الاحتفاظ بالتغييرات محليًا');
    }finally{
      syncing=false;if(pending)setTimeout(syncChanges,150);
    }
  }

  save=function(){
    try{originalSave?.()}catch(_){localStorage.setItem(LOCAL_KEY,JSON.stringify(db))}
    syncChanges();
  };

  window.IECCloud={apiUrl:API_URL,refresh:async()=>{const cloud=await request('bootstrap');applyCloud(cloud);status('متصل بـ Google Sheets')},sync:syncChanges};

  (async()=>{
    try{
      const cloud=await loadCloud();applyCloud(cloud);ready=true;status('متصل بـ Google Sheets');
    }catch(error){
      console.error('Cloud initialization failed',error);ready=true;status('يعمل محليًا — تعذر الاتصال',false);
    }
  })();
})();