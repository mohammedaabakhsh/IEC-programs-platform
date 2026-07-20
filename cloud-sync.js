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
  const FORM_SETUP_KEY='iec-google-form-setup-v2';
  const CONFLICT_CODE='PROGRAM_VERSION_CONFLICT';
  let ready=false,syncing=false,pending=false;
  let snapshot={programs:[],evaluations:[],attendance:[],settings:{}};
  const originalSave=typeof save==='function'?save:null;

  function status(text,ok=true){
    const el=document.querySelector('.sidebar-card small'),dot=document.querySelector('.sidebar-card .status-dot');
    if(el)el.textContent=text;
    if(dot){dot.style.background=ok?'#22c55e':'#ef4444';dot.style.boxShadow=ok?'0 0 0 4px rgba(34,197,94,.15)':'0 0 0 4px rgba(239,68,68,.15)'}
    window.dispatchEvent(new CustomEvent('iec-cloud-status',{detail:{text,ok}}));
  }

  async function request(action,data={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
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
  const snapshotNow=()=>plain({programs:db.programs||[],evaluations:db.evaluations||[],attendance:db.attendance||[],settings:db.settings||{}});

  function renderAll(){
    try{
      renderDashboard?.();renderPrograms?.();renderEvaluations?.();renderReports?.();window.renderTrash?.();
      const center=document.querySelector('#centerName');if(center)center.value=db.settings?.centerName||'';
      const university=document.querySelector('#universityName');if(university)university.value=db.settings?.universityName||'';
    }catch(error){console.warn('Cloud render warning',error)}
  }

  function makeTrash(cloud){
    return (cloud.deletedPrograms||[]).map(program=>({
      program,
      evaluations:(cloud.evaluations||[]).filter(e=>String(e.programId)===String(program.id)),
      attendance:(cloud.attendance||[]).filter(a=>String(a.programId)===String(program.id)),
      deletedAt:program.deletedAt
    }));
  }

  function mergeProgramLocalMetadata(cloudPrograms){
    const localMap=mapById(db.programs||[]);
    return (cloudPrograms||[]).map(program=>{
      const local=localMap.get(String(program.id));
      if(!local)return program;
      return {
        ...program,
        ...(local.settings?{settings:local.settings}:{}),
        ...(local.questionnaireMode?{questionnaireMode:local.questionnaireMode}:{}),
        ...(Array.isArray(local.questionnaire)?{questionnaire:local.questionnaire}:{})
      };
    });
  }

  function applyCloud(cloud){
    const localExtras={questionBank:db.questionBank,notifications:db.notifications,annualGoals:db.annualGoals,archives:db.archives};
    const programs=mergeProgramLocalMetadata(cloud.programs||[]);
    db={...db,...localExtras,programs,evaluations:cloud.evaluations||[],attendance:cloud.attendance||[],trash:makeTrash(cloud),settings:{...(db.settings||{}),...(cloud.settings||{})},goals:cloud.goals||[],activityLog:cloud.activityLog||[]};
    localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
    snapshot=snapshotNow();renderAll();
  }

  async function assertProgramVersion(id,oldItem){
    if(!oldItem?.updatedAt)return;
    const remotePrograms=await request('programs.list');
    const remote=(remotePrograms||[]).find(item=>String(item.id)===String(id));
    if(!remote)return;
    if(String(remote.updatedAt||'')!==String(oldItem.updatedAt||'')){
      const error=new Error('تم تعديل هذا البرنامج من جهاز آخر. تم تحميل أحدث نسخة، أعد إدخال تعديلك عليها.');
      error.code=CONFLICT_CODE;
      throw error;
    }
  }

  async function syncCollection(actionSave,actionDelete,oldList,newList){
    const oldMap=mapById(oldList),newMap=mapById(newList);
    for(const [id,item] of newMap){
      const oldItem=oldMap.get(id);
      if(!oldItem||changed(item,oldItem)){
        if(actionSave==='programs.save'&&oldItem)await assertProgramVersion(id,oldItem);
        await request(actionSave,item);
      }
    }
    if(actionDelete)for(const [id] of oldMap){if(!newMap.has(id))await request(actionDelete,{id})}
  }

  async function ensureGoogleForm(){
    try{
      const formStatus=await request('forms.status');
      if(formStatus?.ready){localStorage.setItem(FORM_SETUP_KEY,'done');return formStatus}
      const result=await request('forms.setup');
      localStorage.setItem(FORM_SETUP_KEY,'done');
      return result;
    }catch(error){
      localStorage.removeItem(FORM_SETUP_KEY);
      console.warn('Google Form setup pending',error);
      return null;
    }
  }

  async function syncChanges(){
    if(!ready||syncing){pending=true;return}
    if(!navigator.onLine){pending=true;status('بانتظار عودة الإنترنت — محفوظ محليًا',false);return}
    syncing=true;pending=false;status('جارٍ حفظ التغييرات…');
    try{
      await syncCollection('programs.save','programs.delete',snapshot.programs,db.programs||[]);
      await syncCollection('evaluations.save','evaluations.delete',snapshot.evaluations,db.evaluations||[]);
      await syncCollection('attendance.save','attendance.delete',snapshot.attendance,db.attendance||[]);
      if(changed(db.settings||{},snapshot.settings||{}))await request('settings.save',db.settings||{});
      const cloud=await request('bootstrap');
      applyCloud(cloud);
      status('متصل بقاعدة البيانات');
    }catch(error){
      if(error?.code===CONFLICT_CODE){
        pending=false;
        try{const cloud=await request('bootstrap');applyCloud(cloud)}catch(refreshError){console.error('Conflict refresh failed',refreshError)}
        status('تم تحميل أحدث نسخة بعد تعارض تعديل',false);
        showToast?.(error.message);
      }else{
        pending=true;console.error('Cloud sync failed',error);status('تعذر الحفظ السحابي — سيُعاد تلقائيًا',false);
        showToast?.('تعذر الاتصال مؤقتًا؛ التغييرات محفوظة على هذا الجهاز وستُرسل عند عودة الاتصال');
      }
    }finally{syncing=false;if(pending&&navigator.onLine)setTimeout(syncChanges,1200)}
  }

  save=function(){try{originalSave?.()}catch(_){localStorage.setItem(LOCAL_KEY,JSON.stringify(db))}pending=true;syncChanges()};

  window.IECCloud={
    apiUrl:API_URL,
    request,
    refresh:async()=>{const cloud=await request('bootstrap');applyCloud(cloud);status('متصل بقاعدة البيانات')},
    sync:syncChanges,
    setupEvaluationForm:async()=>ensureGoogleForm(),
    restoreProgram:async id=>{await request('programs.restore',{id});await window.IECCloud.refresh()},
    deleteProgramPermanent:async id=>{await request('programs.deletePermanent',{id});await window.IECCloud.refresh()},
    getState:()=>({ready,syncing,pending,online:navigator.onLine})
  };

  const legacyOpenEvaluation=window.openEvaluation;
  const legacyOpenProgram=window.openProgram;
  const evaluationUrl=id=>{
    const program=(db.programs||[]).find(item=>String(item.id)===String(id));
    return program?.evaluationUrl||'';
  };

  window.openEvaluation=async id=>{
    let url=evaluationUrl(id);
    if(!url&&navigator.onLine){
      try{await syncChanges();await window.IECCloud.refresh();url=evaluationUrl(id)}catch(error){console.warn('Evaluation link refresh failed',error)}
    }
    if(url){window.open(url,'_blank','noopener,noreferrer');return}
    if(typeof legacyOpenEvaluation==='function'&&!navigator.onLine){legacyOpenEvaluation(id);return}
    showToast?.('تعذر تجهيز رابط Google Form حاليًا');
  };

  window.shareLink=async id=>{
    const program=(db.programs||[]).find(item=>String(item.id)===String(id));
    let url=program?.evaluationUrl||'';
    if(!url){
      try{await syncChanges();await window.IECCloud.refresh();url=evaluationUrl(id)}catch(error){console.warn('Share link refresh failed',error)}
    }
    if(!url){showToast?.('رابط Google Form لم يجهز بعد');return}
    try{
      if(navigator.share)await navigator.share({title:`تقييم ${program.name}`,text:'نرجو تقييم مشاركتكم في البرنامج',url});
      else{await navigator.clipboard.writeText(url);showToast?.('تم نسخ رابط Google Form للمشاركة')}
    }catch(error){if(error?.name!=='AbortError')showToast?.('تعذرت مشاركة الرابط')}
  };

  window.openProgram=id=>{
    if(typeof legacyOpenProgram==='function')legacyOpenProgram(id);
    const url=evaluationUrl(id);
    if(!url)return;
    const linkCard=[...document.querySelectorAll('#programDetails .detail-card')].find(card=>card.querySelector('.link-input'));
    if(!linkCard)return;
    const input=linkCard.querySelector('.link-input');
    const qr=linkCard.querySelector('.qr-box img');
    const buttons=linkCard.querySelectorAll('.inline-actions button');
    if(input)input.value=url;
    if(qr)qr.src=`https://quickchart.io/qr?size=180&text=${encodeURIComponent(url)}`;
    if(buttons[0])buttons[0].onclick=async()=>{try{await navigator.clipboard.writeText(url);showToast?.('تم نسخ رابط Google Form')}catch(error){showToast?.('تعذر نسخ الرابط')}};
    if(buttons[1])buttons[1].onclick=()=>window.shareLink(id);
  };

  const preview=document.querySelector('#previewEvaluation');
  if(preview)preview.onclick=()=>{const first=(db.programs||[]).find(program=>program.evaluationUrl);if(first)window.openEvaluation(first.id);else showToast?.('أنشئ برنامجًا أولًا لمعاينة النموذج')};

  window.addEventListener('online',()=>{status('عاد الاتصال — جارٍ المزامنة…');syncChanges()});
  window.addEventListener('offline',()=>status('غير متصل — الحفظ محلي مؤقتًا',false));
  window.addEventListener('beforeunload',e=>{if(syncing||pending){e.preventDefault();e.returnValue=''}});

  (async()=>{
    try{
      status('جارٍ الاتصال بقاعدة البيانات…');
      await ensureGoogleForm();
      const cloud=await request('bootstrap');applyCloud(cloud);ready=true;status('متصل بقاعدة البيانات');
    }catch(error){console.error('Cloud initialization failed',error);ready=true;status('يعمل محليًا — تعذر الاتصال بقاعدة البيانات',false)}
  })();
})();