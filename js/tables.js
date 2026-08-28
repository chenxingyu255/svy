/* ==========================================================
 * tables.js —— 桌台管理：桌台增删、状态流转、一键清空
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U, Store = global.AppStore, Auth = global.Auth;

  var STATUS = {
    free: { label: '空闲', cls: 't-free' },
    busy: { label: '就餐中', cls: 't-busy' },
    pay:  { label: '待结账', cls: 't-pay' }
  };

  function render(data) {
    var grid = U.$('#table-grid');
    grid.innerHTML = data.tables.map(function (t) {
      var st = STATUS[t.status] || STATUS.free;
      var activeOrders = data.orders.filter(function (o) {
        return o.tableId === t.id && (o.status === 'pending' || o.status === 'preparing');
      });
      var info = activeOrders.length ? activeOrders.length + ' 个进行中订单' : '暂无订单';
      return '<div class="table-card ' + st.cls + '" data-id="' + t.id + '" title="点击查看/切换状态">' +
        '<div class="t-no">' + U.esc(t.no) + '</div>' +
        '<div class="t-info">' + t.seats + ' 人桌 · ' + info + '</div>' +
        '<div class="t-status">' + st.label + '</div>' +
        '</div>';
    }).join('');
  }

  function addTableModal() {
    var body =
      '<div class="field"><label>桌号</label><input id="t-no" class="input" placeholder="例如 C01"></div>' +
      '<div class="field"><label>座位数</label><input id="t-seats" class="input" type="number" min="1" value="4"></div>';
    U.modal({
      title: '新增桌台',
      body: body,
      buttons: [
        { label: '取消', cls: 'btn-ghost' },
        {
          label: '保存', cls: 'btn-primary', onClick: function () {
            var no = U.$('#t-no').value.trim();
            var seats = parseInt(U.$('#t-seats').value, 10);
            if (!no) { U.toast('请填写桌号', 'error'); return false; }
            if (isNaN(seats) || seats < 1) { U.toast('请填写正确的座位数', 'error'); return false; }
            var data = Store.load();
            if (data.tables.some(function (t) { return t.no === no; })) { U.toast('桌号已存在', 'error'); return false; }
            data.tables.push({ id: U.uid('t'), no: no, seats: seats, status: 'free' });
            Store.save(data);
            U.toast('桌台已新增', 'success');
            global.App && App.render();
          }
        }
      ]
    });
  }

  function bind() {
    U.$('#btn-add-table').addEventListener('click', function () {
      if (!Auth.isAdmin()) { U.toast('仅管理员可新增桌台', 'error'); return; }
      addTableModal();
    });

    U.$('#btn-reset-tables').addEventListener('click', function () {
      U.modal({
        title: '一键清空桌台',
        body: '<p>将所有桌台状态重置为「空闲」，已完成/已取消的订单将保留，进行中的订单不受影响。</p>',
        buttons: [
          { label: '取消', cls: 'btn-ghost' },
          {
            label: '确认清空', cls: 'btn-danger', onClick: function () {
              var data = Store.load();
              data.tables.forEach(function (t) {
                var hasActive = data.orders.some(function (o) {
                  return o.tableId === t.id && (o.status === 'pending' || o.status === 'preparing');
                });
                if (!hasActive) { t.status = 'free'; }
              });
              Store.save(data);
              U.toast('桌台状态已重置', 'success');
              global.App && App.render();
            }
          }
        ]
      });
    });

    U.$('#table-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.table-card');
      if (!card) { return; }
      var id = card.getAttribute('data-id');
      var data = Store.load();
      var table = data.tables.find(function (t) { return t.id === id; });
      if (!table) { return; }
      var orderHtml = data.orders.filter(function (o) { return o.tableId === id; }).slice(0, 5).map(function (o) {
        var st = (global.Orders && global.Orders.STATUS[o.status]) || { label: o.status };
        return '<div>· ' + U.esc(o.no) + '　<span class="tag ' + st.tag + '">' + st.label + '</span>　' + U.fmtMoney(o.total) + '</div>';
      }).join('') || '<p class="muted">暂无历史订单</p>';
      var body =
        '<p>桌台 <b>' + U.esc(table.no) + '</b>（' + table.seats + ' 人桌），当前状态：' + (STATUS[table.status] || {}).label + '</p>' +
        '<div style="margin:10px 0"><b>最近订单</b></div>' + orderHtml;
      U.modal({
        title: '桌台 ' + U.esc(table.no),
        body: body,
        buttons: [
          { label: '标记空闲', cls: 'btn-ghost', onClick: function () { table.status = 'free'; Store.save(data); U.toast('桌台已标记为空闲', 'success'); global.App && App.render(); } },
          { label: '标记待结账', cls: 'btn-ghost', onClick: function () { table.status = 'pay'; Store.save(data); U.toast('桌台已标记为待结账', 'success'); global.App && App.render(); } },
          { label: '关闭', cls: 'btn-primary' }
        ]
      });
    });
  }

  global.Tables = { render: render, bind: bind, STATUS: STATUS };
})(window);
