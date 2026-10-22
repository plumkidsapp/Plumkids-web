(() => {
  const mq = window.matchMedia('(max-width: 820px)');
  const selectors = [
    '.paper',
    '.worksheet-a4',
    '.worksheet-wrapper',
    '.a4-container',
    '.a4-page',
    '.sheet'
  ];

  let target = null;
  let shell = null;
  let observer = null;

  function findTarget(){
    return selectors.map(s => document.querySelector(s)).find(Boolean) || null;
  }

  function wrap(){
    if(!mq.matches) return;
    target = findTarget();
    if(!target) return;

    if(target.parentElement?.classList.contains('pk-scale-shell')){
      shell = target.parentElement;
    } else {
      shell = document.createElement('div');
      shell.className = 'pk-scale-shell';
      target.parentNode.insertBefore(shell, target);
      shell.appendChild(target);
    }
    target.classList.add('pk-scale-target');
    fit();

    if(!observer && window.ResizeObserver){
      observer = new ResizeObserver(() => fit());
      observer.observe(target);
      observer.observe(shell);
    }

    // Re-fit after generators redraw their worksheet contents.
    const mo = new MutationObserver(() => requestAnimationFrame(fit));
    mo.observe(target,{childList:true,subtree:true,characterData:true});
    target.__pkMutationObserver = mo;
  }

  function fit(){
    if(!mq.matches || !target || !shell) return;
    target.style.transform = 'none';
    target.style.margin = '0';
    const naturalW = Math.max(target.scrollWidth, target.getBoundingClientRect().width || 1);
    const naturalH = Math.max(target.scrollHeight, target.offsetHeight || 1);
    const available = Math.max(280, shell.clientWidth || document.documentElement.clientWidth);
    const scale = Math.min(1, available / naturalW);
    target.style.transform = `scale(${scale})`;
    shell.style.height = `${Math.ceil(naturalH * scale)}px`;
  }

  function unwrap(){
    if(!target || !shell) return;
    target.style.transform = '';
    target.style.margin = '';
    target.classList.remove('pk-scale-target');
    target.__pkMutationObserver?.disconnect();
    if(shell.parentNode){
      shell.parentNode.insertBefore(target, shell);
      shell.remove();
    }
    observer?.disconnect();
    observer = null;
    target = null;
    shell = null;
  }

  function sync(){
    if(mq.matches) wrap();
    else unwrap();
  }

  document.addEventListener('DOMContentLoaded', () => {
    sync();
    [80,250,700,1400].forEach(ms => setTimeout(() => { if(mq.matches){ if(!target) wrap(); fit(); } }, ms));
  });
  window.addEventListener('load', () => { sync(); fit(); });
  window.addEventListener('resize', () => requestAnimationFrame(sync));
  mq.addEventListener?.('change', sync);
})();
