export function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) { return null; }
}
export function getToken() { return localStorage.getItem('jwt_token'); }
export function isLoggedIn() { return !!getToken(); }
export function setAuth(token, user) {
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
}
