(function () {
  const black = JSON.parse(localStorage.getItem('iirose_splash_black') || '[]');
  if (!black.includes('6a7c38409e902')) {
    black.push('6a7c38409e902');
    localStorage.setItem('iirose_splash_black', JSON.stringify(black));
  }
  const orig = Utils.service.jumpToMaxPplRoom;
  Utils.service.jumpToMaxPplRoom = function (n) {
    const list = orig.apply(this, arguments);
    const arr = Array.isArray(list) ? list.filter(x => !black.includes(x[1])) : list;
    return arr;
  };
})();
