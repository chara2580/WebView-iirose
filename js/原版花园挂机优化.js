(function () {
    console.log("部署跨系统稳定版 Firefox 静音保活…");

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: "playback"
    });

    // 创建一个 ScriptProcessorNode（兼容性最好）
    const bufferSize = 256;
    const node = audioCtx.createScriptProcessor(bufferSize, 1, 1);

    node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // 极低幅度白噪声（系统认为是真实音频）
            out[i] = (Math.random() * 2 - 1) * 0.00001;
        }
    };

    const tryStart = () => {
        node.connect(audioCtx.destination);
        console.log("✅ 跨系统稳定保活已激活");
        document.removeEventListener("click", tryStart);
        document.removeEventListener("touchstart", tryStart);
    };

    document.addEventListener("click", tryStart);
    document.addEventListener("touchstart", tryStart);
})();