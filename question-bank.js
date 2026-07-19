(()=>{
  const defaultQuestions=[
    {id:'content',label:'ما مدى رضاك عن محتوى البرنامج؟',type:'rating',required:true},
    {id:'organization',label:'ما مدى رضاك عن تنظيم البرنامج؟',type:'rating',required:true},
    {id:'trainer',label:'كيف تقيّم المدرب أو مقدم الجلسة؟',type:'rating',required:true},
    {id:'goals',label:'إلى أي مدى تحققت أهداف البرنامج؟',type:'rating',required:true},
    {id:'benefit',label:'ما مدى استفادتك من البرنامج؟',type:'rating',required:true},
    {id:'strengths',label:'ما أبرز نقاط القوة في البرنامج؟',type:'long',required:false},
    {id:'comment',label:'هل لديك ملاحظات أو مقترحات؟',type:'long',required:false}
  ];

  if(!document.querySelector('link[href="question-bank.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='question-bank.css';document.head.appendChild(css);
  }
  if(!Array.isArray(db.questionBank)||!db.questionBank.length)db.questionBank=structuredClone(defaultQuestions);
  db.programs.forEach(p=>{
    if(!p.questionnaireMode)p.questionnaireMode='default';
    if(p.questionnaireMode!=='custom')delete p.questionnaire;
  });
  save();

  // إزالة عنصر أسئلة التقييم القديم من القائمة الجانبية.
  document.querySelector('[data-view="question-bank"]')?.remove();

  const editorMarkup=(prefix,allowAdd=true)=>`
    <div id="${prefix}List" class="question-list"></div>
    <div class="question-editor" id="${prefix}Editor">
      <input id="${prefix}TitleInput" placeholder="اكتب نص السؤال"/>
      <select id="${prefix}TypeInput"><option value="rating">تقييم من 1 إلى 5</option><option value="yesno">نعم / لا</option><option value="short">إجابة قصيرة</option><option value="long">إجابة طويلة</option></select>
      <select id="${prefix}RequiredInput"><option value="true">إلزامي</option><option value="false">اختياري</option></select>
      <div class="editor-actions"><button class="secondary-btn" id="${prefix}CancelEdit" type="button">إلغاء</button><button class="primary-btn" id="${prefix}SaveBtn" type="button">${allowAdd?'إضافة سؤال':'حفظ التعديل'}</button></div>
    </div>`;

  // بنك الأسئلة العام داخل الإعدادات.
  const settingsGrid=document.querySelector('#settings .settings-grid');
  if(settingsGrid&&!document.querySelector('#globalQuestionBank')){
    const card=document.createElement('article');
    card.id='globalQuestionBank';card.className='panel form-panel question-bank-settings-card';
    card.innerHTML=`<div class="panel-head"><div><small>النموذج المعتمد لجميع البرامج</small><h3>بنك الأسئلة الأساسي</h3></div></div><p class="muted">أي تعديل هنا ينعكس على جميع البرامج التي تستخدم النموذج الأساسي. البرامج المخصصة لا تتأثر.</p>${editorMarkup('globalQuestion',false)}`;
    settingsGrid.appendChild(card);
  }

  // صفحة مستقلة لتخصيص برنامج واحد، ولا تظهر في القائمة الجانبية.
  if(!document.querySelector('#program-questions')){
    const section=document.createElement('section');section.id='program-questions';section.className='view';
    section.innerHTML=`
      <div class="section-tools"><div><p class="eyebrow">تخصيص برنامج محدد</p><h2 id="programQuestionPageTitle">أسئلة تقييم البرنامج</h2></div><button class="secondary-btn" id="backToProgram" type="button">العودة للبرنامج</button></div>
      <div class="question-bank-layout">
        <aside class="panel question-bank-side">
          <label>البرنامج<select id="questionScope"></select></label>
          <div id="questionModelStatus" class="question-scope-note"></div>
          <button class="primary-btn" id="createCustomQuestions" type="button">إنشاء نسخة خاصة لهذا البرنامج</button>
          <button class="secondary-btn" id="restoreDefaultQuestions" type="button">العودة إلى النموذج الأساسي</button>
        </aside>
        <article class="panel question-bank-main"><div class="panel-head"><div><small>أسئلة البرنامج المحدد</small><h3 id="questionEditorTitle">النموذج الأساسي</h3></div></div>${editorMarkup('programQuestion',true)}</article>
      </div>`;
    document.querySelector('main.main-content')?.appendChild(section);
  }

  function typeLabel(type){return({rating:'تقييم من 1 إلى 5',yesno:'نعم / لا',short:'إجابة قصيرة',long:'إجابة طويلة'})[type]||type}
  function itemHtml(q,i,qs,mode){
    const actions=mode==='global'
      ?`<button data-up="${q.id}" ${i===0?'disabled':''}>↑</button><button data-down="${q.id}" ${i===qs.length-1?'disabled':''}>↓</button><button data-edit="${q.id}">تعديل</button>`
      :`<button data-up="${q.id}" ${i===0?'disabled':''}>↑</button><button data-down="${q.id}" ${i===qs.length-1?'disabled':''}>↓</button><button data-edit="${q.id}">تعديل</button><button class="delete-question" data-delete="${q.id}">حذف</button>`;
    return `<div class="question-item"><span class="question-number">${i+1}</span><div><h4>${escapeHtml(q.label)}${q.required?'<span class="required-chip">إلزامي</span>':''}</h4><small>${typeLabel(q.type)}</small></div><div class="question-actions">${actions}</div></div>`;
  }

  function makeEditor({prefix,getQuestions,canUse,onPersist,allowDelete,allowAdd}){
    const list=document.querySelector(`#${prefix}List`),editor=document.querySelector(`#${prefix}Editor`),title=document.querySelector(`#${prefix}TitleInput`),type=document.querySelector(`#${prefix}TypeInput`),required=document.querySelector(`#${prefix}RequiredInput`),saveBtn=document.querySelector(`#${prefix}SaveBtn`),cancel=document.querySelector(`#${prefix}CancelEdit`);
    let editingId=null;
    function reset(){editingId=null;title.value='';type.value='rating';required.value='true';saveBtn.textContent=allowAdd?'إضافة سؤال':'حفظ التعديل'}
    function render(){const enabled=canUse(),qs=getQuestions();editor.style.display=enabled?'grid':'none';list.innerHTML=qs.length?qs.map((q,i)=>itemHtml(q,i,qs,allowDelete?'program':'global')).join(''):'<div class="question-empty">لا توجد أسئلة.</div>'}
    function persist(message){save();reset();render();onPersist?.();renderDashboard();renderEvaluations();renderReports();if(message)showToast(message)}
    function find(id){return getQuestions().find(q=>q.id===id)}
    list.onclick=e=>{const b=e.target.closest('button');if(!b||!canUse())return;const qs=getQuestions();if(b.dataset.up||b.dataset.down){const id=b.dataset.up||b.dataset.down,i=qs.findIndex(q=>q.id===id),j=i+(b.dataset.up?-1:1);if(i>=0&&j>=0&&j<qs.length){[qs[i],qs[j]]=[qs[j],qs[i]];persist()}}else if(b.dataset.edit){const q=find(b.dataset.edit);if(!q)return;editingId=q.id;title.value=q.label;type.value=q.type;required.value=String(q.required);saveBtn.textContent='حفظ التعديل';title.focus()}else if(b.dataset.delete&&allowDelete){const i=qs.findIndex(q=>q.id===b.dataset.delete);if(i>=0&&confirm('هل تريد حذف هذا السؤال من هذا البرنامج فقط؟')){qs.splice(i,1);persist('تم حذف السؤال من هذا البرنامج')}}};
    saveBtn.onclick=()=>{if(!canUse())return;const label=title.value.trim();if(!label){showToast('اكتب نص السؤال أولًا');return}const qs=getQuestions();if(editingId){const q=find(editingId);q.label=label;q.type=type.value;q.required=required.value==='true';persist('تم حفظ تعديل السؤال')}else if(allowAdd){qs.push({id:'Q-'+Date.now(),label,type:type.value,required:required.value==='true'});persist('تمت إضافة السؤال لهذا البرنامج')}};
    cancel.onclick=reset;
    return{render,reset};
  }

  const globalEditor=makeEditor({prefix:'globalQuestion',getQuestions:()=>db.questionBank,canUse:()=>true,onPersist:()=>programEditor?.render(),allowDelete:false,allowAdd:false});

  const scope=document.querySelector('#questionScope'),statusBox=document.querySelector('#questionModelStatus'),editorTitle=document.querySelector('#questionEditorTitle'),createBtn=document.querySelector('#createCustomQuestions'),restoreBtn=document.querySelector('#restoreDefaultQuestions');
  function selectedProgram(){return db.programs.find(p=>p.id===scope.value)}
  function isCustom(p=selectedProgram()){return p?.questionnaireMode==='custom'&&Array.isArray(p.questionnaire)}
  function currentProgramQuestions(){const p=selectedProgram();return isCustom(p)?p.questionnaire:db.questionBank}
  window.getProgramQuestions=p=>p?.questionnaireMode==='custom'&&Array.isArray(p.questionnaire)?p.questionnaire:db.questionBank;
  function renderScope(){const selected=scope.value||currentProgramId||db.programs[0]?.id||'';scope.innerHTML=db.programs.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');scope.value=[...scope.options].some(o=>o.value===selected)?selected:(db.programs[0]?.id||'')}
  function renderProgramArea(){renderScope();const p=selectedProgram(),custom=isCustom(p);if(!p){statusBox.textContent='لا توجد برامج حتى الآن.';createBtn.style.display='none';restoreBtn.style.display='none';programEditor.render();return}statusBox.innerHTML=custom?'<strong>نموذج مخصص</strong><br>التعديلات هنا تخص هذا البرنامج فقط.':'<strong>النموذج الأساسي</strong><br>هذا البرنامج يستخدم بنك الأسئلة العام.';editorTitle.textContent=custom?'النموذج المخصص لهذا البرنامج':'النموذج الأساسي — للعرض فقط';document.querySelector('#programQuestionPageTitle').textContent=`أسئلة تقييم: ${p.name}`;createBtn.style.display=custom?'none':'block';restoreBtn.style.display=custom?'block':'none';programEditor.render()}
  const programEditor=makeEditor({prefix:'programQuestion',getQuestions:currentProgramQuestions,canUse:()=>isCustom(),onPersist:renderProgramArea,allowDelete:true,allowAdd:true});
  scope.onchange=()=>{programEditor.reset();renderProgramArea()};
  createBtn.onclick=()=>{const p=selectedProgram();if(!p)return;p.questionnaire=structuredClone(db.questionBank);p.questionnaireMode='custom';save();renderProgramArea();showToast('تم إنشاء نسخة خاصة لهذا البرنامج')};
  restoreBtn.onclick=()=>{const p=selectedProgram();if(!p||!confirm('سيتم حذف تخصيصات هذا البرنامج والعودة إلى الأسئلة الأساسية.'))return;delete p.questionnaire;p.questionnaireMode='default';save();renderProgramArea();showToast('عاد البرنامج إلى النموذج الأساسي')};
  document.querySelector('#backToProgram').onclick=()=>{const p=selectedProgram();if(p)openProgram(p.id);else navigate('programs')};
  window.openProgramQuestionnaire=id=>{currentProgramId=id;scope.value=id;navigate('program-questions');document.querySelector('#pageTitle').textContent='تخصيص أسئلة البرنامج';renderProgramArea()};

  // زر التخصيص داخل تفاصيل البرنامج.
  const details=document.querySelector('#programDetails');
  if(details){new MutationObserver(()=>{if(!currentProgramId||details.querySelector('#customizeProgramQuestions'))return;const target=details.querySelector('.inline-actions')||details.firstElementChild;if(!target)return;const btn=document.createElement('button');btn.id='customizeProgramQuestions';btn.type='button';btn.className='secondary-btn';btn.textContent='تخصيص أسئلة التقييم';btn.onclick=()=>window.openProgramQuestionnaire(currentProgramId);target.appendChild(btn)}).observe(details,{childList:true,subtree:true})}

  document.querySelector('#programForm')?.addEventListener('submit',()=>setTimeout(()=>{db.programs.forEach(p=>{if(!p.questionnaireMode)p.questionnaireMode='default'});save();renderScope()},0));
  globalEditor.render();renderProgramArea();
})();