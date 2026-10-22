// Nav scroll
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

// Hamburger
const ham = document.getElementById('hamburger');
const mob = document.getElementById('mobileMenu');
ham.addEventListener('click', () => {
  const open = mob.classList.toggle('open');
  ham.classList.toggle('open', open);
  ham.setAttribute('aria-expanded', open);
});
function closeMobile() {
  mob.classList.remove('open');
  ham.classList.remove('open');
  ham.setAttribute('aria-expanded', 'false');
}
mob.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 60);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// GA4 direto (o GTM-5C96PR6L ainda está vazio); o dataLayer.push fica para quando ele ganhar tags
function ga(evento, params) { if (typeof gtag === 'function') gtag('event', evento, params); }

// ═══ Envio para Google Sheets (Apps Script) ═══
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwRQWQ95VzSPKElErf8xGx1hjgJhk07tbxn5BgPTx-Lq7i9X4008N_ulYMKnz2ttls/exec'; // termina em /exec
const ABA_CONTATO = 'Form Cadastro Site';

function getUTMs() {
  const p = new URLSearchParams(location.search);
  const out = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k => {
    const v = p.get(k) || sessionStorage.getItem(k) || '';
    if (p.get(k)) { try { sessionStorage.setItem(k, v); } catch(e){} }
    out[k] = v;
  });
  return out;
}
getUTMs(); // guarda as UTMs da entrada

function enviarParaPlanilha(dados) {
  const body = new URLSearchParams({ ...dados, ...getUTMs(), pagina: location.href });
  // no-cors: o Apps Script recebe normalmente; a resposta não é lida
  const envio = fetch(SHEETS_URL, { method: 'POST', mode: 'no-cors', body, keepalive: true }).catch(() => {});
  const limite = new Promise(r => setTimeout(r, 2500)); // não trava o usuário
  return Promise.race([envio, limite]);
}

// ═══ Modal de download (o mesmo em todas as páginas) ═══
document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-overlay" id="modalLivro" role="dialog" aria-modal="true" aria-labelledby="modalTitulo" aria-hidden="true">
    <div class="modal-box">
      <button type="button" class="modal-close" id="modalFechar" aria-label="Fechar">&times;</button>
      <span class="label">Download gratuito</span>
      <h3 class="modal-titulo" id="modalTitulo">Receba seu livro</h3>
      <p class="modal-sub">Preencha seus dados e o download começa em seguida.</p>
      <form id="formLivro" novalidate>
        <div class="form-group">
          <label for="lead-nome">Nome</label>
          <input type="text" id="lead-nome" name="nome" required autocomplete="name" placeholder="Seu nome" />
        </div>
        <div class="form-group">
          <label for="lead-whats">WhatsApp com DDD</label>
          <input type="tel" id="lead-whats" name="whatsapp" required autocomplete="tel" inputmode="tel" placeholder="(DDD) 00000-0000" maxlength="16" />
        </div>
        <div class="form-group">
          <label for="lead-email">E-mail</label>
          <input type="email" id="lead-email" name="email" required autocomplete="email" placeholder="seu@email.com" />
        </div>
        <p class="modal-lgpd">Ao continuar, você concorda em receber conteúdos de João Emanuel. Seus dados não serão compartilhados.</p>
        <button type="submit" class="btn btn-gold" style="width:100%;justify-content:center;">Baixar agora</button>
        <p class="modal-erro" id="modalErro">Preencha nome, WhatsApp com DDD e e-mail válidos.</p>
      </form>
    </div>
  </div>`);

const modal = document.getElementById('modalLivro');
const formLivro = document.getElementById('formLivro');
const erroLivro = document.getElementById('modalErro');
let livroAtual = null;

function abrirModal(btn) {
  livroAtual = { nome: btn.dataset.livro, aba: btn.dataset.aba, pdf: btn.dataset.pdf };
  document.getElementById('modalTitulo').textContent = 'Receba “' + livroAtual.nome + '”';
  erroLivro.style.display = 'none';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('lead-nome').focus(), 50);
  window.dataLayer.push({ event: 'abrir_modal_livro', livro: livroAtual.nome });
  ga('abrir_modal_livro', { livro: livroAtual.nome });
}
function fecharModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.querySelectorAll('.livro-btn[data-pdf], .btn[data-pdf]').forEach(b => b.addEventListener('click', () => abrirModal(b)));
document.getElementById('modalFechar').addEventListener('click', fecharModal);
modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) fecharModal(); });

formLivro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = formLivro.nome.value.trim();
  const email = formLivro.email.value.trim();
  const whatsapp = formLivro.whatsapp.value.replace(/\D/g, '');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!nome || !emailOk || whatsapp.length < 10) { erroLivro.style.display = 'block'; return; }
  erroLivro.style.display = 'none';

  const btn = formLivro.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Preparando seu livro...';

  window.dataLayer.push({ event: 'lead_livro', livro: livroAtual.nome, form_id: 'formLivro' });
  ga('generate_lead', { livro: livroAtual.nome, form_id: 'formLivro', transport_type: 'beacon' });
  await enviarParaPlanilha({ aba: livroAtual.aba, livro: livroAtual.nome, nome, email, whatsapp });

  window.location.href = livroAtual.pdf; // redireciona para o PDF
});

// ═══ Formulário de contato ═══
async function enviarForm(e) {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Enviando...';
  window.dataLayer.push({ event: 'contato_enviado', form_id: 'contato' });
  ga('contato_enviado', { form_id: 'contato' });
  await enviarParaPlanilha({ aba: ABA_CONTATO, nome: f.nome.value.trim(), email: f.email.value.trim(), mensagem: f.mensagem.value.trim() });
  btn.textContent = 'Mensagem enviada ✓';
  btn.style.background = 'var(--gold-lt)';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; btn.disabled = false; f.reset(); }, 3500);
}
