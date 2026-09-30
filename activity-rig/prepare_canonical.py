import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
W, H = 520, 590

def clean(image):
    data = np.asarray(image.convert('RGBA')).copy()
    data[data[:, :, 3] <= 4] = 0
    return Image.fromarray(data)

def polygon(points):
    image = Image.new('L', (W, H))
    ImageDraw.Draw(image).polygon(points, fill=255)
    return np.asarray(image).astype(float) / 255

def plate(image, mask):
    data = np.asarray(image).copy()
    data[:, :, 3] = np.rint(data[:, :, 3] * mask).astype('uint8')
    return clean(Image.fromarray(data))

def register(image, target):
    image = clean(image)
    bounds = image.getchannel('A').getbbox()
    x0, y0, x1, y1 = target
    registered = Image.new('RGBA', (W, H))
    registered.alpha_composite(image.crop(bounds).resize((x1-x0, y1-y0), Image.Resampling.LANCZOS), (x0, y0))
    return clean(registered)

def components(mask):
    pending = set(map(tuple, np.argwhere(mask)))
    found = []
    while pending:
        start = pending.pop()
        stack, points = [start], [start]
        while stack:
            y, x = stack.pop()
            for point in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if point in pending:
                    pending.remove(point); stack.append(point); points.append(point)
        if len(points) >= 16:
            ys, xs = np.asarray(points).T
            found.append((len(points), [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]))
    return sorted(found, reverse=True)

original = clean(Image.open(ROOT / 'canonical-body.png'))
assert original.size == (W, H)
head = polygon([(141,149),(153,108),(177,81),(208,60),(243,43),(280,44),(319,56),(349,80),(369,116),(378,167),(376,218),(360,250),(330,270),(281,284),(236,284),(201,276),(172,258),(155,241),(146,214)])
left_ear = polygon([(0,60),(182,60),(174,110),(152,190),(149,230),(166,257),(186,275),(205,285),(202,309),(170,335),(139,347),(0,360)]) * (1-head)
right_ear = np.fliplr(left_ear.copy()) * (1-head)
ear_union = np.maximum(left_ear, right_ear)
head_support = np.asarray(Image.fromarray((head*255).astype('uint8')).filter(ImageFilter.MaxFilter(17))).astype(float)/255
ear_support = np.asarray(Image.fromarray((ear_union*255).astype('uint8')).filter(ImageFilter.MaxFilter(17))).astype(float)/255

parts = {
    'left': {'roi':[142,395,243,553], 'bindX':194, 'sleepShoulder':[166,493],
        'shaft':[(162,401),(215,401),(227,432),(227,470),(220,504),(166,504),(160,483),(161,438)],
        'foot':[(158,499),(170,492),(212,492),(229,500),(241,516),(241,538),(223,551),(156,551),(146,537),(146,514)]},
    'right': {'roi':[278,395,381,553], 'bindX':324, 'sleepShoulder':[352,493],
        'shaft':[(305,401),(357,401),(363,438),(361,483),(354,504),(298,504),(291,470),(292,432)],
        'foot':[(291,500),(309,492),(350,492),(368,500),(377,515),(378,537),(362,551),(295,551),(278,538),(278,516)]},
}
limb_union = np.zeros((H,W))
for side, part in parts.items():
    shaft, foot = polygon(part['shaft']), polygon(part['foot'])
    limb_union = np.maximum(limb_union, np.maximum(shaft, foot))
    x0,y0,x1,y1 = part['roi']
    plate(original, shaft).crop((x0,y0,x1,y1)).save(ROOT/f'foreleg-{side}.png')
    plate(original, foot).crop((x0,y0,x1,y1)).save(ROOT/f'foot-{side}.png')

underplate = register(Image.open(ROOT/'canonical-source/torso.png'), (20,220,500,526))
hidden = np.maximum(limb_union, polygon([(170,220),(349,220),(391,413),(354,546),(169,546),(128,413)]))
torso = plate(underplate, hidden)
body_region = np.clip((np.indices((H,W))[0]-295)/40,0,1)
torso.alpha_composite(plate(original, (1-head)*(1-ear_union)*(1-limb_union)*body_region))
clean(torso).save(ROOT/'torso.png')
plate(original, head_support).save(ROOT/'head.png')
plate(original, np.minimum(ear_support, polygon([(0,0),(260,0),(260,H),(0,H)]))).save(ROOT/'ear-left.png')
plate(original, np.minimum(ear_support, polygon([(260,0),(W,0),(W,H),(260,H)]))).save(ROOT/'ear-right.png')

