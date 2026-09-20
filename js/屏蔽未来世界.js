(function () {
  const black = JSON.parse(localStorage.getItem('iirose_splash_black') || '[]');
  if (!black.includes('6aa27a76974af')) {
    black.push('6aa27a76974af');
    localStorage.setItem('iirose_splash_black', JSON.stringify(black));
  }