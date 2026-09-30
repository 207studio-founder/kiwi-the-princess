import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from prepare_canonical import clean,components

root=Path(__file__).resolve().parent
source=clean(Image.open(root/'canonical-source/hind-stand.png'))
a=np.asarray(source);yy,xx=np.mgrid[:source.height,:source.width]
mask=(a[:,:,:3].max(axis=2)<140)&(a[:,:,3]>128)&(xx>source.width*.3)&(xx<source.width*.7)&(yy>source.height*.15)&(yy<source.height*.4)
blobs=components(mask)
nose=next(bounds for _,bounds in blobs if .75<(bounds[2]-bounds[0])/(bounds[3]-bounds[1])<1.8)
c=lambda bounds:np.array([(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2])
nose_center=c(nose)
eyes=[bounds for _,bounds in blobs if .3<(bounds[2]-bounds[0])/(bounds[3]-bounds[1])<.85 and bounds[3]<nose_center[1]]
left=min(eyes,key=lambda bounds:bounds[0]);right=max(eyes,key=lambda bounds:bounds[0])
sp=np.array([c(left),c(right),nose_center]);tp=np.array([[198,147.5],[320,149],[254.5,198]])
sm,tm=sp.mean(axis=0),tp.mean(axis=0);s0,t0=sp-sm,tp-tm
u,sv,vh=np.linalg.svd(s0.T@t0);rotation=u@vh;scale=sv.sum()/(s0*s0).sum();offset=tm-scale*sm@rotation
r=rotation;coeff=(r[0,0]/scale,r[0,1]/scale,(-r[0,0]*offset[0]-r[0,1]*offset[1])/scale,r[1,0]/scale,r[1,1]/scale,(-r[1,0]*offset[0]-r[1,1]*offset[1])/scale)
registered=clean(source.transform((520,900),Image.Transform.AFFINE,coeff,Image.Resampling.BICUBIC))
floor=registered.getchannel('A').getbbox()[3]-1;split=290;floor_scale=(546-split)/(floor-split)
result=Image.new('RGBA',(520,590));result.alpha_composite(registered.crop((0,0,520,split)))
result.alpha_composite(registered.crop((0,split,520,floor+1)).resize((520,547-split),Image.Resampling.LANCZOS),(0,split))
body_mask=Image.new('L',(520,590));ImageDraw.Draw(body_mask).polygon([(175,225),(345,225),(350,285),(405,325),(405,490),(395,558),(125,558),(115,490),(115,325),(170,285)],fill=255)
data=np.asarray(result).copy();data[:,:,3]=(data[:,:,3].astype(float)*np.asarray(body_mask)/255).round().astype('uint8')
clean(Image.fromarray(data)).save(root/'stand-body.png')
registration={'sourceLandmarks':sp.tolist(),'targetLandmarks':tp.tolist(),'sourceFloor':floor,'targetFloor':546,'headLift':32,'lowerBodyCompression':floor_scale,'scale':float(scale),'rotation':rotation.tolist(),'offset':offset.tolist(),'frontPawCenters':[[195,366],[324,366]],'hindPawCenters':[[194,532],[326,532]],'totalPaws':4,'groundedPaws':2}
(root/'stand-registration.json').write_text(json.dumps(registration,indent=2))
manifest=json.loads((root/'canonical-assets.json').read_text());manifest['hashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.png')};manifest['generatedUse']='hidden torso, compact prone and four-paw hind-standing anatomical underplates, eye inserts; canonical rigid face retained';(root/'canonical-assets.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(registration))
