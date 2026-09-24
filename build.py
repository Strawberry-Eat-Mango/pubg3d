import os
d=os.path.dirname(os.path.abspath(__file__))
src=lambda f: open(os.path.join(d,'src',f),encoding='utf-8').read()
game='\n'.join(src(f) for f in ['core.js','world.js','items.js','units.js','ai.js','game.js'])
html=src('shell.html').replace('/*__THREE__*/',src('three.min.js')).replace('/*__GAME__*/',game)
open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(html)
print('built', len(html)//1024, 'KB')
