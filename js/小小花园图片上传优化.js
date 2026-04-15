(function() {
    'use strict';

    console.log("【上传行为劫持插件】已启动：强制相册优先模式");

    /**
     * 核心修改函数：强制修改。 input 属性
     */
    function forceImageMode(el) {
        if (el && el.tagName === 'INPUT' && el.type === 'file') {
            // 1. 设置 accept 为图片，这是安卓识别“打开相册”的关键
            el.setAttribute('accept', 'image/*');
            
            // 2. 移除 capture 属性
            // 如果 capture="camera"，会强制打开相机
            // 移除它后，安卓系统通常会弹出“相机/相册”选择菜单
            el.removeAttribute('capture');
            
            // 3. 某些顽固的 input 可能有多个 accept 值，强制重写
            if (el.accept !== 'image/*') {
                el.accept = 'image/*';
            }
            
            console.log("成功劫持到一个上传按钮:", el);
        }
    }

    /**
     * 逻辑 1: 捕获点击瞬间（最有效）
     * 很多插件在点击时才动态生成 input，我们在点击那一刻进行拦截
     */
    window.addEventListener('click', function(e) {
        // 扫描全页面所有的 file input
        const inputs = document.querySelectorAll('input[type="file"]');
        inputs.forEach(forceImageMode);
    }, true); // true 表示在捕获阶段执行，优先级最高

    /**
     * 逻辑 2: 动态监听 DOM 变化
     * 针对单页应用（Vue/React），按钮可能是后来才出现在页面上的
     */
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // 如果是新加的 input
                if (node instanceof HTMLElement) {
                    if (node.tagName === 'INPUT') {
                        forceImageMode(node);
                    }
                    // 或者是包含 input 的容器
                    const children = node.querySelectorAll?.('input[type="file"]');
                    children?.forEach(forceImageMode);
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    /**
     * 逻辑 3: 页面加载完成后立即扫描一遍
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('input[type="file"]').forEach(forceImageMode);
        });
    } else {
        document.querySelectorAll('input[type="file"]').forEach(forceImageMode);
    }

})();
