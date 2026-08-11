const header=document.querySelector('.header');const menu=document.querySelector('.menu');menu?.addEventListener('click',()=>header.classList.toggle('open'));
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>header.classList.remove('open')));
const modal=document.getElementById('modal'),title=document.getElementById('modalTitle'),text=document.getElementById('modalText');
function openModal(t,m){title.textContent=t;text.textContent=m;modal.classList.add('show');}
function closeModal(){modal.classList.remove('show');}
document.querySelector('.demo')?.addEventListener('click',()=>openModal('Demo Plumkids','Muy pronto podrás probar las apps directamente desde Plumkids.'));
document.querySelectorAll('.try').forEach(b=>b.addEventListener('click',()=>openModal('Prueba gratuita','Estamos preparando la experiencia de prueba gratuita.')));
document.querySelectorAll('.buy').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.app,'La compra se habilitará cuando conectemos la pasarela de pago.')));
document.querySelectorAll('.close,.close2,.backdrop').forEach(e=>e.addEventListener('click',closeModal));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});