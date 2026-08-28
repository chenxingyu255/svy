/* ==========================================================
 * menu.js —— 菜单管理：菜品增删改查、上下架、搜索筛选
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U, Store = global.AppStore, Cart = global.Cart, Auth = global.Auth;

  var searchText = '', categoryFilter = 'all';

  function catName(data, id) {
    var c = data.categories.find(function (x) { return x.id === id; });
    return c ? c.name : '未分类';
  }

  function renderFilter(data) {
    var sel = U.$('#menu-category-filter');
    var html = '<option value="all">全部分类</option>';
    data.categories.forEach(function (c) {
      html += '<option value="' + U.esc(c.id) + '"' + (categoryFilter === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
    });
    sel.innerHTML = html;
  }

  function render(data) {
    renderFilter(data);
    var tbody = U.$('#menu-tbody');
    var list = data.dishes.filter(function (d) {
      var okSearch = !searchText || d.name.toLowerCase().indexOf(searchText.toLowerCase()) > -1;
      var okCat = categoryFilter === 'all' || d.categoryId === categoryFilter;
      return okSearch && okCat;
    });
    if (!list.length) {
      U.$('#menu-empty').classList.remove('hidden');
      tbody.innerHTML = '';
      return;
    }
    U.$('#menu-empty').classList.add('hidden');
    tbody.innerHTML = list.map(function (d) {
      var cat = data.categories.find(function (c) { return c.id === d.categoryId; });
      return '<tr>' +
        '<td><div class="dish-cell"><span class="dish-emoji">' + U.esc(d.emoji || '🍽️') + '</span>' +
        '<div><div class="dish-name">' + U.esc(d.name) + '</div>' +
        '<div class="dish-desc">' + U.esc(d.desc || '') + '</div></div></div></td>' +
        '<td>' + U.esc(cat ? cat.name : '未分类') + '</td>' +
        '<td>' + U.fmtMoney(d.price) + '</td>' +
        '<td>' + d.stock + '</td>' +
        '<td>' + d.sales + '</td>' +
        '<td><span class="tag ' + (d.status === 'on' ? 'tag-on' : 'tag-off') + '">' + (d.status === 'on' ? '在售' : '已下架') + '</span></td>' +
        '<td>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="add-cart" data-id="' + d.id + '">加入购物车</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="edit" data-id="' + d.id + '">编辑</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="toggle" data-id="' + d.id + '">' + (d.status === 'on' ? '下架' : '上架') + '</button> ' +
          (Auth.isAdmin() ? '<button type="button" class="btn btn-danger btn-sm" data-act="del" data-id="' + d.id + '">删除</button>' : '') +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function dishFormModal(data, dish) {
    var isEdit = !!dish;
    var catOpts = data.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (dish && dish.categoryId === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
    }).join('');
    var body =
      '<div class="field"><label>菜品名称</label><input id="m-name" class="input" value="' + (dish ? U.esc(dish.name) : '') + '"></div>' +
      '<div class="field"><label>表情图标</label><input id="m-emoji" class="input" value="' + (dish ? U.esc(dish.emoji || '') : '') + '" placeholder="例如 🍖"></div>' +
      '<div class="field"><label>分类</label><select id="m-cat" class="input">' + catOpts + '</select></div>' +
      '<div class="field"><label>价格（元）</label><input id="m-price" class="input" type="number" min="0" step="0.01" value="' + (dish ? dish.price : '') + '"></div>' +
      '<div class="field"><label>库存</label><input id="m-stock" class="input" type="number" min="0" step="1" value="' + (dish ? dish.stock : 10) + '"></div>' +
      '<div class="field"><label>描述</label><textarea id="m-desc" class="input" rows="2">' + (dish ? U.esc(dish.desc || '') : '') + '</textarea></div>';
    U.modal({
      title: isEdit ? '编辑菜品' : '新增菜品',
      body: body,
      buttons: [
        { label: '取消', cls: 'btn-ghost' },
        {
          label: '保存', cls: 'btn-primary', onClick: function () {
            var name = U.$('#m-name').value.trim();
            var price = parseFloat(U.$('#m-price').value);
            var stock = parseInt(U.$('#m-stock').value, 10);
            if (!name) { U.toast('请填写菜品名称', 'error'); return false; }
            if (isNaN(price) || price < 0) { U.toast('请填写正确的价格', 'error'); return false; }
            if (isNaN(stock) || stock < 0) { U.toast('请填写正确的库存', 'error'); return false; }
            var d = Store.load();
            var cat = U.$('#m-cat').value;
            if (isEdit) {
              var target = d.dishes.find(function (x) { return x.id === dish.id; });
              target.name = name; target.emoji = U.$('#m-emoji').value.trim(); target.categoryId = cat;
              target.price = price; target.stock = stock; target.desc = U.$('#m-desc').value.trim();
              U.toast('菜品已更新', 'success');
            } else {
              d.dishes.push({
                id: U.uid('d'), name: name, emoji: U.$('#m-emoji').value.trim(), categoryId: cat,
                price: price, stock: stock, sales: 0, status: 'on', desc: U.$('#m-desc').value.trim()
              });
              U.toast('菜品已新增', 'success');
            }
            Store.save(d);
            global.App && App.render();
            return true;
          }
        }
      ]
    });
  }

  function bind() {
    U.$('#btn-add-dish').addEventListener('click', function () {
      if (!Auth.isAdmin()) { U.toast('仅管理员可新增菜品', 'error'); return; }
      dishFormModal(Store.load(), null);
    });

    U.$('#menu-search').addEventListener('input', U.debounce(function (e) {
      searchText = e.target.value.trim();
      global.App && App.render();
    }, 200));

    U.$('#menu-category-filter').addEventListener('change', function (e) {
      categoryFilter = e.target.value;
      global.App && App.render();
    });

    U.$('#menu-tbody').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) { return; }
      var act = btn.getAttribute('data-act');
      var id = btn.getAttribute('data-id');
      var data = Store.load();
      var dish = data.dishes.find(function (x) { return x.id === id; });
      if (!dish) { return; }
      if (act === 'add-cart') {
        if (dish.status !== 'on') { U.toast('该菜品已下架', 'error'); return; }
        if (dish.stock <= 0) { U.toast('该菜品库存不足', 'error'); return; }
        Cart.add(dish, 1);
        U.toast('已加入购物车：' + dish.name, 'success');
        global.App && App.render();
      } else if (act === 'edit') {
        if (!Auth.isAdmin()) { U.toast('仅管理员可编辑菜品', 'error'); return; }
        dishFormModal(data, dish);
      } else if (act === 'toggle') {
        if (!Auth.isAdmin()) { U.toast('仅管理员可上下架菜品', 'error'); return; }
        dish.status = dish.status === 'on' ? 'off' : 'on';
        Store.save(data);
        U.toast(dish.status === 'on' ? '菜品已上架' : '菜品已下架', 'success');
        global.App && App.render();
      } else if (act === 'del') {
        U.modal({
          title: '删除菜品',
          body: '<p>确定要删除「' + U.esc(dish.name) + '」吗？该操作不可恢复。</p>',
          buttons: [
            { label: '取消', cls: 'btn-ghost' },
            {
              label: '删除', cls: 'btn-danger', onClick: function () {
                data.dishes = data.dishes.filter(function (x) { return x.id !== id; });
                Store.save(data);
                U.toast('菜品已删除', 'success');
                global.App && App.render();
              }
            }
          ]
        });
      }
    });
  }

  global.Menu = { render: render, bind: bind, catName: catName };
})(window);
