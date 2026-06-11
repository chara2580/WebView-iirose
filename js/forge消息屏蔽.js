(function () {
  'use strict';

  const FORGE_REGEX = /iiroseForge:[\s\S]*?:end/i;

  // 获取 IIROSE 的全局 window 和 document 对象
  function getIIROSEContext() {
    if (window.socket && window.uid) return { win: window, doc: document };
    const iframe = document.getElementById("mainFrame");
    if (iframe && iframe.contentWindow && iframe.contentWindow.socket && iframe.contentWindow.uid) {
      return { win: iframe.contentWindow, doc: iframe.contentDocument };
    }
    return null;
  }

  // 1. 视图层清洗：清理已经存在于页面上的记录
  function cleanExistingDOM(doc) {
    if (!doc || !doc.body) return;

    // 使用 TreeWalker 高效遍历所有文本节点
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToClean = [];

    while ((node = walker.nextNode())) {
      if (FORGE_REGEX.test(node.nodeValue)) {
        nodesToClean.push(node);
      }
    }

    nodesToClean.forEach(n => {
      // 将包含特征的字符串替换为空
      n.nodeValue = n.nodeValue.replace(new RegExp(FORGE_REGEX.source, 'gi'), '');
      
      // 可选：如果清洗后这个元素的文本彻底空了，连带隐藏它的父级气泡，防止出现空聊天框
      const parent = n.parentElement;
      if (parent && parent.textContent.trim() === '') {
        // 向上寻找聊天气泡的容器并隐藏 (这里使用通用隐藏逻辑)
        parent.style.display = 'none';
      }
    });
  }

  // 2. 动态视图监听：处理用户向上滚动加载历史记录的情况
  function installDOMObserver(doc) {
    if (doc.__forgeObserverInstalled) return;
    doc.__forgeObserverInstalled = true;

    // 观察整个 body 的 DOM 变化
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldClean = true;
          break;
        }
      }
      if (shouldClean) {
        cleanExistingDOM(doc);
      }
    });

    observer.observe(doc.body, { childList: true, subtree: true });
  }

  // 3. 网络层清洗：拦截底层 WebSocket
  function installNetworkCleaner(win) {
    if (win.__forgeNetCleanerInstalled) return;
    win.__forgeNetCleanerInstalled = true;

    const origOnMessage = win.socket._onmessage;
    win.socket._onmessage = function(msg) {
      if (typeof msg === 'string' && FORGE_REGEX.test(msg)) {
        if (msg.startsWith('""')) {
          const parts = msg.substring(2).split('<');
          const filteredParts = parts.filter(p => !FORGE_REGEX.test(p));
          if (filteredParts.length === 0) return;
          msg = '""' + filteredParts.join('<');
        } else {
          return;
        }
      }
      if (origOnMessage) origOnMessage.call(win.socket, msg);
    };
  }

  // 主初始化入口
  function init() {
    const context = getIIROSEContext();
    if (!context) {
      // 页面核心没加载完，继续轮询
      setTimeout(init, 1000);
      return;
    }

    console.log("🚀 iiroseForge 双端清洗模块已就绪 (网络拦截 + 视图清理)");

    // 1. 拦截新消息
    installNetworkCleaner(context.win);
    // 2. 清理当前屏幕上已有的脏数据
    cleanExistingDOM(context.doc);
    // 3. 监听动态插入的历史记录
    installDOMObserver(context.doc);
  }

  init();
})();
