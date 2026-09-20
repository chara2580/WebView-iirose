// IIROSE Anti-Recall (精准借力捕获版)
(function(){
    var KEY = 'mc_v9';
    var cfg = {on: true, antiRecall: true};
    function load(){try{var s=localStorage.getItem(KEY);if(s)cfg=JSON.parse(s);}catch(e){}}
    function save(){localStorage.setItem(KEY,JSON.stringify(cfg));}
    load();

    if(cfg.on && cfg.antiRecall && typeof Utils !== 'undefined' && Utils.service && Utils.service.revokeMsg){
        var origRevoke = Utils.service.revokeMsg.bind(Utils.service);
        
        Utils.service.revokeMsg = function(e, t){
            try{
                var parts = t.split('"');
                var recallUid = parts[0] ? parts[0].substr(0,13) : '';
                
                // 只有别人撤回时才拦截打标（自己的撤回放行）
                if(typeof uid !== 'undefined' && recallUid !== uid){
                    console.log('[MC] 捕捉到他人撤回指令，发送者:', recallUid);

                    // 1. 撤回前：记录当前屏幕上所有消息节点的状态快照
                    var msgNodes = Array.from(document.querySelectorAll('.chatContentHolder'));
                    var snapshots = msgNodes.map(function(node) {
                        return {
                            node: node,
                            parent: node.parentNode,
                            next: node.nextSibling,
                            html: node.innerHTML
                        };
                    });

                    // 2. 让官方原生逻辑跑一次，让它帮我们自动精准定位并修改/删除对应 DOM
                    origRevoke(e, t);

                    // 3. 原生修改是同步完成的，立刻检查是哪个节点发生了变化或被移除
                    var restoredCount = 0;
                    snapshots.forEach(function(item) {
                        var node = item.node;
                        var wasRemoved = !document.body.contains(node);
                        var wasChanged = node.innerHTML !== item.html;

                        // 一旦发现某个节点被原生撤回函数动了
                        if (wasRemoved || wasChanged) {
                            // 如果被原生删除，放回原来的位置
                            if (wasRemoved && item.parent) {
                                item.parent.insertBefore(node, item.next);
                            }
                            
                            // 还原原本的内容，并打上 [已防撤回] 视觉提示
                            if (node.getAttribute('data-restored') !== 'true') {
                                node.innerHTML = '<span style="color:#ff4757;font-weight:bold;margin-right:6px;">[已防撤回]</span>' + item.html;
                                node.setAttribute('data-restored', 'true');
                                node.classList.remove('bgLight');
                                node.classList.add('bgDark');
                            }
                            restoredCount++;
                        }
                    });

                    if (restoredCount > 0) {
                        console.log('[MC] 已成功精准拦截并给 ' + restoredCount + ' 条消息打上提示标签');
                    } else {
                        console.log('[MC] 消息可能不在视野内或已被清理');
                    }

                    return;
                }
            }catch(ex){
                console.error('[MC] 防撤回解析异常', ex);
            }
            
            // 自己撤回走正常逻辑
            return origRevoke(e, t);
        };
        console.log('[MC] 智能防撤回已就绪');
    }
})();
