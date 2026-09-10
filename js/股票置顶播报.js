"use strict";
/**
 * 股价悬浮条  作者：eeooooo 链接 https://github.com/eeooooo/eeooooo.github.io    分离版：花园id 猹 
 * 依赖 IIROSE 官方接口：socket / Objs.stockOldHolder / Variable.coin
 * 用法：在 IIROSE 页面（含 iframe 的主页面）控制台执行，或做成油猴脚本
 */
(function () {
  // ============ 配置 ============
  var CFG = {
    pollActive: 2000,    // 活跃期轮询间隔
    pollIdle: 5000,      // 半活跃
    pollSleep: 10000,    // 沉寂
    activeWindow: 30000,
    idleWindow: 120000,
    barId: "omo-stock-bar",
    styleId: "omo-stock-style",
    crashShares: 1,
    crashGold: 1000,
    crashPrice: 1
  };

  // ============ 状态 ============
  var enabled = true;
  var barEl = null;
  var lastHTML = "";
  var lastUpdate = Date.now();
  var pollingTimer = null;
  var pollCount = 0;
  var crashDetected = false;
  var crashTimer = null;

  var stockPrice = 0, prevPrice = 0;
  var totalShares = 0, prevShares = 0;
  var totalGold = 0, prevGold = 0;
  var myShares = -1, prevMyShares = -1;
  var myCoin = -1, prevMyCoin = -1;
  var pendingFlash = null;

  var origOnMessage = null;
  var stockUpdateHooked = false;
  var originalLyricTop = null;

  // ============ 工具 ============
  function fmt(n, d) {
    try {
      return window.Utils && window.Utils.smallTools && window.Utils.smallTools.formatDecimal
        ? window.Utils.smallTools.formatDecimal(n, d)
        : Number(n).toFixed(d);
    } catch (e) { return Number(n).toFixed(d); }
  }

  function diffText(cur, prev, digits, withPct) {
    if (cur === null || prev === null || !isFinite(cur) || cur === prev) return null;
    var up = cur > prev;
    var delta = Math.abs(cur - prev);
    var txt = (up ? "+" : "-") + delta.toFixed(digits);
    if (withPct && prev !== 0) {
      txt += " (" + (Math.abs(cur - prev) / prev * 100).toFixed(1) + "%)";
    }
    return [txt, up ? "#7ec97e" : "#e06c5a"];
  }

  // ============ 样式 ============
  function injectStyle() {
    if (document.getElementById(CFG.styleId)) return;
    var s = document.createElement("style");
    s.id = CFG.styleId;
    s.textContent = [
      "#" + CFG.barId + "{flex-wrap:wrap;justify-content:center;row-gap:1px;max-width:100vw;padding-left:10px!important;padding-right:10px!important;}",
      "@media (max-width:720px){#" + CFG.barId + "{left:0!important;right:0!important;transform:none!important;width:100vw;box-sizing:border-box;border-radius:5px;font-size:11px!important;gap:6px 10px!important;}}",
      "@media (max-width:390px){#" + CFG.barId + "{gap:4px 8px!important;font-size:10px!important;}}",
      "@keyframes omo-flash-up{from{background-color:rgba(52,168,83,.95)}to{background-color:rgba(16,16,16,.8)}}",
      "@keyframes omo-flash-down{from{background-color:rgba(220,68,55,.95)}to{background-color:rgba(16,16,16,.8)}}",
      "@keyframes omo-crash-tip{0%{opacity:0;transform:translateY(6px)}6%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  // ============ 悬浮条 ============
  function ensureBar() {
    if (barEl) return barEl;
    injectStyle();
    barEl = document.createElement("div");
    barEl.id = CFG.barId;
    barEl.style.cssText = [
      "position:fixed;top:0;left:50%;transform:translateX(-50%);",
      "z-index:9999998;display:none;align-items:center;gap:14px;padding:6px 16px;",
      "cursor:pointer;background:rgba(16,16,16,.8);color:rgba(255,255,255,.75);",
      "border-radius:5px;box-shadow:0 0 1px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.24);",
      'font-family:noto,"PingFang SC","Microsoft YaHei",sans-serif;',
      "font-size:13px;font-weight:bold;user-select:none;white-space:nowrap;"
    ].join("");
    barEl.title = "点击打开炒股面板";
    barEl.onclick = function () {
      try {
        if (!window.Probe || !window.Probe.init || !window.Probe.init.stockOldHolder) {
          if (window.Init && typeof window.Init.movePanel === "function") window.Init.movePanel(0);
          if (window.socket && typeof window.socket.send === "function") window.socket.send(">#");
        }
        var holder = window.Objs && window.Objs.stockOldHolder;
        if (holder && holder.This && typeof window.panelAnimate === "function") {
          window.panelAnimate(26, 1);
        }
        setTimeout(function () { attachProxy(); queryStock(true); }, 600);
      } catch (e) {}
    };
    (document.body || document.documentElement).appendChild(barEl);
    return barEl;
  }

  // ============ 渲染 ============
  function detectCrash() {
    var isCrash = totalShares === CFG.crashShares
      && totalGold === CFG.crashGold
      && stockPrice === CFG.crashPrice;
    if (isCrash && !crashDetected) {
      crashDetected = true;
      totalShares = prevShares || 0;
      totalGold = prevGold || 0;
      stockPrice = prevPrice || 0;
      showCrashTip();
    } else if (!isCrash && crashDetected) {
      crashDetected = false;
    }
  }

  function showCrashTip() {
    if (!barEl) return;
    var tip = barEl.querySelector(".omo-stock-crash");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "omo-stock-crash";
      tip.style.cssText = "position:absolute;left:0;bottom:-24px;display:none;padding:3px 10px;background:#d64541;color:#fff;font-size:11px;font-weight:bold;line-height:16px;white-space:nowrap;border-radius:5px;box-shadow:0 0 1px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.24);";
      barEl.appendChild(tip);
    }
    tip.textContent = "⚠ 股市已崩盘重置：股价 1 · 股数 1000 · 总金 1000，监测基准已同步";
    tip.style.display = "block";
    tip.style.animation = "none";
    void tip.offsetWidth;
    tip.style.animation = "omo-crash-tip 5s ease forwards";
    clearTimeout(crashTimer);
    crashTimer = setTimeout(function () { tip.style.display = "none"; }, 5000);
  }

  function cell(label, value, color, sub) {
    return '<span style="display:inline-grid;grid-template-columns:auto auto;column-gap:5px;align-items:baseline;line-height:1.15;">'
      + '<span style="opacity:.55">' + label + "</span>"
      + "<span" + (color ? ' style="color:' + color + '"' : "") + ">" + value + "</span>"
      + (sub
          ? '<span style="grid-column:2;justify-self:center;font-size:10px;font-weight:normal;color:' + sub[1] + ';opacity:.95;">' + sub[0] + "</span>"
          : '<span style="grid-column:2;height:12px;"></span>')
      + "</span>";
  }

  function render() {
    if (!enabled || !barEl) return;
    detectCrash();

    var priceColor = stockPrice > prevPrice ? "#7ec97e"
                   : stockPrice < prevPrice ? "#e06c5a"
                   : "#cd7f32";

    if (pendingFlash !== null) {
      var flash = pendingFlash;
      pendingFlash = null;
      barEl.style.animation = "none";
      void barEl.offsetWidth;
      barEl.style.animation = (flash ? "omo-flash-up" : "omo-flash-down") + " .9s ease-out";
    }

    var html = cell("股价", stockPrice ? stockPrice.toFixed(4) : "- -", priceColor,
                    diffText(stockPrice, prevPrice || null, 4, true))
             + cell("持股", myShares >= 0 ? String(myShares) : "-", undefined,
                    myShares >= 0 ? diffText(myShares, prevMyShares, 0, false) : null)
             + cell("总股", totalShares ? String(totalShares) : "-", undefined,
                    totalShares ? diffText(totalShares, prevShares, 0, true) : null)
             + cell("总金", totalGold ? fmt(totalGold, 3) : "-", undefined,
                    totalGold ? diffText(totalGold, prevGold, 3, false) : null)
             + cell("余额", myCoin >= 0 ? fmt(myCoin, 2) : "-", undefined, null);

    if (html !== lastHTML) {
      barEl.innerHTML = html;
      lastHTML = html;
    }
    barEl.style.display = "flex";
    repositionLyric();
  }

  function repositionLyric() {
    var lyric = document.getElementById("lyricHolder");
    if (!lyric) return;
    if (!(enabled && barEl && barEl.style.display === "flex")) {
      if (originalLyricTop !== null) {
        lyric.style.top = originalLyricTop + "px";
        originalLyricTop = null;
      }
      return;
    }
    if (originalLyricTop === null) {
      var t = parseFloat(lyric.style.top);
      originalLyricTop = isFinite(t) ? t : (parseFloat(getComputedStyle(lyric).top) || 24);
    }
    var newTop = originalLyricTop + Math.round(barEl.getBoundingClientRect().height) + 4;
    if (parseFloat(lyric.style.top) !== newTop) lyric.style.top = newTop + "px";
  }

  // ============ 数据更新 ============
  function updateStock(shares, gold, price) {
    if (!(shares > 0 && isFinite(gold))) return false;
    var p = (price != null && isFinite(price))
      ? Number(Number(price).toFixed(4))
      : Number((gold / shares).toFixed(4));

    if (shares === totalShares && gold === totalGold && p === stockPrice) return false;

    if (p !== stockPrice) {
      pendingFlash = stockPrice > 0 ? (p > stockPrice ? 1 : -1) : null;
      prevPrice = stockPrice;
    }
    if (totalShares && shares !== totalShares) prevShares = totalShares;
    if (totalGold && gold !== totalGold) prevGold = totalGold;

    totalShares = shares;
    totalGold = gold;
    stockPrice = p;
    lastUpdate = Date.now();
    return true;
  }

  // ============ 包解析 ============
  function parsePacket(msg) {
    if (!enabled || typeof msg !== "string" || !msg) return;
    var changed = false;

    var start = -1;
    if (msg[0] === "%" && msg[1] === "*") {
      if (msg[3] === '"') start = 4;
      else if (msg[2] === '"') start = 3;
    }
    if (start > 0) {
      var end = msg.substr(start).indexOf('"');
      if (end > 0) {
        var parts = msg.substr(start, end).split("#");
        if (parts[1]) {
          var nums = parts[1].split("$");
          if (nums.length >= 2 && updateStock(+nums[0], +nums[1])) changed = true;
        }
      }
    } else if (msg[0] === ">" && msg.length > 2) {
      if (msg.indexOf('"') > 1) {
        var ps = msg.substr(1).split('"');
        if (updateStock(Number(ps[0]), Number(ps[1]), Number(ps[2]))) changed = true;

        var sIdx = ps.length === 5 ? 3 : 2;
        var cIdx = ps.length === 5 ? 4 : 3;
        var s = Number(ps[sIdx]);
        var c = Number(ps[cIdx]);
        if (isFinite(s) && s !== myShares) {
          if (myShares >= 0) prevMyShares = myShares;
          myShares = s; changed = true;
        }
        if (isFinite(c) && c !== myCoin) {
          if (myCoin >= 0) prevMyCoin = myCoin;
          myCoin = c; changed = true;
        }
        if (changed) lastUpdate = Date.now();
      } else {
        var kind = msg[1];
        var val = parseFloat(msg.slice(2));
        if (!isFinite(val)) return;
        if (kind === "%" || kind === "<") {
          if (val !== myCoin) { if (myCoin >= 0) prevMyCoin = myCoin; myCoin = val; changed = true; }
        } else if (kind === ">") {
          if (val !== myShares) { if (myShares >= 0) prevMyShares = myShares; myShares = val; changed = true; }
        }
      }
    }
    if (changed) render();
  }

  // ============ 劫持 ============
  function hookSocket() {
    var sock = window.socket;
    if (!sock || typeof sock._onmessage !== "function") return;
    if (origOnMessage === sock._onmessage) return;
    var orig = sock._onmessage;
    origOnMessage = function (msg) {
      try { parsePacket(msg); } catch (e) {}
      return orig.call(this, msg);
    };
    sock._onmessage = origOnMessage;
  }

  function attachProxy() {
    if (stockUpdateHooked) return;
    try {
      var holder = window.Objs && window.Objs.stockOldHolder;
      if (holder && holder.function
          && typeof holder.function.stockUpdate === "function"
          && !holder._omoSuTap) {
        holder._omoSuTap = true;
        var orig = holder.function.stockUpdate;
        holder.function.stockUpdate = function (args) {
          try {
            if (Array.isArray(args)) {
              var shares = +args[0], gold = +args[1];
              var price = Number(Number(args[2]).toFixed(4));
              if (price !== stockPrice) {
                pendingFlash = stockPrice > 0 ? (price > stockPrice ? 1 : -1) : null;
                prevPrice = stockPrice;
              }
              if (totalShares && shares !== totalShares) prevShares = totalShares;
              if (totalGold && gold !== totalGold) prevGold = totalGold;
              totalShares = shares;
              totalGold = gold;
              stockPrice = price;
              lastUpdate = Date.now();
              render();
            }
          } catch (e) {}
          return orig.apply(this, arguments);
        };
        stockUpdateHooked = true;
      }
    } catch (e) {}
  }

  // ============ 兜底读取 ============
  function readFromObjs() {
    try {
      var holder = window.Objs && window.Objs.stockOldHolder;
      if (holder && holder.Variable) {
        if (typeof holder.Variable.stockNum === "number" && holder.Variable.stockNum > 0) {
          var p = Number(Number(holder.Variable.stockNum).toFixed(4));
          if (p !== stockPrice) {
            pendingFlash = stockPrice > 0 ? (p > stockPrice ? 1 : -1) : null;
            prevPrice = stockPrice || p;
            stockPrice = p;
          }
        }
        if (typeof holder.Variable.stockCoin === "number") myShares = holder.Variable.stockCoin;
      }
      if (window.Variable && typeof window.Variable.coin === "number" && window.Variable.coin >= 0) {
        myCoin = window.Variable.coin;
      }
    } catch (e) {}
  }

  // ============ 轮询 ============
  function pollInterval() {
    var idle = Date.now() - lastUpdate;
    if (idle < CFG.activeWindow) return CFG.pollActive;
    if (idle < CFG.idleWindow) return CFG.pollIdle;
    return CFG.pollSleep;
  }

  function queryStock(full) {
    attachProxy();
    readFromObjs();
    try {
      if (window.socket && typeof window.socket.send === "function") {
        window.socket.send(">#");
        if (full) window.socket.send(">%");
      }
    } catch (e) {}
    render();
  }

  function tick() {
    try {
      hookSocket();
      attachProxy();
      pollCount++;
      var full = pollCount % 5 === 0;
      queryStock(full);
      window.__omoStockPolls = pollCount;
    } catch (e) {}
    pollingTimer = setTimeout(tick, pollInterval());
  }

  // ============ 启停 ============
  function start() {
    ensureBar();
    hookSocket();
    attachProxy();
    queryStock(true);
    if (!pollingTimer) tick();
  }

  function stop() {
    if (pollingTimer) { clearTimeout(pollingTimer); pollingTimer = null; }
    if (barEl) barEl.style.display = "none";
    repositionLyric();
  }

  // ============ 对外 API ============
  window.__omoStockBar = {
    enable: function () { enabled = true; start(); },
    disable: function () { enabled = false; stop(); },
    isEnabled: function () { return enabled; },
    state: function () {
      return { stockPrice: stockPrice, totalShares: totalShares, totalGold: totalGold,
               myShares: myShares, myCoin: myCoin, polls: pollCount };
    }
  };

  // 自动启动
  start();
})();