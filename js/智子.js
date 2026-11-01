(function () {
  const CONFIG = {
    url: 'wss://m8.iirose.com:443',
    loginPacket: '*{"r":"5ce6a4b520a90","n":"智子","i":"http://r.iirose.com/i/26/9/20/19/3039-BZ.jpg","nc":"ac81a2","s":"4","st":"n","mo":"","uid":"X999999999999","li":"032003330934","mb":"3","mu":"03","la":"三体第一舰队","vc":"1142","fp":"@efb4eedb61f61939ba87855987e5751d"}\n',
    reconnectInterval: 300000, // 5 分钟
    heartbeatInterval: 30000   // 30 秒
  };

  let ws = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let stopped = false;

  function log(...args) {
    console.log(`[${new Date().toLocaleTimeString()}]`, ...args);
  }

  function scheduleReconnect() {
    if (stopped) return;
    reconnectTimer = setTimeout(connect, CONFIG.reconnectInterval);
  }

  function connect() {
    if (stopped) return;
    log('正在尝试连接服务器...');

    try {
      ws = new WebSocket(CONFIG.url);
    } catch (e) {
      console.error('创建 WebSocket 失败:', e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      log('连接已建立，发送登录包...');
      ws.send(CONFIG.loginPacket);

      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send('');
          // 若服务端要求心跳带换行，改成：ws.send('\n');
        }
      }, CONFIG.heartbeatInterval);
    };

    // 丢弃所有接收到的消息，防止终端卡死
    ws.onmessage = () => {};

    ws.onerror = (err) => {
      console.error(`[${new Date().toLocaleTimeString()}] Socket 错误:`, err);
    };

    ws.onclose = (event) => {
      const code = event.code;
      const reason = event.reason || '';

      log(
        `连接已断开，code=${code}，reason=${reason || '无'}。` +
        `将在 ${CONFIG.reconnectInterval / 1000} 秒后重新连接...`
      );

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      scheduleReconnect();
    };
  }

  function stop() {
    stopped = true;
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) {
      try { ws.close(); } catch (e) {}
      ws = null;
    }
    log('已停止');
  }

  connect();
  window.__wsBot = { stop, connect, get ws() { return ws; } };
  console.log('提示：运行 __wsBot.stop() 可停止；__wsBot.ws 可查看当前连接。');
})();