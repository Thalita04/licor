/**
 * DOSE CERTA LICORES ARTESANAIS — SCRIPT PÚBLICO PRINCIPAL
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadInstitutionalContent();
  initGallery();
  initContactForm();
  initSmoothScroll();
});

/* ==========================================================================
   NAVEGAÇÃO E CABEÇALHO
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  // Efeito de sombra ao rolar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  // Toggle do menu hambúrguer no mobile
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isActive = menuToggle.classList.toggle('is-active');
      navMenu.classList.toggle('is-active');
      menuToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    // Fecha o menu ao clicar em um link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('is-active');
        navMenu.classList.remove('is-active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ==========================================================================
   CARREGAMENTO DINÂMICO DE CONTEÚDO INSTITUCIONAL (API REST)
   ========================================================================== */
async function loadInstitutionalContent() {
  try {
    const response = await fetch('/api/content');
    if (!response.ok) return;

    const result = await response.json();
    if (!result.success || !result.data) return;

    const data = result.data;

    // Atualiza elementos que possuem o atributo data-content="key"
    document.querySelectorAll('[data-content]').forEach(el => {
      const key = el.getAttribute('data-content');
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = data[key];
        } else if (el.tagName === 'A' && key.includes('url')) {
          el.href = data[key];
        } else {
          el.textContent = data[key];
        }
      }
    });

    // Se houver links específicos de contato
    if (data.contact_instagram_url) {
      document.querySelectorAll('.js-instagram-link').forEach(a => {
        a.href = data.contact_instagram_url;
      });
    }
  } catch (err) {
    console.info('Usando dados estáticos embutidos para exibição.');
  }
}

/* ==========================================================================
   GALERIA INSTITUCIONAL & LIGHTBOX
   ========================================================================== */
async function initGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  if (!galleryGrid) return;

  let galleryItems = [];

  try {
    const res = await fetch('/api/gallery');
    const result = await res.json();
    if (result.success && result.data && result.data.length > 0) {
      galleryItems = result.data;
      renderGallery(galleryItems);
    }
  } catch (err) {
    console.warn('Falha ao carregar galeria via API, mantendo estático.', err);
  }

  function renderGallery(items) {
    galleryGrid.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'gallery-item';
      el.setAttribute('data-category', item.category || 'geral');
      el.innerHTML = `
        <img src="${item.image_url}" alt="${item.title}" loading="lazy">
        <div class="gallery-overlay">
          <span class="gallery-overlay-tag">${item.category || 'Artesanal'} • ${item.volume || 'Dose Certa'}</span>
          <h4 class="gallery-overlay-title">${item.title}</h4>
          ${item.description ? `<p style="color: #F7F1E5; font-size: 0.85rem; margin-top: 4px;">${item.description}</p>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        if (lightbox && lightboxImg && lightboxCaption) {
          lightboxImg.src = item.image_url;
          lightboxCaption.textContent = `${item.title} — ${item.description || 'Dose Certa Licores Artesanais'}`;
          lightbox.classList.add('is-active');
        }
      });

      galleryGrid.appendChild(el);
    });
  }

  // Filtros de Categoria
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-filter');
      if (cat === 'all') {
        renderGallery(galleryItems);
      } else {
        const filtered = galleryItems.filter(i => (i.category || '').toLowerCase() === cat.toLowerCase());
        renderGallery(filtered);
      }
    });
  });

  // Fechamento do Lightbox
  if (lightbox && lightboxClose) {
    lightboxClose.addEventListener('click', () => lightbox.classList.remove('is-active'));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.remove('is-active');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') lightbox.classList.remove('is-active');
    });
  }
}

/* ==========================================================================
   FORMULÁRIO DE CONTATO INSTITUCIONAL
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const alertBox = document.getElementById('contactAlert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Enviar';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando mensagem...';
    }

    if (alertBox) {
      alertBox.className = 'alert-feedback';
      alertBox.style.display = 'none';
    }

    const payload = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      subject: form.subject.value,
      message: form.message.value
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        if (alertBox) {
          alertBox.textContent = resData.message || 'Mensagem enviada com sucesso!';
          alertBox.className = 'alert-feedback success';
          alertBox.style.display = 'block';
        }
        form.reset();
      } else {
        throw new Error(resData.message || 'Ocorreu um erro ao enviar a mensagem.');
      }
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Erro ao conectar ao servidor.';
        alertBox.className = 'alert-feedback error';
        alertBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  });
}

/* ==========================================================================
   ROLAGEM SUAVE
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}
