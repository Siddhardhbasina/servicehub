// Service Hub – zero-dependency Node server (Node 18+)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,PASS=process.env.ADMIN_PASSWORD||'admin123',DIR=process.env.DATA_DIR||path.join(__dirname,'data');
fs.mkdirSync(path.join(DIR,'uploads'),{recursive:true});
const F=path.join(DIR,'data.json');
let D={places:[],apps:[],ads:[]};try{D={...D,...JSON.parse(fs.readFileSync(F))}}catch(e){}
const save=()=>{fs.writeFileSync(F+'.tmp',JSON.stringify(D));fs.renameSync(F+'.tmp',F)};
const tokens=new Set();
const MIME={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
const body=(req,max)=>new Promise((ok,no)=>{const c=[];let n=0;req.on('data',d=>{n+=d.length;if(n>max){no(new Error('Too large'));req.destroy()}else c.push(d)});req.on('end',()=>ok(Buffer.concat(c)));req.on('error',no)});
const json=(res,code,o)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const isAdmin=req=>{const m=/(?:^|; )tok=([a-f0-9]+)/.exec(req.headers.cookie||'');return !!m&&tokens.has(m[1])};
http.createServer(async(req,res)=>{try{
  const p=new URL(req.url,'http://x').pathname;
  if(p==='/api/data'&&req.method==='GET')return json(res,200,D);
  if(p==='/api/me')return json(res,200,{admin:isAdmin(req)});
  if(p==='/api/login'&&req.method==='POST'){
    const {password}=JSON.parse((await body(req,1e4)).toString()||'{}');
    const a=Buffer.from(String(password||'')),b=Buffer.from(PASS);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(res,401,{error:'Wrong password'});
    const t=crypto.randomBytes(24).toString('hex');tokens.add(t);
    res.setHeader('Set-Cookie',`tok=${t}; HttpOnly; Path=/; SameSite=Strict; Max-Age=2592000${process.env.COOKIE_SECURE?'; Secure':''}`);
    return json(res,200,{ok:1});
  }
  if(p.startsWith('/api/')){
    if(!isAdmin(req))return json(res,401,{error:'Admin login required'});
    if(p==='/api/upload'&&req.method==='POST'){
      const ext={'image/png':'.png','image/jpeg':'.jpg','image/gif':'.gif','image/webp':'.webp'}[req.headers['content-type']];
      if(!ext)return json(res,400,{error:'Only png, jpg, gif, webp images'});
      const name=crypto.randomBytes(8).toString('hex')+ext;
      fs.writeFileSync(path.join(DIR,'uploads',name),await body(req,8e6));return json(res,200,{url:'/uploads/'+name});
    }
    const m=/^\/api\/(places|apps|ads)(?:\/([\w-]+))?$/.exec(p);if(!m)return json(res,404,{error:'Not found'});
    const k=m[1];
    if(req.method==='POST'){const items=JSON.parse((await body(req,2e6)).toString());
      for(const o of items){if(!o||!o.id)continue;const i=D[k].findIndex(x=>x.id===o.id);i>-1?D[k][i]=o:D[k].push(o)}
      save();return json(res,200,D)}
    if(req.method==='DELETE'){D[k]=D[k].filter(x=>x.id!==m[2]);save();return json(res,200,D)}
  }
  if(p.startsWith('/uploads/')){const f=path.join(DIR,'uploads',path.basename(p));
    if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'public,max-age=86400'});return fs.createReadStream(f).pipe(res)}}
  if(p==='/'||p==='/index.html'){res.writeHead(200,{'Content-Type':MIME['.html']});return fs.createReadStream(path.join(__dirname,'public/index.html')).pipe(res)}
  res.writeHead(404);res.end('Not found');
}catch(e){json(res,500,{error:e.message})}}).listen(PORT,()=>console.log('Service Hub running on port '+PORT));
