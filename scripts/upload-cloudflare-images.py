import json, subprocess, hashlib, sys
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime, timezone

root=Path(__file__).resolve().parents[1]/'eais-lab'
manifest_file=root/'cloudflare-images.json'
manifest=json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
assets={'wordmark':'web/wordmark.svg','mascot':'web/mascot.webp','badge':'web/badge.webp','expressions':'web/mascot-expressions.webp','favicon':'web/favicon.svg','apple_touch_icon':'web/apple-touch-icon.png'}
assets.update({'pose_'+p.stem:'web/expressions/'+p.name for p in sorted((root/'web/expressions').glob('*.svg'))})
token=subprocess.check_output(['gh','auth','token'],text=True).strip()
headers='header = '+json.dumps('Authorization: Bearer '+token)+'\nheader = "Origin: https://eaislab.com"\nheader = "Content-Type: application/json"\n'
for name in (sys.argv[1:] or assets):
 path=root/assets[name]
 digest=hashlib.sha256(path.read_bytes()).hexdigest()
 if manifest.get(name,{}).get('sha256')==digest:
  print(name+': already uploaded',flush=True);continue
 r=subprocess.run(['curl','--silent','--show-error','--fail-with-body','--config','-','--max-time','30','--data','{"variant":"content"}','https://eais-cms-images.neardws.workers.dev/upload-url'],input=headers,text=True,capture_output=True)
 if r.returncode: raise RuntimeError('Cannot allocate upload: '+str(r.returncode))
 allocation=json.loads(r.stdout)
 if urlparse(allocation['uploadURL']).hostname!='upload.imagedelivery.net':raise RuntimeError('Unexpected upload host')
 # GitHub credentials are sent only to the existing authentication Worker.
 r=subprocess.run(['curl','--silent','--show-error','--fail-with-body','--max-time','90','--form',f'file=@{path};filename=eais-lab-{name}{path.suffix}',allocation['uploadURL']],text=True,capture_output=True)
 result=json.loads(r.stdout)
 if r.returncode or not result.get('success'):raise RuntimeError('Upload failed for '+name+': '+json.dumps(result.get('errors',[])))
 manifest[name]={'source':assets[name],'sha256':digest,'id':result['result']['id'],'url':allocation['deliveryURL'],'uploaded_at':datetime.now(timezone.utc).isoformat()}
 manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
 print(name+': uploaded '+allocation['deliveryURL'],flush=True)
