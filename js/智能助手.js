// 蔷薇花园(iirose.com) 智能输入助手插件 - 适配版
// 功能：空格分割自动发送、无操作自动收起、长按拖拽、右键自定义主题
(function () {
    'use strict';

    // 避免重复加载
    if (window.__iiroseSmartInputLoaded) return;
    window.__iiroseSmartInputLoaded = true;

    // 注入基础样式
    const style = document.createElement('style');
    style.textContent = `
        #iirose-smart-input {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
            font-family: system-ui, -apple-system, sans-serif;
        }
        #iirose-smart-input.collapsed {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            overflow: hidden;
            cursor: grab;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
        }
        #iirose-smart-input.expanded {
            width: 340px;
            border-radius: 14px;
            background: white;
            cursor: default;
        }
        #iirose-smart-input.dragging {
            opacity: 0.85;
            cursor: grabbing;
            transform: scale(1.03);
        }
        .iirose-plugin-inner {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
            display: flex;
            flex-direction: column;
        }
        #iirose-smart-input.expanded .iirose-plugin-inner {
            opacity: 1;
            pointer-events: auto;
        }
        .iirose-plugin-header {
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            padding: 12px 16px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 14px 14px 0 0;
        }
        .iirose-plugin-textarea {
            width: 100%;
            height: 110px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
            resize: none;
            outline: none;
            font-size: 14px;
            box-sizing: border-box;
        }
        .iirose-plugin-footer {
            padding: 0 16px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .iirose-send-btn {
            background: #6366f1;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .iirose-send-btn:hover {
            background: #4f46e5;
        }
        #iirose-context-menu {
            position: fixed;
            background: white;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.12);
            z-index: 100000;
            min-width: 170px;
            display: none;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        .iirose-menu-item {
            padding: 11px 18px;
            cursor: pointer;
            font-size: 14px;
            color: #374151;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .iirose-menu-item:hover {
            background-color: #f3f4f6;
            color: #6366f1;
        }
        .iirose-menu-divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 4px 0;
        }
        .iirose-color-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid #ddd;
        }
        .iirose-toast {
            position: fixed;
            bottom: 90px;
            right: 24px;
            background: rgba(0,0,0,0.75);
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            z-index: 100001;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);

    // 创建插件DOM
    const pluginEl = document.createElement('div');
    pluginEl.id = 'iirose-smart-input';
    pluginEl.className = 'collapsed';
    pluginEl.innerHTML = `
        <span>??</span>
        <div class="iirose-plugin-inner">
            <div class="iirose-plugin-header">
                <span style="font-weight: 600;">蔷薇智能助手</span>
                <button id="iirose-min-btn" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 16px;">▼</button>
            </div>
            <div style="padding: 0 16px;">
                <textarea class="iirose-plugin-textarea" placeholder="输入内容，空格分割自动发送..."></textarea>
                <div class="iirose-plugin-footer">
                    <span style="font-size: 12px; color: #9ca3af;">按空格拆分逐条发送</span>
                    <button class="iirose-send-btn">发送</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(pluginEl);

    // 创建自定义右键菜单
    const contextMenu = document.createElement('div');
    contextMenu.id = 'iirose-context-menu';
    contextMenu.innerHTML = `
        <div class="iirose-menu-item" data-color="#6366f1">
            <div class="iirose-color-dot" style="background:#6366f1"></div>
            <span>紫蓝主题</span>
        </div>
        <div class="iirose-menu-item" data-color="#10b981">
            <div class="iirose-color-dot" style="background:#10b981"></div>
            <span>清新绿主题</span>
        </div>
        <div class="iirose-menu-item" data-color="#ef4444">
            <div class="iirose-color-dot" style="background:#ef4444"></div>
            <span>热情红主题</span>
        </div>
        <div class="iirose-menu-divider"></div>
        <div class="iirose-menu-item" data-reset="true">
            <span>??</span>
            <span>重置位置</span>
        </div>
    `;
    document.body.appendChild(contextMenu);

    // 核心逻辑
    const state = {
        isExpanded: false,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        startLeft: 0,
        startTop: 0,
        collapseTimer: null,
        delay: 3000
    };

    const textarea = pluginEl.querySelector('.iirose-plugin-textarea');
    const sendBtn = pluginEl.querySelector('.iirose-send-btn');
    const minBtn = pluginEl.querySelector('#iirose-min-btn');

    // 自动收起计时器
    function resetCollapseTimer() {
        clearTimeout(state.collapseTimer);
        state.collapseTimer = setTimeout(() => {
            if (!document.activeElement.isSameNode(textarea)) {
                pluginEl.classList.remove('expanded');
                pluginEl.classList.add('collapsed');
                state.isExpanded = false;
            }
        }, state.delay);
    }

    // 发送逻辑：空格分割自动逐条发出
    function handleSend() {
        const rawText = textarea.value.trim();
        if (!rawText) return;
        const msgList = rawText.split(/\s+/).filter(m => m.length > 0);
        textarea.value = '';
        let idx = 0;
        const nextSend = () => {
            if (idx >= msgList.length) return;
            // 适配蔷薇花园聊天框自动发送
            const chatInput = document.querySelector('textarea, input[type="text"].chat-input');
            if (chatInput) {
                chatInput.value = msgList[idx];
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                const sendEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
                chatInput.dispatchEvent(sendEvent);
            }
            showToast(`已发送: ${msgList[idx]}`);
            idx++;
            setTimeout(nextSend, 700);
        };
        nextSend();
        resetCollapseTimer();
    }

    // 显示提示
    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'iirose-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }

    // 事件绑定
    pluginEl.addEventListener('click', e => {
        if (state.isDragging) return;
        if (e.target.closest('button')) return;
        pluginEl.classList.remove('collapsed');
        pluginEl.classList.add('expanded');
        state.isExpanded = true;
        resetCollapseTimer();
    });

    minBtn.addEventListener('click', e => {
        e.stopPropagation();
        pluginEl.classList.remove('expanded');
        pluginEl.classList.add('collapsed');
        state.isExpanded = false;
    });

    textarea.addEventListener('input', resetCollapseTimer);
    sendBtn.addEventListener('click', e => {
        e.stopPropagation();
        handleSend();
    });

    // 长按拖拽逻辑
    pluginEl.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        const rect = pluginEl.getBoundingClientRect();
        state.startLeft = rect.left;
        state.startTop = rect.top;
        state.isDragging = false;
    });

    window.addEventListener('mousemove', e => {
        if (!state.dragStartX) return;
        const dx = Math.abs(e.clientX - state.dragStartX);
        const dy = Math.abs(e.clientY - state.dragStartY);
        if (!state.isDragging && (dx > 5 || dy > 5)) {
            state.isDragging = true;
            pluginEl.classList.add('dragging');
        }
        if (state.isDragging) {
            const newL = Math.max(0, Math.min(state.startLeft + (e.clientX - state.dragStartX), window.innerWidth - 52));
            const newT = Math.max(0, Math.min(state.startTop + (e.clientY - state.dragStartY), window.innerHeight - 52));
            pluginEl.style.left = newL + 'px';
            pluginEl.style.top = newT + 'px';
            pluginEl.style.right = 'auto';
            pluginEl.style.bottom = 'auto';
        }
    });

    window.addEventListener('mouseup', () => {
        pluginEl.classList.remove('dragging');
        state.isDragging = false;
        state.dragStartX = 0;
    });

    // 自定义右键菜单
    pluginEl.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.style.display = 'block';
        contextMenu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
        contextMenu.style.top = Math.min(e.clientY, window.innerHeight - 160) + 'px';
    });

    window.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    contextMenu.addEventListener('click', e => {
        const item = e.target.closest('.iirose-menu-item');
        if (!item) return;
        if (item.dataset.color) {
            const c = item.dataset.color;
            const header = pluginEl.querySelector('.iirose-plugin-header');
            header.style.background = `linear-gradient(90deg, ${c}, ${adjustBright(c, -25)})`;
            pluginEl.querySelector('.collapsed').style.background = `linear-gradient(135deg, ${c}, ${adjustBright(c, 20)})`;
        }
        if (item.dataset.reset) {
            pluginEl.style.left = '';
            pluginEl.style.top = '';
            pluginEl.style.right = '20px';
            pluginEl.style.bottom = '20px';
        }
        contextMenu.style.display = 'none';
    });

    // 辅助：调整颜色亮度
    function adjustBright(hex, amt) {
        hex = hex.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(0,2),16) + amt));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(2,4),16) + amt));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(4,6),16) + amt));
        return '#' + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1);
    }

    showToast('蔷薇智能输入助手加载成功');
})();