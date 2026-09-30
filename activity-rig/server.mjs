import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const contentType=file=>file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html':'text/javascript';

http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  try{
    const bytes=await readFile(file);
    response.writeHead(200,{'Content-Type':contentType(file),'Cache-Control':'no-store'});
    response.end(bytes);
  }catch{
    response.writeHead(404).end();
  }
}).listen(Number(process.env.PORT||52128),'127.0.0.1',()=>console.log(`http://127.0.0.1:${Number(process.env.PORT||52128)}/`));
