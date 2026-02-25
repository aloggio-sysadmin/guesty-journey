import { auth as authApi } from '../api.js';
import { toast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export default async function renderAdminUsers(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>User Management</h2>
      <div class="page-actions">
        <button class="btn btn-ghost" id="btn-import-csv">Import CSV</button>
        <button class="btn btn-primary" id="btn-add-user">+ Add User</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div id="users-table-container"><div class="loading-center"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  container.querySelector('#btn-add-user').addEventListener('click', () => openAddUserModal(container));
  container.querySelector('#btn-import-csv').addEventListener('click', () => openCsvImportModal(container));

  await loadUsers(container);
}

async function loadUsers(container) {
  const el = container.querySelector('#users-table-container');
  try {
    const users = await authApi.listUsers();
    if (!users || !users.length) {
      el.innerHTML = '<p style="color:var(--text-secondary);padding:16px">No users found.</p>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
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
              <td><span class="badge badge-blue">${u.role}</span></td>
              <td><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-amber'}">
                ${u.status || 'unknown'}
              </span></td>
              <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td>
                <button class="btn btn-sm btn-ghost"
                  data-action="edit"
                  data-user='${JSON.stringify({ user_id: u.user_id, full_name: u.full_name || '', email: u.email, role: u.role, status: u.status })}'>
                  Edit
                </button>
                <button class="btn btn-sm btn-ghost"
                  data-action="reset"
                  data-user-id="${u.user_id}">
                  Reset PW
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>`;

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
    el.innerHTML = `<p style="color:var(--error);padding:16px">${esc(err.message)}</p>`;
  }
}

function openAddUserModal(container) {
  const modal = showModal({
    title: 'Add User',
    body: `
      <form id="add-user-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="full_name" class="form-control" placeholder="Jane Smith" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" class="form-control" placeholder="jane@hotel.com" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role" class="form-control">
            <option value="interviewer">Interviewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="modal-submit">Create User</button>
        </div>
      </form>`,
    actions: []
  });

  document.getElementById('modal-cancel').addEventListener('click', modal.close);
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      const res = await authApi.register(data);
      toast(`User created. Temp password: ${res.temp_password}`, 'success', 8000);
      modal.close();
      await loadUsers(container);
    } catch (err) {
      toast(err.message || 'Failed to create user', 'error');
      btn.disabled = false;
    }
  });
}

function openEditUserModal(container, user) {
  const modal = showModal({
    title: 'Edit User',
    body: `
      <form id="edit-user-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="full_name" class="form-control" value="${esc(user.full_name)}" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role" class="form-control">
            <option value="interviewer" ${user.role === 'interviewer' ? 'selected' : ''}>Interviewer</option>
            <option value="admin"       ${user.role === 'admin'       ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-weight:normal">
            <input type="checkbox" name="is_active" ${user.status === 'active' ? 'checked' : ''}>
            Account active
          </label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="modal-submit">Save Changes</button>
        </div>
      </form>`,
    actions: []
  });

  document.getElementById('modal-cancel').addEventListener('click', modal.close);
  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      full_name: fd.get('full_name'),
      role: fd.get('role'),
      status: fd.get('is_active') === 'on' ? 'active' : 'inactive'
    };
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      await authApi.updateUser(user.user_id, data);
      toast('User updated', 'success');
      modal.close();
      await loadUsers(container);
    } catch (err) {
      toast(err.message || 'Failed to update user', 'error');
      btn.disabled = false;
    }
  });
}

async function doResetPassword(userId) {
  if (!confirm('Reset password for this user? A new temporary password will be generated.')) return;
  try {
    const res = await authApi.updateUser(userId, { password_reset: true });
    toast(`New temp password: ${res.temp_password}`, 'success', 8000);
  } catch (err) {
    toast(err.message || 'Failed to reset password', 'error');
  }
}

function openCsvImportModal(container) {
  const modal = showModal({
    title: 'Import Users from CSV',
    body: `
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">Upload a CSV with columns: <code>full_name, email, role</code></p>
      <div class="form-group">
        <label>CSV File</label>
        <input type="file" id="csv-file-input" class="form-control" accept=".csv">
      </div>
      <div id="csv-preview" style="display:none;margin-top:12px">
        <p style="font-size:12px;color:var(--text-secondary)">Preview (first 5 rows):</p>
        <pre id="csv-preview-text" style="background:var(--bg-secondary);padding:8px;border-radius:6px;font-size:11px;overflow-x:auto"></pre>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="modal-submit">Import</button>
      </div>`,
    actions: []
  });

  document.getElementById('modal-cancel').addEventListener('click', modal.close);

  document.getElementById('csv-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const preview = text.trim().split('\n').slice(0, 6).join('\n');
    document.getElementById('csv-preview-text').textContent = preview;
    document.getElementById('csv-preview').style.display = 'block';
  });

  document.getElementById('modal-submit').addEventListener('click', async () => {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput.files[0]) { toast('Please select a CSV file', 'error'); return; }
    const csvContent = await fileInput.files[0].text();
    const btn = document.getElementById('modal-submit');
    btn.disabled = true;
    try {
      const res = await authApi.bulkImport(csvContent);
      const errCount = res.errors?.length || 0;
      toast(`Imported ${res.imported} users.${errCount ? ` ${errCount} errors.` : ''}`, 'success', 6000);
      modal.close();
      await loadUsers(container);
    } catch (err) {
      toast(err.message || 'Import failed', 'error');
      btn.disabled = false;
    }
  });
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
