(function(){
var KEY='mc_v9';
var cfg={on:true,antiRecall:true};
function load(){try{var s=localStorage.getItem(KEY);if(s)cfg=JSON.parse(s);}catch(e){}}
function save(){localStorage.setItem(KEY,JSON.stringify(cfg));}
load();

if(cfg.on&&cfg.antiRecall&&typeof Utils!=='undefined'&&Utils.service&&Utils.service.revokeMsg){
    var origRevoke=Utils.service.revokeMsg.bind(Utils.service);
    Utils.service.revokeMsg=function(e,t){
        try{
            var parts=t.split('"');
            var recallUid=parts[0]?parts[0].substr(0,13):'';
            if(typeof uid!=='undefined'&&recallUid!==uid){
                console.log('[MC] Recall blocked from:',recallUid);
                return;
            }
        }catch(ex){}
        return origRevoke(e,t);
    };
    console.log('[MC] Anti-recall active');
}
})();