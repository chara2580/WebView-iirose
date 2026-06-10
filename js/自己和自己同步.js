// 原版方式：劫持 _onmessage（已经解码好的字符串）
(function() {
    console.log("🚀 原版方式启动...");
    
    const iframe = document.getElementById("mainFrame");
    const win = iframe.contentWindow;
    const myUid = win.uid;
    
    if (!myUid) {
        console.log("❌ 未获取到 UID");
        return;
    }
    console.log("📌 当前 UID:", myUid);
    
    // 保存原始 _onmessage
    const originalOnMessage = win.socket._onmessage;
    
    // 劫持 _onmessage（原版方式）
    win.socket._onmessage = function(str) {
        // 这里的 str 已经是解码后的字符串了！
        console.log("📩 收到解码后消息:", str);
        
        // 检查是否是发给自己的消息（原版方式：看第一个字符）
        if (typeof str === "string") {
            // 匹配 #~...~# 格式
            const match = str.match(/#~([^~]+)~#/);
            if (match) {
                const cmd = match[1];
                console.log("✅✅✅ 识别到命令:", cmd);
                
                switch(cmd) {
                    case "sync":
                        console.log("🔄 执行同步操作");
                        break;
                    case "reload":
                        console.log("🔁 执行重载操作");
                        break;
                    case "test":
                        console.log("🧪 执行测试操作");
                        break;
                    default:
                        console.log("❓ 未知命令:", cmd);
                }
            }
        }
        
        // 调用原始处理器
        if (originalOnMessage) {
            originalOnMessage.call(win.socket, str);
        }
    };
    
    console.log("✅ 劫持 _onmessage 完成");
    
    // 发送测试消息
    function sendCommand(cmd) {
        win.socket?.send(JSON.stringify({
            g: myUid,
            m: `#~${cmd}~#`,
            mc: win.inputcolorhex || "#ffffff",
            i: Date.now().toString().slice(-5) + Math.random().toString().slice(-7)
        }));
        console.log(`📤 发送命令: ${cmd}`);
    }
    
    // 延迟发送测试
    setTimeout(() => sendCommand("test"), 2000);
    setTimeout(() => sendCommand("sync"), 5000);
    setTimeout(() => sendCommand("reload"), 8000);
})();