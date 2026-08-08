(function() {
  const KEYWORD = '未来世界';
  const FUZZY_MAX_GAP = 8;
  const HIDDEN_FLAG = '__ancestor_hidden__';
  const LEVELS_UP = 3;
  const INTERVAL_MS = 10000; // 10 秒

  // ========== 工具函数 ==========
  function getAllTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          const p = node.parentElement;
          if (!p || ['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function collectRoots(root, arr = []) {
    arr.push(root);
    root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) collectRoots(el.shadowRoot, arr);
    });
    root.querySelectorAll('iframe').forEach(iframe => {
      try { if (iframe.contentDocument?.body) collectRoots(iframe.contentDocument.body, arr); } catch(e) {}
    });
    return arr;
  }

  // ========== 核心扫描隐藏 ==========
  function scanAndHide() {
    // 先清除上一轮的隐藏记录（防止元素已被替换导致残留标记）
    document.querySelectorAll('[' + HIDDEN_FLAG + ']').forEach(el => {
      el.style.display = '';
      delete el[HIDDEN_FLAG];
    });

    const roots = collectRoots(document.body);
    let allTextNodes = [];
    roots.forEach(r => allTextNodes.push(...getAllTextNodes(r)));

    if (allTextNodes.length === 0) return;

    let fullText = '';
    const nodeRanges = [];
    allTextNodes.forEach(node => {
      const text = node.textContent;
      const start = fullText.length;
      fullText += text;
      nodeRanges.push({ node, start, end: fullText.length });
    });

    // 精确匹配
    let matches = [];
    const exactRegex = new RegExp(KEYWORD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let m;
    while ((m = exactRegex.exec(fullText)) !== null) {
      matches.push({ start: m.index, end: exactRegex.lastIndex, exact: true });
    }

    // 模糊匹配
    if (matches.length === 0) {
      const fuzzyRegex = new RegExp(`未来.{0,${FUZZY_MAX_GAP}}?世界`, 'g');
      while ((m = fuzzyRegex.exec(fullText)) !== null) {
        matches.push({ start: m.index, end: fuzzyRegex.lastIndex, exact: false });
      }
    }

    if (matches.length === 0) return;

    // 向上找容器
    const containersToHide = new Set();
    matches.forEach(match => {
      const involvedNodes = nodeRanges
        .filter(r => r.start < match.end && r.end > match.start)
        .map(r => r.node);
      involvedNodes.forEach(node => {
        let target = node.parentElement;
        for (let i = 1; i < LEVELS_UP; i++) {
          if (target && target !== document.body && target !== document.documentElement) {
            target = target.parentElement;
          } else break;
        }
        if (target && target !== document.body && target !== document.documentElement) {
          containersToHide.add(target);
        }
      });
    });

    // 隐藏
    containersToHide.forEach(el => {
      if (!el[HIDDEN_FLAG]) {
        el.style.display = 'none';
        el[HIDDEN_FLAG] = true;
      }
    });

    // 保存引用供手动恢复
    window.__hiddenAncestors = containersToHide;
  }

  // ========== 启动 ==========
  scanAndHide(); // 立即执行一次
  const timerId = setInterval(scanAndHide, INTERVAL_MS);

  console.log('✅ 全量轮询已启动，每 ' + (INTERVAL_MS / 1000) + ' 秒扫描一次并隐藏含“' + KEYWORD + '”的房间卡片');

  // 手动停止
  window.stopRoomBlocker = function() {
    clearInterval(timerId);
    console.log('轮询已停止');
  };

  // 手动恢复
  window.restoreAncestorContainers = function() {
    document.querySelectorAll('[' + HIDDEN_FLAG + ']').forEach(el => {
      el.style.display = '';
      delete el[HIDDEN_FLAG];
    });
    console.log('已恢复所有被隐藏的容器');
  };
})();