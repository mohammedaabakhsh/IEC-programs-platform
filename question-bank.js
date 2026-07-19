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

  // ترحيل البيانات القديمة: أي نسخة كانت تُنشأ تلقائيًا تعتبر نموذجًا أساسيًا حتى يختار المستخدم تخصيصها.
  db.programs.forEach(p=>{
    if(!p.questionnaireMode)p.questionnaireMode='default';
    if(p.questionnaireMode!=='custom')delete p.questionnaire;
  });
  save();

  if(!document.querySelector('[data-view="question-bank"]')){
    const btn=document.createElement('button');btn.className='nav-item';btn.dataset.view='question-bank';btn.innerHTML='<span>؟</span> أسئلة التقييم';
    document.querySelector('.nav-list')?.insertBefore(btn,document.querySelector('[data-view="settings"]'));
  }

  if(!document.querySelector('#question-bank')){
    const section=document.createElement('section');section.id='question-bank';section.className='view';
    section.innerHTML=`
      <div class="section-tools"><div><p class="eyebrow">تخصيص عند الحاجة</p><h2>أسئلة تقييم البرامج</h2></div></div>
      <div class="question-bank-layout">
        <aside class="panel question-bank-side">
          <label>اختر البرنامج<select id="questionScope"></select></label>
          <div id="questionModelStatus" class="question-scope-note"></div>
          <button class="primary-btn" id="createCustomQuestions" type="button">إنشاء نسخة خاصة لهذا البرنامج</button>
          <button class="secondary-btn" id="restoreDefaultQuestions" type="button">العودة إلى النموذج الأساسي</button>
        </aside>
        <article class="panel question-bank-main">
          <div class="panel-head"><div><small>أسئلة البرنامج المحدد</small><h3 id="questionEditorTitle">النموذج الأساسي</h3></div></div>
          <div id="questionList" class="question-list"></div>
          <div class="question-editor" id="questionEditor">
            <input id="questionTitleInput" placeholder="اكتب نص السؤال"/>
            <select id="questionTypeInput"><option value="rating">تقييم من 1 إلى 5</option><option value="yesno">نعم / لا</option><option value="short">إجابة قصيرة</option><option value="long">إجابة طويلة</option></select>
            <select id="questionRequiredInput"><option value="true">إلزامي</option><option value="false">اختياري</option></select>
            <div class="editor-actions"><button class="secondary-btn" id="cancelQuestionEdit" type="button">إلغاء</button><button class="primary-btn" id="saveQuestionBtn" type="button">إضافة السؤال</button></div>
          </div>
        </article>
      </div>`;
    document.querySelector('main.main-content')?.appendChild(section);
  }

  const scope=document.querySelector('#questionScope');
  const list=document.querySelector('#questionList');
  const statusBox=document.querySelector('#questionModelStatus');
  const editor=document.querySelector('#questionEditor');
  const editorTitle=document.querySelector('#questionEditorTitle');
  const createBtn=document.querySelector('#createCustomQuestions');
  const restoreBtn=document.querySelector('#restoreDefaultQuestions');
  const titleInput=document.querySelector('#questionTitleInput');
  const typeInput=document.querySelector('#questionTypeInput');
  const requiredInput=document.querySelector('#questionRequiredInput');
  const saveBtn=document.querySelector('#saveQuestionBtn');
  const cancelBtn=document.querySelector('#cancelQuestionEdit');
  let editingId=null;

  function selectedProgram(){return db.programs.find(p=>p.id===scope.value)}
  function isCustom(p=selectedProgram()){return p?.questionnaireMode==='custom'&&Array.isArray(p.questionnaire)}
  function currentQuestions(){const p=selectedProgram();return isCustom(p)?p.questionnaire:db.questionBank}
  window.getProgramQuestions=p=>p?.questionnaireMode==='custom'&&Array.isArray(p.questionnaire)?p.questionnaire:db.questionBank;

  function resetEditor(){editingId=null;titleInput.value='';typeInput.value='rating';requiredInput.value='true';saveBtn.textContent='إضافة السؤال'}
  function typeLabel(type){return({rating:'تقييم من 1 إلى 5',yesno:'نعم / لا',short:'إجابة قصيرة',long:'إجابة طويلة'})[type]||type}
  function renderScope(){
    const selected=scope.value||db.programs[0]?.id||'';
    scope.innerHTML=db.programs.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    scope.value=[...scope.options].some(o=>o.value===selected)?selected:(db.programs[0]?.id||'');
  }
  function render(){
    renderScope();
    const p=selectedProgram(),custom=isCustom(p),qs=currentQuestions();
    if(!p){statusBox.textContent='لا توجد برامج حتى الآن.';list.innerHTML='<div class="question-empty">أضف برنامجًا أولًا.</div>';editor.style.display='none';createBtn.style.display='none';restoreBtn.style.display='none';return}
    statusBox.innerHTML=custom?'<strong>نموذج مخصص</strong><br>التعديلات هنا تخص هذا البرنامج فقط، ولا تؤثر على بقية البرامج.':'<strong>النموذج الأساسي</strong><br>هذا البرنامج يستخدم الأسئلة الثابتة المعتمدة تلقائيًا.';
    editorTitle.textContent=custom?'النموذج المخصص لهذا البرنامج':'النموذج الأساسي — للعرض فقط';
    editor.style.display=custom?'grid':'none';
    createBtn.style.display=custom?'none':'block';
    restoreBtn.style.display=custom?'block':'none';
    list.innerHTML=qs.length?qs.map((q,i)=>`<div class="question-item"><span class="question-number">${i+1}</span><div><h4>${escapeHtml(q.label)}${q.required?'<span class="required-chip">إلزامي</span>':''}</h4><small>${typeLabel(q.type)}</small></div><div class="question-actions">${custom?`<button data-up="${q.id}" ${i===0?'disabled':''}>↑</button><button data-down="${q.id}" ${i===qs.length-1?'disabled':''}>↓</button><button data-edit="${q.id}">تعديل</button><button class="delete-question" data-delete="${q.id}">حذف</button>`:'<span class="fixed-question-label">ثابت</span>'}</div></div>`).join(''):'<div class="question-empty">لا توجد أسئلة في هذا النموذج.</div>';
  }
  function persist(message){save();resetEditor();render();renderDashboard();renderEvaluations();renderReports();if(message)showToast(message)}
  function findQuestion(id){return currentQuestions().find(q=>q.id===id)}
  function move(id,dir){if(!isCustom())return;const qs=currentQuestions(),i=qs.findIndex(q=>q.id===id),j=i+dir;if(i<0||j<0||j>=qs.length)return;[qs[i],qs[j]]=[qs[j],qs[i]];persist()}
  function remove(id){if(!isCustom())return;const qs=currentQuestions(),i=qs.findIndex(q=>q.id===id);if(i<0||!confirm('هل تريد حذف هذا السؤال من هذا البرنامج فقط؟'))return;qs.splice(i,1);persist('تم حذف السؤال من هذا البرنامج')}
  function edit(id){if(!isCustom())return;const q=findQuestion(id);if(!q)return;editingId=id;titleInput.value=q.label;typeInput.value=q.type;requiredInput.value=String(q.required);saveBtn.textContent='حفظ التعديل';titleInput.focus()}

  list.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.up)move(b.dataset.up,-1);if(b.dataset.down)move(b.dataset.down,1);if(b.dataset.edit)edit(b.dataset.edit);if(b.dataset.delete)remove(b.dataset.delete)};
  scope.onchange=()=>{resetEditor();render()};
  createBtn.onclick=()=>{const p=selectedProgram();if(!p)return;p.questionnaire=structuredClone(db.questionBank);p.questionnaireMode='custom';persist('تم إنشاء نسخة خاصة لهذا البرنامج')};
  restoreBtn.onclick=()=>{const p=selectedProgram();if(!p||!confirm('سيتم حذف تخصيصات هذا البرنامج والعودة إلى الأسئلة الأساسية.'))return;delete p.questionnaire;p.questionnaireMode='default';persist('عاد البرنامج إلى النموذج الأساسي')};
  saveBtn.onclick=()=>{if(!isCustom())return;const label=titleInput.value.trim();if(!label){showToast('اكتب نص السؤال أولًا');return}const qs=currentQuestions(),wasEditing=Boolean(editingId);if(editingId){const q=findQuestion(editingId);q.label=label;q.type=typeInput.value;q.required=requiredInput.value==='true'}else qs.push({id:'Q-'+Date.now(),label,type:typeInput.value,required:requiredInput.value==='true'});persist(wasEditing?'تم تعديل السؤال لهذا البرنامج':'تمت إضافة السؤال لهذا البرنامج')};
  cancelBtn.onclick=resetEditor;

  function openForProgram(id){scope.value=id;navigate('question-bank');document.querySelector('#pageTitle').textContent='أسئلة تقييم البرنامج';render()}
  window.openProgramQuestionnaire=openForProgram;
  const nav=document.querySelector('[data-view="question-bank"]');nav.onclick=()=>{navigate('question-bank');document.querySelector('#pageTitle').textContent='أسئلة تقييم البرامج';render()};

  // إضافة زر التخصيص داخل تفاصيل كل برنامج.
  const details=document.querySelector('#programDetails');
  if(details){new MutationObserver(()=>{if(!currentProgramId||details.querySelector('#customizeProgramQuestions'))return;const target=details.querySelector('.detail-actions,.program-actions,.form-actions')||details.firstElementChild;if(!target)return;const btn=document.createElement('button');btn.id='customizeProgramQuestions';btn.type='button';btn.className='secondary-btn';btn.textContent='تخصيص أسئلة التقييم';btn.onclick=()=>openForProgram(currentProgramId);target.appendChild(btn)}).observe(details,{childList:true,subtree:true})}

  document.querySelector('#programForm')?.addEventListener('submit',()=>setTimeout(()=>{db.programs.forEach(p=>{if(!p.questionnaireMode)p.questionnaireMode='default'});save();renderScope()},0));
  render();
})();