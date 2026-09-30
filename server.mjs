import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat,realpath} from 'node:fs/promises';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html;charset=utf-8','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.json':'application/json','.js':'text/javascript','.mjs':'text/javascript','.md':'text/plain;charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(root+path.sep))throw new Error('Outside root');
  const resolved=await realpath(target);
  if(!resolved.startsWith(root+path.sep)||!(await stat(resolved)).isFile())throw new Error('Invalid file');
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(resolved));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||52130),'127.0.0.1',()=>console.log('KIWI_FINAL_VIEWER port='+Number(process.env.PORT||52130)));