sheet = clean(Image.open(ROOT/'canonical-source/eyes.png'))
split = sheet.width // 2
blank = sheet.crop((0,0,split,sheet.height))
closed = sheet.crop((split,0,sheet.width,sheet.height))
eye_records = {}
for side, roi, search in [
    ('left', [177,143,220,219], [.20,.47]),
    ('right',[298,143,342,219], [.54,.81]),
]:
    x0,y0,x1,y1 = roi
    opened = original.crop(tuple(roi))
    data = np.asarray(opened).copy()
    dark = (data[:,:,:3].max(axis=2)<150) & (data[:,:,3]>128)
    blob = components(dark)[0][1]
    cx,cy = x0+(blob[0]+blob[2])/2, y0+(blob[1]+blob[3])/2
    data[:,:,3] *= dark.astype('uint8')
    clean(Image.fromarray(data)).save(ROOT/f'eye-{side}-open.png')
    region = [int(closed.width*search[0]),int(closed.height*.25),int(closed.width*search[1]),int(closed.height*.60)]
    values = np.asarray(closed.crop(tuple(region)))
    dark = (values[:,:,:3].max(axis=2)<150) & (values[:,:,3]>128)
    candidates = [record for record in components(dark) if (record[1][2]-record[1][0]) / max(1,record[1][3]-record[1][1]) > 2]
    _, bounds = candidates[0]
    bounds = [bounds[0]+region[0],bounds[1]+region[1],bounds[2]+region[0],bounds[3]+region[1]]
    b = [bounds[0]-3,bounds[1]-3,bounds[2]+3,bounds[3]+3]
    lid = closed.crop(tuple(b)); lid_data=np.asarray(lid).copy()
    lid_data[:,:,3] *= (lid_data[:,:,:3].max(axis=2)<160).astype('uint8')
    lid = clean(Image.fromarray(lid_data))
    target_width = 32
    target_height = round(lid.height/lid.width*target_width)
    lid = lid.resize((target_width,target_height),Image.Resampling.LANCZOS)
    lid.save(ROOT/f'eye-{side}-closed.png')
    sx=(bounds[0]+bounds[2])/2;sy=(bounds[1]+bounds[3])/2
    patch=blank.crop((round(sx-70),round(sy-120),round(sx+70),round(sy+120))).resize((x1-x0,y1-y0),Image.Resampling.LANCZOS)
    patch_data=np.asarray(patch).copy()
    remove=Image.fromarray((np.asarray(opened)[:,:,:3].max(axis=2)<150).astype('uint8')*255)
    remove=remove.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
    patch_data[:,:,3]=np.asarray(remove)
    clean(Image.fromarray(patch_data)).save(ROOT/f'eye-{side}-empty.png')
    original_data=np.asarray(opened)
    original_dark=original_data[:,:,:3].max(axis=2)<150
    dark_mask=Image.fromarray(original_dark.astype('uint8')*255)
    outer=np.asarray(dark_mask.filter(ImageFilter.MaxFilter(17)))>0
    inner=np.asarray(dark_mask.filter(ImageFilter.MaxFilter(7)))>0
    target=np.median(original_data[:,:,:3][outer&~inner],axis=0)/255
    sample=np.median(patch_data[:,:,:3][patch_data[:,:,3]>200],axis=0)/255
    def linear(rgb):
        return np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    gain=(linear(target)/np.maximum(.001,linear(sample))).tolist()
    eye_records[side]={'roi':roi,'center':[cx,cy],'openBounds':blob,'closedSize':[target_width,target_height],'emptyColorGainLinear':gain}

