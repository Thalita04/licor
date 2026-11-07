/**
 * DOSE CERTA LICORES ARTESANAIS — SCRIPT DO PAINEL ADMINISTRATIVO
 */

let currentUser = null;
let authToken = localStorage.getItem('dose_certa_token') || null;

document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = window.location.pathname.endsWith('login.html');

  if (isLoginPage) {
    initLoginForm();
  } else {
    const authenticated = await verifyAuth();
    if (authenticated) {
      initDashboard();
    }
  }
});

/* ==========================================================================
   AUTENTICAÇÃO & PROTEÇÃO DE ROTAS
   ========================================================================== */
async function verifyAuth() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });

    if (!res.ok) {
      window.location.href = 'login.html';
      return false;
    }

    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      renderUserInfo(currentUser);
      return true;
    } else {
      window.location.href = 'login.html';
      return false;
    }
  } catch (err) {
    window.location.href = 'login.html';
    return false;
  }
}

function renderUserInfo(user) {
  const userNameEl = document.getElementById('adminUserName');
  const userRoleEl = document.getElementById('adminUserRole');
  if (userNameEl) userNameEl.textContent = user.name;
  if (userRoleEl) userRoleEl.textContent = `${user.email} (${user.role})`;
}

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const alertEl = document.getElementById('loginAlert');

  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Autenticando...';

    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.className = 'alert-feedback';
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email.value,
          password: loginForm.password.value
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem('dose_certa_token', data.token);
        }
        window.location.href = 'index.html';
      } else {
        throw new Error(data.message || 'Falha na autenticação.');
      }
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message;
        alertEl.className = 'alert-feedback error';
        alertEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

/* ==========================================================================
   PAINEL DASHBOARD
   ========================================================================== */
function initDashboard() {
  initTabs();
  initLogout();
  loadStats();
  loadContentEditor();
  loadGalleryManager();
  loadMessages();
  loadUsersManager();
}

function initTabs() {
  const navBtns = document.querySelectorAll('.nav-item-btn[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-content-panel');
  const pageTitle = document.getElementById('dashboardPageTitle');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');

      navBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(`tab-${tabId}`);
      if (targetPanel) targetPanel.classList.add('active');

      if (pageTitle) {
        pageTitle.textContent = btn.getAttribute('data-title') || 'Painel de Controle';
      }
    });
  });
}

function initLogout() {
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {}
      localStorage.removeItem('dose_certa_token');
      window.location.href = 'login.html';
    });
  }
}

// Carregar estatísticas do resumo
async function loadStats() {
  try {
    const [galRes, msgRes, usersRes] = await Promise.all([
      fetch('/api/gallery'),
      fetch('/api/contact', { headers: getAuthHeaders() }),
      fetch('/api/admin/users', { headers: getAuthHeaders() })
    ]);

    const galData = await galRes.json();
    const msgData = await msgRes.json();
    const userData = await usersRes.json();

    const statGallery = document.getElementById('statGalleryCount');
    const statMessages = document.getElementById('statMessagesCount');
    const statUnread = document.getElementById('statUnreadCount');
    const statUsers = document.getElementById('statUsersCount');

    if (statGallery && galData.data) statGallery.textContent = galData.data.length;
    if (statMessages && msgData.data) statMessages.textContent = msgData.data.length;
    if (statUnread && msgData.data) {
      const unreadCount = msgData.data.filter(m => !m.is_read).length;
      statUnread.textContent = unreadCount;
    }
    if (statUsers && userData.data) statUsers.textContent = userData.data.length;
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
  }
}

/* ==========================================================================
   GERENCIAMENTO DE CONTEÚDO INSTITUCIONAL
   ========================================================================== */
