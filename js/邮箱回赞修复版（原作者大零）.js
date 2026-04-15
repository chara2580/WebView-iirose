(function () {
    console.log("【邮箱快捷回赞】正在运行");

    // 字符串规范化函数：用于模糊匹配
    function normalizeString(str) {
        if (!str) return '';
        // 1. NFKC 规范化（兼容全角/半角）
        // 2. 转小写
        // 3. 移除零宽字符、不可见控制字符（保留字母数字中文等）
        return str.normalize('NFKC').toLowerCase()
            .replace(/[\u200B-\u200D\uFEFF]/g, '')   // 零宽字符
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // 控制字符
    }

    // 异步获取 uid（模糊匹配），最多重试 retries 次，每次间隔 delay ms
    // 返回真实 uid 或 '???'（表示最终未找到）
    async function fetchUidWithRetry(cardTagName, retries = 3, delay = 200) {
        const normCardName = normalizeString(cardTagName);
        for (let i = 0; i < retries; i++) {
            try {
                const userlistL = window["Objs"]?.mapHolder?.Assets?.userlistL;
                const userlistUid = window["Objs"]?.mapHolder?.Assets?.userlistUid;
                if (userlistL && userlistUid && Array.isArray(userlistL)) {
                    // 遍历查找，使用规范化比较
                    for (let idx = 0; idx < userlistL.length; idx++) {
                        const normUserName = normalizeString(userlistL[idx]);
                        if (normUserName === normCardName) {
                            const uid = userlistUid[idx];
                            if (uid !== undefined && uid !== null) {
                                return uid;
                            }
                        }
                    }
                }
            } catch (e) {
                // 忽略错误，继续重试
            }
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return '???'; // 最终未找到返回三个问号
    }

    // ---------- 初始化逻辑 ----------
    function startObserving(targetNode) {
        const config = { attributes: true, childList: true, subtree: true };
        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement && node.classList.contains('cardTag')) {
                            addBtn(node);
                        }
                    }
                }
            }
        });
        observer.observe(targetNode, config);
    }

    function initLikeBtn() {
        const leaveMsgHolder = document.getElementById("leaveMsgHolder");
        if (!leaveMsgHolder) return;
        const cardTagArr = leaveMsgHolder.querySelectorAll(".cardTag");
        cardTagArr.forEach((cardTag) => {
            addBtn(cardTag);
        });
    }

    function addBtn(cardTag) {
        const cardTagC = cardTag.querySelector(".cardTagC");
        if (!cardTagC || cardTagC.textContent.slice(0, 8) !== "系统 : 赞了您") return;

        const cardTagName = cardTag.querySelector(".cardTagName").textContent;

        // 设置容器相对定位
        cardTagC.style.position = "relative";

        // 立即创建 uid 显示标签（初始显示 '???'）
        const uidSpan = document.createElement('span');
        uidSpan.textContent = ` UID: ???`;
        uidSpan.style.marginLeft = '8px';
        uidSpan.style.color = '#aaa';
        uidSpan.style.fontSize = '12px';
        uidSpan.style.fontWeight = 'normal';
        uidSpan.style.verticalAlign = 'middle';
        cardTagC.appendChild(uidSpan);

        // 异步获取真实 uid，只有获取成功才添加点赞按钮
        fetchUidWithRetry(cardTagName, 3, 200).then(realUid => {
            if (realUid !== '???') {
                // 更新 UID 显示
                uidSpan.textContent = ` UID: ${realUid}`;

                // 创建点赞按钮（无留言）
                const span1 = document.createElement('span');
                span1.classList.add('whoisTouch', 'mdi-thumb-up-outline');
                span1.style.right = '40px';
                span1.style.top = "24px";
                span1.style.position = 'absolute';
                span1.style.fontFamily = 'md';
                span1.style.fontSize = '18px';
                span1.style.transition = 'transform .125s';
                span1.style.display = 'inline-block';
                span1.style.lineHeight = '24px';
                span1.style.verticalAlign = 'top';
                span1.addEventListener("click", () => {
                    window["socket"].send(`+*${realUid}`);
                    window["_alert"]("点赞信息已发送");
                });

                // 创建带留言的点赞按钮
                const span2 = document.createElement('span');
                span2.classList.add('whoisTouch', 'mdi-comment-text-outline');
                span2.style.right = '12px';
                span2.style.top = "24px";
                span2.style.position = 'absolute';
                span2.style.fontFamily = 'md';
                span2.style.fontSize = '18px';
                span2.style.transition = 'transform .125s';
                span2.style.display = 'inline-block';
                span2.style.lineHeight = '24px';
                span2.style.verticalAlign = 'top';
                span2.addEventListener("click", () => {
                    window["Utils"].sync(3, [window["languageArr"][7][187], 10000, ''], (content) => {
                        if (content) {
                            window["socket"].send(`+*${realUid} ${content}`);
                            window["_alert"]("点赞信息已发送");
                        }
                    });
                });

                cardTagC.appendChild(span1);
                cardTagC.appendChild(span2);
            }
            // 若获取失败，仅保留 UID: ??? 的显示，不添加按钮
        });
    }

    // ---------- 方案一：立即检查 + 监听 ----------
    function tryInit() {
        const existingHolder = document.getElementById('leaveMsgHolder');
        if (existingHolder) {
            startObserving(existingHolder);
            initLikeBtn();
            return true;
        }
        return false;
    }

    // 如果已经存在，直接处理
    if (tryInit()) {
        return;
    }

    // 否则监听父节点等待出现
    const parentTarget = document.getElementById('hidePanel');
    if (!parentTarget) {
        console.warn("【邮箱快捷回赞】未找到 hidePanel，请检查页面结构");
        return;
    }

    const config = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationsList, obs) => {
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement && node.id === 'leaveMsgHolder') {
                    startObserving(node);
                    initLikeBtn();
                    obs.disconnect();
                    return;
                }
            }
        }
    });
    observer.observe(parentTarget, config);
})();