/* ==========================================================
 * app.js —— 主控制：初始化、视图切换、购物车抽屉、设置、数据管理
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U, Store = global.AppStore, Auth = global.Auth;

  var VIEW_TITLES = {
    dashboard: '经营看板',
    menu: '菜单管理',
    tables: '桌台管理',
    orders: '订单管理',
    settings: '系统设置'
  };
  var currentView = 'dashboard';

  /* ---------- 登录流程 ---------- */
  function showLogin() {
    U.$('#app-view').classList.add('hidden');
    U.$('#login-view').classList.remove('hidden');
  }
  function showApp() {
    U.$('#login-view').classList.add('hidden');
    U.$('#app-view').classList.remove('hidden');
    var u = Auth.currentUser();
    U.$('#current-user').textContent = u ? u.name + '（' + u.username + '）' : '';
    U.$('#current-role').textContent = u && u.role === 'admin' ? '管理员' : '普通店员';
    U.$('#set-account-info').value = u ? (u.name + ' / ' + u.username) : '';
  }

  function initAuthUI() {
    U.$('#btn-login').addEventListener('click', doLogin);
    U.$('#login-password').addEventListener('keydown', function (e) { if (e.key === 'Enter') { doLogin(); } });
    U.$('#btn-goto-register').addEventListener('click', function () {
      U.$('#login-form').classList.add('hidden');
      U.$('#register-form').classList.remove('hidden');
    });
    U.$('#btn-goto-login').addEventListener('click', function () {
      U.$('#register-form').classList.add('hidden');
      U.$('#login-form').classList.remove('hidden');
    });
    U.$('#btn-register').addEventListener('click', function () {
      try {
        var u = U.$('#reg-username').value.trim();
        var n = U.$('#reg-name').value.trim();
        var p = U.$('#reg-password').value;
        var p2 = U.$('#reg-password2').value;
        if (p !== p2) { U.toast('两次输入的密码不一致', 'error'); return; }
        Auth.register(u, p, n);
        U.toast('注册成功，欢迎使用！', 'success');
        showApp();
        render();
      } catch (err) { U.toast(err.message, 'error'); }
    });
    U.$('#btn-logout').addEventListener('click', function () {
      Auth.logout();
      U.toast('已退出登录', 'info');
      showLogin();
    });
  }

  function doLogin() {
    try {
      var u = Auth.login(U.$('#login-username').value, U.$('#login-password').value);
      U.toast('欢迎回来，' + u.name, 'success');
      showApp();
      render();
    } catch (err) { U.toast(err.message, 'error'); }
  }

  /* ---------- 视图切换 ---------- */
  function switchView(view) {
    if (view === 'settings' && !Auth.isAdmin()) { U.toast('仅管理员可访问系统设置', 'error'); return; }
    currentView = view;
    U.$$('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-view') === view);
    });
    U.$$('.view').forEach(function (el) { el.classList.add('hidden'); });
    U.$('#view-' + view).classList.remove('hidden');
    U.$('#view-title').textContent = VIEW_TITLES[view] || view;
  }

  function bindNav() {
    U.$$('.nav-item').forEach(function (el) {
      el.addEventListener('click', function () { switchView(el.getAttribute('data-view')); });
    });
  }

  /* ---------- 购物车抽屉 ---------- */
  function renderCart() {
    var items = Cart.get();
    U.$('#cart-badge').textContent = Cart.count();
    var box = U.$('#cart-items');
    if (!items.length) {
      box.innerHTML = '<p class="cart-empty">购物车空空如也，去菜单加点菜吧～</p>';
    } else {
      box.innerHTML = items.map(function (it) {
        return '<div class="cart-item">' +
          '<span class="dish-emoji">' + U.esc(it.emoji || '🍽️') + '</span>' +
          '<div class="ci-info"><div class="ci-name">' + U.esc(it.name) + '</div>' +
          '<div class="ci-price">' + U.fmtMoney(it.price) + ' / 份</div></div>' +
          '<div class="qty-ctrl">' +
            '<button type="button" data-qty="-1" data-id="' + it.dishId + '">−</button>' +
            '<span>' + it.qty + '</span>' +
            '<button type="button" data-qty="1" data-id="' + it.dishId + '">＋</button>' +
          '</div>' +
          '<button type="button" class="icon-btn" data-remove="' + it.dishId + '">🗑️</button>' +
        '</div>';
      }).join('');
    }
    U.$('#cart-total').textContent = U.fmtMoney(Cart.total());

    // 桌台下拉
    var data = Store.load();
    var sel = U.$('#cart-table');
    var busyIds = data.orders.filter(function (o) { return o.status === 'pending' || o.status === 'preparing'; })
      .map(function (o) { return o.tableId; });
    sel.innerHTML = '<option value="">请选择桌台</option>' + data.tables.map(function (t) {
      var busy = busyIds.indexOf(t.id) > -1;
      return '<option value="' + t.id + '">' + U.esc(t.no) + '（' + (busy ? '就餐中' : '空闲') + '）</option>';
    }).join('');
  }

  function bindCart() {
    U.$('#btn-cart').addEventListener('click', function () {
      renderCart();
      U.$('#cart-drawer').classList.remove('hidden');
    });
    U.$('#btn-close-cart').addEventListener('click', function () {
      U.$('#cart-drawer').classList.add('hidden');
    });
    U.$('#cart-items').addEventListener('click', function (e) {
      var q = e.target.closest('button[data-qty]');
      var rm = e.target.closest('button[data-remove]');
      if (q) { Cart.changeQty(q.getAttribute('data-id'), parseInt(q.getAttribute('data-qty'), 10)); renderCart(); render(); }
      if (rm) { Cart.remove(rm.getAttribute('data-remove')); renderCart(); render(); }
    });
    U.$('#btn-submit-order').addEventListener('click', function () {
      try {
        var tableId = U.$('#cart-table').value;
        var remark = U.$('#cart-remark').value.trim();
        var order = Orders.createFromCart(tableId, remark);
        U.toast('下单成功：' + order.no + '，合计 ' + U.fmtMoney(order.total), 'success');
        U.$('#cart-drawer').classList.add('hidden');
        U.$('#cart-remark').value = '';
        switchView('orders');
        render();
      } catch (err) { U.toast(err.message, 'error'); }
    });
  }

  /* ---------- 系统设置 ---------- */
  function fillSettings(data) {
    U.$('#set-shop-name').value = data.shop.name;
    U.$('#set-shop-notice').value = data.shop.notice;
    U.$('#set-shop-open').value = String(data.shop.open);
  }

  function bindSettings() {
    U.$('#btn-save-shop').addEventListener('click', function () {
      var data = Store.load();
      data.shop.name = U.$('#set-shop-name').value.trim() || '云餐宝智能餐厅';
      data.shop.notice = U.$('#set-shop-notice').value.trim();
      data.shop.open = U.$('#set-shop-open').value === 'true';
      Store.save(data);
      U.toast('店铺信息已保存', 'success');
      render();
    });

    U.$('#btn-change-password').addEventListener('click', function () {
      var u = Auth.currentUser();
      var np = U.$('#set-new-password').value;
      if (!np) { U.toast('请输入新密码', 'error'); return; }
      if (np.length < 6) { U.toast('密码至少 6 位', 'error'); return; }
      var data = Store.load();
      var user = data.users.find(function (x) { return x.id === u.id; });
      user.password = np;
      Store.save(data);
      U.$('#set-new-password').value = '';
      U.toast('密码修改成功', 'success');
    });

    U.$('#btn-export-data').addEventListener('click', function () {
      var blob = new Blob([Store.exportData(Store.load())], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'yuncanbao-backup-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      U.toast('数据已导出', 'success');
    });

    U.$('#btn-import-data').addEventListener('click', function () { U.$('#import-file').click(); });
    U.$('#import-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) { return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importData(reader.result);
          U.toast('数据导入成功', 'success');
          render();
        } catch (err) { U.toast(err.message, 'error'); }
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    });

    U.$('#btn-reset-data').addEventListener('click', function () {
      U.modal({
        title: '恢复初始数据',
        body: '<p>将清空当前所有数据并恢复为系统内置的演示数据，该操作不可恢复，请先导出备份。</p>',
        buttons: [
          { label: '取消', cls: 'btn-ghost' },
          {
            label: '确认恢复', cls: 'btn-danger', onClick: function () {
              Store.reset();
              Cart.clear();
              U.toast('已恢复初始数据', 'success');
              render();
            }
          }
        ]
      });
    });
  }

  /* ---------- 顶部状态 ---------- */
  function renderShopStatus(data) {
    var pill = U.$('#shop-status-pill');
    pill.textContent = data.shop.open ? '营业中' : '休息中';
    pill.classList.toggle('closed', !data.shop.open);
  }

  /* ---------- 总渲染入口 ---------- */
  function render() {
    var data = Store.load();
    renderShopStatus(data);
    switchView(currentView);
    Dashboard.render(data);
    Menu.render(data);
    Tables.render(data);
    Orders.render(data);
    fillSettings(data);
    renderCart();
  }

  function init() {
    initAuthUI();
    bindNav();
    bindCart();
    Menu.bind();
    Tables.bind();
    Orders.bind();
    bindSettings();

    if (Auth.currentUser()) { showApp(); render(); }
    else { showLogin(); }
  }

  document.addEventListener('DOMContentLoaded', init);
  global.App = { render: render, switchView: switchView, currentView: function () { return currentView; } };
})(window);
