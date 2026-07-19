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

  if(!Array.isArray(db.questionBank)||!db.questionBank.length) db.questionBank=structuredClone(defaultQuestions);
  db.programs.forEach(p=>{if(!Array.isArray(p.questionnaire)||!p.questionnaire.length)p.questionnaire=structuredClone(db.questionBank)});
  save();

  function syncLegacyQuestions(){
    const ratings=db.questionBank.filter(q=>q.type==='rating').map(q=>[q.id,q.label]);
    questions.splice(0,questions.length,...ratings);
  }
  syncLegacyQuestions();

  const section=document.querySelector('#question-bank');
  const scope=document.querySelector('#questionScope');
  const list=document.querySelector('#questionList');
  const titleInput=document.querySelector('#questionTitleInput');
  const typeInput=document.querySelector('#questionTypeInput');
  const requiredInput=document.querySelector('#questionRequiredInput');
  const saveBtn=document.querySelector('#saveQuestionBtn');
  const cancelBtn=document.querySelector('#cancelQuestionEdit');
  let editingId=null;

  function currentQuestions(){
    if(scope.value==='default') return db.questionBank;
    return db.programs.find(p=>p.id===scope.value)?.questionnaire||[];
  }
  function persist(){
    save();
    syncLegacyQuestions();
    render();
    renderDashboard();renderEvaluations();renderReports();
  }
  function resetEditor(){editingId=null;titleInput.value='';typeInput.value='rating';requiredInput.value='true';saveBtn.textContent='إضافة السؤال'}
  function typeLabel(type){return({rating:'تقييم من 1 إلى 5',yesno:'نعم / لا',short:'إجابة قصيرة',long:'إجابة طويلة'})[type]||type}
  function renderScope(){
    const selected=scope.value||'default';
    scope.innerHTML='<option value="default">النموذج الافتراضي للبرامج الجديدة</option>'+db.programs.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    scope.value=[...scope.options].some(o=>o.value===selected)?selected:'default';
  }
  function render(){
    renderScope();
    const qs=currentQuestions();
    list.innerHTML=qs.length?qs.map((q,i)=>`<div class="question-item"><span class="question-number">${i+1}</span><div><h4>${escapeHtml(q.label)}${q.required?'<span class="required-chip">إلزامي</span>':''}</h4><small>${typeLabel(q.type)}</small></div><div class="question-actions"><button data-up="${q.id}" ${i===0?'disabled':''}>↑</button><button data-down="${q.id}" ${i===qs.length-1?'disabled':''}>↓</button><button data-edit="${q.id}">تعديل</button><button class="delete-question" data-delete="${q.id}">حذف</button></div></div>`).join(''):'<div class="question-empty">لا توجد أسئلة في هذا النموذج.</div>';
  }
  function findQuestion(id){return currentQuestions().find(q=>q.id===id)}
  function move(id,dir){const qs=currentQuestions(),i=qs.findIndex(q=>q.id===id),j=i+dir;if(i<0||j<0||j>=qs.length)return;[qs[i],qs[j]]=[qs[j],qs[i]];persist()}
  function remove(id){const qs=currentQuestions(),i=qs.findIndex(q=>q.id===id);if(i<0)return;if(!confirm('هل تريد حذف هذا السؤال؟'))return;qs.splice(i,1);persist();resetEditor()}
  function edit(id){const q=findQuestion(id);if(!q)return;editingId=id;titleInput.value=q.label;typeInput.value=q.type;requiredInput.value=String(q.required);saveBtn.textContent='حفظ التعديل';titleInput.focus()}

  list.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.up)move(b.dataset.up,-1);if(b.dataset.down)move(b.dataset.down,1);if(b.dataset.edit)edit(b.dataset.edit);if(b.dataset.delete)remove(b.dataset.delete)};
  scope.onchange=()=>{resetEditor();render()};
  saveBtn.onclick=()=>{const label=titleInput.value.trim();if(!label){showToast('اكتب نص السؤال أولًا');return}const qs=currentQuestions();if(editingId){const q=findQuestion(editingId);q.label=label;q.type=typeInput.value;q.required=requiredInput.value==='true'}else{qs.push({id:'Q-'+Date.now(),label,type:typeInput.value,required:requiredInput.value==='true'})}persist();resetEditor();showToast(editingId?'تم تعديل السؤال':'تمت إضافة السؤال')};
  cancelBtn.onclick=resetEditor;
  document.querySelector('#copyDefaultQuestions').onclick=()=>{if(scope.value==='default'){showToast('أنت داخل النموذج الافتراضي بالفعل');return}const p=db.programs.find(x=>x.id===scope.value);p.questionnaire=structuredClone(db.questionBank);persist();showToast('تم تطبيق الأسئلة الافتراضية على البرنامج')};

  document.querySelectorAll('[data-view="question-bank"]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('#pageTitle').textContent='بنك أسئلة التقييم';render()}));

  const form=document.querySelector('#programForm');
  form.addEventListener('submit',()=>setTimeout(()=>{let changed=false;db.programs.forEach(p=>{if(!Array.isArray(p.questionnaire)||!p.questionnaire.length){p.questionnaire=structuredClone(db.questionBank);changed=true}});if(changed)save();renderScope()},0));

  render();
})();