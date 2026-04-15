javascript:(function() {
    var imgs = document.getElementsByTagName('img');
    var MAX_SCALE = 3.0;

    for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];

        // 基础加速配置
        img.style.willChange = 'transform';
        img.style.transform = 'scale(1) translateZ(0)';
        img.style.backfaceVisibility = 'hidden';
        img.setAttribute('decoding', 'async');
        
        // 【唯一改动】：强制全程像素化，移除 1.5 倍的判断逻辑
        img.style.imageRendering = 'pixelated';

        img.dataset.currentScale = '1.0';
        var lastScale = 1.0;

        img.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                lastScale = Math.sqrt(dx*dx + dy*dy);
                e.preventDefault();
            }
        }, { passive: false });

        img.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                var currentDistance = Math.sqrt(dx*dx + dy*dy);
                var scaleDelta = currentDistance / lastScale;
                var currentScale = parseFloat(this.dataset.currentScale);
                var newScale = currentScale * scaleDelta;
                newScale = Math.min(MAX_SCALE, Math.max(1.0, newScale));

                this.style.transform = 'scale(' + newScale + ') translateZ(0)';
                this.dataset.currentScale = newScale;

                lastScale = currentDistance;
            }
        }.bind(img));

        img.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) lastScale = 1.0;
        });
    }
})();