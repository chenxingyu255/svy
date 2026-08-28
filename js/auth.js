/* ==========================================================
 * auth.js —— 用户认证：登录 / 注册 / 退出 / 权限判断
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U, Store = global.AppStore;

  function currentUser() { return Store.getSession(); }
  function isAdmin() { var u = currentUser(); return !!u && u.role === 'admin'; }

  function login(username, password) {
    var data = Store.load();
    var user = data.users.find(function (u) { return u.username === username.trim() && u.password === password; });
    if (!user) { throw new Error('用户名或密码错误'); }
    Store.setSession({ id: user.id, username: user.username, name: user.name, role: user.role });
    return user;
  }

  function register(username, password, name) {
    if (!username || !password || !name) { throw new Error('请填写完整信息'); }
    var data = Store.load();
    if (data.users.some(function (u) { return u.username === username.trim(); })) { throw new Error('用户名已存在'); }
    var user = { id: U.uid('u'), username: username.trim(), password: password, name: name.trim(), role: 'staff' };
    data.users.push(user);
    Store.save(data);
    Store.setSession({ id: user.id, username: user.username, name: user.name, role: user.role });
    return user;
  }

  function logout() { Store.setSession(null); }

  global.Auth = { currentUser: currentUser, isAdmin: isAdmin, login: login, register: register, logout: logout };
})(window);
