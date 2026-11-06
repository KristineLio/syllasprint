from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="css/style.css(?:\?[^"]*)?"\s*/>', '<style>\n'+(root/'css/style.css').read_text(encoding='utf-8')+'\n</style>', html)
for name in ('core','lecture','guide','app'):
    html=re.sub(r'<script defer src="js/'+name+r'\.js(?:\?[^"]*)?"></script>', '', html)
scripts='\n'.join('<script>\n'+(root/'js'/ (name+'.js')).read_text(encoding='utf-8')+'\n</script>' for name in ('core','lecture','guide','app'))
html=html.replace('</body>',scripts+'\n</body>')
(root/'syllasprint-vibeflow.html').write_text(html,encoding='utf-8')
print('Built single-file edition',len(html))