nose_roi=[227,207,283,254]
nose=original.crop(tuple(nose_roi));nose_values=np.asarray(nose).copy()
nose_dark=(nose_values[:,:,:3].max(axis=2)<160)&(nose_values[:,:,3]>128)
nose_bounds=components(nose_dark)[0][1]
nose_values[:,:,3]*=nose_dark.astype('uint8')
clean(Image.fromarray(nose_values)).save(ROOT/'nose.png')
nose_record={'roi':nose_roi,'center':[nose_roi[0]+(nose_bounds[0]+nose_bounds[2])/2,nose_roi[1]+(nose_bounds[1]+nose_bounds[3])/2],'maxPulseScale':1.028}

prone=clean(Image.open(ROOT/'canonical-source/prone.png'))
values=np.asarray(prone)
yy,xx=np.mgrid[:prone.height,:prone.width]
dark=(values[:,:,:3].max(axis=2)<140)&(values[:,:,3]>128)&(xx>prone.width*.25)&(xx<prone.width*.75)&(yy>prone.height*.3)&(yy<prone.height*.8)
blobs=components(dark)
nose=next(bounds for _,bounds in blobs if .7<(bounds[2]-bounds[0])/(bounds[3]-bounds[1])<2)
nose_center=np.array([(nose[0]+nose[2])/2,(nose[1]+nose[3])/2])
eye_blobs=[bounds for _,bounds in blobs if (bounds[2]-bounds[0])/(bounds[3]-bounds[1])>2 and bounds[3]<nose_center[1]]
left=min(eye_blobs,key=lambda bounds:bounds[0])
right=max(eye_blobs,key=lambda bounds:bounds[0])
source_points=np.array([[(left[0]+left[2])/2,(left[1]+left[3])/2],[(right[0]+right[2])/2,(right[1]+right[3])/2],nose_center])
target_points=np.array([[198,376.5],[320,378],[254.5,422]])
source_mean,target_mean=source_points.mean(axis=0),target_points.mean(axis=0)
sp,tp=source_points-source_mean,target_points-target_mean
u,singular,vh=np.linalg.svd(sp.T@tp)
rotation=u@vh
scale=singular.sum()/(sp*sp).sum()
offset=target_mean-scale*source_mean@rotation
r=rotation
coefficients=(r[0,0]/scale,r[0,1]/scale,(-r[0,0]*(60+offset[0])-r[0,1]*offset[1])/scale,r[1,0]/scale,r[1,1]/scale,(-r[1,0]*(60+offset[0])-r[1,1]*offset[1])/scale)
registered=prone.transform((640,H),Image.Transform.AFFINE,coefficients,Image.Resampling.BICUBIC)
clean(registered).save(ROOT/'prone-body.png')
source_floor=clean(registered).getchannel('A').getbbox()[3]-1
floor_scale=(546-474)/(source_floor-474)

anatomy={'width':W,'height':H,'headPivot':[260,270],'headDrop':192,'earRoots':{'left':[173,100],'right':[347,100]},'eyes':eye_records,'nose':nose_record,'headMask':head.astype('uint8').sum().item(),'proneRegistration':{'width':640,'height':H,'scale':float(scale),'rotation':rotation.tolist(),'offset':offset.tolist(),'sourceLandmarks':source_points.tolist(),'targetLandmarks':target_points.tolist(),'sourceFloor':source_floor,'targetFloor':546,'floorScale':floor_scale}}
(ROOT/'anatomy.json').write_text(json.dumps(anatomy,indent=2))
(ROOT/'forelimb-anatomy.json').write_text(json.dumps({'canvas':[W,H],'parts':parts,'lengths':[54,30],'bindY':[419,473,503]},indent=2))
hashes={str(file.relative_to(ROOT)):hashlib.sha256(file.read_bytes()).hexdigest() for file in ROOT.glob('*.png')}
(ROOT/'canonical-assets.json').write_text(json.dumps({'canonical':'canonical-body.png','nativeSize':[W,H],'headCopiedFromCanonical':True,'generatedUse':'hidden torso, compact prone underplate and eye replacement patches; original rigid face retained','hashes':hashes},indent=2))
print(json.dumps({'parts':len(hashes),'canvas':[W,H],'eyeCenters':{side:r['center'] for side,r in eye_records.items()}}))
