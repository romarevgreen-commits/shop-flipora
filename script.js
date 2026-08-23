const tabs = document.querySelectorAll('[data-tool]');
const type = document.getElementById('projectType');
const idea = document.getElementById('idea');
const result = document.getElementById('result');

function chooseTool(name) {
  type.value = name;
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tool === name));
  document.getElementById('create').scrollIntoView({behavior:'smooth'});
}

tabs.forEach(tab => tab.addEventListener('click', () => chooseTool(tab.dataset.tool)));
document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => chooseTool(button.dataset.select)));

document.getElementById('generate').addEventListener('click', () => {
  const request = idea.value.trim();
  if (!request) { idea.focus(); idea.placeholder = 'Please type your idea here first...'; return; }
  const style = document.getElementById('style').value;
  const purpose = document.getElementById('purpose').value;
  result.innerHTML = `<div class="prepared"><span class="ready">READY FOR AI</span><h3>${type.value}</h3><p>Your project request has been prepared:</p><blockquote>${request}</blockquote><p><strong>Style:</strong> ${style}<br><strong>Purpose:</strong> ${purpose}</p><button class="primary" data-preview>Connect AI to create</button></div>`;
  result.querySelector('[data-preview]').addEventListener('click', openModal);
});

const modal = document.getElementById('modal');
function openModal(){ modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', openModal));
document.querySelectorAll('.close,.close-button').forEach(button => button.addEventListener('click', closeModal));
modal.addEventListener('click', event => { if(event.target === modal) closeModal(); });
document.addEventListener('keydown', event => { if(event.key === 'Escape') closeModal(); });
