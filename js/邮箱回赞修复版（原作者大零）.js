(function () {
    console.log("【邮箱快捷回赞】全局监听版已加载 - 完美不白版");

    // 全局状态
    const uidCache = {};
    const whoisQueue = [];
    let isWhoisProcessing = false;
    let isSocketHooked = false;

    // 1. 注入轻量样式（只定义按钮外观和安全右边距，不改动任何容器的 display/height）
    function injectStyles() {
        if (document.getElementById('quick-like-styles')) return;
        const style = document.createElement('style');
        style.id = 'quick-like-styles';
        style.textContent = `
            .uid-display { color: #00a1d6; font-size: 12px; margin-left: 10px; }
            .uid-error { color: red; }
            .whois-btn { position: absolute; right: 40px; top: 10px; font-family: md; font-size: 18px; cursor: pointer; color: #888; }
            .whois-btn-msg { right: 12px; }
            .whois-btn-active { color: #ff4081 !important; }
        `;
        document.head.appendChild(style);
    }

    // 静默拦截 socket
    function setupSocketHook() {
        if (isSocketHooked) return;
        if (!window.socket || !window.socket.__onmessage) return;

        const origOnMessage = window.socket.__onmessage;
        window.socket.__onmessage = function (e) {
            if (typeof e === 'string' && e[0] === '+' && isWhoisProcessing && whoisQueue.length > 0) {
                const s = e.substr(1);
                const t = s[0];
                if (t === '2' || t === '3') {
                    const uid = s.substr(1).split('>')[3];
                    const task = whoisQueue.shift();
                    
                    if (uid) uidCache[task.name] = uid;
                    task.resolve(uid || '???');
                    processWhoisQueue();
                    
                    return; 
                }
            }
            return origOnMessage.apply(this, arguments);
        };
        isSocketHooked = true;
    }

    function processWhoisQueue() {
        if (whoisQueue.length === 0) {
            isWhoisProcessing = false;
            return;
        }
        setupSocketHook();
        isWhoisProcessing = true;
        const nextReq = whoisQueue[0];
        window.socket.send('++' + nextReq.name);
    }

    function getUidByName(name) {
        return new Promise(resolve => {
            if (!name) return resolve('???');
            const lowerName = name.trim().toLowerCase();

            if (uidCache[lowerName]) return resolve(uidCache[lowerName]);

            const userJson = window["Objs"]?.mapHolder?.Assets?.userJson;
            if (userJson && userJson[lowerName]) {
                const uid = userJson[lowerName][8];
                if (uid) {
                    uidCache[lowerName] = uid;
                    return resolve(uid);
                }
            }

            whoisQueue.push({ name: lowerName, resolve: resolve });
            if (!isWhoisProcessing) {
                processWhoisQueue();
            }
        });
    }

    // 核心渲染逻辑：完全延续你最初成功的布局定位方式
    function injectButtonsToCard(cardTag) {
        if (cardTag.dataset.likedBtnInjected) return;
        cardTag.dataset.likedBtnInjected = "true";

        const cardTagC = cardTag.querySelector(".cardTagC");
        const nameNode = cardTag.querySelector(".cardTagName");
        
        if (!cardTagC || !nameNode) return;
        
        const cardTagName = nameNode.innerText || nameNode.textContent;

        // 保留你原本成功的定位设置
        cardTagC.style.position = "relative";
        cardTagC.style.minHeight = "40px";

        const uidSpan = document.createElement('span');
        uidSpan.className = 'uid-display';
        uidSpan.textContent = ` UID: 获取中...`;
        cardTagC.appendChild(uidSpan);

        getUidByName(cardTagName).then(uid => {
            if (uid !== '???') {
                uidSpan.textContent = ` UID: ${uid}`;

                // 使用 innerHTML 批量插入（带上 data-uid 供事件委托使用）
                cardTagC.insertAdjacentHTML('beforeend', `
                    <span class="whoisTouch mdi-thumb-up-outline whois-btn" title="快捷点赞" data-uid="${uid}"></span>
                    <span class="whoisTouch mdi-comment-text-outline whois-btn whois-btn-msg" title="留言并点赞" data-uid="${uid}"></span>
                `);
            } else {
                uidSpan.textContent = ` UID: 查询失败`;
                uidSpan.className = 'uid-display uid-error';
            }
        });
    }

    // 2. 事件委托：统一管理点击事件，性能更好且不占内存
    function setupEventDelegation(holder) {
        if (holder.dataset.eventHooked) return;
        holder.dataset.eventHooked = "true";

        holder.addEventListener('click', (e) => {
            const target = e.target;
            const uid = target.dataset.uid;
            if (!uid) return;

            // 点赞按钮
            if (target.classList.contains('whois-btn') && !target.classList.contains('whois-btn-msg')) {
                window.socket.send(`+*${uid}`);
                target.classList.add('whois-btn-active');
            }
            // 留言并点赞按钮
            else if (target.classList.contains('whois-btn-msg')) {
                if (window.Utils && window.Utils.sync) {
                    window.Utils.sync(3, ["请输入附言", 10000, ''], (content) => {
                        if (content) {
                            window.socket.send(`+*${uid} ${content}`);
                            target.classList.add('whois-btn-active');
                        }
                    });
                }
            }
        });
    }

    let holderObserver = null;
    function observeMailbox(holder) {
        if (holderObserver) return;
        
        injectStyles();
        setupEventDelegation(holder);
        
        // 处理已有卡片
        holder.querySelectorAll('.cardTag').forEach(injectButtonsToCard);
        
        // 监听新插入的卡片
        holderObserver = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.classList.contains('cardTag')) {
                            injectButtonsToCard(node);
                        } else {
                            node.querySelectorAll('.cardTag').forEach(injectButtonsToCard);
                        }
                    }
                });
            });
        });
        holderObserver.observe(holder, { childList: true, subtree: true });
        console.log("【邮箱快捷回赞】已锁定信箱面板并开始监听留言");
    }

    function main() {
        const holder = document.getElementById("leaveMsgHolder");
        if (holder) {
            observeMailbox(holder);
        } else {
            const bodyObserver = new MutationObserver((mutations, obs) => {
                const h = document.getElementById("leaveMsgHolder");
                if (h) {
                    obs.disconnect(); // 找到后断开全局监听
                    observeMailbox(h);
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    main();
})();
