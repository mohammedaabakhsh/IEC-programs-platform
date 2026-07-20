(()=>{
  const loadMvp=()=>{
    if(document.querySelector('script[src="mvp-mode.js"]'))return;
    const mvp=document.createElement('script');
    mvp.src='mvp-mode.js';
    document.body.appendChild(mvp);
  };

  const core=document.createElement('script');
  core.src='https://cdn.jsdelivr.net/gh/mohammedaabakhsh/IEC-programs-platform@fca298f09a1caf5f4d00a9969105d3091c12bc6e/evaluation-v2.js';
  core.onload=()=>{
    if(!document.querySelector('script[src="cloud-sync.js"]')){
      const cloud=document.createElement('script');
      cloud.src='cloud-sync.js';
      cloud.onload=()=>{
        if(!document.querySelector('script[src="program-metadata-sync.js"]')){
          const metadata=document.createElement('script');
          metadata.src='program-metadata-sync.js';
          metadata.onload=loadMvp;
          metadata.onerror=loadMvp;
          document.body.appendChild(metadata);
        }else{
          loadMvp();
        }
      };
      cloud.onerror=loadMvp;
      document.body.appendChild(cloud);
    }else{
      loadMvp();
    }
  };
  core.onerror=()=>{
    console.error('تعذر تحميل وحدة التقييم الأساسية');
    loadMvp();
  };
  document.body.appendChild(core);
})();