async function loadContentEditor() {
  const form = document.getElementById('contentEditorForm');
  if (!form) return;

  try {
    const res = await fetch('/api/content/admin', { headers: getAuthHeaders() });
    const result = await res.json();

    if (result.success && result.items) {
      result.items.forEach(item => {
        const input = form.elements[item.key];
        if (input) {
          input.value = item.value;
        }
      });
    }
  } catch (err) {
    showToast('Falha ao carregar textos do banco.', 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Salvando alterações...';

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    try {
      const res = await fetch('/api/content/admin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast('Conteúdos institucionais atualizados com sucesso!', 'success');
      } else {
        throw new Error(resData.message || 'Erro ao salvar alterações.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

/* ==========================================================================
   GERENCIAMENTO DA GALERIA
   ========================================================================== */
async function loadGalleryManager() {
  const tableBody = document.getElementById('galleryTableBody');
  const addForm = document.getElementById('addGalleryForm');
  if (!tableBody) return;

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/gallery');
      const result = await res.json();
      if (!result.success) return;

      tableBody.innerHTML = '';
      result.data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><img src="${item.image_url}" alt="${item.title}" class="table-img-thumb"></td>
          <td><strong>${item.title}</strong><br><small style="color:#607066">${item.description || ''}</small></td>
          <td><span class="badge-tag badge-category">${item.category || 'geral'}</span></td>
          <td>${item.volume || '375 ml'}</td>
          <td>${item.is_featured ? '<span class="badge-tag badge-featured">Destaque</span>' : 'Padrão'}</td>
          <td>
            <button class="btn-action btn-action-delete" onclick="deleteGalleryItem(${item.id})">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
      loadStats();
    } catch (err) {
      showToast('Erro ao carregar lista de imagens.', 'error');
    }
  }

  fetchAndRender();

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = addForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Enviando foto...';

      const formData = new FormData(addForm);

      try {
        const res = await fetch('/api/gallery', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast('Fotografia adicionada com sucesso!', 'success');
          addForm.reset();
          fetchAndRender();
        } else {
          throw new Error(resData.message || 'Erro ao adicionar imagem.');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  window.deleteGalleryItem = async (id) => {
    if (!confirm('Deseja realmente remover esta fotografia da galeria?')) return;

    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Foto excluída com sucesso!', 'success');
        fetchAndRender();
      } else {
        throw new Error(data.message || 'Erro ao excluir imagem.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

/* ==========================================================================
   GERENCIAMENTO DE MENSAGENS INSTITUCIONAIS
   ========================================================================== */
async function loadMessages() {
  const tableBody = document.getElementById('messagesTableBody');
  if (!tableBody) return;

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/contact', { headers: getAuthHeaders() });
      const result = await res.json();
      if (!result.success) return;

      tableBody.innerHTML = '';
      if (result.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: #888;">Nenhuma mensagem recebida até o momento.</td></tr>';
        return;
      }

      result.data.forEach(msg => {
        const tr = document.createElement('tr');
        if (!msg.is_read) {
          tr.style.backgroundColor = 'rgba(243, 230, 168, 0.25)';
          tr.style.fontWeight = '600';
        }
        const dateStr = new Date(msg.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        tr.innerHTML = `
          <td>${msg.is_read ? '<span style="color:#2E7D32">✓ Lida</span>' : '<strong style="color:#D98243">● Nova</strong>'}</td>
          <td>${msg.name}<br><small style="font-weight:normal;color:#666">${msg.email}</small></td>
          <td>${msg.phone || '-'}</td>
          <td>${msg.subject || 'Contato'}<br><small style="font-weight:normal;color:#555;">${msg.message}</small></td>
          <td>${dateStr}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-action ${msg.is_read ? 'btn-action-edit' : 'btn-action-edit'}" onclick="toggleMessageRead(${msg.id}, ${!msg.is_read})">
                ${msg.is_read ? 'Marcar Não Lida' : 'Marcar Lida'}
              </button>
              <button class="btn-action btn-action-delete" onclick="deleteMessage(${msg.id})">Excluir</button>
            </div>
          </td>
        `;
        tableBody.appendChild(tr);
      });
      loadStats();
    } catch (err) {
      showToast('Erro ao carregar mensagens institucionais.', 'error');
    }
  }

  fetchAndRender();

  window.toggleMessageRead = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/contact/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_read: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAndRender();
      }
    } catch (err) {
      showToast('Erro ao atualizar status da mensagem.', 'error');
    }
  };

  window.deleteMessage = async (id) => {
    if (!confirm('Excluir esta mensagem de contato?')) return;
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Mensagem excluída com sucesso!', 'success');
        fetchAndRender();
      }
    } catch (err) {
      showToast('Erro ao excluir mensagem.', 'error');
    }
  };
}

/* ==========================================================================
   GERENCIAMENTO DE USUÁRIOS ADMINISTRADORES
   ========================================================================== */
async function loadUsersManager() {
  const tableBody = document.getElementById('usersTableBody');
  const addForm = document.getElementById('addUserForm');
  if (!tableBody) return;

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      const result = await res.json();
      if (!result.success) return;

      tableBody.innerHTML = '';
      result.data.forEach(u => {
        const tr = document.createElement('tr');
        const isCurrent = currentUser && currentUser.id === u.id;
        tr.innerHTML = `
          <td><strong>${u.name}</strong> ${isCurrent ? '<span class="badge-tag badge-category">Você</span>' : ''}</td>
          <td>${u.email}</td>
          <td><span class="badge-tag badge-featured">${u.role}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
          <td>
            ${isCurrent ? '<small style="color:#777">Sessão ativa</small>' : `<button class="btn-action btn-action-delete" onclick="deleteAdminUser(${u.id})">Remover</button>`}
          </td>
        `;
        tableBody.appendChild(tr);
      });
      loadStats();
    } catch (err) {
      showToast('Erro ao carregar administradores.', 'error');
    }
  }

  fetchAndRender();

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = addForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Cadastrando...';

      const payload = {
        name: addForm.name.value,
        email: addForm.email.value,
        password: addForm.password.value,
        role: addForm.role ? addForm.role.value : 'admin'
      };

      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Novo administrador cadastrado!', 'success');
          addForm.reset();
          fetchAndRender();
        } else {
          throw new Error(data.message || 'Erro ao cadastrar usuário.');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  window.deleteAdminUser = async (id) => {
    if (!confirm('Deseja realmente revogar o acesso deste administrador?')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Administrador removido.', 'success');
        fetchAndRender();
      } else {
        throw new Error(data.message || 'Erro ao remover usuário.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

/* ==========================================================================
   UTILITÁRIOS & TOAST
   ========================================================================== */
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
