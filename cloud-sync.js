(()=>{
  const sidebarStyle=document.createElement('style');
  sidebarStyle.textContent=`
    .sidebar{overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:24px}
    .brand{flex:0 0 auto}.nav-list{flex:0 0 auto}.sidebar-card{flex:0 0 auto;margin-top:28px}
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
    window.dispatchEvent(new CustomEvent('iec-cloud-status',{detail:{text,ok}}));
  }

  async function request(action,data={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,data}),signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      if(!payload.ok)throw new Error(payload.error||'تعذر الاتصال بقاعدة البيانات');
      return payload.data;
    }finally{clearTimeout(timeout)}
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

  async function loadCloud(){
    status('جارٍ الاتصال بقاعدة البيانات…');
    return request('bootstrap');
  }

  function applyCloud(cloud){
    const localExtras={questionBank:db.questionBank,users:db.users,notifications:db.notifications,annualGoals:db.annualGoals,archives:db.archives,trash:db.trash};
    db={...db,...localExtras,programs:cloud.programs||[],evaluations:cloud.evaluations||[],attendance:cloud.attendance||[],settings:{...(db.settings||{}),...(cloud.settings||{})},goals:cloud.goals||[],activityLog:cloud.activityLog||[]};
    localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
    snapshot=plain({programs:db.programs,evaluations:db.evaluations,settings:db.settings});
    renderAll();
  }

  async function syncChanges(){
    if(!ready){pending=true;return}
    if(syncing){pending=true;return}
    if(!navigator.onLine){pending=true;status('بانتظار عودة الإنترنت — محفوظ محليًا',false);return}
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
      status('متصل بقاعدة البيانات');
    }catch(error){
      pending=true;
      console.error('Cloud sync failed',error);
      status('تعذر الحفظ السحابي — سيُعاد تلقائيًا',false);
      showToast?.('تعذر الاتصال مؤقتًا؛ التغييرات محفوظة على هذا الجهاز وستُرسل عند عودة الاتصال');
    }finally{
      syncing=false;
      if(pending&&navigator.onLine)setTimeout(syncChanges,1200);
    }
  }

  save=function(){
    try{originalSave?.()}catch(_){localStorage.setItem(LOCAL_KEY,JSON.stringify(db))}
    pending=true;syncChanges();
  };

  window.IECCloud={
    apiUrl:API_URL,
    refresh:async()=>{const cloud=await request('bootstrap');applyCloud(cloud);status('متصل بقاعدة البيانات')},
    sync:syncChanges,
    getState:()=>({ready,syncing,pending,online:navigator.onLine})
  };

  window.addEventListener('online',()=>{status('عاد الاتصال — جارٍ المزامنة…');syncChanges()});
  window.addEventListener('offline',()=>status('غير متصل — الحفظ محلي مؤقتًا',false));
  window.addEventListener('beforeunload',e=>{if(syncing||pending){e.preventDefault();e.returnValue=''}});

  (async()=>{
    try{
      const cloud=await loadCloud();
      applyCloud(cloud);
      ready=true;
      status('متصل بقاعدة البيانات');
    }catch(error){
      console.error('Cloud initialization failed',error);
      ready=true;
      status('يعمل محليًا — تعذر الاتصال بقاعدة البيانات',false);
    }
  })();
})();