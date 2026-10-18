"use strict";
(function () {
  /* ============================================================
   * 0. 基础工具
   * ============================================================ */
  var le = "OmO_";
  function $o(n){ try { return localStorage.getItem(le+n); } catch(t){ return null; } }
  function qo(n,t){ try { localStorage.setItem(le+n,t); } catch(e){} }
  function Go(n){ try { localStorage.removeItem(le+n); } catch(t){} }
  var G = {
    get: function(n,t){ var e=$o(n); if(e==null) return t; try { return JSON.parse(e); } catch(i){ return e; } },
    set: function(n,t){ qo(n, typeof t==="string" ? t : JSON.stringify(t)); },
    del: function(n){ Go(n); }
  };

  /* ---- 定时器（多窗口共享一个循环） ---- */
  var Kt=new Set(), be=null, Jt=false;
  function Qn(){
    if(be=null, document.hidden||Jt) return;
    var n=Date.now();
    for(var t of Array.from(Kt)) if(!(n<t.next)){
      n-t.next>t.ms*3 ? t.next=n+t.ms : t.next+=t.ms;
      try{ t.fn(); }catch(e){}
    }
    Qt();
  }
  function Qt(){ be||document.hidden||Jt||(be=setTimeout(Qn,500)); }
  function to(){ if(!document.hidden){ var n=Date.now(); for(var t of Kt) t.next>n&&(t.next=n); Qt(); } }
  try{ document.addEventListener("visibilitychange",to); }catch(n){}
  function It(n){ Jt!==n&&(Jt=n,n||Qt()); }
  function Z(n,t){
    var e={ fn:n, ms:t, next:Date.now()+t };
    Kt.add(e); Qt();
    return function(){ Kt.delete(e); };
  }

  /* ---- 跨窗口遍历 ---- */
  function eo(n){ try{ return !!(n&&n.document); }catch(t){ return false; } }
  function _e(){
    var n=[], t=new Set(), e=function(o,s){
      if(eo(o)&&!t.has(o)){ t.add(o); n.push(o);
        if(!(s>=2)) try{ var r=o.frames; for(var a=0;r&&a<r.length;a++) e(r[a],s+1); }catch(r){}
      }
    };
    e(window,0);
    try{ var o=window.parent; o&&o!==window&&e(o,1); }catch(o){}
    return n;
  }
  function U(n){ for(var t of _e()) try{ n(t); }catch(e){} }
  function Ot(n){ for(var t of _e()) try{ if(n(t)) return t; }catch(e){} return null; }
  function yi(n){ var t=Ot(function(e){ try{ return n(e.document); }catch(i){ return false; } }); return t?t.document:null; }

  /* ---- 主窗口定位 ---- */
  var Tt=null;
  function K(){
    if(Tt){ try{ if(Tt.socket&&typeof Tt.socket.send==="function"&&Tt.Objs) return Tt; }catch(n){} Tt=null; }
    Tt=Ot(function(n){ return !!(n.socket&&typeof n.socket.send==="function"&&n.Objs); });
    return Tt||window;
  }
  function St(n,t){
    t=t||2000;
    var e=null, i=false, o=function(){ i=true; e&&(e(),e=null); };
    if(n()) return o;
    e=Z(function(){ if(i) return; var s=false; try{ s=n(); }catch(r){ s=false; } s&&o(); },t);
    return o;
  }

  /* ---- 方法 Hook ---- */
  function Q(){
    var n=[];
    function t(s,r,a){ for(var l of n) if(l.owner===s&&l.key===r&&l.wrapped===a) return true; return false; }
    function e(s,r,a){
      if(!s) return false;
      try{
        var l=s[r];
        if(typeof l!=="function"||t(s,r,l)) return false;
        var c=function(){
          var p=Array.prototype.slice.call(arguments), h=false;
          var d=function(){ h=true; return l.apply(this,arguments); };
          try{ return a(d,p,this); }
          catch(u){ if(h) throw u; return l.apply(this,p); }
        };
        s[r]=c;
        n.push({ owner:s, key:r, orig:l, own:Object.prototype.hasOwnProperty.call(s,r), wrapped:c });
        return true;
      }catch(c){ return false; }
    }
    function i(s,r,a){ return e(s,r,function(l,c,p){ var h=false; try{ h=a(c); }catch(d){ h=false; } if(!h) return l.apply(p,c); }); }
    function o(){ while(n.length){ var s=n.pop(); try{ s.owner[s.key]===s.wrapped&&(s.own?s.owner[s.key]=s.orig:delete s.owner[s.key]); }catch(r){} } }
    return { hook:e, dropWhen:i, unhookAll:o };
  }

  /* ============================================================
   * 1. UI 基础
   * ============================================================ */
  function Ee(n){ return n.replace(/[&<>]/g, function(t){ return ({"&":"&amp;","<":"&lt;",">":"&gt;"})[t]; }); }
  function go(){ return !!window.theme; }
  function fo(n){
    var t="";
    for(var i of n.sections){
      t += '<div class="omo-modal__sec">'
        + (i.h ? '<div class="omo-modal__h">'+Ee(i.h)+'</div>' : '')
        + (i.p.indexOf("<table")===0 ? i.p : "<p>"+i.p+"</p>")
        + "</div>";
    }
    var e=go();
    return '<style>#omo-notice .mainColor{color:'+(e?n.accent.light:n.accent.dark)+';}'
      + '#omo-notice .mainBg_color{background-color:'+(e?n.accent.light:n.accent.dark)+';}'
      + (e ? '#omo-notice .contentItemBtn>button{text-shadow:none;}' : "")
      + '</style><div class="panelHolderItem panelHolderItemSmall omo-modal">'
      + '<div class="contentItemBgicon '+n.icon+' mainBg_color commonColor textOverflowEllipsis" style="opacity:.8;">'
      + '<span class="contentItemBgiconText">'+Ee(n.title)+'</span></div>'
      + '<div class="contentItemContent"><div class="fullBox textColor omo-modal__body" style="overflow-x:auto;overflow-y:auto;background:'
      + (e?"rgb(240,240,240)":"rgb(16,16,16)")
      + ';padding:24px;box-sizing:border-box;line-height:26px;font-size:15px !important;user-select:text;-webkit-user-select:text;">'
      + t + '</div></div>'
      + '<div class="contentItemBtn" style="background:'+(e?"#e0e0e0":"#303030")+';opacity:.8;">'
      + '<button class="mainColor" data-act="ok"><span class="buttonIcon '+n.okIcon+'"></span>'
      + '<span class="buttonText">'+Ee(n.okText)+'</span></button></div></div>';
  }
  function ee(n,t,e){
    var i=document.createElement("div");
    i.id="omo-notice";
    i.className="flexCenter";
    i.style.cssText="position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.8);padding:12px;box-sizing:border-box;overflow:auto;";
    i.innerHTML=fo(t);
    var o=function(){ try{ i.remove(); }catch(s){} };
    i.addEventListener("click", function(s){
      var r=s.target;
      if(r.closest && r.closest('[data-act="ok"]')){ e(); o(); }
    });
    n.appendChild(i);
  }

  /* ============================================================
   * 2. 日志组件（左上角显示）
   * ============================================================ */
  var de=10;
  function $i(n){
    n = n || [];
    var t=null, e=n.slice(0,de);
    function i(a,l){
      var c=a.createElement("div"); c.className="omo-salog__ln";
      var p=a.createElement("span"); p.className="omo-salog__t"; p.textContent=l.t;
      c.append(p, a.createTextNode(" "+l.text));
      return c;
    }
    function o(){
      var a=K(), l=a&&a.document||document, c=l.body||l.documentElement;
      if(!c) return null;
      if(t&&t.parentNode===c) return t;
      t&&t.remove();
      t=l.createElement("div"); t.className="omo-salog";
      var p=l.createElement("div"); p.className="omo-salog__hd"; p.textContent="自动炒股日志";
      t.appendChild(p);
      for(var h of e) t.appendChild(i(l,h));
      c.appendChild(t);
      return t;
    }
    function s(a){
      var l=o(); if(!l) return;
      var c={ t:new Date().toTimeString().slice(0,8), text:a };
      e.unshift(c);
      if(e.length>de) e.length=de;
      l.insertBefore(i(l.ownerDocument,c), l.children[1]||null);
      while(l.children.length>de+1) l.removeChild(l.lastChild);
    }
    function r(){ t&&(t.remove(),t=null); }
    o();
    return { push:s, lines:function(){ return e; }, show:function(){ o(); }, destroy:r };
  }

  /* ============================================================
   * 3. 策略相关
   * ============================================================ */
  var Zi = "stockCode";
  function Nt(){ var n=G.get(Zi,""); return typeof n==="string" ? n : ""; }
  function Ui(n){ G.set(Zi,n); }
  function ce(n){
    var t = "const { price, hold, share, money, coin, dir, streak, event, cost } = s;\n"
          + "const { buy, sell, sellAll, log } = a;\n" + n;
    return new Function("s","a",t);
  }

  /* ---- 策略说明弹窗 ---- */
  var Y = function(n,t,e){ return "<tr><td><code>"+n+"</code></td><td>"+t+"</td>"+(e?"<td>"+e+"</td>":"")+"</tr>"; };
  var Bt = function(n,t){ return "<table><thead><tr>"+n.map(function(e){ return "<th>"+e+"</th>"; }).join("")+"</tr></thead><tbody>"+t+"</tbody></table>"; };

  var Vi = {
    ver:3, title:"自动炒股策略说明", icon:"mdi-chart-line",
    accent:{ dark:"#8ab4f8", light:"#1a73e8" }, okIcon:"mdi-check", okText:"知道了",
    sections:[
      { h:"可调用动作", p:Bt(["函数","作用","会被什么挡下"],
          Y("buy(股数)","按现价买入，只认整数股","股价低于 0.1 钞；余额不够；这一拍已放行过一单；距上一单不足 250 毫秒")
        + Y("sell(股数)","卖出，数量不会超过你的持股","保本线：买价大于 0 且现价不高于买价；持股不够；同上")
        + Y("sellAll()","清掉全部持股","同 sell；持股为 0 时什么都不做")
        + Y("log(文字)","屏幕左上角写一行，留 10 条","无")) },
      { h:"可读变量", p:Bt(["名字","是什么"],
          Y("price","当前股价，留 4 位小数")
        + Y("hold","我的持股数")
        + Y("share","全场总股数")
        + Y("money","全场总金，留 3 位小数")
        + Y("coin","我的余额")
        + Y("dir","这一拍刚跳出来的方向，up / down")
        + Y("streak","同方向连续第几下")
        + Y("event","crash 崩盘；recover 跌后回升")
        + Y("cost","本轮最后一单的买价")) },
      { h:"执行时机", p:Bt(["情形","干什么"],
          Y("行情包一到","立刻判一次")
        + Y("每秒心跳","数据没动也判一次")
        + Y("文本改动","当场生效")
        + Y("一次判断","只放行一单")
        + Y("崩盘之前","没崩盘也没手动开盘时，一次都不跑")) },
      { h:"下单闸门顺序", p:Bt(["顺序","条件"],
          Y("1","这一拍已经发过单，或数量不大于 0")
        + Y("2","保本线")
        + Y("3","距上一单不足 250 毫秒")
        + Y("4","官方面板没就绪")
        + Y("5","发出去的帧不是 &gt;$N 或 &gt;@N")) }
    ]
  };

  /* ============================================================
   * 4. 股价悬浮条
   * ============================================================ */
  var io=340, no=380, oo=520, so=900, ro=460, ao=680, lo=600, _i=640;
  function te(){ return (window.innerWidth||1280)>_i; }
  function bi(){
    var n=(window.innerWidth||1280)<=_i;
    return { minW:io, maxW:n?ro:so, minH:n?oo:no, maxH:n?lo:ao, ratioH:n?.7:.82, ratioW:n?.24:.52 };
  }
  function xi(n){
    n = n || {};
    var t=document.getElementById("movePanelHolder")||document.getElementById("mainHolderBox")||document.body;
    if(!t) return null;
    var e=document.createElement("div");
    e.id="omo-root"; e.className="omo-shell";
    e.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:120;";
    var i=document.createElement("div");
    i.className="omo-card omo-card--elev2";
    i.style.cssText="position:fixed;display:none;flex-direction:column;overflow:hidden;border-radius:5px;pointer-events:auto;";
    var o=false, s=false, r=document.createElement("div");
    r.className="omo-card__header";
    r.style.cssText="cursor:move;color:#fff;background-image:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)),url('https://t.alcy.cc/ycy?t="+Date.now()+"');background-size:cover;background-position:center;";
    var a=document.createElement("h3"); a.className="omo-card__title"; a.textContent=n.title||"PRISM";
    var l=document.createElement("span"); l.className="omo-card__ver"; l.title="版本号";
    l.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg><span></span>';
    l.lastChild.textContent = "0.3.69";
    var c=document.createElement("div");
    c.style.cssText="display:flex;align-items:center;gap:7px;min-width:0;";
    c.append(a,l);
    var u=document.createElement("button");
    u.setAttribute("aria-label","关闭"); u.title="关闭";
    u.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';
    u.onclick=function(){ i.style.display="none"; };
    var m=document.createElement("div");
    m.style.cssText="display:flex;align-items:center;gap:2px;";
    m.append(u);
    r.append(c,m);
    var g=document.createElement("div"); g.className="omo-card__body";
    g.style.cssText="display:flex;flex-direction:column;flex:1;overflow:auto;padding:4px 14px 10px;";
    var x=document.createElement("div"); x.className="omo-resize"; x.title="拖拽调整大小";
    i.append(r,g,x);
    e.appendChild(i);
    t.appendChild(e);
    ge(e);

    function E(){
      var L=bi(), I=window.innerWidth||1280, F=window.innerHeight||720;
      var q=Math.round(Math.min(Math.max(I*L.ratioW,L.minW),Math.min(L.maxW,I-32)));
      var gt=Math.round(Math.min(Math.max(F*L.ratioH,L.minH),Math.min(L.maxH,F-32)));
      if(!s){ i.style.width=q+"px"; i.style.height=gt+"px"; }
      if(!o||te()){ i.style.left=Math.round((I-q)/2)+"px"; i.style.top=Math.round((F-gt)/2)+"px"; }
      else{ var at=i.getBoundingClientRect();
        i.style.left=Math.max(8,Math.min(I-at.width-8,at.left))+"px";
        i.style.top=Math.max(8,Math.min(F-at.height-8,at.top))+"px"; }
    }
    E();

    function v(){ ge(e); i.style.display="flex"; }
    function y(){ i.style.display="none"; }

    var M=false,R=0,_=0,S=0,k=0,O=0,T=0,z=0,X=0,tt=0,$=false,lt=0,nt=0;
    function mt(){
      z=M?requestAnimationFrame(mt):0;
      if(!(!M||!$)){ $=false;
        lt=Math.max(8-S,Math.min(window.innerWidth-O-8-S,X-R));
        nt=Math.max(8-k,Math.min(window.innerHeight-T-8-k,tt-_));
        i.style.transform = (lt||nt) ? "translate("+lt+"px,"+nt+"px)" : "";
      }
    }
    function pt(L){
      if(te()) return;
      var I=L.target;
      if(I&&I.closest&&I.closest("button, input, select, textarea, a")) return;
      if(!(I&&r.contains(I))) return;
      M=true; o=true; R=L.clientX; _=L.clientY;
      var F=i.getBoundingClientRect(); S=F.left; k=F.top;
      lt=0; nt=0; $=false; O=i.offsetWidth; T=i.offsetHeight;
      try{ i.setPointerCapture(L.pointerId); }catch(q){}
      document.body.style.userSelect="none";
      i.classList.add("is-dragging"); It(true);
      z||(z=requestAnimationFrame(mt));
      L.preventDefault();
    }
    function dt(L){ M&&(X=L.clientX, tt=L.clientY, $=true); }
    function xt(L){
      if(!M) return;
      M=false; z&&(cancelAnimationFrame(z),z=0);
      document.body.style.userSelect="";
      i.classList.remove("is-dragging"); It(false);
      try{ i.releasePointerCapture(L.pointerId); }catch(I){}
      i.style.left=S+lt+"px"; i.style.top=k+nt+"px"; i.style.transform="";
      o=true;
    }
    var ft=false,J=0,wt=0,Et=0,w=0,H=0,B=0,j=0;
    function A(L){
      ft=true; s=true;
      var I="touches" in L ? L.touches[0] : L;
      J=I.clientX; wt=I.clientY; Et=i.offsetWidth; w=i.offsetHeight;
      document.body.style.userSelect="none";
      i.classList.add("is-dragging"); It(true);
      L.preventDefault(); L.stopPropagation();
    }
    function N(L){
      if(!ft) return;
      if(!("touches" in L)&&L.buttons===0){ f(); return; }
      var I="touches" in L ? L.touches[0] : L;
      B=I.clientX; j=I.clientY;
      if(!H) H=requestAnimationFrame(function(){
        if(H=0,!ft) return;
        var F=bi();
        i.style.width=Math.max(F.minW,Math.min(F.maxW,Et+(B-J),window.innerWidth-16))+"px";
        i.style.height=Math.max(F.minH,Math.min(F.maxH,w+(j-wt),window.innerHeight-16))+"px";
      });
    }
    function f(){
      ft=false; H&&(cancelAnimationFrame(H),H=0);
      document.body.style.userSelect="";
      i.classList.remove("is-dragging"); It(false);
    }
    r.style.cursor=te()?"default":"move"; r.style.touchAction="none";
    i.addEventListener("pointerdown",pt);
    window.addEventListener("pointermove",dt);
    window.addEventListener("pointerup",xt);
    window.addEventListener("pointercancel",xt);
    x.addEventListener("mousedown",A);
    window.addEventListener("mousemove",N);
    window.addEventListener("mouseup",f);
    x.addEventListener("touchstart",A,{passive:false});
    window.addEventListener("touchmove",N,{passive:false});
    window.addEventListener("touchend",f);
    window.addEventListener("resize",P);
    function P(){ r.style.cursor=te()?"default":"move"; E(); }
    return {
      body:g, open:v,
      destroy:function(){
        It(false);
        window.removeEventListener("pointermove",dt);
        window.removeEventListener("pointerup",xt);
        window.removeEventListener("pointercancel",xt);
        window.removeEventListener("mousemove",N);
        window.removeEventListener("mouseup",f);
        window.removeEventListener("touchmove",N);
        window.removeEventListener("touchend",f);
        window.removeEventListener("resize",P);
        z&&cancelAnimationFrame(z); H&&cancelAnimationFrame(H);
        e.remove();
      }
    };
  }

  /* ============================================================
   * 5. 股价悬浮条 Bi
   * ============================================================ */
  var ae=">", Ni="%", Co="<", Mo=ae, Hi=ae+"#", Ao=ae+Ni;
  var Io=26, Oo=1, Ho=1e3, zi="#e06c5a", Di="#7ec97e";
  var zo=2e3, Do=5e3, Ro=1e4, No=3e4, Bo=12e4, Fo=5, Wo=15e3, Zo=600;
  var Ri=5e3, Uo=2, Vo=4, jo=24;

  function Bi(n){
    var t=window, e=document;
    function i(){
      var f=K();
      if(f&&f!==t&&(t=f,e=f.document,o&&o.ownerDocument!==e)){
        try{ o.remove(); }catch(P){} o=null;
        if(T){ try{ T.remove(); }catch(P){} T=null; }
      }
    }
    var o=null, s=Q(), r=true, a=0, l=0, c=0, p=0, h=-1, d=-1;
    var u=null, m=null, g=null, x=Date.now(), E=false, v=0;
    var y=function(f,P){ try{ return t.Utils&&t.Utils.smallTools?t.Utils.smallTools.formatDecimal(f,P):f.toFixed(P); }catch(L){ return f.toFixed(P); } };

    function M(){
      if(o) return o;
      if(!e.getElementById("omo-stock-style")){
        var f=e.createElement("style");
        f.id="omo-stock-style";
        f.textContent = "#omo-stock-bar{flex-wrap:wrap;justify-content:center;row-gap:1px;max-width:100vw;padding-left:10px!important;padding-right:10px!important;}"
          + "@media (max-width:720px){#omo-stock-bar{left:0!important;right:0!important;transform:none!important;width:100vw;box-sizing:border-box;border-radius:5px;font-size:11px!important;gap:6px 10px!important;}}"
          + "@media (max-width:390px){#omo-stock-bar{gap:4px 8px!important;font-size:10px!important;}}"
          + "@media (min-width:721px){#omo-stock-bar{border-radius:0 0 5px 5px!important;}}"
          + "@keyframes omo-flash-up{from{background-color:rgba(220,68,55,.95)}to{background-color:rgba(16,16,16,.8)}}"
          + "@keyframes omo-flash-down{from{background-color:rgba(52,168,83,.95)}to{background-color:rgba(16,16,16,.8)}}"
          + "@keyframes omo-crash-tip{0%{opacity:0;transform:translate(-50%,6px)}6%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0}}";
        (e.head||e.documentElement).appendChild(f);
      }
      o=e.createElement("div");
      o.id="omo-stock-bar";
      o.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9999998;display:none;align-items:center;gap:14px;padding:6px 16px;cursor:pointer;background:rgba(16,16,16,.8);color:rgba(255,255,255,.75);border-radius:5px;box-shadow:0 0 1px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.24);font-family:noto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;font-weight:bold;user-select:none;white-space:nowrap;';
      o.title="点击打开炒股面板";
      o.onclick=function(){
        try{
          (!t.Probe||!t.Probe.init.stockOldHolder)&&(t.Init&&typeof t.Init.movePanel==="function"&&t.Init.movePanel(0),
            t.socket&&typeof t.socket.send==="function"&&t.socket.send(Hi));
          var f=t.Objs&&t.Objs.stockOldHolder;
          f&&f.This&&t.panelAnimate(Io,1);
          setTimeout(function(){ H(); ft(); },Zo);
        }catch(f){}
      };
      (e.body||e.documentElement).appendChild(o);
      return o;
    }

    function R(f){
      if(!o) return;
      o.style.animation="none"; o.offsetWidth;
      o.style.animation=(f?"omo-flash-up":"omo-flash-down")+" .9s ease-out";
    }
    var _=false, S=null, k=null;
    function O(){
      var f=a===Oo&&c===Ho;
      if(!f&&a>0&&c>0) k={ price:a, share:c, coin:p };
      if(f&&!_){ _=true; l=a; u=c; m=p; g=null; tt(); }
      else if(!f&&_) _=false;
    }
    var T=null;
    function z(){
      if(T&&T.isConnected) return T;
      var f=e.body||e.documentElement;
      if(!f) return null;
      T=e.createElement("div");
      T.className="omo-stock-crash";
      T.style.cssText="position:fixed;left:50%;top:0;display:none;z-index:9999997;transform:translateX(-50%);padding:3px 10px;background:#34a853;color:#fff;font-size:11px;font-weight:bold;line-height:16px;white-space:nowrap;box-shadow:0 0 1px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.24);";
      f.appendChild(T);
      return T;
    }
    function X(){ S&&(clearTimeout(S),S=null); T&&(T.style.display="none"); }
    function tt(){
      if(!o||!r) return;
      var f=z(); if(!f) return;
      f.textContent="股市已崩盘重置："+(k?"崩盘前 股价 "+k.price.toFixed(4)+" · 总股 "+k.share+" · 总金 "+y(k.coin,0)+"，":"")+"监测基准已同步";
      f.style.top=Math.round(o.getBoundingClientRect().bottom+Uo)+"px";
      f.style.display="block"; f.style.animation="none"; f.offsetWidth;
      f.style.animation="omo-crash-tip "+Ri+"ms ease forwards";
      S&&clearTimeout(S);
      S=setTimeout(function(){ try{ f.style.display="none"; }catch(P){} },Ri);
    }
    var $="";
    function lt(){
      if(!r||!o) return;
      O();
      var f = a>l ? true : a<l ? false : null;
      var P = f===null ? "#cd7f32" : f ? zi : Di;
      if(g!==null){ var ot=g; g=null; R(ot); }
      var L=function(ot,ct,At,kt){
        return '<span style="display:inline-grid;grid-template-columns:auto auto;column-gap:5px;align-items:baseline;line-height:1.15;">'
          + '<span style="opacity:.55">'+ot+'</span>'
          + '<span'+(At?' style="color:'+At+'"':"")+'>'+ct+'</span>'
          + (kt ? '<span style="grid-column:2;justify-self:center;font-size:10px;font-weight:normal;color:'+kt[1]+';opacity:.95;">'+kt[0]+'</span>'
                : '<span style="grid-column:2;height:12px;"></span>')
          + "</span>";
      };
      var I=function(ot,ct,At,kt){
        if(ot===null||ct===null||!isFinite(ct)||ot===ct) return null;
        var Gt=ot>ct, b=Math.abs(ot-ct);
        return [ (Gt?"+":"-")+b.toFixed(At)+(kt&&ct!==0?" ("+(Math.abs(ot-ct)/ct*100).toFixed(1)+"%)":""), Gt?zi:Di ];
      };
      var F=I(a,l||null,4,true), q=c?I(c,u,0,true):null, gt=p?I(p,m,3,false):null;
      var at = L("股价", a?a.toFixed(4):"- -", P, F)
             + L("持股", h>=0?String(h):"-", undefined, null)
             + L("总股", c?String(c):"-", undefined, q)
             + L("总金", p?y(p,3):"-", undefined, gt)
             + L("余额", d>=0?y(d,2):"-", undefined, null);
      if(at!==$){ o.innerHTML=at; $=at; }
      o.style.display="flex"; wt();
    }
    function nt(f,P,L){
      if(!(f>0&&isFinite(P))) return false;
      var I = (L!=null&&isFinite(L)) ? Number(L.toFixed(4)) : Number((P/f).toFixed(4));
      if(f===c&&P===p&&I===a) return false;
      if(I!==a){ g = a>0 ? I>a : null; l=a; }
      if(c&&f!==c) u=c;
      if(p&&P!==p) m=p;
      c=f; p=P; a=I; x=Date.now();
      return true;
    }
    function mt(f){
      if(!r||typeof f!=="string"||!f) return;
      var P=false, L=-1;
      if(f[0]==="%"&&f[1]==="*"){
        if(f[3]==='"') L=4; else if(f[2]==='"') L=3;
      }
      if(L>0){
        var I=f.substr(L).indexOf('"');
        if(I>0){
          var F=f.substr(L,I).split("#");
          if(F[1]){
            var q=F[1].split("$");
            if(q.length>=2&&nt(+q[0],+q[1])) P=true;
          }
        }
      } else if(f[0]===ae&&f.length>2){
        if(f.indexOf('"')>1){
          var F=f.substr(1).split('"');
          if(nt(Number(F[0]),Number(F[1]),Number(F[2]))) P=true;
          var q=F.length===5?3:2, gt=F.length===5?4:3;
          var at=Number(F[q]), ot=Number(F[gt]);
          if(isFinite(at)&&at!==h){ h=at; P=true; }
          if(isFinite(ot)&&ot!==d){ d=ot; P=true; }
          if(P) x=Date.now();
        } else {
          var F=f[1], q=parseFloat(f.slice(2));
          if(!isFinite(q)) return;
          if(F===Ni||F===Co){ if(q!==d){ d=q; P=true; } }
          else if(F===Mo){ if(q!==h){ h=q; E=true; P=true; } }
        }
      }
      P&&lt();
    }
    function pt(){
      var f=t.socket;
      if(!f||typeof f._onmessage!=="function") return;
      s.hook(f,"_onmessage",function(P,L,I){ try{ mt(L[0]); }catch(F){} return P.apply(I,L); });
    }
    function dt(){ var f=Date.now()-x; return f<No?zo:f<Bo?Do:Ro; }
    function xt(){
      try{
        var f=t.Objs&&t.Objs.stockOldHolder;
        if(f&&f.Variable){
          if(typeof f.Variable.stockNum==="number"&&f.Variable.stockNum>0){
            if(Date.now()-x>=Wo){
              var P=Number(Number(f.Variable.stockNum).toFixed(4));
              if(P!==a){ g = a>0 ? P>a : null; l=a||P; a=P; }
            }
          } else if(!a&&typeof f.Variable.stockNum==="number") a=f.Variable.stockNum;
          if(typeof f.Variable.stockCoin==="number") h=f.Variable.stockCoin;
        }
        if(typeof t.Variable!=="undefined"&&t.Variable&&typeof t.Variable.coin==="number"&&t.Variable.coin>=0) d=t.Variable.coin;
      }catch(f){}
    }
    function ft(){ try{ t.socket&&typeof t.socket.send==="function"&&t.socket.send(Ao); }catch(f){} }
    var J=null;
    function wt(){
      var f=e.getElementById("lyricHolder"); if(!f) return;
      if(!(r&&!!o&&o.style.display==="flex")){ J!==null&&(f.style.top=J+"px",J=null); return; }
      if(J===null){ var I=parseFloat(f.style.top); J=isFinite(I)?I:parseFloat(getComputedStyle(f).top)||jo; }
      var L=J+Math.round(o.getBoundingClientRect().height)+Vo;
      parseFloat(f.style.top)!==L&&(f.style.top=L+"px");
    }
    function Et(){
      try{
        if(t.Probe&&t.Probe.init&&t.Probe.init.stockOldHolder) return;
        t.Init&&typeof t.Init.movePanel==="function"&&t.Init.movePanel(0);
      }catch(f){}
    }
    function w(f){
      Et(); H(); xt();
      try{ t.socket&&typeof t.socket.send==="function"&&(t.socket.send(Hi), f&&ft()); }catch(P){}
      lt();
    }
    function H(){
      try{
        var f=t.Objs&&t.Objs.stockOldHolder, P=f&&f.function;
        if(!P||typeof P.stockUpdate!=="function") return;
        s.hook(P,"stockUpdate",function(L,I,F){
          var q=I[0];
          try{
            if(Array.isArray(q)){
              var gt=+q[0], at=+q[1], ot=Number(Number(q[2]).toFixed(4));
              if(ot!==a){ g = a>0 ? ot>a : null; l=a; }
              if(c&&gt!==c) u=c;
              if(p&&at!==p) m=p;
              c=gt; p=at; a=ot; x=Date.now(); lt();
            }
          }catch(gt){}
          return L.apply(F,I);
        });
      }catch(f){}
    }
    var B=null;
    function j(){
      try{ i(); pt(); var f=E||++v%Fo===0; E=false; w(f); }catch(f){}
      B=setTimeout(j,dt());
    }
    function A(){ i(); pt(); M(); H(); w(true); B||j(); }
    function N(){ B&&(clearTimeout(B),B=null); X(); s.unhookAll(); o&&(o.style.display="none"); wt(); }
    n()&&A();
    return { enable:function(){ r=true; A(); }, disable:function(){ r=false; N(); } };
  }

  /* ============================================================
   * 6. 自动炒股 Gi
   * ============================================================ */
  var Xo=1e3, Ko=250, Jo=500, qi=1, Te=1e3;
  var Pe="stockAutoState", pe="stockAutoMkt", Qo=10;

  function Gi(n){
    var t=Q(), e=null, i=null, o=null;
    var s=NaN, r="", a=0, l="", c=0;
    var p=false, h=false, d=false, u=false, m=false, g=false;
    var x=0, E=0, v=NaN;
    var y={ price:NaN, hold:NaN, coin:NaN, share:NaN, money:NaN };
    var M=0, R="", _="", S="", k="", O="", T="", z=null, X="";
    var tt=false, $=null, lt=false, nt=false, mt=false, pt=0;
    var _e = function(){ return t&&n(); };

    function dt(){
      if(!o) return;
      var b={ last:isFinite(s)?s:null, dir:r, streak:a, fell:d, recSeen:u, crashBase:m, live:g, cost:x, pending:E, hold:isFinite(v)?v:null, log:o.lines() };
      var C=JSON.stringify(b);
      if(C!==R){ R=C; G.set(Pe,b); }
    }
    function xt(){
      if(!(y.price>0)||!(y.share>0)) return;
      var b=y.price+"|"+y.hold+"|"+y.share+"|"+y.money+"|"+y.coin;
      if(b!==_){ _=b; G.set(pe,{ price:y.price, hold:y.hold, share:y.share, money:y.money, coin:y.coin, at:Date.now() }); }
    }
    function ft(){
      var b=G.get(pe,null); if(!b||typeof b!=="object") return;
      var C=J(b.price), D=J(b.hold), W=J(b.share), V=J(b.money), st=J(b.coin);
      if(C>0) y.price=C;
      if(isFinite(D)) y.hold=D;
      if(W>0) y.share=W;
      if(V>0) y.money=V;
      if(isFinite(st)) y.coin=st;
    }
    function J(b){ return typeof b==="number"&&isFinite(b) ? b : NaN; }
    function wt(b){
      if(!b||typeof b!=="object") return [];
      s=J(b.last);
      r=(b.dir==="up"||b.dir==="down")?b.dir:"";
      a=Math.max(0,Math.floor(J(b.streak)||0));
      d=!!b.fell; u=!!b.recSeen; m=!!b.crashBase; g=!!b.live;
      x=J(b.cost)||0; E=J(b.pending)||0; v=J(b.hold);
      return (Array.isArray(b.log)?b.log:[]).filter(function(D){ return D&&typeof D.t==="string"&&typeof D.text==="string"; }).slice(0,Qo);
    }
    function Et(b){
      var C=b.Objs&&b.Objs.stockOldHolder;
      if(C) return C;
      try{ b.Init&&typeof b.Init.movePanel==="function"&&b.Init.movePanel(0); }catch(D){}
      return b.Objs&&b.Objs.stockOldHolder;
    }
    function w(b){ o&&(o.push(b),dt()); }
    function H(b){
      if(!isFinite(b)) return;
      if(!isFinite(s)){ s=b; return; }
      if(b===s) return;
      var C=b>s?"up":"down";
      a = C===r ? a+1 : 1;
      r=C; l=C; c=a;
      if(C==="down") d=true;
      s=b;
    }
    function B(b){ return Number(b.toFixed(4)); }
    function j(b){ return Number(b.toFixed(3)); }
    function A(b,C,D,W,V){
      var st=isFinite(b)?B(b):b, rt=isFinite(V)?j(V):V;
      if(isFinite(st)&&st>0) y.price=st;
      if(isFinite(C)) y.hold=C;
      if(isFinite(D)) y.coin=D;
      if(isFinite(W)&&W>0) y.share=W;
      if(isFinite(rt)&&rt>0) y.money=rt;
      H(st); dt(); xt();
    }
    function N(){
      m=true; p=true; h=false;
      y.price=qi; y.hold=0; y.share=Te; y.money=Te;
      x=0; E=0; v=NaN; d=false; u=false; g=true;
      s=NaN; r=""; a=0; l=""; c=0;
      w("崩盘"); G.del(pe); _=""; dt();
    }
    function f(b){
      if(typeof b!=="string"||!b) return;
      if(b[0]==="%"){
        if(b[1]!=="*") return;
        var ut=b.substr(4).indexOf('"'); if(ut<0) return;
        var _t=b.substr(4,ut).split("#")[1]; if(!_t) return;
        var zt=_t.split("$"), Lt=Number(zt[0]), Yt=Number(zt[1]);
        if(Lt>0&&isFinite(Yt)&&Yt>0) A(Yt/Lt,NaN,NaN,Lt,Yt);
        return;
      }
      if(b[0]!==">"||b.length<2) return;
      var C=b[1];
      if(C==="#"||C==="%"||C===">"||C==="<"||C==="*"||C==="!"||C==="$"||C==="-"||C==="?"){
        if(C==="%"){ var ut=Number(b.slice(2)); if(isFinite(ut)) y.coin=ut; }
        ct(); return;
      }
      var D=b.slice(1).split('"'), W=Number(D[0]), V=Number(D[1]);
      if(!(W>0)||!isFinite(V)||V<=0) return;
      var st=D.length===4, rt=st?V/W:Number(D[2]);
      if(W===Te&&B(rt)===qi){
        if(!m){ N(); ct(); return; }
      } else m=false;
      A(rt, Number(D[st?2:3]), Number(D[st?3:4]), W, V);
      ct();
    }
    function P(b){
      var C=b&&b.socket;
      if(!C||typeof C._onmessage!=="function") return;
      t.hook(C,"_onmessage",function(D,W,V){
        var st=D.apply(V,W);
        try{ f(W[0]); }catch(rt){}
        return st;
      });
    }
    function L(b){
      var C=Date.now();
      if(mt||C-M<Jo) return;
      mt=false; M=C;
      try{ b.socket.send(">#"); }catch(D){}
    }
    function I(b){
      var C=Number(b.Variable&&b.Variable.coin);
      var D={ price:y.price, hold:y.hold, share:y.share, money:y.money, coin:isFinite(C)?C:y.coin,
              dir:l, streak:c, event:p?"crash":h?"recover":"", cost:x };
      if(D.price>0&&isFinite(D.price)&&isFinite(D.hold)) return D;
      return null;
    }
    function F(b){
      try{
        if(!(Number(b.Variable.stockNum)>0)&&y.price>0&&y.share>0&&y.money>0&&typeof b.function.stockUpdate==="function")
          b.function.stockUpdate([y.share,y.money,y.price,isFinite(y.hold)?y.hold:0,isFinite(y.coin)?y.coin:0]);
        if(!(Number(b.Variable.stockCoin)>0)&&y.hold>0) b.Variable.stockCoin=y.hold;
      }catch(C){}
    }
    function q(b,C,D,W){
      if(tt||!(C>0)) return false;
      if(D==="sell"&&W.cost>0&&W.price<=W.cost) return false;
      if(Date.now()-pt<Ko){ nt=true; return false; }
      var V=Et(b);
      if(!V||!V.stockInput||!V.function||typeof V.function.event!=="function"){ nt=true; return false; }
      F(V);
      if(!(Number(V.Variable&&V.Variable.stockNum)>0)){ nt=true; mt=true; L(b); return false; }
      var st=">"+(D==="buy"?"$":"@")+C, rt="";
      var ut=b.socket, _t=ut&&ut.send, zt=typeof _t==="function";
      try{
        if(zt) ut.send=function(Lt){ if(typeof Lt==="string"&&Lt[0]===">") rt=Lt; return _t.apply(this,arguments); };
        V.stockInput.val(String(C));
        V.function.event(2, D==="buy"?1:0);
      }catch(Lt){ return false; }
      finally{ zt&&(ut.send=_t); }
      if(rt!==st){ w((D==="buy"?"买入被官方拒了 ":"卖出被官方拒了 ")+C+" 股"); return false; }
      pt=Date.now(); tt=true;
      if(D==="buy") E=W.price;
      w((D==="buy"?"买入 ":"卖出 ")+C+" 股 @"+W.price.toFixed(4));
      return true;
    }
    function gt(b,C,D){
      tt=false;
      try{
        b(D,{
          buy:function(W){ q(C,Math.floor(Number(W)||0),"buy",D); },
          sell:function(W){ q(C,Math.min(Math.floor(Number(W)||0),Math.floor(D.hold)),"sell",D); },
          sellAll:function(){ q(C,Math.floor(D.hold),"sell",D); },
          log:function(W){ w(String(W)); }
        });
      }catch(W){
        var V=String(W&&W.message?W.message:W);
        if(X!==V){ X=V; w("运行出错 "+V); }
      }
    }
    function at(b){
      if(E>0&&isFinite(v)&&b.hold>v){ x=E; E=0; }
      if(b.hold<=0) x=0;
      v=b.hold;
    }
    function ot(){
      s=NaN; r=""; a=0; l=""; c=0; d=false; u=false; h=false; g=true;
      w("手动开盘"); dt(); ct();
    }
    function ct(b){
      b = b || false;
      var C=$;
      if(!C||lt||!o) return;
      var D=Nt(), W=Number(C.Variable&&C.Variable.coin);
      var V=p||h||l!=="";
      var st=y.price+"|"+y.hold+"|"+(isFinite(W)?W:y.coin);
      if(!V&&!b&&st===S&&D===k) return;
      S=st; lt=true;
      try{
        if(D!==k){
          k=D; X="";
          try{ z=ce(D); T=""; }catch(_t){ z=null; X=String(_t&&_t.message?_t.message:_t); }
        }
        if(!z&&X&&D===O&&T!==D){ T=D; w("语法错误 "+X); }
        O=D;
        if(!z) return;
        var rt=I(C);
        if(!rt) return;
        at(rt);
        var ut=d&&x>0&&rt.price>x;
        if(ut&&!u) h=true;
        u=ut;
        if(h&&!rt.event) rt.event="recover";
        if(g||rt.event==="crash") gt(z,C,rt);
        if(!nt){ l=""; c=0; p=false; h=false; }
        nt=false;
        dt();
      }finally{ lt=false; }
    }
    function At(){
      if(!_e()) return;
      o&&o.show();
      $=K(); Et($); P($); L($); ct(true);
    }
    function kt(){
      if(e) return;
      e=Z(At,Xo);
      ft();
      var b=G.get(Pe,null);
      o=$i(b?wt(b):[]);
      if(b) dt(); else w("启动，等开盘");
      $=K(); Et($); P($); L($);
    }
    function Gt(){
      if(e){ e(); e=null; }
      t.unhookAll();
      if(o){ o.destroy(); o=null; }
      G.del(Pe); G.del(pe);
      _=""; R=""; s=NaN; r=""; a=0; l=""; c=0;
      p=false; h=false; d=false; u=false; m=false; g=false;
      x=0; E=0; v=NaN;
      y={ price:NaN, hold:NaN, coin:NaN, share:NaN, money:NaN };
      M=0; S=""; $=null; lt=false; nt=false; mt=false; pt=0; tt=false;
      k=""; O=""; T=""; z=null; X="";
    }
    _e()&&kt();
    return {
      enable:kt, disable:Gt,
      openSettings:function(){ if(!i) i=ji(ot); i.open(); }
    };
  }

  /* ============================================================
   * 7. 策略编辑器 ji
   * ============================================================ */
  function ji(n){
    var t=document.body||document.documentElement;
    var e=document.createElement("div"); e.className="omo-sa";
    var i=document.createElement("div"); i.className="omo-sa__header";
    var o=document.createElement("span"); o.className="omo-sa__title"; o.textContent="自动炒股策略";
    var s=document.createElement("button"); s.className="omo-sa__btn"; s.textContent="手动开盘"; s.title="不等崩盘，把这一刻当这一轮的开始";
    s.onclick=function(E){ E.stopPropagation(); n(); };
    var r=document.createElement("button"); r.className="omo-sa__x"; r.setAttribute("aria-label","关闭"); r.title="关闭";
    r.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';
    var a=document.createElement("div");
    a.style.cssText="display:flex;align-items:center;gap:6px;";
    a.append(s,r);
    i.append(o,a);
    var l=document.createElement("div"); l.className="omo-sa__body";
    var c=document.createElement("textarea"); c.className="omo-sa__code"; c.spellcheck=false; c.value=Nt();
    var p=document.createElement("div"); p.className="omo-sa__acts";
    var h=document.createElement("button"); h.className="omo-sa__add"; h.textContent="说明"; h.title="变量、动作和限制看这里";
    h.onclick=function(){ ee(document.body,Vi,function(){}); };
    p.append(h);
    var d=document.createElement("div"); d.className="omo-sa__status";
    l.append(c,p,d);
    e.append(i,l);
    t.appendChild(e);

    function u(){
      Ui(c.value);
      var E="";
      try{ ce(c.value); }catch(v){ E=String(v&&v.message?v.message:v); }
      d.classList.toggle("is-bad", !!E);
      d.textContent = E ? "有语法错误: "+E : "已保存，下一包生效";
    }
    c.oninput=u;
    c.onkeydown=function(E){ E.stopPropagation(); };
    r.onclick=function(){ e.classList.remove("is-open"); };
    var m=false, g=null;
    i.addEventListener("pointerdown",function(E){
      if(E.button>0||E.target.closest("button")) return;
      var v=e.getBoundingClientRect();
      g={ dx:E.clientX-v.left, dy:E.clientY-v.top };
      E.preventDefault();
    });
    window.addEventListener("pointermove",function(E){
      if(!g) return;
      m=true;
      e.style.left=Math.max(0,E.clientX-g.dx)+"px";
      e.style.top=Math.max(0,E.clientY-g.dy)+"px";
    });
    window.addEventListener("pointerup",function(){ g=null; });
    function x(){
      var E=e.offsetWidth||560, v=e.offsetHeight||360;
      e.style.left=Math.max(8,Math.round(((window.innerWidth||1280)-E)/2))+"px";
      e.style.top=Math.max(8,Math.round(((window.innerHeight||720)-v)/2))+"px";
    }
    window.addEventListener("resize",function(){ e.classList.contains("is-open")&&!m&&x(); });
    return {
      open:function(){ c.value=Nt(); u(); e.classList.add("is-open"); m||x(); }
    };
  }

  /* ============================================================
   * 8. 面板开关项
   * ============================================================ */
  var uo='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>';
  function we(n,t,e,i,o){
    var s=document.createElement("button");
    s.className=n; s.title=t; s.setAttribute("aria-label",i); s.innerHTML=e;
    s.style.cssText="display:inline-flex;align-items:center;background:none;border:none;color:inherit;padding:1px;cursor:pointer;opacity:.55;flex:none;";
    s.onclick=function(r){ r.stopPropagation(); o(); };
    return s;
  }
  function ki(n,t,e,i){
    i = i || {};
    var o=document.createElement("div");
    o.className="omo-list__item"+(t?" is-on":"");
    o.tabIndex=0;
    o.setAttribute("role","switch");
    o.setAttribute("aria-checked", t?"true":"false");
    o.setAttribute("aria-label", i.doc ? n+" - "+i.doc : n);
    var s=document.createElement("div"); s.className="omo-list__label";
    var r=document.createElement("strong"); r.textContent=n; s.appendChild(r);
    if(i.onSettings) s.appendChild(we("omo-set-btn","设置",uo,n+" 设置",i.onSettings));
    o.append(s);
    if(i.doc){ var l=document.createElement("div"); l.className="omo-list__desc"; l.textContent=i.doc; o.appendChild(l); }
    var a=function(l){
      o.setAttribute("aria-checked", l?"true":"false");
      o.classList.toggle("is-on", l);
      e(l);
    };
    o.onclick=function(){ a(o.getAttribute("aria-checked")!=="true"); };
    o.onkeydown=function(l){
      if(l.target===o&&(l.key==="Enter"||l.key===" ")){ l.preventDefault(); a(o.getAttribute("aria-checked")!=="true"); }
    };
    return o;
  }
  function wi(n){
    var t=document.createElement("div"); t.className="omo-list";
    n.appendChild(t);
    return t;
  }

  /* ============================================================
   * 9. 主题适配
   * ============================================================ */
  var Kn=["--omo-primary","--omo-primary-ctr","--omo-surface","--omo-surface-solid","--omo-surface-variant","--omo-on-surface","--omo-on-surface-strong","--omo-on-surface-variant","--omo-on-surface-faint","--omo-outline","--omo-outline-variant","--omo-elev-2","--omo-font"];

  function qn(){
    var n=typeof window!=="undefined"?window:{};
    var t=(function(){ try{ return window.parent; }catch(a){ return null; } })();
    var e=function(){ for(var a=0;a<arguments.length;a++) if(arguments[a]!=null) return arguments[a]; };
    var i=e(n.theme, t&&t.theme, null);
    var s=(function(a){
      try{
        var l=e(n.Cookie, t&&t.Cookie, null);
        if(typeof l==="function") return l(a);
      }catch(l){}
      return null;
    })("theme");
    return { isDark: typeof i==="string" ? i!=="theme/" : typeof i==="boolean" ? !i : s!=null ? !["1","3"].includes(String(s)) : true };
  }
  function Gn(n){
    var t=n.replace(/^#/,"").trim();
    if(!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(t)) return null;
    var e=t.length===3 ? t.split("").map(function(a){ return a+a; }).join("") : t;
    var i=parseInt(e,16), o=i>>16&255, s=i>>8&255, r=i&255;
    return o+","+s+","+r;
  }
  function Yn(){
    var n=typeof window!=="undefined"?window:{};
    var t=(function(){ try{ return window.parent; }catch(i){ return null; } })();
    var e=function(i){
      try{
        var o=n.Cookie||t&&t.Cookie;
        if(typeof o==="function") return o(i);
      }catch(o){}
      return null;
    };
    for(var i of ["namecolor","roomcolor"]){
      var o=e(i);
      if(typeof o==="string"&&o){
        var s=Gn(o.startsWith("#")?o:"#"+o);
        if(s) return "rgb("+s+")";
        return o;
      }
    }
    try{
      var i2=document.querySelector(".mainColor");
      if(i2){ var o2=getComputedStyle(i2).color; if(o2&&o2!=="rgba(0, 0, 0, 0)") return o2; }
    }catch(i){}
    return "#808080";
  }
  function Xn(n){
    try{
      var t=document.getElementById("selectHolderBox"); if(!t) return false;
      var e=getComputedStyle(t), i=e.backgroundColor, o=e.color;
      if(!i||i==="rgba(0, 0, 0, 0)") return false;
      n.style.setProperty("--omo-surface",i);
      var s=i.match(/\d+/g);
      if(s&&s.length>=3) n.style.setProperty("--omo-surface-solid","rgb("+s[0]+","+s[1]+","+s[2]+")");
      if(o&&o!=="rgba(0, 0, 0, 0)") n.style.setProperty("--omo-on-surface",o);
      if(s&&s.length>=3){
        var a=.2126*+s[0]+.7152*+s[1]+.0722*+s[2]>140;
        n.classList.toggle("omo-light", a);
        return true;
      }
    }catch(t){}
    return false;
  }
  function ge(n){
    var t=qn();
    n.classList.toggle("omo-light", !t.isDark);
    var e=Yn();
    if(e){
      n.style.setProperty("--omo-primary",e);
      var i=e.match(/\d+/g);
      if(i&&i.length>=3){
        var o=.2126*+i[0]+.7152*+i[1]+.0722*+i[2];
        n.style.setProperty("--omo-primary-ctr", o>180?"#202020":"#ffffff");
      }
    }
    Xn(n);
    try{
      var i2=getComputedStyle(n), o2=document.documentElement;
      for(var s of Kn){ var r=i2.getPropertyValue(s).trim(); if(r) o2.style.setProperty(s,r); }
    }catch(i){}
    return t;
  }

  /* ============================================================
   * 10. 侧边栏入口
   * ============================================================ */
  var re="PRISM", Le="functionBtnFont omo-entry-text textOverflowEllipsis";
  var Xt='linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)),url("https://t.alcy.cc/ycy?t='+Date.now()+'")';
  function oe(){ return yi(function(n){ try{ return !!n.getElementById("functionHolder"); }catch(t){ return false; } }); }
  function Ai(n){
    var t=n.getElementById("functionHolder"); if(!t) return null;
    var e=t.querySelector(".functionButtonGroup"); if(!e) return null;
    var i=e.nextElementSibling;
    return (i&&i.classList.contains("functionItemBox")) ? i : null;
  }
  function Ii(n){
    var t=function(e){ e.stopImmediatePropagation(); e.preventDefault(); n(); };
    t._omoEntryClick=true;
    return t;
  }
  function se(n,t){
    var e=n.createElement("div");
    e.className="functionButton";
    e.setAttribute("data-omo-entry","1");
    e.title=re;
    e.style.cssText="display:flex;align-items:center;padding-right:16px;background-image:"+Xt+";background-size:cover;background-position:center;";
    e.onclick=Ii(t);
    var i=n.createElement("span"); i.className=Le; i.textContent=re;
    var o=n.createElement("span");
    o.style.cssText="margin-left:auto;display:flex;align-items:center;color:#fff;opacity:.85;flex:none;";
    o.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    e.append(i,o);
    return e;
  }
  function Oi(n){
    var t=false, e=function(){}, i=[], o=0;
    var s=function(){
      if(t) return;
      var l=oe(); if(!l) return;
      var c=Ai(l); if(!c) return;
      var p=c.querySelector("[data-omo-entry]");
      if(!p){ t=true; try{ c.insertBefore(se(l,n),c.firstChild); }finally{ t=false; } return; }
      if((p.onclick||{})._omoEntryClick===undefined) p.onclick=Ii(n);
      if(c.firstElementChild!==p){ t=true; try{ p.remove(); c.insertBefore(se(l,n),c.firstChild); }finally{ t=false; } return; }
      var h=p.querySelector(".functionBtnFont");
      if(!h){
        var d=Date.now();
        i=i.filter(function(u){ return d-u<6e4; });
        if(d<o) return;
        i.push(d);
        if(i.length>12){ o=d+9e4; i=[]; }
        t=true;
        try{
          p.innerHTML="";
          var u=se(l,function(){});
          while(u.firstChild) p.appendChild(u.firstChild);
        }finally{ t=false; }
        return;
      }
      if(h.textContent!==re) h.textContent=re;
      if(h.className!==Le) h.className=Le;
      if(h.hasAttribute("style")) h.removeAttribute("style");
    };
    var r=function(){
      var l=oe(); if(!l) return false;
      var c=Ai(l); if(!c) return false;
      if(!c.querySelector("[data-omo-entry]")) c.insertBefore(se(l,n),c.firstChild);
      return true;
    };
    if(r()) a();
    else{
      var l=new MutationObserver(function(){ if(r()){ l.disconnect(); e(); a(); } });
      e=St(function(){
        var p=oe(), h=p?p.getElementById("functionHolder"):null;
        if(!h) return false;
        l.observe(h,{ childList:true });
        if(r()){ l.disconnect(); a(); }
        return true;
      },1e3);
    }
    function a(){
      var l=oe(), c=l?l.getElementById("functionHolder"):null;
      if(!c) return;
      new MutationObserver(function(){ setTimeout(s,0); }).observe(c,{ childList:true, subtree:true });
      s();
    }
  }

  /* ============================================================
   * 11. CSS
   * ============================================================ */
  var CSS = `
#omo-root {
  --omo-primary: #fcffff;
  --omo-primary-ctr: #202020;
  --omo-surface: rgba(32,32,32,0.8);
  --omo-surface-solid: rgb(32,32,32);
  --omo-surface-variant: rgba(255,255,255,0.08);
  --omo-on-surface: rgba(255,255,255,0.75);
  --omo-on-surface-strong: #ffffff;
  --omo-on-surface-variant: rgba(255,255,255,0.45);
  --omo-on-surface-faint: rgba(255,255,255,0.2);
  --omo-outline: rgba(255,255,255,0.14);
  --omo-outline-variant: rgba(255,255,255,0.08);
  --omo-elev-2: 0 0 1px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.3);
  --omo-font: noto,"PingFang SC","Microsoft YaHei",Consolas,Helvetica,Tahoma,Arial,STXihei,"微软雅黑",SimSun,Heiti,"黑体",sans-serif;
}
#omo-root.omo-light {
  --omo-surface: rgba(255,255,255,0.82);
  --omo-surface-solid: rgb(255,255,255);
  --omo-surface-variant: rgba(0,0,0,0.06);
  --omo-on-surface: rgba(0,0,0,0.72);
  --omo-on-surface-strong: #202020;
  --omo-on-surface-variant: rgba(0,0,0,0.45);
  --omo-on-surface-faint: rgba(0,0,0,0.2);
  --omo-outline: rgba(0,0,0,0.12);
  --omo-outline-variant: rgba(0,0,0,0.06);
}
#omo-root * { font-family: var(--omo-font); }

.omo-card { background: var(--omo-surface-solid); color: var(--omo-on-surface); border-radius:5px; box-shadow: var(--omo-elev-2); overflow:hidden; border:0; }
.omo-card.is-dragging { will-change:transform; box-shadow:none; cursor:move; }
.omo-card__header { flex:0 0 auto; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--omo-outline-variant); }
.omo-card__title { font-size:15px; font-weight:700; margin:0; letter-spacing:.5px; color:#fff; }
.omo-card__ver { display:inline-flex; align-items:center; gap:4px; flex:0 0 auto; color:rgba(255,255,255,.85); font-size:11px; letter-spacing:.5px; line-height:1; user-select:none; }
.omo-card__ver svg { opacity:.75; }
.omo-card__header button { border:0; background:transparent; color:#fff; cursor:pointer; width:28px; height:28px; border-radius:5px; font-size:18px; line-height:1; display:inline-flex; align-items:center; justify-content:center; padding:0; transition: color 160ms; }
.omo-card__header button:hover { color:rgba(255,255,255,.75); }
.omo-entry-text { line-height:1; vertical-align:middle; top:-2px; color:#fff; }
.omo-list { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; align-content:start; grid-auto-rows:1fr; }
@media (min-width:721px) { .omo-list { grid-template-columns:1fr 1fr 1fr; gap:12px; } }
.omo-list__item { position:relative; display:flex; flex-direction:column; gap:4px; padding:10px 12px; overflow:hidden; cursor:pointer; border:1.5px solid var(--omo-outline-variant); background:var(--omo-surface); border-radius:5px; transition:border-color 160ms, background 160ms; }
.omo-list__item:hover { border-color:var(--omo-on-surface-variant); }
.omo-list__item.is-on { border-color:#2196f3; background:rgba(33,150,243,.12); }
.omo-list__label { display:flex; align-items:center; gap:6px; }
.omo-list__label strong { flex:1; font-size:13px; font-weight:700; color:var(--omo-on-surface-strong); line-height:1.35; min-width:0; }
.omo-list__desc { font-size:11px; line-height:1.3; color:var(--omo-on-surface-variant); height:29px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.omo-resize { position:absolute; right:0; bottom:0; width:16px; height:16px; cursor:nwse-resize; color: var(--omo-on-surface-faint); opacity:.7; font-size:10px; line-height:1; display:flex; align-items:center; justify-content:center; user-select:none; }
.omo-resize:hover { opacity:1; color: var(--omo-on-surface-strong); }
.omo-resize::before { content:"◢"; }

#omo-notice .panelHolderItemSmall { height:min(60vh, 420px); width:min(440px, calc(100vw - 24px)); margin:12px; }
#omo-notice .omo-modal__sec { margin-bottom:14px; }
#omo-notice .omo-modal__h { font-weight:700; font-size:16px !important; margin-bottom:3px; }
#omo-notice .omo-modal__sec p { margin:0; font-weight:400; }
#omo-notice .omo-modal__sec table { width:100%; border-collapse:collapse; font-size:13.5px; line-height:1.5; }
#omo-notice .omo-modal__sec th, #omo-notice .omo-modal__sec td { border:1px solid var(--omo-outline); padding:6px 8px; text-align:left; vertical-align:top; }
#omo-notice .omo-modal__sec th { font-weight:700; white-space:nowrap; }
#omo-notice .omo-modal__sec code { font-family:Consolas,Menlo,"Courier New",monospace; font-size:12.5px; }
#omo-notice .omo-modal__sec a { text-decoration:underline; word-break:break-all; }

.omo-sa { position:fixed; z-index:99999998; display:none; flex-direction:column; overflow:hidden; width:min(560px, calc(100vw - 24px)); height:min(432px, calc(100vh - 40px)); background:var(--omo-surface-solid); color:var(--omo-on-surface); border-radius:5px; box-shadow:var(--omo-elev-2); pointer-events:auto; }
.omo-sa.is-open { display:flex; }
.omo-sa__header { flex:none; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 12px; cursor:move; touch-action:none; background:var(--omo-primary); color:var(--omo-primary-ctr); }
.omo-sa__title { font-size:14px; font-weight:700; letter-spacing:.5px; }
.omo-sa__btn { flex:none; border:1px solid currentColor; border-radius:4px; background:transparent; color:inherit; cursor:pointer; font-size:12px; line-height:1; padding:5px 8px; opacity:.85; }
.omo-sa__btn:hover { opacity:1; }
.omo-sa__x { border:0; background:transparent; color:inherit; cursor:pointer; width:24px; height:24px; padding:0; display:inline-flex; align-items:center; justify-content:center; }
.omo-sa__body { flex:1; min-height:0; display:flex; flex-direction:column; gap:8px; padding:10px 12px 12px; }
.omo-sa__code { flex:1; min-height:0; resize:none; outline:none; white-space:pre; overflow:auto; tab-size:4; font-family:Consolas,Menlo,"Courier New",monospace; font-size:12.5px; line-height:1.6; color:var(--omo-on-surface-strong); background:rgba(127,127,127,.08); border:1px solid var(--omo-outline); border-radius:5px; padding:8px 10px; }
.omo-sa__code:focus { border-color:var(--omo-on-surface-variant); }
.omo-sa__acts { flex:none; display:flex; flex-wrap:wrap; gap:6px; }
.omo-sa__add { align-self:flex-start; border:1px dashed var(--omo-outline); border-radius:4px; background:transparent; color:inherit; cursor:pointer; font-size:12px; padding:6px 10px; }
.omo-sa__status { flex:none; min-height:16px; font-size:12px; opacity:.6; }
.omo-sa__status.is-bad { color:#e06c5a; opacity:.95; }
@media (max-width:720px) { .omo-sa { height:min(480px, calc(100vh - 24px)); } .omo-sa__code { font-size:13px; } }

.omo-salog { position:fixed; left:6px; top:6px; z-index:9999997; display:flex; flex-direction:column; align-items:flex-start; gap:3px; max-width:min(320px, 52vw); pointer-events:none; user-select:none; font-family:noto,"PingFang SC","Microsoft YaHei",sans-serif; }
.omo-salog__hd { font-size:11px; letter-spacing:.5px; padding:2px 6px; border-radius:4px; color:rgba(255,255,255,.5); background:rgba(16,16,16,.5); }
.omo-salog__ln { font-size:12px; line-height:1.4; padding:3px 7px; border-radius:4px; color:rgba(255,255,255,.85); background:rgba(16,16,16,.75); white-space:nowrap; }
.omo-salog__t { opacity:.45; margin-right:2px; font-variant-numeric:tabular-nums; }

html { --omo-on-tint:#4fc3f7; }
.omo-card { border-radius:28px !important; background:var(--omo-surface-solid); box-shadow:0 1px 2px rgba(0,0,0,.30), 0 1px 3px 1px rgba(0,0,0,.15); border:0; }
.omo-card[data-omo-title] { border-radius:16px !important; }
.omo-card.is-dragging { box-shadow:none; }
.omo-card__header { padding:18px 20px 6px !important; border-bottom:0 !important; background-image:none !important; background-color:transparent !important; color:var(--omo-on-surface-strong) !important; }
.omo-card__title { font-size:20px; font-weight:500; letter-spacing:0; color:var(--omo-on-surface-strong); }
.omo-card__ver { color:var(--omo-on-surface-variant); background:var(--omo-surface-variant); border-radius:999px; padding:3px 9px; font-size:11px; letter-spacing:.2px; }
.omo-card__header button { width:40px; height:40px; border-radius:50%; color:var(--omo-on-surface-variant); background:transparent; }
.omo-card__header button:hover { background:var(--omo-surface-variant); color:var(--omo-on-surface-strong); }
.omo-card__body { padding:8px 16px 18px !important; }
.omo-list { gap:8px; margin-top:8px; }
.omo-list__item { border:1px solid var(--omo-outline-variant); background:transparent; border-radius:20px; padding:12px 14px; }
.omo-list__item:hover { background:var(--omo-outline); border-color:var(--omo-on-surface-variant); }
.omo-list__item.is-on { border-color:transparent; background:color-mix(in srgb, var(--omo-on-tint) 24%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--omo-on-tint) 60%, transparent); }
.omo-list__item.is-on:hover { background:color-mix(in srgb, var(--omo-on-tint) 34%, transparent); }
.omo-list__label strong { font-size:14px; font-weight:500; }
.omo-resize { width:22px; height:22px; right:8px; bottom:8px; opacity:0; font-size:0; }
.omo-resize::before { content:none !important; }
@media (max-width:720px) {
  .omo-card { border-radius:24px !important; }
  .omo-card__header { padding:16px 16px 4px !important; }
  .omo-card__body { padding:8px 12px 14px !important; }
  .omo-list__item { border-radius:16px; padding:12px; }
}
`;

  function injectCSS(){
    var targets = [document];
    try{
      var f = window.frames && window.frames[0];
      if(f && f.document) targets.push(f.document);
    }catch(e){}
    for(var t of targets){
      try{
        if(t.getElementById("omo-style")) continue;
        var e=t.createElement("style");
        e.id="omo-style"; e.textContent=CSS;
        (t.head||t.documentElement).appendChild(e);
      }catch(e){}
    }
  }

  /* ============================================================
   * 12. 启动
   * ============================================================ */
  function boot(){
    if(window.__omoStockBooted) return;
    if(document.getElementById("omo-root")) return;
    window.__omoStockBooted = true;

    injectCSS();

    /* ---- 控制面板 ---- */
    var panel = xi({ title: "PRISM · 自动炒股" });
    if(!panel) return;

    var autoPanel = panel;
    var body = autoPanel.body;
    var list = wi(body);

    /* ---- 两个功能实例 ---- */
    var instances = {
      stockMonitor: null,
      stockAuto: null
    };
    var flags = {
      stockMonitor: { key: "stockMonitorEnabled", label: "股价悬浮", doc: "悬浮条实时显示股价与资产。" },
      stockAuto:    { key: "stockAutoEnabled",    label: "自动炒股", doc: "用代码写策略，直接调官方买卖。", settings: true }
    };

    Object.keys(flags).forEach(function(key){
      var f = flags[key];
      var item = ki(f.label, !!G.get(f.key, false), function(v){
        G.set(f.key, v);
        if(!v){
          if(instances[key]) instances[key].disable();
          return;
        }
        if(!instances[key]){
          instances[key] = key === "stockMonitor"
            ? Bi(function(){ return !!G.get(f.key, false); })
            : Gi(function(){ return !!G.get(f.key, false); });
        }
        instances[key].enable();
      }, {
        doc: f.doc,
        onSettings: f.settings ? function(){
          if(instances[key] && instances[key].openSettings) instances[key].openSettings();
        } : null
      });
      list.appendChild(item);
    });

    /* ---- 侧边栏入口 ---- */
    Oi(function(){ autoPanel.open(); });
  }

  function start(){
    try{ boot(); }
    catch(e){ try{ console.error("[PRISM·自动炒股] 启动失败", e); }catch(_){} }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

  /* ---- 等 extRunAt 时机 ---- */
  try{
    var n = window.extRunAt || (window.parent && window.parent.extRunAt);
    if(typeof n === "function" && !n._omoStockTap){
      var t = n;
      var e = function(i){
        var o = t.apply(this, arguments);
        if(i === "allReady" || i === "pageFirstShowEnd") start();
        return o;
      };
      e._omoStockTap = true;
      window.extRunAt = e;
    }
  }catch(e){}
})();