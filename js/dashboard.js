/* ==========================================================
 * dashboard.js —— 经营看板：核心指标 + SVG 图表（手写，无第三方库）
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U;

  var PALETTE = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  function renderStats(data) {
    var today = U.todayStr();
    var todayOrders = data.orders.filter(function (o) { return o.status !== 'cancelled' && U.isToday(o.createdAt); });
    var todayRevenue = todayOrders.filter(function (o) { return o.status === 'done' || o.status === 'preparing'; })
      .reduce(function (s, o) { return s + o.total; }, 0);
    var totalSales = data.dishes.reduce(function (s, d) { return s + (d.sales || 0); }, 0);
    var active = data.orders.filter(function (o) { return o.status === 'pending' || o.status === 'preparing'; }).length;
    var cards = [
      { label: '今日营业额', value: U.fmtMoney(todayRevenue), sub: '已完成 + 制作中订单', color: '#f59e0b' },
      { label: '今日订单数', value: todayOrders.length, sub: '不含已取消订单', color: '#3b82f6' },
      { label: '进行中订单', value: active, sub: '待支付 + 制作中', color: '#ef4444' },
      { label: '累计菜品销量', value: totalSales, sub: '全部菜品历史销量', color: '#10b981' }
    ];
    U.$('#stat-cards').innerHTML = cards.map(function (c) {
      return '<div class="stat-card"><div class="stat-label">' + c.label + '</div>' +
        '<div class="stat-value" style="color:' + c.color + '">' + c.value + '</div>' +
        '<div class="stat-sub">' + c.sub + '</div></div>';
    }).join('');
  }

  /* 柱状图：热销菜品 TOP5 */
  function renderTop(data) {
    var top = data.dishes.slice().sort(function (a, b) { return (b.sales || 0) - (a.sales || 0); }).slice(0, 5);
    var box = U.$('#chart-top');
    if (!top.length) { box.innerHTML = '<p class="empty">暂无数据</p>'; return; }
    var max = Math.max.apply(null, top.map(function (d) { return d.sales; })) || 1;
    var barW = 520 / 5;
    var bars = top.map(function (d, i) {
      var h = Math.max(8, Math.round((d.sales / max) * 180));
      var y = 200 - h;
      var x = 30 + i * barW + (barW - 34) / 2;
      return '<rect x="' + x + '" y="' + y + '" width="34" height="' + h + '" rx="4" fill="' + PALETTE[i % PALETTE.length] + '">' +
        '<title>' + U.esc(d.name) + '：' + d.sales + ' 份</title></rect>' +
        '<text x="' + (x + 17) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="11" fill="#6b7280">' + d.sales + '</text>' +
        '<text x="' + (x + 17) + '" y="222" text-anchor="middle" font-size="11" fill="#4b5563">' + U.esc(d.name.length > 4 ? d.name.slice(0, 4) + '…' : d.name) + '</text>';
    }).join('');
    box.innerHTML = '<svg viewBox="0 0 560 240" width="100%" style="max-width:560px">' +
      '<line x1="30" y1="200" x2="540" y2="200" stroke="#e5e7eb"/>' + bars + '</svg>';
  }

  /* 环形图：分类销量占比 */
  function renderCategory(data) {
    var box = U.$('#chart-category');
    var catSales = data.categories.map(function (c) {
      return { name: c.name, total: data.dishes.filter(function (d) { return d.categoryId === c.id; }).reduce(function (s, d) { return s + (d.sales || 0); }, 0) };
    }).filter(function (c) { return c.total > 0; });
    var sum = catSales.reduce(function (s, c) { return s + c.total; }, 0);
    if (!sum) { box.innerHTML = '<p class="empty">暂无数据</p>'; return; }
    var R = 70, cx = 90, cy = 100, r2 = 55;
    var start = -Math.PI / 2;
    var segs = '', legends = '';
    catSales.forEach(function (c, i) {
      var angle = (c.total / sum) * Math.PI * 2;
      var end = start + angle;
      var large = angle > Math.PI ? 1 : 0;
      var x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      var x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
      var ix1 = cx + r2 * Math.cos(end), iy1 = cy + r2 * Math.sin(end);
      var ix2 = cx + r2 * Math.cos(start), iy2 = cy + r2 * Math.sin(start);
      var color = PALETTE[i % PALETTE.length];
      segs += '<path d="M ' + x1 + ' ' + y1 + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 +
        ' L ' + ix1 + ' ' + iy1 + ' A ' + r2 + ' ' + r2 + ' 0 ' + large + ' 0 ' + ix2 + ' ' + iy2 + ' Z" fill="' + color + '">' +
        '<title>' + U.esc(c.name) + '：' + c.total + ' 份（' + Math.round(c.total / sum * 100) + '%）</title></path>';
      legends += '<span><i class="legend-dot" style="background:' + color + '"></i>' + U.esc(c.name) + ' ' + Math.round(c.total / sum * 100) + '%</span>';
      start = end;
    });
    box.innerHTML =
      '<svg viewBox="0 0 180 200" width="180" height="200" style="display:block;margin:0 auto">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none"/>' + segs +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#1f2937">' + sum + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" fill="#6b7280">累计销量</text>' +
      '</svg>' +
      '<div class="chart-legend" style="justify-content:center">' + legends + '</div>';
  }

  function renderRecent(data) {
    var box = U.$('#recent-orders');
    var recent = data.orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 6);
    if (!recent.length) { box.innerHTML = '<p class="empty">暂无订单</p>'; return; }
    box.innerHTML = recent.map(function (o) {
      var st = (global.Orders && global.Orders.STATUS[o.status]) || { label: o.status, tag: 'tag-off' };
      var table = data.tables.find(function (t) { return t.id === o.tableId; });
      return '<div class="order-card">' +
        '<div class="order-head"><span class="order-no">' + U.esc(o.no) + '</span>' +
        '<span class="tag ' + st.tag + '">' + st.label + '</span></div>' +
        '<div class="order-items">桌台 ' + U.esc(table ? table.no : '—') + ' · ' + o.items.reduce(function (s, it) { return s + it.qty; }, 0) + ' 件菜品</div>' +
        '<div class="order-total">' + U.fmtMoney(o.total) + '　<span class="order-time">' + U.fmtTime(o.createdAt) + '</span></div>' +
      '</div>';
    }).join('');
  }

  function render(data) {
    renderStats(data);
    renderTop(data);
    renderCategory(data);
    renderRecent(data);
  }

  global.Dashboard = { render: render };
})(window);
