(()=>{
  const KEY='programMetadata';
  let lastMeta={};
  let saving=false;
  let pending=false;
  let wrapped=false;

  const clone=value=>JSON.parse(JSON.stringify(value||null));
  const changed=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
  const metadataFromPrograms=()=>Object.fromEntries((db.programs||[]).map(program=>{
    const meta={};
    if(program.settings)meta.settings=clone(program.settings);
    if(program.questionnaireMode!==undefined)meta.questionnaireMode=program.questionnaireMode;
    if(Array.isArray(program.questionnaire))meta.questionnaire=clone(program.questionnaire);
    return [String(program.id),meta];
  }).filter(([,meta])=>Object.keys(meta).length));

  function render(){
    try{renderDashboard?.();renderPrograms?.();renderEvaluations?.();renderReports?.();if(currentProgramId)openProgram?.(currentProgramId)}catch(error){console.warn('Metadata render warning',error)}
  }

  async function hydrate(){
    if(!window.IECCloud?.request||!navigator.onLine)return;
    const settings=await window.IECCloud.request('settings.get');
    const remote=settings?.[KEY]||{};
    (db.programs||[]).forEach(program=>{
      const meta=remote[String(program.id)];
      if(!meta)return;
      if(meta.settings)program.settings=clone(meta.settings);
      if(meta.questionnaireMode!==undefined)program.questionnaireMode=meta.questionnaireMode;
      if(Array.isArray(meta.questionnaire))program.questionnaire=clone(meta.questionnaire);
    });
    db.settings={...(db.settings||{}),[KEY]:remote};
    localStorage.setItem(typeof DB_KEY==='string'?DB_KEY:'iec-platform-v2',JSON.stringify(db));
    lastMeta=clone(remote)||{};
    render();
  }

  async function sync(){
    if(saving){pending=true;return}
    if(!window.IECCloud?.request||!navigator.onLine){pending=true;return}
    saving=true;pending=false;
    try{
      const local=metadataFromPrograms();
      const ids=new Set([...Object.keys(local),...Object.keys(lastMeta||{})]);
      const changedIds=[...ids].filter(id=>changed(local[id],lastMeta?.[id]));
      if(!changedIds.length)return;
      const settings=await window.IECCloud.request('settings.get');
      const merged={...(settings?.[KEY]||{})};
      changedIds.forEach(id=>{if(local[id])merged[id]=local[id];else delete merged[id]});
      await window.IECCloud.request('settings.save',{[KEY]:merged});
      lastMeta=clone(merged)||{};
      db.settings={...(db.settings||{}),[KEY]:merged};
      localStorage.setItem(typeof DB_KEY==='string'?DB_KEY:'iec-platform-v2',JSON.stringify(db));
    }catch(error){pending=true;console.error('Program metadata sync failed',error)}
    finally{saving=false;if(pending&&navigator.onLine)setTimeout(sync,1200)}
  }

  function wrapSave(){
    if(wrapped||typeof save!=='function')return;
    wrapped=true;
    const original=save;
    save=function(){const result=original.apply(this,arguments);sync();return result};
  }

  async function initialize(){
    if(!window.IECCloud?.request){setTimeout(initialize,250);return}
    wrapSave();
    try{
      const local=metadataFromPrograms();
      const settings=await window.IECCloud.request('settings.get');
      const remote=settings?.[KEY]||{};
      const merged={...remote};
      let needsMigration=false;
      Object.keys(local).forEach(id=>{if(!Object.prototype.hasOwnProperty.call(merged,id)){merged[id]=local[id];needsMigration=true}});
      if(needsMigration)await window.IECCloud.request('settings.save',{[KEY]:merged});
      lastMeta=clone(merged)||{};
      await hydrate();
    }catch(error){console.warn('Program metadata initialization pending',error)}
  }

  window.addEventListener('online',()=>{hydrate().then(sync).catch(()=>{})});
  window.addEventListener('iec-cloud-status',event=>{if(event.detail?.ok&&String(event.detail.text||'').includes('متصل'))hydrate().catch(()=>{})});
  initialize();
})();