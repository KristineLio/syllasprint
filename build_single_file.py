"""Build the portable HTML version from the framework-free production source."""
from pathlib import Path
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="css/style.css" />','<style>\n'+(root/'css/style.css').read_text(encoding='utf-8')+'\n</style>')
for file in ['core','lecture','app']:
    html=html.replace('  <script defer src="js/'+file+'.js"></script>','')
scripts='\n'.join('<script>\n'+(root/'js'/ (name+'.js')).read_text(encoding='utf-8')+'\n</script>' for name in ['core','lecture','app'])
html=html.replace('</body>',scripts+'\n</body>')
(root/'syllasprint-vibeflow.html').write_text(html,encoding='utf-8')
print('Built',root/'syllasprint-vibeflow.html',len(html),'characters')