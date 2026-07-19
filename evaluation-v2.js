(()=>{
  const modal=document.querySelector('#evaluationModal');
  const closeBtn=document.querySelector('#closeModal');
  const form=document.querySelector('#evaluationForm');
  if(!modal||!form)return;

  const intro=document.querySelector('#evaluationIntro');
  const formStep=document.querySelector('#evaluationFormStep');
  const success=document.querySelector('#evaluationSuccess');
  const unavailable=document.querySelector('#evaluationUnavailable');
  const closeSuccess=document.querySelector('#closeEvaluationSuccess');
  const progress=document.querySelector('#evaluationProgressBar');
  let activeProgram=null;
  let activeQuestions=[];

  function setStep(step){[intro,formStep,success,unavailable].forEach(el=>el&&el.classList.remove('active'));step?.classList.add('active')}
  function showEvaluationForm(){[intro,formStep,success,unavailable].forEach(el=>el&&el.classList.remove('active'));intro.classList.add('active');formStep.classList.add('active')}
  function clearEvaluationHash(){if(location.hash.startsWith('#evaluate='))history.replaceState(null,'',location.pathname+location.search)}

  function fillProgram(p){
    document.querySelector('#evaluationProgramName').textContent=p.name;
    document.querySelector('#evaluationProgramDate').textContent=formatDate(p.date);
    document.querySelector('#evaluationProgramTrainer').textContent=p.trainer;
    document.querySelector('#evaluationProgramType').textContent=p.type;
    document.querySelector('#evaluationProgramAudience').textContent=p.audience;
    document.querySelector('#evaluationProgramOrganizer').textContent=p.organizer;
    document.querySelector('#evaluationCenterName').textContent=db.settings.centerName||'مركز الابتكار وريادة الأعمال';
    document.querySelector('#evaluationUniversityName').textContent=db.settings.universityName||'جامعة الملك عبدالعزيز';
  }

  function inputHtml(q,index){
    const required=q.required?'required':'';
    if(q.type==='rating')return `<div class="evaluation-question"><label>${index+1}. ${escapeHtml(q.label)}${q.required?' *':''}</label><div class="rating-row" data-name="${q.id}">${[1,2,3,4,5].map(n=>`<button type="button" data-value="${n}" aria-label="${n} من 5">${n}</button>`).join('')}</div><input type="hidden" name="${q.id}" ${required}></div>`;
    if(q.type==='yesno')return `<div class="evaluation-question"><label>${index+1}. ${escapeHtml(q.label)}${q.required?' *':''}</label><div class="rating-row yesno-row" data-name="${q.id}"><button type="button" data-value="نعم">نعم</button><button type="button" data-value="لا">لا</button></div><input type="hidden" name="${q.id}" ${required}></div>`;
    if(q.type==='short')return `<div class="evaluation-question"><label>${index+1}. ${escapeHtml(q.label)}${q.required?' *':''}<input type="text" name="${q.id}" ${required}></label></div>`;
    return `<div class="evaluation-question"><label>${index+1}. ${escapeHtml(q.label)}${q.required?' *':''}<textarea name="${q.id}" ${required}></textarea></label></div>`;
  }

  function buildQuestions(){
    activeQuestions=Array.isArray(activeProgram.questionnaire)&&activeProgram.questionnaire.length?activeProgram.questionnaire:db.questionBank||[];
    document.querySelector('#ratingQuestions').innerHTML=activeQuestions.map(inputHtml).join('');
    document.querySelectorAll('.rating-row button').forEach(btn=>btn.onclick=()=>{const row=btn.parentElement;row.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');row.nextElementSibling.value=btn.dataset.value;updateProgress()});
    document.querySelectorAll('#ratingQuestions input[type=text],#ratingQuestions textarea').forEach(el=>el.addEventListener('input',updateProgress));
    const legacyStrengths=form.querySelector('[name="strengths"]')?.closest('label');
    const legacyComment=form.querySelector('[name="comment"]')?.closest('label');
    if(legacyStrengths)legacyStrengths.style.display='none';
    if(legacyComment)legacyComment.style.display='none';
  }

  function updateProgress(){const answered=activeQuestions.filter(q=>String(form.elements[q.id]?.value||'').trim()).length;progress.style.width=`${activeQuestions.length?Math.round(answered/activeQuestions.length*100):0}%`}

  window.openEvaluation=id=>{
    const p=db.programs.find(x=>x.id===id);
    modal.classList.add('show');form.reset();progress.style.width='0%';
    if(!p){setStep(unavailable);return}
    activeProgram=p;currentProgramId=p.id;form.elements.programId.value=p.id;fillProgram(p);buildQuestions();showEvaluationForm();
    const attendanceTitle=document.querySelector('#evaluationIntro > strong');
    const attendanceBox=document.querySelector('.attendance-box');
    const attendanceMessage=document.querySelector('#attendanceMessage');
    const startBtn=document.querySelector('#startEvaluation');
    if(attendanceTitle)attendanceTitle.style.display='none';if(attendanceBox)attendanceBox.style.display='none';if(attendanceMessage)attendanceMessage.style.display='none';if(startBtn)startBtn.style.display='none';
    setTimeout(()=>document.querySelector('#evaluationFormStep')?.scrollIntoView({block:'nearest'}),100);
  };

  form.onsubmit=e=>{
    e.preventDefault();const fd=new FormData(form);
    const missing=activeQuestions.some(q=>q.required&&!String(fd.get(q.id)||'').trim());
    if(missing){showToast('أجب عن جميع الأسئلة الإلزامية');return}
    const entry={id:crypto.randomUUID(),programId:fd.get('programId'),createdAt:new Date().toISOString(),answers:{}};
    activeQuestions.forEach(q=>{const value=fd.get(q.id)||'';entry.answers[q.id]=value;if(q.type==='rating')entry[q.id]=Number(value||0)});
    entry.strengths=entry.answers.strengths||'';entry.comment=entry.answers.comment||'';
    db.evaluations.push(entry);save();
    document.querySelector('#evaluationReference').textContent='EV-'+new Date().getFullYear()+'-'+entry.id.slice(0,8).toUpperCase();
    setStep(success);renderDashboard();renderEvaluations();renderReports();
  };

  closeBtn.onclick=()=>{modal.classList.remove('show');clearEvaluationHash()};
  closeSuccess.onclick=()=>{modal.classList.remove('show');clearEvaluationHash()};
  modal.onclick=e=>{if(e.target===modal){modal.classList.remove('show');clearEvaluationHash()}};

  const hashMatch=location.hash.match(/^#evaluate=(.+)$/);
  if(hashMatch){const id=decodeURIComponent(hashMatch[1]);if(db.programs.some(p=>p.id===id))setTimeout(()=>window.openEvaluation(id),0);else clearEvaluationHash()}
})();