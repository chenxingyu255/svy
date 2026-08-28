/* ==========================================================
 * utils.js —— 通用工具函数（DOM 查询、格式化、弹窗、提示）
 * ========================================================== */
(function (global) {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* 生成唯一 id */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* 金额格式化 */
  function fmtMoney(n) { return '¥' + Number(n || 0).toFixed(2); }

  /* 时间格式化 */
  function pad(x) { return String(x).padStart(2, '0'); }
  function fmtTime(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }

  /* HTML 转义，防止 XSS */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 防抖 */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  }

  /* 轻提示 */
  function toast(msg, type) {
    var root = $('#toast-root');
    if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 350);
    }, 2200);
  }

  /* 通用弹窗：opts = { title, body(html字符串), buttons: [{label, cls, onClick}] } */
  function modal(opts) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal">' +
      '<div class="modal-head"><h3>' + esc(opts.title || '提示') + '</h3>' +
      '<button type="button" class="icon-btn" data-close>✕</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      '<div class="modal-foot"></div>' +
      '</div>';
    var foot = $('.modal-foot', mask);
    (opts.buttons || [{ label: '关闭', cls: 'btn-ghost' }]).forEach(function (btn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (btn.cls || 'btn-ghost');
      b.textContent = btn.label;
      b.addEventListener('click', function () {
        if (btn.onClick) { var keep = btn.onClick(mask); if (keep === false) return; }
        close();
      });
      foot.appendChild(b);
    });
    function close() { mask.remove(); }
    $('[data-close]', mask).addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    $('#modal-root').appendChild(mask);
    return { el: mask, close: close };
  }

  global.U = { $: $, $$: $$, uid: uid, fmtMoney: fmtMoney, fmtTime: fmtTime, todayStr: todayStr, isToday: isToday, esc: esc, debounce: debounce, toast: toast, modal: modal };
})(window);
