/* ==========================================================
 * store.js —— 数据层：本地存储（localStorage）+ 初始种子数据
 * ========================================================== */
(function (global) {
  'use strict';

  var KEY = 'yuncanbao:v1';
  var SESSION_KEY = 'yuncanbao:session';

  /* 初始种子数据：便于开箱演示 */
  var seed = {
    shop: {
      name: '云餐宝智能餐厅',
      notice: '本店菜品每日新鲜现做，欢迎品尝！支持堂食点餐，扫码即点。',
      open: true
    },
    users: [
      { id: 'u1', username: 'admin', password: 'admin123', name: '店长', role: 'admin' },
      { id: 'u2', username: 'staff', password: 'staff123', name: '收银员', role: 'staff' }
    ],
    categories: [
      { id: 'c1', name: '招牌热菜' },
      { id: 'c2', name: '主食' },
      { id: 'c3', name: '饮品' },
      { id: 'c4', name: '小吃' }
    ],
    dishes: [
      { id: 'd1', name: '招牌红烧肉', categoryId: 'c1', price: 48, stock: 20, sales: 132, status: 'on', desc: '肥而不腻，入口即化', emoji: '🍖' },
      { id: 'd2', name: '酸菜鱼', categoryId: 'c1', price: 68, stock: 15, sales: 98, status: 'on', desc: '酸辣开胃，鱼片鲜嫩', emoji: '🐟' },
      { id: 'd3', name: '宫保鸡丁', categoryId: 'c1', price: 32, stock: 30, sales: 76, status: 'on', desc: '经典川味，微辣下饭', emoji: '🍗' },
      { id: 'd4', name: '蒜蓉西兰花', categoryId: 'c1', price: 22, stock: 25, sales: 45, status: 'on', desc: '清爽解腻，低脂健康', emoji: '🥦' },
      { id: 'd5', name: '扬州炒饭', categoryId: 'c2', price: 18, stock: 40, sales: 210, status: 'on', desc: '粒粒分明，配料丰富', emoji: '🍚' },
      { id: 'd6', name: '手工牛肉面', categoryId: 'c2', price: 26, stock: 35, sales: 168, status: 'on', desc: '牛骨高汤，面劲汤浓', emoji: '🍜' },
      { id: 'd7', name: '冰镇酸梅汤', categoryId: 'c3', price: 8, stock: 60, sales: 320, status: 'on', desc: '古法熬制，生津止渴', emoji: '🧋' },
      { id: 'd8', name: '鲜榨橙汁', categoryId: 'c3', price: 15, stock: 30, sales: 120, status: 'on', desc: '现榨鲜橙，无添加', emoji: '🍊' },
      { id: 'd9', name: '黄金炸鸡翅', categoryId: 'c4', price: 28, stock: 20, sales: 88, status: 'on', desc: '外酥里嫩，回味无穷', emoji: '🍗' },
      { id: 'd10', name: '红糖糍粑', categoryId: 'c4', price: 16, stock: 25, sales: 66, status: 'on', desc: '软糯香甜，川味小吃', emoji: '🍡' }
    ],
    tables: [
      { id: 't1', no: 'A01', seats: 2, status: 'free' },
      { id: 't2', no: 'A02', seats: 4, status: 'busy' },
      { id: 't3', no: 'A03', seats: 4, status: 'free' },
      { id: 't4', no: 'B01', seats: 6, status: 'pay' },
      { id: 't5', no: 'B02', seats: 6, status: 'free' },
      { id: 't6', no: 'B03', seats: 8, status: 'free' }
    ],
    orders: [
      {
        id: 'o_seed1', no: '202608280001', tableId: 't4', remark: '',
        items: [
          { dishId: 'd5', name: '扬州炒饭', price: 18, qty: 2 },
          { dishId: 'd7', name: '冰镇酸梅汤', price: 8, qty: 3 }
        ],
        total: 60, status: 'done', createdAt: Date.now() - 5 * 3600 * 1000, payAt: Date.now() - 4 * 3600 * 1000
      },
      {
        id: 'o_seed2', no: '202608280002', tableId: 't2', remark: '少辣',
        items: [
          { dishId: 'd1', name: '招牌红烧肉', price: 48, qty: 1 },
          { dishId: 'd9', name: '黄金炸鸡翅', price: 28, qty: 1 },
          { dishId: 'd7', name: '冰镇酸梅汤', price: 8, qty: 2 }
        ],
        total: 92, status: 'preparing', createdAt: Date.now() - 40 * 60 * 1000, payAt: Date.now() - 35 * 60 * 1000
      },
      {
        id: 'o_seed3', no: '202608280003', tableId: 't3', remark: '',
        items: [
          { dishId: 'd2', name: '酸菜鱼', price: 68, qty: 1 },
          { dishId: 'd6', name: '手工牛肉面', price: 26, qty: 2 }
        ],
        total: 120, status: 'pending', createdAt: Date.now() - 10 * 60 * 1000, payAt: null
      }
    ]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        return Object.assign(clone(seed), data);
      }
    } catch (e) {
      console.warn('读取本地数据失败，使用初始数据', e);
    }
    return clone(seed);
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  function exportData(data) {
    return JSON.stringify(data, null, 2);
  }

  function importData(json) {
    var data = JSON.parse(json);
    if (!data || !Array.isArray(data.dishes) || !Array.isArray(data.orders)) {
      throw new Error('数据格式不正确，请检查导入文件');
    }
    save(data);
    return data;
  }

  /* 会话管理 */
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(user) {
    if (user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
    else { sessionStorage.removeItem(SESSION_KEY); }
  }

  global.AppStore = { seed: seed, load: load, save: save, reset: reset, exportData: exportData, importData: importData, getSession: getSession, setSession: setSession };
})(window);
