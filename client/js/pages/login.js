import { auth } from '../api.js';
import { setAuth } from '../auth.js';
import { toast } from '../components/toast.js';

export default function renderLogin(container) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
      <div class="card" style="width:100%;max-width:400px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:40px">🗺️</div>
          <h2 style="font-size:22px;font-weight:700;margin-top:8px">Journey Mapping Agent</h2>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Sign in to continue</p>
        </div>
        <div id="login-error" style="display:none;background:#FEE2E2;color:#991B1B;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:16px"></div>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" class="form-control" placeholder="you@company.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%" id="login-btn">Sign In</button>
        </form>
      </div>
    </div>`;

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#login-btn');
    const errEl = container.querySelector('#login-error');
    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errEl.style.display = 'none';
    try {
      const res = await auth.login(email, password);
      setAuth(res.token, res.user);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}
