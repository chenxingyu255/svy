/* ==========================================================
 * cart.js —— 购物车：增删改查、数量调整、合计
 * ========================================================== */
(function (global) {
  'use strict';
  var U = global.U;
  var KEY = 'yuncanbao:cart';

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function set(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

  function add(dish, qty) {
    var items = get();
    var hit = items.find(function (it) { return it.dishId === dish.id; });
    if (hit) { hit.qty += (qty || 1); }
    else { items.push({ dishId: dish.id, name: dish.name, price: dish.price, qty: qty || 1, emoji: dish.emoji }); }
    set(items);
    return items;
  }

  function changeQty(dishId, delta) {
    var items = get();
    var hit = items.find(function (it) { return it.dishId === dishId; });
    if (!hit) { return items; }
    hit.qty += delta;
    if (hit.qty <= 0) { items = items.filter(function (it) { return it.dishId !== dishId; }); }
    set(items);
    return items;
  }

  function remove(dishId) {
    var items = get().filter(function (it) { return it.dishId !== dishId; });
    set(items);
    return items;
  }

  function clear() { set([]); }

  function count() { return get().reduce(function (s, it) { return s + it.qty; }, 0); }
  function total() { return get().reduce(function (s, it) { return s + it.price * it.qty; }, 0); }

  global.Cart = { get: get, add: add, changeQty: changeQty, remove: remove, clear: clear, count: count, total: total };
})(window);
