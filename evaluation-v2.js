(()=>{
  const modal=document.querySelector('#evaluationModal');
  const closeBtn=document.querySelector('#closeModal');
  const form=document.querySelector('#evaluationForm');
  if(!modal||!form)return;

  const intro=document.querySelector('#evaluationIntro');
  const formStep=document.querySelector('#evaluationFormStep');
  const success=document.querySelector('#evaluationSuccess');
  const unavailable=document.querySelector('#evaluationUnavailable');
  const startBtn=document.querySelector('#startEvaluation');
  const closeSuccess=document.querySelector('#closeEvaluationSuccess');
  const attendanceYes=document.querySelector('#attendanceYes');
  const attendanceNo=document.querySelector('#attendanceNo');
  const attendanceMessage=document.querySelector('#attendanceMessage');
  const progress=document.querySelector('#evaluationProgressBar');
  let activeProgram=null;
  let attended=null;

  function setStep(step){
    [intro,formStep,success,unavailable].forEach(el=>el&&el.classList.remove('active'));
    step?.classList.add('active');
  }

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

  function buildQuestions(){
    document.querySelector('#ratingQuestions').innerHTML=questions.map(([key,label],index)=>`<div class="evaluation-question"><label>${index+1}. ${label}</label><div class="rating-row" data-name="${key}">${[1,2,3,4,5].map(n=>`<button type="button" data-value="${n}" aria-label="${n} من 5">${n}</button>`).join('')}</div><input type="hidden" name="${key}" required></div>`).join('');
    document.querySelectorAll('.rating-row button').forEach(btn=>btn.onclick=()=>{
      const row=btn.parentElement;
      row.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      row.nextElementSibling.value=btn.dataset.value;
      updateProgress();
    });
  }

  function updateProgress(){
    const answered=questions.filter(([k])=>form.elements[k]?.value).length;
    progress.style.width=`${Math.round(answered/questions.length*100)}%`;
  }

  window.openEvaluation=id=>{
    const p=db.programs.find(x=>x.id===id);
    modal.classList.add('show');
    form.reset();
    attended=null;
    attendanceYes.classList.remove('selected');
    attendanceNo.classList.remove('selected');
    attendanceMessage.textContent='';
    progress.style.width='0%';
    if(!p){setStep(unavailable);return;}
    activeProgram=p;
    currentProgramId=p.id;
    form.elements.programId.value=p.id;
    fillProgram(p);
    buildQuestions();
    setStep(intro);
  };

  attendanceYes.onclick=()=>{
    attended=true;
    attendanceYes.classList.add('selected');
    attendanceNo.classList.remove('selected');
    attendanceMessage.textContent='';
  };
  attendanceNo.onclick=()=>{
    attended=false;
    attendanceNo.classList.add('selected');
    attendanceYes.classList.remove('selected');
    attendanceMessage.textContent='هذا التقييم مخصص لمن حضر البرنامج.';
  };

  startBtn.onclick=()=>{
    if(attended!==true){attendanceMessage.textContent=attended===false?'هذا التقييم مخصص لمن حضر البرنامج.':'اختر هل حضرت البرنامج أولًا.';return;}
    setStep(formStep);
  };

  form.onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(form);
    if(questions.some(([k])=>!fd.get(k))){showToast('قيّم جميع المحاور أولًا');return;}
    const entry={id:crypto.randomUUID(),programId:fd.get('programId'),createdAt:new Date().toISOString(),strengths:fd.get('strengths').trim(),comment:fd.get('comment').trim()};
    questions.forEach(([k])=>entry[k]=Number(fd.get(k)));
    db.evaluations.push(entry);
    save();
    document.querySelector('#evaluationReference').textContent='EV-'+new Date().getFullYear()+'-'+entry.id.slice(0,8).toUpperCase();
    setStep(success);
    renderDashboard();
    renderEvaluations();
    renderReports();
    if(currentProgramId===entry.programId) setTimeout(()=>openProgram(entry.programId),300);
  };

  closeBtn.onclick=()=>modal.classList.remove('show');
  closeSuccess.onclick=()=>modal.classList.remove('show');
  modal.onclick=e=>{if(e.target===modal)modal.classList.remove('show')};

  const hashMatch=location.hash.match(/^#evaluate=(.+)$/);
  if(hashMatch)setTimeout(()=>window.openEvaluation(decodeURIComponent(hashMatch[1])),0);
})();