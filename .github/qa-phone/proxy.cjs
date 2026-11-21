const http=require('node:http'),fs=require('node:fs');
const script=fs.readFileSync('.github/qa-phone/probe.js','utf8');
http.createServer((req,res)=>{
 if(req.url==='/__result' && req.method==='POST'){let result='';req.on('data',d=>result+=d);req.on('end',()=>{fs.writeFileSync('/tmp/sfm-native-result.json',result);res.end('OK')});return;}
 const upstream=http.request({hostname:'127.0.0.1',port:3590,path:req.url,method:req.method,headers:{...req.headers,'accept-encoding':'identity'}},r=>{
   if(!r.headers['content-type']?.includes('text/html')){res.writeHead(r.statusCode,r.headers);r.pipe(res);return;}
   let html='';r.setEncoding('utf8');r.on('data',d=>html+=d);r.on('end',()=>{const headers={...r.headers};delete headers['content-length'];res.writeHead(r.statusCode,headers);res.end(html.replace('<head>',()=>'<head><script>'+script+'</script>'));});
 });upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream);
}).listen(3583,'127.0.0.1');
