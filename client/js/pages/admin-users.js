'use strict';
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export default async function renderAdminUsers(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>User Management</h1>
      <div class="page-header__actions">
        <button class="btn btn--secondary" id="btn-import-csv">Import CSV</button>
        <button class="btn btn--primary" id="btn-add-user">Add User</button>
      </div>
    </div>
    <div class="card">
      <div id="users-table-container"><div class="spinner"></div></div>
    </div>
  `;

  container.querySelector('#btn-add-user').addEventListener('click', () => openAddUserModal(container));
  container.querySelector('#btn-import-csv').addEventListener('click', () => openCsvImportModal(container));

  await loadUsers(container);
}

async function loadUsers(container) {
  const el = container.querySelector('#users-table-container');
  try {
    const { users } = await api.get('/auth/users');
    if (!users || !users.length) {
      el.innerHTML = '<p class="text-muted p-4">No users found.</p>';
      return;
    }
    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th>
            <th>Status</th><th>Last Login</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${esc(u.full_name || '—')}</td>
              <td>${esc(u.email)}</td>
              <td><span class="badge badge--${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span></td>
              <td><span class="badge badge--${u.is_active !== false ? 'success' : 'warning'}">
                ${u.is_active !== false ? 'Active' : 'Inactive'}
              </span></td>
              <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td class="table-actions">
                <button class="btn btn--ghost btn--sm"
                  data-action="edit"
                  data-user='${JSON.stringify({ user_id: u.user_id, full_name: u.full_name || '', email: u.email, role: u.role })}'>
                  Edit
                </button>
                <button class="btn btn--ghost btn--sm btn--danger"
                  data-action="reset"
                  data-user-id="${u.user_id}">
                  Reset PW
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    el.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit') {
        const u = JSON.parse(btn.dataset.user);
        openEditUserModal(container, u);
      }
      if (btn.dataset.action === 'reset') {
        await doResetPassword(btn.dataset.userId);
      }
    });
  } catch (err) {
    el.innerHTML = `<p class="text-error p-4">${esc(err.message)}</p>`;
  }
}

function openAddUserModal(container) {
  openModal({
    title: 'Add User',
    content: `
      <form id="add-user-form" class="form-stack">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="full_name" class="input" placeholder="Jane Smith" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" class="input" placeholder="jane@hotel.com" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role" class="input">
            <option value="interviewer">Interviewer</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </form>
    `,
    actions: `
      <button class="btn btn--secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn--primary" id="modal-submit">Create User</button>
    `
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-submit').addEventListener('click', async () => {
    const form = document.getElementById('add-user-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form));
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      const res = await api.post('/auth/register', data);
      showToast(`User created. Temp password: ${res.temp_password}`, 'success', 8000);
      closeModal();
      await loadUsers(container);
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
      btn.disabled = false;
    }
  });
}

function openEditUserModal(container, user) {
  openModal({
    title: 'Edit User',
    content: `
      <form id="edit-user-form" class="form-stack">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="full_name" class="input" value="${esc(user.full_name)}" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role" class="input">
            <option value="interviewer" ${user.role === 'interviewer' ? 'selected' : ''}>Interviewer</option>
            <option value="admin"       ${user.role === 'admin'       ? 'selected' : ''}>Admin</option>
            <option value="viewer"      ${user.role === 'viewer'      ? 'selected' : ''}>Viewer</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="is_active" ${user.is_active !== false ? 'checked' : ''}>
            Account active
          </label>
        </div>
      </form>
    `,
    actions: `
      <button class="btn btn--secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn--primary" id="modal-submit">Save Changes</button>
    `
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-submit').addEventListener('click', async () => {
    const form = document.getElementById('edit-user-form');
    const fd = new FormData(form);
    const data = {
      full_name: fd.get('full_name'),
      role: fd.get('role'),
      is_active: fd.get('is_active') === 'on'
    };
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      await api.put(`/auth/users/${user.user_id}`, data);
      showToast('User updated', 'success');
      closeModal();
      await loadUsers(container);
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
      btn.disabled = false;
    }
  });
}

async function doResetPassword(userId) {
  if (!confirm('Reset password for this user? A new temporary password will be generated.')) return;
  try {
    const res = await api.put(`/auth/users/${userId}`, { password_reset: true });
    showToast(`New temp password: ${res.temp_password}`, 'success', 8000);
  } catch (err) {
    showToast(err.message || 'Failed to reset password', 'error');
  }
}

function openCsvImportModal(container) {
  openModal({
    title: 'Import Users from CSV',
    content: `
      <p class="text-muted mb-3">Upload a CSV file with columns: <code>full_name, email, role</code></p>
      <div class="form-group">
        <label>CSV File</label>
        <input type="file" id="csv-file-input" class="input" accept=".csv">
      </div>
      <div id="csv-preview" class="hidden mt-3">
        <p class="text-muted text-sm">Preview (first 5 rows):</p>
        <pre id="csv-preview-text" class="code-preview"></pre>
      </div>
    `,
    actions: `
      <button class="btn btn--secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn--primary" id="modal-submit">Import</button>
    `
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  document.getElementById('csv-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const preview = text.trim().split('\n').slice(0, 6).join('\n');
    document.getElementById('csv-preview-text').textContent = preview;
    document.getElementById('csv-preview').classList.remove('hidden');
  });

  document.getElementById('modal-submit').addEventListener('click', async () => {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput.files[0]) { showToast('Please select a CSV file', 'error'); return; }
    const csvContent = await fileInput.files[0].text();
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      const res = await api.post('/auth/bulk-import', { csv_content: csvContent });
      const errCount = res.errors?.length || 0;
      showToast(`Imported ${res.created} users.${errCount ? ` ${errCount} errors.` : ''}`, 'success', 6000);
      closeModal();
      await loadUsers(container);
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      btn.disabled = false;
    }
  });
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
