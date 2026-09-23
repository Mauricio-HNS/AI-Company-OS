window.AIOS_API=(function(){
  const base=(window.AIOS_CONFIG&&window.AIOS_CONFIG.API_BASE)||"";
  const tokenKey="aiosAuthToken";
  async function request(path,options={}){
    const headers=Object.assign({"Content-Type":"application/json"},options.headers||{});
    const token=localStorage.getItem(tokenKey);
    if(token) headers.Authorization="Bearer "+token;
    const res=await fetch(base+"/api"+path,Object.assign({},options,{headers}));
    const text=await res.text();
    let data={}; try{data=text?JSON.parse(text):{}}catch(_){data={message:text}};
    if(!res.ok) throw new Error(data.error||data.message||("HTTP "+res.status));
    return data;
  }
  return {
    enabled:!!base,
    setToken:t=>localStorage.setItem(tokenKey,t),
    clearToken:()=>localStorage.removeItem(tokenKey),
    request,
    health:()=>request("/health")
  };
})();