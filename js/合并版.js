(function iiroseEmojiCategoriesScript() {
  'use strict';

  if (window.__iiroseEmojiCategoriesInstalled) return;
  window.__iiroseEmojiCategoriesInstalled = true;

  const STORAGE_KEY = 'iiroseEmojiCategories';
  const ALL_CATEGORY_ID = 'all';
  const LONG_PRESS_MS = 520;
  const LONG_PRESS_MOVE_TOLERANCE = 10;
  const FACE_HOLDER_SELECTOR = '#faceHolder';
  const CUSTOM_EMOJI_CONTENT_SELECTOR = '#faceHolder .emojiContentBox[index="4"]';
  const CUSTOM_EMOJI_BOX_SELECTOR = '#faceHolder .emojiContentBox[index="4"] .faceHolderBoxChild';
  const CUSTOM_EMOJI_PAGE_SELECTOR = '#faceHolder .emojiContentBox[index="4"] .emojiPage';

  let setupTimer = 0;
  let barSignature = '';
  let itemMenu = null;
  let categoryMenu = null;
  let activeDialog = null;
  let longPressTimer = 0;
  let longPressStart = null;
  let suppressedClick = null;

  installInSameOriginFrames();
  injectStyle();
  installObservers();
  installEvents();
  scheduleSetup();

  function installInSameOriginFrames() {
    const source = '(' + iiroseEmojiCategoriesScript.toString() + ')();';

    const install = (frame) => {
      try {
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        if (
          !frameWindow ||
          !frameDocument ||
          frameWindow.__iiroseEmojiCategoriesInstalled
        ) {
          return;
        }

        const script = frameDocument.createElement('script');
        script.textContent = source;
        (frameDocument.head || frameDocument.documentElement).appendChild(script);
        script.remove();
      } catch (error) {
        // Cross-origin iframes cannot be touched from the parent page.
      }
    };

    const scan = () => {
      document.querySelectorAll('iframe').forEach(install);
      installSync(); // 尝试初始化同步模块
    };

    scan();
    window.setInterval(scan, 1500);
  }

  // ---------- 核心同步逻辑集成开始 ----------
  function getIIROSEWindow() {
    if (window.socket && window.uid) return window;
    const iframe = document.getElementById("mainFrame");
    if (iframe && iframe.contentWindow && iframe.contentWindow.socket && iframe.contentWindow.uid) {
      return iframe.contentWindow;
    }
    return null;
  }

  function installSync() {
    const win = getIIROSEWindow();
    if (!win || win.__iiroseEmojiSyncInstalled) return;

    win.__iiroseEmojiSyncInstalled = true;
    console.log("🚀 表情分类：同步模块（精准写入版）已就绪");

    const orig = win.socket._onmessage;
    win.socket._onmessage = function(msg) {
      if (orig) orig.call(win.socket, msg);
      handleSyncMessage(msg, win);
    };
  }

  function handleSyncMessage(msg, win) {
    if (typeof msg !== 'string') return;
    const m = msg.match(/#~([^~|]+)(?:\|([^~]*))?~#/);
    if (!m) return;
    const cmd = m[1];
    const payload = m[2] || '';

    if (cmd === 'sync_req') {
      showSyncConfirmBtn(win);
    } else if (cmd === 'sync_push') {
      receiveSyncData(payload);
    }
  }

  function showSyncConfirmBtn(win) {
    const old = document.getElementById('iirose-sync-confirm-btn');
    if (old) old.remove();

    const btn = document.createElement('button');
    btn.id = 'iirose-sync-confirm-btn';
    btn.textContent = '✅ 发送我的数据';
    btn.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:2147483647;padding:12px 24px;background:#2196f3;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
    
    btn.onclick = () => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        alert("本地没有表情分类数据");
        btn.remove();
        return;
      }
      const safe = encodeURIComponent(raw);
      win.socket?.send(JSON.stringify({
        g: win.uid,
        m: `#~sync_push|${STORAGE_KEY}|${safe}~#`,
        mc: win.inputcolorhex || '#2196f3',
        i: Date.now().toString().slice(-5) + Math.random().toString().slice(-7)
      }));
      btn.style.background = '#4caf50';
      btn.textContent = '✔️ 已发送';
      setTimeout(() => btn.remove(), 2000);
    };
    
    document.body.appendChild(btn);
    setTimeout(() => { if (document.body.contains(btn)) btn.remove(); }, 10000);
  }

  function receiveSyncData(payload) {
    const idx = payload.indexOf('|');
    if (idx === -1) return;
    const key = payload.slice(0, idx);
    if (key !== STORAGE_KEY) return; // 校验是不是自己的数据

    const encoded = payload.slice(idx + 1);
    let jsonString;
    try {
      jsonString = decodeURIComponent(encoded);
      JSON.parse(jsonString); // 验证合法性
    } catch(e) {
      console.error("同步数据解码或解析失败", e);
      return;
    }
    
    // 双重写入确保生效
    try { window.localStorage.setItem(key, jsonString); } catch(e) {}
    try {
      const iframe = document.getElementById("mainFrame");
      if (iframe && iframe.contentWindow) iframe.contentWindow.localStorage.setItem(key, jsonString);
    } catch(e) {}
    
    barSignature = ''; // 清空签名以强行触发重绘
    scheduleSetup();
    
    const toast = document.createElement('div');
    toast.textContent = '📡 同步成功！表情分类已自动更新。';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 20px;background:#4caf50;color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-weight:bold;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function requestSync(btn) {
    const win = getIIROSEWindow();
    if (!win || !win.socket || !win.uid) {
      alert("未找到 WebSocket 连接，无法请求同步。");
      return;
    }

    win.socket.send(JSON.stringify({
      g: win.uid,
      m: '#~sync_req~#',
      mc: win.inputcolorhex || '#ff9800',
      i: Date.now().toString().slice(-5) + Math.random().toString().slice(-7)
    }));

    const oldText = btn.textContent;
    btn.textContent = '✔️';
    btn.style.background = '#4caf50';
    btn.style.borderColor = '#4caf50';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 2000);
  }
  // ---------- 核心同步逻辑集成结束 ----------

  function installObservers() {
    const observer = new MutationObserver(scheduleSetup);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });
  }

  function installEvents() {
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleCategoryContextMenu, true);
    document.addEventListener('contextmenu', handleCustomEmojiContextMenu, true);
    document.addEventListener('pointerdown', handleCategoryPointerDown, true);
    document.addEventListener('pointerdown', handleCustomEmojiPointerDown, true);
    document.addEventListener('pointermove', handleCustomEmojiPointerMove, true);
    document.addEventListener('pointerup', cancelLongPress, true);
    document.addEventListener('pointercancel', cancelLongPress, true);
    window.addEventListener('resize', positionActiveDialog, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', positionActiveDialog, true);
      window.visualViewport.addEventListener('scroll', positionActiveDialog, true);
    }
  }

  function scheduleSetup() {
    window.clearTimeout(setupTimer);
    setupTimer = window.setTimeout(setup, 80);
  }

  function setup() {
    const faceHolder = document.querySelector(FACE_HOLDER_SELECTOR);
    const emojiPage = document.querySelector(CUSTOM_EMOJI_PAGE_SELECTOR);
    if (!faceHolder || !emojiPage) {
      closeItemMenu();
      closeCategoryMenu();
      return;
    }

    faceHolder.classList.add('iirose-emoji-category-holder');
    cleanupLegacyTopLevelBar(faceHolder);
    const bar = ensureCategoryBar(emojiPage);
    const active = isCustomEmojiPanelActive();
    faceHolder.classList.toggle('iirose-emoji-category-active', active);
    bar.hidden = !active;

    if (!active) {
      closeItemMenu();
      closeCategoryMenu();
      return;
    }

    pruneCategories();
    renderCategoryBar();
    applyCategoryFilter();
  }

  function cleanupLegacyTopLevelBar(faceHolder) {
    Array.from(faceHolder.children).forEach((child) => {
      if (child.classList && child.classList.contains('iirose-emoji-category-bar')) {
        child.remove();
      }
    });

    const typeBar = faceHolder.querySelector(':scope > .faceHolderType');
    if (typeBar && typeBar.nextElementSibling) {
      typeBar.nextElementSibling.classList.remove('iirose-emoji-category-content-wrap');
    }
  }

  function ensureCategoryBar(emojiPage) {
    const existing = emojiPage.querySelector('.iirose-emoji-category-bar');
    if (existing) return existing;

    const bar = document.createElement('div');
    bar.className = 'iirose-emoji-category-bar';
    bar.dataset.iiroseEmojiCategoryBar = '1';
    bar.hidden = true;
    emojiPage.appendChild(bar);
    return bar;
  }

  function renderCategoryBar() {
    const bar = document.querySelector(CUSTOM_EMOJI_PAGE_SELECTOR + ' .iirose-emoji-category-bar');
    if (!bar) return;

    const state = loadState();
    const signature = JSON.stringify({
      activeCategoryId: state.activeCategoryId,
      categories: state.categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    });

    if (barSignature === signature && bar.children.length) return;
    barSignature = signature;
    bar.textContent = '';

    bar.appendChild(createCategoryButton('全部', ALL_CATEGORY_ID, state.activeCategoryId === ALL_CATEGORY_ID));

    state.categories.forEach((category) => {
      bar.appendChild(createCategoryButton(category.name, category.id, state.activeCategoryId === category.id));
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'iirose-emoji-category-button iirose-emoji-category-button--add';
    addButton.dataset.emojiCategoryAction = 'add';
    addButton.textContent = '+';
    addButton.title = '新增分类';
    bar.appendChild(addButton);

    // 注入同步请求按钮
    const syncButton = document.createElement('button');
    syncButton.type = 'button';
    syncButton.className = 'iirose-emoji-category-button iirose-emoji-category-button--sync';
    syncButton.dataset.emojiCategoryAction = 'sync';
    syncButton.textContent = '📡';
    syncButton.title = '请求同步数据';
    bar.appendChild(syncButton);
  }

  function createCategoryButton(text, id, active) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'iirose-emoji-category-button';
    button.dataset.emojiCategoryId = id;
    button.textContent = text;
    button.title = id === ALL_CATEGORY_ID ? text : text + '，右键或长按管理';
    button.classList.toggle('iirose-emoji-category-button--active', active);
    return button;
  }

  function handleDocumentClick(event) {
    if (handleSuppressedClick(event)) return;
    if (handleCategoryMenuClick(event)) return;
    if (handleItemMenuClick(event)) return;
    if (handleCategoryBarClick(event)) return;

    if (categoryMenu && !categoryMenu.contains(event.target)) {
      closeCategoryMenu();
    }

    if (itemMenu && !itemMenu.contains(event.target)) {
      closeItemMenu();
    }
  }

  function handleSuppressedClick(event) {
    if (!suppressedClick || Date.now() > suppressedClick.until) {
      suppressedClick = null;
      return false;
    }

    if (suppressedClick.type === 'emoji') {
      const item = findCustomEmojiItem(event.target);
      if (!item || item !== suppressedClick.item) return false;
    } else if (suppressedClick.type === 'category') {
      const button = findCategoryButton(event.target);
      if (!button || button !== suppressedClick.button) return false;
    } else {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    suppressedClick = null;
    return true;
  }

  function handleCategoryBarClick(event) {
    const button = event.target.closest && event.target.closest('.iirose-emoji-category-bar button');
    if (!button) return false;

    event.preventDefault();
    event.stopPropagation();

    if (button.dataset.emojiCategoryAction === 'add') {
      createCategoryFromPrompt();
      return true;
    }

    if (button.dataset.emojiCategoryAction === 'sync') {
      requestSync(button);
      return true;
    }

    const categoryId = button.dataset.emojiCategoryId;
    if (!categoryId) return true;

    const state = loadState();
    state.activeCategoryId = hasCategory(state, categoryId) ? categoryId : ALL_CATEGORY_ID;
    saveState(state);
    renderCategoryBar();
    applyCategoryFilter();
    return true;
  }

  function handleCategoryMenuClick(event) {
    if (!categoryMenu) return false;

    const button = event.target.closest && event.target.closest('.iirose-emoji-category-menu button');
    if (!button) return categoryMenu.contains(event.target);

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.categoryMenuAction;
    const categoryId = categoryMenu.dataset.categoryId;

    if (action === 'delete') {
      const state = loadState();
      const category = state.categories.find((item) => item.id === categoryId);
      closeCategoryMenu();
      if (category) {
        showConfirmDialog({
          title: '删除分类',
          message: '确定删除“' + category.name + '”？分类内的表情不会从图包中删除。',
          confirmText: '删除',
          danger: true,
          onConfirm: () => deleteCategory(category.id),
        });
      }
      return true;
    }

    return true;
  }

  function handleItemMenuClick(event) {
    if (!itemMenu) return false;

    const button = event.target.closest && event.target.closest('.iirose-emoji-category-menu button');
    if (!button) return itemMenu.contains(event.target);

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.emojiMenuAction;
    const url = itemMenu.dataset.emojiUrl;
    if (!url) {
      closeItemMenu();
      return true;
    }

    if (action === 'new') {
      createCategoryFromPrompt(url);
      closeItemMenu();
      return true;
    }

    if (action === 'toggle') {
      toggleEmojiInCategory(button.dataset.categoryId, url);
      closeItemMenu();
      return true;
    }

    if (action === 'remove-current') {
      const state = loadState();
      removeEmojiFromCategory(state.activeCategoryId, url);
      closeItemMenu();
      return true;
    }

    return true;
  }

  function handleCategoryContextMenu(event) {
    const button = findCategoryButton(event.target);
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    showCategoryMenu(button, event.clientX, event.clientY);
  }

  function handleCustomEmojiContextMenu(event) {
    const item = findCustomEmojiItem(event.target);
    if (!item) return;

    event.preventDefault();
    event.stopPropagation();
    showItemMenu(item, event.clientX, event.clientY);
  }

  function handleCategoryPointerDown(event) {
    if (event.pointerType === 'mouse') return;

    const button = findCategoryButton(event.target);
    if (!button) return;

    cancelLongPress();
    longPressStart = {
      type: 'category',
      button,
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimer = window.setTimeout(() => {
      suppressedClick = {
        type: 'category',
        button,
        until: Date.now() + 900,
      };
      showCategoryMenu(button, event.clientX, event.clientY);
      cancelLongPressTimerOnly();
    }, LONG_PRESS_MS);
  }

  function handleCustomEmojiPointerDown(event) {
    if (event.pointerType === 'mouse') return;

    const item = findCustomEmojiItem(event.target);
    if (!item) return;

    cancelLongPress();
    longPressStart = {
      type: 'emoji',
      item,
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimer = window.setTimeout(() => {
      suppressedClick = {
        type: 'emoji',
        item,
        until: Date.now() + 900,
      };
      showItemMenu(item, event.clientX, event.clientY);
      cancelLongPressTimerOnly();
    }, LONG_PRESS_MS);
  }

  function handleCustomEmojiPointerMove(event) {
    if (!longPressStart) return;

    const dx = Math.abs(event.clientX - longPressStart.x);
    const dy = Math.abs(event.clientY - longPressStart.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
      cancelLongPress();
    }
  }

  function cancelLongPress() {
    cancelLongPressTimerOnly();
    longPressStart = null;
  }

  function cancelLongPressTimerOnly() {
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
  }

  function showItemMenu(item, x, y) {
    const url = getEmojiItemUrl(item);
    if (!url) return;

    closeCategoryMenu();
    closeItemMenu();

    const state = loadState();
    const menu = document.createElement('div');
    menu.className = 'iirose-emoji-category-menu';
    menu.dataset.emojiUrl = url;

    const title = document.createElement('div');
    title.className = 'iirose-emoji-category-menu-title';
    title.textContent = '表情分类';
    menu.appendChild(title);

    if (state.categories.length) {
      state.categories.forEach((category) => {
        const button = document.createElement('button');
        const included = category.items.includes(url);
        button.type = 'button';
        button.className = 'iirose-emoji-category-menu-button';
        button.dataset.emojiMenuAction = 'toggle';
        button.dataset.categoryId = category.id;
        button.textContent = (included ? '✓ ' : '+ ') + category.name;
        menu.appendChild(button);
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'iirose-emoji-category-menu-empty';
      empty.textContent = '还没有分类';
      menu.appendChild(empty);
    }

    if (state.activeCategoryId !== ALL_CATEGORY_ID && categoryContainsEmoji(state, state.activeCategoryId, url)) {
      const removeCurrentButton = document.createElement('button');
      removeCurrentButton.type = 'button';
      removeCurrentButton.className = 'iirose-emoji-category-menu-button';
      removeCurrentButton.dataset.emojiMenuAction = 'remove-current';
      removeCurrentButton.textContent = '从当前分类移除';
      menu.appendChild(removeCurrentButton);
    }

    const newButton = document.createElement('button');
    newButton.type = 'button';
    newButton.className = 'iirose-emoji-category-menu-button iirose-emoji-category-menu-button--primary';
    newButton.dataset.emojiMenuAction = 'new';
    newButton.textContent = '新建分类并加入';
    menu.appendChild(newButton);

    document.body.appendChild(menu);
    itemMenu = menu;
    positionItemMenu(menu, x, y);
  }

  function showCategoryMenu(button, x, y) {
    const categoryId = button.dataset.emojiCategoryId;
    const state = loadState();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) return;

    closeItemMenu();
    closeCategoryMenu();

    const menu = document.createElement('div');
    menu.className = 'iirose-emoji-category-menu';
    menu.dataset.categoryId = category.id;

    const title = document.createElement('div');
    title.className = 'iirose-emoji-category-menu-title';
    title.textContent = category.name;
    menu.appendChild(title);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'iirose-emoji-category-menu-button iirose-emoji-category-menu-button--danger';
    deleteButton.dataset.categoryMenuAction = 'delete';
    deleteButton.textContent = '删除分类';
    menu.appendChild(deleteButton);

    document.body.appendChild(menu);
    categoryMenu = menu;
    positionItemMenu(menu, x, y);
  }

  function positionItemMenu(menu, x, y) {
    const padding = 8;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const left = clamp(x, padding, viewportWidth - rect.width - padding);
    const top = clamp(y, padding, viewportHeight - rect.height - padding);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function closeItemMenu() {
    if (!itemMenu) return;
    itemMenu.remove();
    itemMenu = null;
  }

  function closeCategoryMenu() {
    if (!categoryMenu) return;
    categoryMenu.remove();
    categoryMenu = null;
  }

  function createCategoryFromPrompt(initialEmojiUrl) {
    closeItemMenu();
    closeCategoryMenu();

    showTextDialog({
      title: '新建分类',
      placeholder: '请输入分类名称 . . .',
      confirmText: '确定',
      onConfirm: (name) => createCategory(name, initialEmojiUrl),
    });
  }

  function createCategory(rawName, initialEmojiUrl) {
    const name = rawName && rawName.trim();
    if (!name) return null;

    const state = loadState();
    const previousActiveCategoryId = state.activeCategoryId;
    const existing = state.categories.find((category) => category.name === name);
    if (existing) {
      if (initialEmojiUrl && !existing.items.includes(initialEmojiUrl)) {
        existing.items.push(initialEmojiUrl);
      }
      state.activeCategoryId = initialEmojiUrl ? existing.id : previousActiveCategoryId;
      saveState(state);
      renderCategoryBar();
      applyCategoryFilter();
      return existing;
    }

    const category = {
      id: 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      name: name.slice(0, 18),
      items: initialEmojiUrl ? [initialEmojiUrl] : [],
    };

    state.categories.push(category);
    state.activeCategoryId = initialEmojiUrl ? category.id : previousActiveCategoryId;
    saveState(state);
    renderCategoryBar();
    applyCategoryFilter();
    return category;
  }

  function deleteCategory(categoryId) {
    const state = loadState();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) return;

    state.categories = state.categories.filter((item) => item.id !== categoryId);
    if (state.activeCategoryId === categoryId) {
      state.activeCategoryId = ALL_CATEGORY_ID;
    }

    saveState(state);
    renderCategoryBar();
    applyCategoryFilter();
  }

  function showTextDialog(options) {
    closeDialog();

    const dialog = createDialogShell({
      title: options.title || '编辑',
      confirmText: options.confirmText || '确定',
      danger: false,
    });

    const inputWrap = document.createElement('div');
    inputWrap.className = 'iirose-emoji-dialog-input-wrap';

    const input = document.createElement('input');
    input.className = 'iirose-emoji-dialog-input';
    input.type = 'text';
    input.placeholder = options.placeholder || '请输入内容 . . .';
    input.maxLength = 18;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = options.value || '';
    inputWrap.appendChild(input);
    dialog.content.appendChild(inputWrap);

    dialog.confirmButton.addEventListener('click', () => {
      const value = input.value.trim();
      if (!value) {
        input.focus();
        dialog.root.classList.add('iirose-emoji-dialog--shake');
        window.setTimeout(() => dialog.root.classList.remove('iirose-emoji-dialog--shake'), 220);
        return;
      }

      closeDialog();
      if (typeof options.onConfirm === 'function') options.onConfirm(value);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        dialog.confirmButton.click();
      }
    });

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  function showConfirmDialog(options) {
    closeDialog();

    const dialog = createDialogShell({
      title: options.title || '确认',
      confirmText: options.confirmText || '确定',
      danger: Boolean(options.danger),
    });

    const message = document.createElement('div');
    message.className = 'iirose-emoji-dialog-message';
    message.textContent = options.message || '';
    dialog.content.appendChild(message);

    dialog.confirmButton.addEventListener('click', () => {
      closeDialog();
      if (typeof options.onConfirm === 'function') options.onConfirm();
    });
  }

  function createDialogShell(options) {
    const root = document.createElement('div');
    root.className = 'iirose-emoji-dialog';

    const panel = document.createElement('div');
    panel.className = 'iirose-emoji-dialog-panel';
    root.appendChild(panel);

    const header = document.createElement('div');
    header.className = 'iirose-emoji-dialog-header';
    panel.appendChild(header);

    const icon = document.createElement('span');
    icon.className = 'iirose-emoji-dialog-header-icon mdi-card-text-outline';
    header.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'iirose-emoji-dialog-title';
    title.textContent = options.title;
    header.appendChild(title);

    const closeIcon = document.createElement('button');
    closeIcon.type = 'button';
    closeIcon.className = 'iirose-emoji-dialog-close mdi-emoticon-happy-outline';
    closeIcon.title = '取消';
    header.appendChild(closeIcon);

    const content = document.createElement('div');
    content.className = 'iirose-emoji-dialog-content';
    panel.appendChild(content);

    const footer = document.createElement('div');
    footer.className = 'iirose-emoji-dialog-footer';
    panel.appendChild(footer);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'iirose-emoji-dialog-button iirose-emoji-dialog-button--cancel';
    cancelButton.innerHTML = '<span class="buttonIcon mdi-cancel"></span><span class="buttonText">取消</span>';
    footer.appendChild(cancelButton);

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'iirose-emoji-dialog-button iirose-emoji-dialog-button--confirm';
    if (options.danger) confirmButton.classList.add('iirose-emoji-dialog-button--danger');
    confirmButton.innerHTML = '<span class="buttonIcon mdi-check"></span><span class="buttonText"></span>';
    confirmButton.querySelector('.buttonText').textContent = options.confirmText || '确定';
    footer.appendChild(confirmButton);

    const close = () => closeDialog();
    closeIcon.addEventListener('click', close);
    cancelButton.addEventListener('click', close);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });

    document.body.appendChild(root);
    activeDialog = root;
    positionDialog(root);
    window.setTimeout(() => positionDialog(root), 80);
    return {
      root,
      content,
      confirmButton,
    };
  }

  function positionActiveDialog() {
    if (activeDialog) positionDialog(activeDialog);
  }

  function positionDialog(root) {
    const panel = root && root.querySelector('.iirose-emoji-dialog-panel');
    if (!panel) return;

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const panelRect = panel.getBoundingClientRect();
    const faceHolder = document.querySelector(FACE_HOLDER_SELECTOR);
    const faceHolderRect = faceHolder && isCustomEmojiPanelActive() ? faceHolder.getBoundingClientRect() : null;
    const availableBottom = faceHolderRect && faceHolderRect.top > 80
      ? Math.min(faceHolderRect.top, viewportHeight)
      : viewportHeight;
    const top = clamp((availableBottom - panelRect.height) / 2, 12, viewportHeight - panelRect.height - 12);
    const left = clamp(viewportWidth / 2 - panelRect.width / 2, 12, viewportWidth - panelRect.width - 12);

    root.style.setProperty('--iirose-emoji-dialog-left', left + 'px');
    root.style.setProperty('--iirose-emoji-dialog-top', top + 'px');
  }

  function closeDialog() {
    if (!activeDialog) return;
    activeDialog.remove();
    activeDialog = null;
  }

  function toggleEmojiInCategory(categoryId, emojiUrl) {
    if (!categoryId || !emojiUrl) return;

    const state = loadState();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) return;

    const index = category.items.indexOf(emojiUrl);
    if (index >= 0) {
      category.items.splice(index, 1);
    } else {
      category.items.push(emojiUrl);
    }

    saveState(state);
    renderCategoryBar();
    applyCategoryFilter();
  }

  function removeEmojiFromCategory(categoryId, emojiUrl) {
    if (!categoryId || categoryId === ALL_CATEGORY_ID || !emojiUrl) return;

    const state = loadState();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) return;

    category.items = category.items.filter((item) => item !== emojiUrl);
    saveState(state);
    renderCategoryBar();
    applyCategoryFilter();
  }

  function applyCategoryFilter() {
    const state = loadState();
    const items = getCustomEmojiItems();
    const activeCategory = state.categories.find((category) => category.id === state.activeCategoryId);
    const allowedUrls = activeCategory ? new Set(activeCategory.items) : null;

    if (!activeCategory && state.activeCategoryId !== ALL_CATEGORY_ID) {
      state.activeCategoryId = ALL_CATEGORY_ID;
      saveState(state);
      renderCategoryBar();
    }

    items.forEach((item) => {
      const url = getEmojiItemUrl(item);
      const hidden = Boolean(allowedUrls && !allowedUrls.has(url));
      item.classList.toggle('iirose-emoji-category-hidden', hidden);
    });
  }

  function pruneCategories() {
    const existingUrls = new Set(getCustomEmojiItems().map(getEmojiItemUrl).filter(Boolean));
    if (!existingUrls.size) return;

    const state = loadState();
    let changed = false;

    state.categories.forEach((category) => {
      const nextItems = category.items.filter((url) => existingUrls.has(url));
      if (nextItems.length !== category.items.length) {
        category.items = nextItems;
        changed = true;
      }
    });

    if (changed) saveState(state);
  }

  function getCustomEmojiItems() {
    return Array.from(document.querySelectorAll(CUSTOM_EMOJI_BOX_SELECTOR + ' .faceHolderBoxChildItem[c]'))
      .filter((item) => getEmojiItemUrl(item));
  }

  function findCustomEmojiItem(target) {
    if (!target || target.nodeType !== 1) return null;

    const item = target.closest(CUSTOM_EMOJI_BOX_SELECTOR + ' .faceHolderBoxChildItem[c]');
    if (!item) return null;
    return getEmojiItemUrl(item) ? item : null;
  }

  function findCategoryButton(target) {
    if (!target || target.nodeType !== 1) return null;

    const button = target.closest('.iirose-emoji-category-bar .iirose-emoji-category-button[data-emoji-category-id], .iirose-emoji-category-bar .iirose-emoji-category-button--add, .iirose-emoji-category-bar .iirose-emoji-category-button--sync');
    if (!button) return null;
    const categoryId = button.dataset.emojiCategoryId;
    if (!categoryId || categoryId === ALL_CATEGORY_ID) return null;
    return button;
  }

  function getEmojiItemUrl(item) {
    const value = item && item.getAttribute && item.getAttribute('c');
    const normalized = normalizeEmojiUrl(value);
    return normalized.includes('://') ? normalized : '';
  }

  function normalizeEmojiUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('s://')) return 'https://' + value.slice(4);
    if (value.startsWith('://')) return 'http://' + value.slice(3);
    return value;
  }

  function isCustomEmojiPanelActive() {
    const content = document.querySelector(CUSTOM_EMOJI_CONTENT_SELECTOR);
    if (!content) return false;

    const style = getComputedStyle(content);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return Number(style.opacity || 1) > 0;
  }

  function loadState() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      raw = null;
    }

    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        parsed = null;
      }
    }

    const state = {
      activeCategoryId: ALL_CATEGORY_ID,
      categories: [],
    };

    if (parsed && typeof parsed === 'object') {
      state.activeCategoryId = typeof parsed.activeCategoryId === 'string'
        ? parsed.activeCategoryId
        : ALL_CATEGORY_ID;

      if (Array.isArray(parsed.categories)) {
        state.categories = parsed.categories
          .map(sanitizeCategory)
          .filter(Boolean);
      }
    }

    if (state.activeCategoryId !== ALL_CATEGORY_ID && !hasCategory(state, state.activeCategoryId)) {
      state.activeCategoryId = ALL_CATEGORY_ID;
    }

    return state;
  }

  function sanitizeCategory(category) {
    if (!category || typeof category !== 'object') return null;

    const id = String(category.id || '').trim();
    const name = String(category.name || '').trim();
    if (!id || !name) return null;

    const seen = new Set();
    const items = Array.isArray(category.items) ? category.items : [];

    return {
      id,
      name: name.slice(0, 18),
      items: items
        .map(normalizeEmojiUrl)
        .filter((url) => url.includes('://'))
        .filter((url) => {
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        }),
    };
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeCategoryId: state.activeCategoryId || ALL_CATEGORY_ID,
        categories: state.categories.map(sanitizeCategory).filter(Boolean),
      }));
    } catch (error) {
      // localStorage may be unavailable in restricted browser modes.
    }
  }

  function hasCategory(state, categoryId) {
    if (categoryId === ALL_CATEGORY_ID) return true;
    return state.categories.some((category) => category.id === categoryId);
  }

  function categoryContainsEmoji(state, categoryId, emojiUrl) {
    const category = state.categories.find((item) => item.id === categoryId);
    return Boolean(category && category.items.includes(emojiUrl));
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(max, value));
  }

  function injectStyle() {
    let style = document.getElementById('iirose-emoji-categories-style');

    if (!style) {
      style = document.createElement('style');
      style.id = 'iirose-emoji-categories-style';
      document.head.appendChild(style);
    }

    style.textContent = `
#faceHolder .emojiContentBox[index="4"] .emojiPage .iirose-emoji-category-bar {
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  max-width: calc(100% - 92px) !important;
  height: 100% !important;
  margin-left: 6px !important;
  padding: 0 4px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  vertical-align: top !important;
  background: transparent !important;
  border: 0 !important;
  scrollbar-width: none !important;
}

#faceHolder .emojiContentBox[index="4"] .emojiPage .iirose-emoji-category-bar[hidden] {
  display: none !important;
}

#faceHolder .emojiContentBox[index="4"] .emojiPage .iirose-emoji-category-bar::-webkit-scrollbar {
  display: none !important;
}

.iirose-emoji-category-button {
  box-sizing: border-box !important;
  flex: 0 0 auto !important;
  max-width: 96px !important;
  height: 24px !important;
  padding: 0 10px !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 6px !important;
  background: #fff !important;
  color: #222 !important;
  font-size: 13px !important;
  line-height: 22px !important;
  text-align: center !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.iirose-emoji-category-button--active {
  background: #2f7cf6 !important;
  border-color: #2f7cf6 !important;
  color: #fff !important;
}

.iirose-emoji-category-button--add {
  width: 28px !important;
  padding: 0 !important;
  font-size: 18px !important;
  line-height: 20px !important;
}

.iirose-emoji-category-button--sync {
  width: 28px !important;
  padding: 0 !important;
  font-size: 13px !important;
  line-height: 22px !important;
}

.iirose-emoji-category-hidden {
  display: none !important;
}

.iirose-emoji-category-menu {
  box-sizing: border-box !important;
  position: fixed !important;
  z-index: 2147483647 !important;
  width: 168px !important;
  max-width: calc(100vw - 16px) !important;
  padding: 8px !important;
  border-radius: 8px !important;
  background: rgba(48, 48, 48, 0.96) !important;
  color: #fff !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24) !important;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.iirose-emoji-category-menu-title {
  box-sizing: border-box !important;
  padding: 2px 4px 8px !important;
  font-size: 13px !important;
  line-height: 18px !important;
  color: rgba(255, 255, 255, 0.72) !important;
}

.iirose-emoji-category-menu-empty {
  box-sizing: border-box !important;
  padding: 8px 4px !important;
  font-size: 13px !important;
  line-height: 18px !important;
  color: rgba(255, 255, 255, 0.6) !important;
}

.iirose-emoji-category-menu-button {
  box-sizing: border-box !important;
  display: block !important;
  width: 100% !important;
  min-height: 32px !important;
  margin: 0 !important;
  padding: 7px 8px !important;
  border: 0 !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: #fff !important;
  font-size: 14px !important;
  line-height: 18px !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  cursor: pointer !important;
}

.iirose-emoji-category-menu-button:hover {
  background: rgba(255, 255, 255, 0.12) !important;
}

.iirose-emoji-category-menu-button--primary {
  margin-top: 4px !important;
  background: rgba(47, 124, 246, 0.92) !important;
}

.iirose-emoji-category-menu-button--danger {
  color: #ffdddd !important;
}

.iirose-emoji-category-menu-button--danger:hover {
  background: rgba(214, 65, 65, 0.32) !important;
}

.iirose-emoji-dialog {
  box-sizing: border-box !important;
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  display: block !important;
  background: transparent !important;
  color: #333 !important;
  padding: 0 !important;
  pointer-events: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.iirose-emoji-dialog-panel {
  box-sizing: border-box !important;
  position: fixed !important;
  left: var(--iirose-emoji-dialog-left, 50%) !important;
  top: var(--iirose-emoji-dialog-top, 50%) !important;
  width: min(684px, calc(100vw - 48px)) !important;
  height: 384px !important;
  max-height: calc(100vh - 48px) !important;
  display: flex !important;
  flex-direction: column !important;
  background: rgba(240, 240, 240, 0.58) !important;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.2) !important;
  pointer-events: auto !important;
}

.iirose-emoji-dialog-header {
  box-sizing: border-box !important;
  flex: 0 0 48px !important;
  display: flex !important;
  align-items: center !important;
  gap: 20px !important;
  padding: 0 28px !important;
  background: #6589cc !important;
  color: rgba(255, 255, 255, 0.92) !important;
  font-weight: bold !important;
}

.iirose-emoji-dialog-header-icon,
.iirose-emoji-dialog-close {
  width: 34px !important;
  height: 34px !important;
  line-height: 34px !important;
  font-family: md !important;
  font-size: 30px !important;
  text-align: center !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.iirose-emoji-dialog-title {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  font-size: 20px !important;
  line-height: 30px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.iirose-emoji-dialog-close {
  flex: 0 0 auto !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  cursor: pointer !important;
}

.iirose-emoji-dialog-content {
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 30px 28px !important;
  overflow: auto !important;
  background: rgba(240, 240, 240, 0.78) !important;
}

.iirose-emoji-dialog-input-wrap {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 520px !important;
}

.iirose-emoji-dialog-input {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 52px !important;
  padding: 0 2px !important;
  border: 0 !important;
  border-bottom: 2px solid rgba(101, 137, 204, 0.6) !important;
  outline: 0 !important;
  background: transparent !important;
  color: #333 !important;
  font-weight: bold !important;
  font-size: 20px !important;
  line-height: 52px !important;
}

.iirose-emoji-dialog-input::placeholder {
  color: rgba(60, 60, 60, 0.62) !important;
}

.iirose-emoji-dialog-message {
  box-sizing: border-box !important;
  max-width: 680px !important;
  padding: 8px 0 !important;
  color: rgba(45, 45, 45, 0.82) !important;
  font-weight: bold !important;
  font-size: 18px !important;
  line-height: 30px !important;
}

.iirose-emoji-dialog-footer {
  box-sizing: border-box !important;
  flex: 0 0 48px !important;
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  background: rgba(255, 255, 255, 0.86) !important;
}

.iirose-emoji-dialog-button {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 18px !important;
  min-width: 0 !important;
  height: 48px !important;
  padding: 0 16px !important;
  border: 0 !important;
  border-radius: 0 !important;
  font-weight: bold !important;
  font-size: 20px !important;
  line-height: 28px !important;
  cursor: pointer !important;
}

.iirose-emoji-dialog-button .buttonIcon {
  font-family: md !important;
  font-size: 31px !important;
  line-height: 31px !important;
}

.iirose-emoji-dialog-button--cancel {
  background: rgba(255, 255, 255, 0.78) !important;
  color: #6589cc !important;
}

.iirose-emoji-dialog-button--confirm {
  background: #6589cc !important;
  color: rgba(255, 255, 255, 0.92) !important;
}

.iirose-emoji-dialog-button--danger {
  background: #b85c5c !important;
}

.iirose-emoji-dialog--shake .iirose-emoji-dialog-panel {
  animation: iiroseEmojiDialogShake 0.2s linear;
}

@keyframes iiroseEmojiDialogShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}

@media (max-width: 520px) {
  #faceHolder .emojiContentBox[index="4"] .emojiPage .iirose-emoji-category-bar {
    gap: 7px !important;
    max-width: calc(100% - 86px) !important;
  }

  .iirose-emoji-category-button {
    height: 28px !important;
    line-height: 26px !important;
    font-size: 14px !important;
  }

  .iirose-emoji-dialog-header {
    flex-basis: 48px !important;
    gap: 18px !important;
    padding: 0 18px !important;
  }

  .iirose-emoji-dialog-title {
    font-size: 21px !important;
  }

  .iirose-emoji-dialog-content {
    padding: 26px 22px !important;
  }

  .iirose-emoji-dialog-input {
    font-size: 19px !important;
  }

  .iirose-emoji-dialog-footer {
    flex-basis: 48px !important;
  }

  .iirose-emoji-dialog-button {
    height: 48px !important;
    font-size: 19px !important;
  }
}
`;
  }
})();
