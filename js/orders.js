/* ==========================================================
 * orders.js —— 订单管理：下单、状态流转、筛选、导出
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U, Store = global.AppStore, Cart = global.Cart;

  var ORDER_STATUS = {
    pending:   { label: '待支付', tag: 'tag-pending' },
    preparing: { label: '制作中', tag: 'tag-preparing' },
    done:      { label: '已完成', tag: 'tag-done' },
    cancelled: { label: '已取消', tag: 'tag-cancelled' }
  };
  var filter = 'all';
  var orderSeq = 1000;

  function nextNo(data) {
    var prefix = '2026' + (data.orders.length + orderSeq);
    // 订单号：日期 + 序号
    var d = new Date();
    var pad = function (x) { return String(x).padStart(2, '0'); };
    var base = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var max = 0;
    data.orders.forEach(function (o) {
      if (o.no.indexOf(base) === 0) {
        var n = parseInt(o.no.slice(base.length), 10) || 0;
        if (n > max) { max = n; }
      }
    });
    return base + String(max + 1).padStart(4, '0');
  }

  /* 从购物车生成订单 */
  function createFromCart(tableId, remark) {
    var items = Cart.get();
    if (!items.length) { throw new Error('购物车为空，请先点餐'); }
    if (!tableId) { throw new Error('请选择桌台'); }
    var data = Store.load();
    var table = data.tables.find(function (t) { return t.id === tableId; });
    if (!table) { throw new Error('桌台不存在'); }
    var total = items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var order = {
      id: U.uid('o'), no: nextNo(data), tableId: tableId, remark: remark || '',
      items: items.map(function (it) { return { dishId: it.dishId, name: it.name, price: it.price, qty: it.qty }; }),
      total: total, status: 'pending', createdAt: Date.now(), payAt: null
    };
    data.orders.unshift(order);
    table.status = 'busy';
    Store.save(data);
    Cart.clear();
    return order;
  }

  /* 订单状态流转 */
  function setStatus(orderId, status) {
    var data = Store.load();
    var order = data.orders.find(function (o) { return o.id === orderId; });
    if (!order) { throw new Error('订单不存在'); }
    order.status = status;
    if (status === 'preparing') { order.payAt = Date.now(); }
    if (status === 'done') {
      // 累计销量、扣减库存
      order.items.forEach(function (it) {
        var dish = data.dishes.find(function (d) { return d.id === it.dishId; });
        if (dish) { dish.sales = (dish.sales || 0) + it.qty; dish.stock = Math.max(0, dish.stock - it.qty); }
      });
      var table = data.tables.find(function (t) { return t.id === order.tableId; });
      if (table) { table.status = 'free'; }
    }
    if (status === 'cancelled') {
      var t2 = data.tables.find(function (t) { return t.id === order.tableId; });
      if (t2 && !data.orders.some(function (o) { return o.id !== orderId && o.tableId === t2.id && o.status !== 'done' && o.status !== 'cancelled'; })) {
        t2.status = 'free';
      }
    }
    Store.save(data);
  }

  function render(data) {
    var list = data.orders.filter(function (o) { return filter === 'all' || o.status === filter; });
    var box = U.$('#order-list');
    if (!list.length) {
      box.innerHTML = '<p class="empty">暂无订单</p>';
      return;
    }
    box.innerHTML = list.map(function (o) {
      var st = ORDER_STATUS[o.status] || { label: o.status, tag: 'tag-off' };
      var table = data.tables.find(function (t) { return t.id === o.tableId; });
      var itemsHtml = o.items.map(function (it) {
        return '<div>· ' + U.esc(it.name) + ' × ' + it.qty + '　' + U.fmtMoney(it.price * it.qty) + '</div>';
      }).join('');
      var actions = '';
      if (o.status === 'pending') {
        actions += '<button type="button" class="btn btn-primary btn-sm" data-act="pay" data-id="' + o.id + '">确认支付</button>';
        actions += '<button type="button" class="btn btn-ghost btn-sm" data-act="cancel" data-id="' + o.id + '">取消订单</button>';
      } else if (o.status === 'preparing') {
        actions += '<button type="button" class="btn btn-primary btn-sm" data-act="done" data-id="' + o.id + '">完成订单</button>';
      }
      return '<div class="order-card">' +
        '<div class="order-head">' +
          '<div><span class="order-no">' + U.esc(o.no) + '</span>' +
          '<span class="tag ' + st.tag + '" style="margin-left:8px">' + st.label + '</span></div>' +
          '<span class="order-time">' + U.fmtTime(o.createdAt) + (o.payAt ? ' · 支付 ' + U.fmtTime(o.payAt) : '') + '</span>' +
        '</div>' +
        '<div class="order-items">' +
          '<div>桌台：' + U.esc(table ? table.no : '—') + (o.remark ? '　备注：' + U.esc(o.remark) : '') + '</div>' +
          itemsHtml +
        '</div>' +
        '<div class="order-head"><span class="order-total">合计 ' + U.fmtMoney(o.total) + '</span>' +
        '<span class="order-actions">' + actions + '</span></div>' +
      '</div>';
    }).join('');
  }

  function bind() {
    U.$('#order-status-filter').addEventListener('change', function (e) {
      filter = e.target.value;
      global.App && App.render();
    });

    U.$('#order-list').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) { return; }
      var act = btn.getAttribute('data-act');
      var id = btn.getAttribute('data-id');
      if (act === 'pay') { setStatus(id, 'preparing'); U.toast('订单已支付，后厨开始制作', 'success'); }
      else if (act === 'done') { setStatus(id, 'done'); U.toast('订单已完成', 'success'); }
      else if (act === 'cancel') { setStatus(id, 'cancelled'); U.toast('订单已取消', 'info'); }
      global.App && App.render();
    });

    U.$('#btn-export-orders').addEventListener('click', function () {
      var data = Store.load();
      var blob = new Blob([JSON.stringify(data.orders, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'orders-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      U.toast('订单数据已导出', 'success');
    });
  }

  global.Orders = { render: render, bind: bind, createFromCart: createFromCart, setStatus: setStatus, STATUS: ORDER_STATUS };
})(window);
