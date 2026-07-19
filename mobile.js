(()=>{
  const isMobile=()=>window.matchMedia('(max-width:820px)').matches;
  const sidebar=document.querySelector('#sidebar');
  const menu=document.querySelector('#menuBtn');
  if(!sidebar||!menu)return;

  const overlay=document.createElement('div');
  overlay.className='mobile-overlay';
  overlay.setAttribute('aria-hidden','true');
  document.body.appendChild(overlay);

  const closeMenu=()=>{
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.classList.remove('menu-open');
    menu.setAttribute('aria-expanded','false');
  };
  const openMenu=()=>{
    if(!isMobile())return;
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('menu-open');
    menu.setAttribute('aria-expanded','true');
  };
  menu.setAttribute('aria-label','فتح القائمة');
  menu.setAttribute('aria-controls','sidebar');
  menu.setAttribute('aria-expanded','false');
  menu.addEventListener('click',e=>{
    e.stopImmediatePropagation();
    sidebar.classList.contains('open')?closeMenu():openMenu();
  },true);
  overlay.addEventListener('click',closeMenu);
  sidebar.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  window.addEventListener('resize',()=>{if(!isMobile())closeMenu()});

  const syncPill=document.createElement('div');
  syncPill.className='mobile-sync-pill';
  syncPill.innerHTML='<span>●</span><strong>جارٍ المزامنة</strong>';
  document.body.appendChild(syncPill);
  const sidebarStatus=document.querySelector('.sidebar-card small');
  const observer=sidebarStatus?new MutationObserver(()=>{
    const text=sidebarStatus.textContent.trim();
    const active=/جارٍ|بانتظار|تعذر|غير متصل/.test(text);
    syncPill.querySelector('strong').textContent=text;
    syncPill.classList.toggle('error',/تعذر|غير متصل/.test(text));
    syncPill.classList.toggle('show',active&&isMobile());
  }):null;
  observer?.observe(sidebarStatus,{childList:true,subtree:true,characterData:true});

  let installPrompt=null;
  const banner=document.createElement('div');
  banner.className='mobile-install-banner';
  banner.innerHTML='<div><strong>ثبّت المنصة على الجوال</strong><small>تفتح مثل التطبيق من الشاشة الرئيسية</small></div><button class="install-now">تثبيت</button><button class="install-close" aria-label="إغلاق">×</button>';
  document.body.appendChild(banner);
  const dismissed=()=>sessionStorage.getItem('iec-install-dismissed')==='1';
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();installPrompt=e;
    if(isMobile()&&!dismissed())banner.classList.add('show');
  });
  banner.querySelector('.install-now').onclick=async()=>{
    if(!installPrompt)return;
    installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;banner.classList.remove('show');
  };
  banner.querySelector('.install-close').onclick=()=>{banner.classList.remove('show');sessionStorage.setItem('iec-install-dismissed','1')};
  window.addEventListener('appinstalled',()=>banner.classList.remove('show'));

  document.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('focus',()=>{if(isMobile())setTimeout(()=>el.scrollIntoView({block:'center',behavior:'smooth'}),250)});
  });
})();
