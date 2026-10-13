#!/usr/bin/env python3
"""Build a single-file version of the app (for hosting where relative fetches are not possible).
Usage: python3 build-standalone.py [output.html]"""
import json,re,sys
out=sys.argv[1] if len(sys.argv)>1 else 'forge-grc-standalone.html'
html=open('index.html',encoding='utf8').read()
m=re.search(r'const GRC_FILES=\[(.*?)\];',html)
files=json.loads('['+m.group(1)+']')
NOTICE='Forge GRC: confidential evaluation copy. All rights reserved. No licence to copy, modify or redistribute is granted.'
src='/* '+NOTICE+' */\n'+'\n;\n'.join(open(f,encoding='utf8').read() for f in files)
blob=json.dumps(src).replace('</','<\\/')
start=html.index('const GRC_FILES=')
end=html.index('.catch(err=>console.error("GRC modules failed to load",err));',start)+len('.catch(err=>console.error("GRC modules failed to load",err));')
loader='try{eval('+blob+')}catch(err){console.error("GRC modules failed to load",err)}'
built=html[:start]+loader+html[end:]
banner='<div style="position:fixed;right:12px;bottom:10px;z-index:99999;font:500 10px \'DM Mono\',monospace;color:#6b7888;background:#ffffffe6;border:1px solid #e8ebef;border-radius:12px;padding:5px 10px;pointer-events:none">Confidential evaluation copy · All rights reserved · Do not copy or redistribute</div>'
built=built.replace('</body>',banner+'</body>',1)
open(out,'w',encoding='utf8').write(built)
print('wrote',out,len(built)//1024,'KB from',len(files),'files')
