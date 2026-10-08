#!/usr/bin/env python3
"""Build a single-file version of the app (for hosting where relative fetches are not possible).
Usage: python3 build-standalone.py [output.html]"""
import json,re,sys
out=sys.argv[1] if len(sys.argv)>1 else 'forge-grc-standalone.html'
html=open('index.html',encoding='utf8').read()
m=re.search(r'const GRC_FILES=\[(.*?)\];',html)
files=json.loads('['+m.group(1)+']')
src='\n;\n'.join(open(f,encoding='utf8').read() for f in files)
blob=json.dumps(src).replace('</','<\\/')
start=html.index('const GRC_FILES=')
end=html.index('.catch(err=>console.error("GRC modules failed to load",err));',start)+len('.catch(err=>console.error("GRC modules failed to load",err));')
loader='try{eval('+blob+')}catch(err){console.error("GRC modules failed to load",err)}'
open(out,'w',encoding='utf8').write(html[:start]+loader+html[end:])
print('wrote',out,len(html[:start]+loader+html[end:])//1024,'KB from',len(files),'files')
