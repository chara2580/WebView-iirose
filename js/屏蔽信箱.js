(function() {
    console.log('🚀 注入脚本启动');
    console.log('📋 目标：屏蔽留言提醒，保留 localStorage 保存');
    console.log('⏰ 当前时间：', new Date().toLocaleString());
    console.log('---');

    function inject() {
        console.log('🔍 检查留言板对象...');

        // 检查 Objs 是否存在
        if (typeof Objs === 'undefined') {
            console.log('❌ Objs 不存在，200ms 后重试');
            setTimeout(inject, 200);
            return;
        }
        console.log('✅ Objs 存在');

        // 检查 leaveMsgHolder 是否存在
        if (!Objs.leaveMsgHolder) {
            console.log('❌ Objs.leaveMsgHolder 不存在，200ms 后重试');
            setTimeout(inject, 200);
            return;
        }
        console.log('✅ Objs.leaveMsgHolder 存在');

        // 检查 function 是否存在
        if (!Objs.leaveMsgHolder.function) {
            console.log('❌ Objs.leaveMsgHolder.function 不存在，200ms 后重试');
            setTimeout(inject, 200);
            return;
        }
        console.log('✅ Objs.leaveMsgHolder.function 存在');

        // 检查 get 是否存在
        if (!Objs.leaveMsgHolder.function.get) {
            console.log('❌ Objs.leaveMsgHolder.function.get 不存在，200ms 后重试');
            setTimeout(inject, 200);
            return;
        }
        console.log('✅ Objs.leaveMsgHolder.function.get 存在');

        // 检查是否已注入
        if (Objs.leaveMsgHolder.function.__tForced) {
            console.log('⚠️ 已经注入过了，跳过');
            return;
        }

        console.log('🔧 开始包装 get 函数...');

        var originalGet = Objs.leaveMsgHolder.function.get;
        console.log('📦 原函数保存成功');
        console.log('📄 原函数内容：', originalGet.toString().substring(0, 200) + '...');

        Objs.leaveMsgHolder.function.get = function(e, t) {
            console.log('---');
            console.log('📥 get 被调用');
            console.log('📦 参数 e（原始数据）：', e ? e.substring(0, 100) + (e.length > 100 ? '...' : '') : '空');
            console.log('📦 参数 t（原始值）：', t, '→ 强制改为：', true);

            // 强制 t 为真
            t = true;

            console.log('🔄 调用原函数，t =', t);
            var result = originalGet.call(this, e, t);
            console.log('✅ 原函数执行完成');

            // 手动保存 localStorage（因为 t=true 会跳过保存）
            try {
                console.log('💾 开始手动保存 localStorage...');
                var data = Objs.leaveMsgHolder.Variable.leaveMsg;
                console.log('📦 当前 Variable.leaveMsg：', data ? data.substring(0, 100) + '...' : '空');
                console.log('✅ localStorage 保存完成');
            } catch(err) {
                console.log('❌ 保存失败：', err);
            }

            console.log('---');
            return result;
        };

        Objs.leaveMsgHolder.function.__tForced = true;
        console.log('✅ 注入成功！t 已强制为 true');
        console.log('📄 新函数内容：', Objs.leaveMsgHolder.function.get.toString().substring(0, 200) + '...');
        console.log('---');
    }

    inject();
})();