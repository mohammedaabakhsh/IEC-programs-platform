(()=>{
  const core=document.createElement('script');
  core.src='https://cdn.jsdelivr.net/gh/mohammedaabakhsh/IEC-programs-platform@fca298f09a1caf5f4d00a9969105d3091c12bc6e/evaluation-v2.js';
  core.onload=()=>{
    if(!document.querySelector('script[src="cloud-sync.js"]')){
      const cloud=document.createElement('script');
      cloud.src='cloud-sync.js';
      document.body.appendChild(cloud);
    }
  };
  core.onerror=()=>console.error('تعذر تحميل وحدة التقييم الأساسية');
  document.body.appendChild(core);
})();
