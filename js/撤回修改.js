// IIROSE 自己撤回 → 回填输入框（生产版 / 无日志）
(function () {
    'use strict';
    if (window.__mcSelfRecallRefill) return;
    window.__mcSelfRecallRefill = true;

    /* ===================== 输入框工具 ===================== */

    function isVisible(el) {
        if (!el || !el.getBoundingClientRect) return false;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        var s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    }

    var HINTS = ['#chatInput','#msgInput','#sendInput','#messageInput','#input',
                 '.chatInput','.chat-input','.input-box','.chat-input-box','.editor'];

    function findInput() {
        var all = [].slice.call(document.querySelectorAll(
            'textarea, input[type="text"], input:not([type]), [contenteditable="true"]'
        )).filter(function (el) {
            return isVisible(el) && !el.disabled && !el.readOnly;
        });
        if (!all.length) return null;
        if (all.length === 1) return all[0];
        for (var i = 0; i < HINTS.length; i++) {
            var hit = all.filter(function (el) {
                return el.matches && el.matches(HINTS[i]);
            });
            if (hit.length) return hit[0];
        }
        return all[0];
    }

    function setNativeValue(el, value) {
        var proto = (window.HTMLTextAreaElement && el instanceof HTMLTextAreaElement)
            ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        var d = Object.getOwnPropertyDescriptor(proto, 'value');
        if (d && d.set) d.set.call(el, value); else el.value = value;
    }

    function fillInput(text) {
        var el = findInput();
        if (!el) return;
        el.focus();
        if (el.isContentEditable) {
            el.textContent = text;
            try {
                var r = document.createRange();
                r.selectNodeContents(el); r.collapse(false);
                var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
            } catch (e) {}
        } else {
            setNativeValue(el, text);
            try { el.setSelectionRange(text.length, text.length); } catch (e) {}
        }
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
    }

    /* ===================== 回填按钮 ===================== */

    function extractText(node) {
        var c = node.cloneNode(true);
        var btns = c.querySelectorAll('.mc-refill-btn');
        for (var i = 0; i < btns.length; i++) btns[i].remove();
        var body = c.querySelector('.chatContent,.msgContent,.messageContent,.content,.text') || c;
        return (body.textContent || '').replace(/\u00a0/g, ' ').trim();
    }

    function addRefillButton(node, text) {
        if (!node || !text) return;
        if (node.querySelector(':scope > .mc-refill-btn')) return;
        var btn = document.createElement('span');
        btn.className = 'mc-refill-btn';
        btn.textContent = '↺ 回填';
        btn.title = '把这条消息放回输入框';
        btn.style.cssText =
            'display:inline-block;margin:0 0 0 8px;padding:0 6px;' +
            'border-radius:4px;background:#3b82f6;color:#fff;font-size:12px;' +
            'line-height:18px;cursor:pointer;user-select:none;vertical-align:middle;';
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            fillInput(text);
        }, true);
        node.appendChild(btn);
    }

    /* ===================== 拦截 revokeMsg ===================== */

    function isSelf(recallUid) {
        if (!recallUid) return false;
        if (typeof uid === 'undefined' || !uid) return false;
        var a = String(uid), b = String(recallUid);
        return a === b || a.indexOf(b) === 0 || b.indexOf(a) === 0;
    }

    var wrapped = false, tries = 0;

    function tryWrap() {
        tries++;
        var hasR = (typeof Utils !== 'undefined' && Utils.service && Utils.service.revokeMsg);
        if (!hasR) return false;
        if (Utils.service.revokeMsg.__mcWrapped) { wrapped = true; return true; }

        var orig = Utils.service.revokeMsg;

        function newRevoke() {
            var args = [].slice.call(arguments);

            try {
                var t = String(args[1] || '');
                var q = t.indexOf('"');
                var recallUid = q > 0 ? t.substr(0, q).substr(0, 13) : '';

                if (isSelf(recallUid)) {
                    var nodes = [].slice.call(document.querySelectorAll('.chatContentHolder'));
                    var snaps = nodes.map(function (n) {
                        return {
                            node: n,
                            parent: n.parentNode,
                            next: n.nextSibling,
                            html: n.innerHTML
                        };
                    });

                    var ret = orig.apply(Utils.service, args);

                    for (var i = 0; i < snaps.length; i++) {
                        var s = snaps[i], n = s.node;
                        var removed = !document.body.contains(n);
                        var modded = !removed && n.innerHTML !== s.html;
                        if (!removed && !modded) continue;

                        if (removed && s.parent) s.parent.insertBefore(n, s.next);
                        n.innerHTML = s.html;
                        n.setAttribute('data-self-recall', '1');
                        addRefillButton(n, extractText(n));
                    }
                    return ret;
                }
            } catch (ex) {}

            return orig.apply(Utils.service, args);
        }

        newRevoke.__mcWrapped = true;
        Utils.service.revokeMsg = newRevoke;
        wrapped = true;
        return true;
    }

    var timer = setInterval(function () {
        if (tryWrap() || tries > 120) clearInterval(timer);
    }, 500);
    tryWrap();

    /* ===================== 精简版 DOM 备用监听 ===================== */
    // 只盯着聊天列表容器，不监听整个文档，去掉 subtree 递归
    try {
        var listEl =
            document.querySelector('.chatContentHolder') &&
            document.querySelector('.chatContentHolder').parentElement;
        listEl = listEl || document.querySelector('#chatContent') || null;

        if (listEl && window.MutationObserver) {
            var mo = new MutationObserver(function () { /* 生产版不做日志，仅保底占位 */ });
            mo.observe(listEl, {childList: true, subtree: false});
        }
    } catch (e) {}
})();