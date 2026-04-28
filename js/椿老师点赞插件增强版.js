(function() {
    const likedCache = new Set(); 

    // 获取点赞列表解析
    const get_liked_user = (data) => {
        try { return data.split(">")[16].split('"')[1].split("'"); } catch (e) { return []; }
    };

    // 内存用户名检索
    const getUsernameByUID = (uid) => {
        if (!uid) return null; 
        const assets = window["Objs"]?.mapHolder?.Assets;
        const idx = assets?.userlistUid?.indexOf(uid);
        return idx > -1 ? assets.userlistL[idx] : null;
    };

    // 带备注点赞发送逻辑
    function send_like_with_comment(uid) {
        if (window["Utils"]?.backward) window["Utils"].backward();
        setTimeout(() => {
            const title = window["languageArr"]?.[7]?.[187] || "备注内容";
            window["Utils"].sync(3, [title, 10000, ''], (content) => {
                if (content) {
                    window["socket"].send(`+*${uid} ${content}`);
                    likedCache.add(uid);
                    updateStatus(true);
                    window["_alert"]("备注点赞已发送");
                }
            });
        }, 160);
    }

    // --- UI 注入：融合第一段的高度控制与第二段的视觉结构 ---
    function injectButtons(uid) {
        const box = document.getElementById("selectHolderBox");
        if (!box || document.getElementById("send_like_container")) return;

        const isLiked = likedCache.has(uid);
        const container = document.createElement('div');
        container.id = "send_like_container";
        
        // 参考第一段：硬编码高度 85px，使用 flex 确保整齐
        container.style.cssText = "display: flex; width: 100%; height: 85px; border-top: 1px solid rgba(255,255,255,0.08); overflow: hidden;";

        const opacity = isLiked ? "0.35" : "1";
        const textLike = isLiked ? "已经赞了" : "点赞";

        // 内部结构：采用第二段的文字+图标方案，但放弃绝对定位，改用 Flex 垂直居中
        container.innerHTML = `
            <div id="btn_pure_like" class="selectHolderBoxItem selectHolderBoxItemIcon" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; border-right:1px solid rgba(255,255,255,0.05); opacity:${opacity}; padding:0; height:100%;">
                <div class="mdi-thumb-up" style="font-family:md; font-size:26px; opacity:.7; margin-bottom:2px;"></div>
                <span id="like_text" style="font-size:12px;">${textLike}</span>
                <div id="touch_pure" class="fullBox whoisTouch3"></div>
            </div>

            <div id="btn_comment_like" class="selectHolderBoxItem selectHolderBoxItemIcon" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; opacity:${opacity}; padding:0; height:100%;">
                <div class="mdi-comment-text-outline" style="font-family:md; font-size:26px; opacity:.7; margin-bottom:2px;"></div>
                <span id="comment_text" style="font-size:12px;">备注点赞</span>
                <div id="touch_comment" class="fullBox whoisTouch3"></div>
            </div>
        `;

        box.appendChild(container);

        // 绑定点击事件
        document.getElementById("touch_pure").onclick = (e) => {
            e.stopPropagation();
            if (likedCache.has(uid)) return;
            window["socket"].send("+*" + uid);
            likedCache.add(uid);
            updateStatus(true);
            window["_alert"]("点赞已发送");
        };

        document.getElementById("touch_comment").onclick = (e) => {
            e.stopPropagation();
            if (likedCache.has(uid)) return;
            send_like_with_comment(uid);
        };
    }

    function updateStatus(isLiked) {
        if (!isLiked) return;
        const b1 = document.getElementById("btn_pure_like");
        const b2 = document.getElementById("btn_comment_like");
        if (b1) b1.style.opacity = "0.35";
        if (b2) b2.style.opacity = "0.35";
        const t1 = document.getElementById("like_text");
        if (t1) t1.innerText = "已经赞了";
    }

    // --- 核心拦截器：保留 switch 逻辑兼容离线提取 ---
    const originalEvent = window["Objs"].mapHolder.function.event;
    window["Objs"].mapHolder.function.event = function(...args) {
        const result = originalEvent.apply(this, args);
        if (args[0] === 7) {
            let targetUid = null;
            let targetName = null;

            switch(args.length) {
                case 1:
                    if (this instanceof Element) {
                        targetUid = this.getAttribute("uid") || this.getAttribute("data-uid");
                        if (targetUid) targetName = getUsernameByUID(targetUid);
                    }
                    break;
                case 2:
                    targetName = args[1][0]; 
                    targetUid = args[1][4];
                    break;
            }

            if (targetUid && targetUid !== "null" && targetName !== window["myself"]) {
                window.__lastClickedUid = targetUid;
                if (targetName) window["socket"].send("+-" + targetName.toLowerCase());

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        injectButtons(targetUid);
                    });
                });
            }
        }
        return result;
    };

    // WebSocket 状态同步
    const originalWS = window["socket"]._onmessage;
    window["socket"]._onmessage = function(...args) {
        const msg = args[0];
        if (typeof msg === "string" && msg.startsWith("+1")) {
            const list = get_liked_user(msg);
            if (list.includes(window["myself"])) {
                if (window.__lastClickedUid) likedCache.add(window.__lastClickedUid);
                updateStatus(true);
            }
        }
        return originalWS.apply(this, args);
    };
})();