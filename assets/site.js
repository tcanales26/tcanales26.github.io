const $ = (s, el = document) => el.querySelector(s);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
};
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';
const pad = (n) => String(n).padStart(2, '0');

const lightbox = $('#lightbox');
let lbImages = [];
let lbIndex = 0;

function showLightbox(i) {
  lbIndex = (i + lbImages.length) % lbImages.length;
  const { url, alt } = lbImages[lbIndex];
  const img = $('img', lightbox);
  img.src = url;
  img.alt = alt || '';
  $('figcaption', lightbox).textContent = `${alt ? alt + ' · ' : ''}${lbIndex + 1} / ${lbImages.length}`;
  const multiple = lbImages.length > 1;
  lightbox.querySelectorAll('.lb-nav').forEach((b) => (b.hidden = !multiple));
  if (!lightbox.open) lightbox.showModal();
}

lightbox.addEventListener('click', (e) => {
  const action = e.target.closest('[data-lb]')?.dataset.lb;
  if (action === 'close' || e.target === lightbox || e.target.tagName === 'FIGURE') lightbox.close();
  if (action === 'prev') showLightbox(lbIndex - 1);
  if (action === 'next') showLightbox(lbIndex + 1);
});
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
  if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
});

function renderProject(p, i, usedIds) {
  let id = slug(p.title);
  while (usedIds.has(id)) id += '-' + i;
  usedIds.add(id);

  const strip = el('div', { className: 'strip' });
  p.images.forEach((im, idx) => {
    const btn = el('button', { type: 'button', ariaLabel: `Ampliar: ${im.alt || p.title}` },
      el('img', { src: im.url, alt: im.alt || '', loading: idx < 3 && i < 2 ? 'eager' : 'lazy', decoding: 'async' }));
    btn.addEventListener('click', () => {
      lbImages = p.images;
      showLightbox(idx);
    });
    strip.append(el('figure', { className: 'shot' }, btn));
  });
  if (!p.images.length) strip.append(el('p', { className: 'empty-shots', textContent: 'Imágenes próximamente.' }));

  const prev = el('button', { className: 'arrow', type: 'button', ariaLabel: 'Imagen anterior', textContent: '←' });
  const next = el('button', { className: 'arrow', type: 'button', ariaLabel: 'Imagen siguiente', textContent: '→' });
  const step = () => (strip.firstElementChild?.offsetWidth || 300) + 20;
  prev.onclick = () => strip.scrollBy({ left: -step(), behavior: 'smooth' });
  next.onclick = () => strip.scrollBy({ left: step(), behavior: 'smooth' });
  const update = () => {
    prev.disabled = strip.scrollLeft <= 2;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
  };
  strip.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(strip);

  const n = p.images.length;
  const section = el('article', { className: 'project', id },
    el('div', { className: 'meta' },
      el('span', { className: 'num', textContent: pad(i + 1) }),
      el('h2', { textContent: p.title }),
      p.description ? el('p', { textContent: p.description }) : null,
      el('div', { className: 'controls' },
        el('span', { className: 'count', textContent: `${n} ${n === 1 ? 'imagen' : 'imágenes'}` }),
        n > 1 ? prev : null,
        n > 1 ? next : null)),
    strip);
  return { section, id };
}

function render(data) {
  const s = data.settings || {};
  const values = { name: s.name, role: s.role, intro: s.intro, year: String(new Date().getFullYear()) };
  document.querySelectorAll('[data-bind]').forEach((node) => (node.textContent = values[node.dataset.bind] || ''));
  if (s.name) document.title = `${s.name} — Portafolio`;

  const mail = $('#mail');
  if (s.email) {
    mail.hidden = false;
    mail.href = `mailto:${s.email}`;
    mail.textContent = s.email;
  }
  $('#links').replaceChildren(
    ...(s.links || []).map((l) => el('li', {}, el('a', { href: l.url, textContent: l.label + ' ↗', target: '_blank', rel: 'noopener' })))
  );

  const list = $('#proyectos');
  const toc = $('#toc');
  const usedIds = new Set();
  list.replaceChildren();
  toc.replaceChildren();
  data.projects.forEach((p, i) => {
    const { section, id } = renderProject(p, i, usedIds);
    list.append(section);
    toc.append(el('li', {}, el('a', { href: `#${id}` }, el('span', { textContent: pad(i + 1) }), p.title)));
  });
  if (!data.projects.length) list.append(el('p', { className: 'state', textContent: 'Aún no hay proyectos publicados.' }));
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

// En la versión estática (GitHub Pages) los datos vienen de data.json.
fetch(window.PORTFOLIO_DATA_URL || '/api/projects')
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then(render)
  .catch(() => ($('#state').textContent = 'No se pudieron cargar los proyectos. Intenta recargar la página.'));
