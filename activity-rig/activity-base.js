import {createSleepEffects} from './sleep-effects.js';
import {solveTwoBone} from './forelimb-math.mjs';

export const DURATION=3.2;
const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};

export async function createRig(THREE){
  const anatomy=await (await fetch(new URL('anatomy.json',import.meta.url))).json();
  const limbs=await (await fetch(new URL('forelimb-anatomy.json',import.meta.url))).json();
  const W=anatomy.width,H=anatomy.height,group=new THREE.Group(),headGroup=new THREE.Group();
  const loader=new THREE.TextureLoader(),maps=[],surfaces=[];
  async function texture(name){
    const map=await loader.loadAsync(new URL(name+'.png',import.meta.url).href);
    map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;
    maps.push(map);return map;
  }
  function plate(map,parent,order,width=W,height=H,segments=1){
    const geometry=new THREE.PlaneGeometry(width,height,segments,segments);
    const material=new THREE.MeshBasicMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
    const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=order;mesh.frustumCulled=false;parent.add(mesh);
    const record={mesh,positions:geometry.attributes.position.array.slice()};surfaces.push(record);return record;
  }
  const body=plate(await texture('torso'),group,1,W,H,64);
  const prone=plate(await texture('prone-body'),group,1,anatomy.proneRegistration.width,H,64);
  prone.mesh.visible=false;
  const standing=plate(await texture('stand-body'),group,1,W,H,64);
  standing.mesh.visible=false;
  const forelegs=[];
  for(const [side,data] of Object.entries(limbs.parts)){
    const [x0,y0,x1,y1]=data.roi;
    const limb=plate(await texture('foreleg-'+side),group,2,x1-x0,y1-y0,48);
    const foot=plate(await texture('foot-'+side),group,2.5,x1-x0,y1-y0);
    for(const part of [limb,foot]){
      part.mesh.geometry.translate((x0+x1)/2-W/2,H/2-(y0+y1)/2,0);
      part.positions=part.mesh.geometry.attributes.position.array.slice();
    }
    forelegs.push({side,data,limb,foot});
  }
  group.add(headGroup);
  const ears=[plate(await texture('ear-left'),headGroup,2,W,H,48),plate(await texture('ear-right'),headGroup,2,W,H,48)];
  const face=plate(await texture('head'),headGroup,3);
  const noseData=anatomy.nose,[nx0,ny0,nx1,ny1]=noseData.roi,[ncx,ncy]=noseData.center;
  const nose=plate(await texture('nose'),headGroup,4.1,nx1-nx0,ny1-ny0).mesh;
  nose.geometry.translate((nx0+nx1)/2-ncx,ncy-(ny0+ny1)/2,0);
  nose.position.set(ncx-W/2,H/2-ncy,0);nose.visible=false;
  const eyes=[];
  for(const side of ['left','right']){
    const data=anatomy.eyes[side],roi=data.roi,[cx,cy]=data.center;
    const w=roi[2]-roi[0],h=roi[3]-roi[1];
    const blank=plate(await texture('eye-'+side+'-empty'),headGroup,3.9,w,h).mesh;
    blank.material.color.setRGB(...data.emptyColorGainLinear);
    blank.position.set((roi[0]+roi[2])/2-W/2,H/2-(roi[1]+roi[3])/2,0);
    const open=plate(await texture('eye-'+side+'-open'),headGroup,4,w,h).mesh;
    open.geometry.translate((roi[0]+roi[2])/2-cx,cy-(roi[1]+roi[3])/2,0);
    open.position.set(cx-W/2,H/2-cy,0);
    const closed=plate(await texture('eye-'+side+'-closed'),headGroup,4,...data.closedSize).mesh;
    closed.position.set(cx-W/2,H/2-cy-5,0);
    eyes.push({blank,open,closed});
  }
  const effects=createSleepEffects({THREE});
  effects.group.position.set(-W/2+18,H/2-70,0);effects.group.scale.set(.7,-.7,1);group.add(effects.group);
  function setEyes(value){
    for(const eye of eyes){
      const closed=value>=.92;
      eye.blank.visible=value>1e-5;
      eye.open.visible=value>1e-5&&!closed;
      eye.open.scale.y=1-.88*value;
      eye.closed.visible=closed;
    }
  }
  function transformLegs(progress,wrists={}){
    for(const {side,data,limb,foot} of forelegs){
      const bx=data.bindX,shoulder=[data.sleepShoulder[0]+(bx-data.sleepShoulder[0])*progress,data.sleepShoulder[1]+(419-data.sleepShoulder[1])*progress];
      const wrist=wrists[side]??[bx,503];
      if(!Array.isArray(wrist)||wrist.length!==2||!wrist.every(Number.isFinite))throw new TypeError('Wrist requires two finite coordinates');
      const upper=34+20*progress,lower=22+8*progress;
      const solved=solveTwoBone({shoulder,wrist,upperLength:upper,lowerLength:lower,bendSign:side==='left'?-1:1});
      function turn(x,y,pivot,target,angle,scale){
        const dx=x-pivot[0],dy=(y-pivot[1])*scale,c=Math.cos(angle),s=Math.sin(angle);
        return [target[0]+dx*c+dy*s,target[1]-dx*s+dy*c];
      }
      const positions=limb.mesh.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=limb.positions[i*3]+W/2,y=H/2-limb.positions[i*3+1];
        const a=turn(x,y,[bx,419],shoulder,solved.upperAngle,upper/54);
        const b=turn(x,y,[bx,473],solved.elbow,solved.lowerAngle,lower/30);
        const weight=ease((y-457)/32);
        positions.setXYZ(i,a[0]*(1-weight)+b[0]*weight-W/2,H/2-(a[1]*(1-weight)+b[1]*weight),0);
      }
      positions.needsUpdate=true;
      foot.mesh.position.set(wrist[0]-bx,-(wrist[1]-503),0);
    }
  }
  function pose(time,breathTime=null,handoffBreath=0){
    if(!Number.isFinite(time)||time<0||time>DURATION)throw new RangeError('Pose time outside duration');
    if(breathTime!==null&&!Number.isFinite(breathTime))throw new RangeError('Breathing time must be finite');
    body.mesh.visible=true;prone.mesh.visible=false;standing.mesh.visible=false;
    nose.visible=false;nose.scale.set(1,1,1);
    for(const part of forelegs){part.limb.mesh.visible=true;part.foot.mesh.visible=true;}
    for(const ear of ears)ear.mesh.visible=true;
    group.position.set(0,0,0);group.rotation.set(0,0,0);headGroup.rotation.set(0,0,0);
    const wake=ease((time-.2)/.65),lift=ease((time-.65)/1.15),push=ease((time-1.4)/1.55);
    const sleeping=1-(.54*lift+.46*push),breath=(breathTime===null?handoffBreath:Math.sin(2*Math.PI*breathTime/DURATION))*sleeping;
    headGroup.position.set(0,-anatomy.headDrop*sleeping+.7*breath,0);
    const positions=body.mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=body.positions[i*3]+W/2,y=H/2-body.positions[i*3+1];
      const weight=clamp((503-y)/233),chest=clamp((490-y)/160)*clamp((y-260)/80);
      const nx=x+(x-260)*.06*sleeping*weight+(x-260)*.006*breath*chest;
      const ny=y+Math.max(0,503-y)*.63*sleeping-1.5*breath*chest;
      positions.setXYZ(i,nx-W/2,H/2-ny,0);
    }
    positions.needsUpdate=true;
    transformLegs(1-sleeping);
    for(let side=0;side<2;side++){
      const ear=ears[side],values=ear.mesh.geometry.attributes.position;
      for(let i=0;i<values.count;i++){
        const x=ear.positions[i*3]+W/2,y=H/2-ear.positions[i*3+1],u=clamp((y-100)/246),lag=Math.sin(Math.PI*push)*2*u*u;
        const nx=x+(side===0?-1:1)*(24*sleeping+lag)*u*u;
        const ny=y-83*sleeping*u*u+lag*.5;
        values.setXYZ(i,nx-W/2,H/2-ny,0);
      }
      values.needsUpdate=true;
    }
    setEyes(1-wake);
  }
  function pronePose(breathTime){
    if(!Number.isFinite(breathTime))throw new RangeError('Breathing time must be finite');
    body.mesh.visible=false;prone.mesh.visible=true;standing.mesh.visible=false;
    nose.visible=false;nose.scale.set(1,1,1);
    for(const part of forelegs){part.limb.mesh.visible=false;part.foot.mesh.visible=false;}
    for(const ear of ears)ear.mesh.visible=false;
    group.position.set(0,0,0);group.rotation.set(0,0,0);headGroup.rotation.set(0,0,0);
    const breath=Math.sin(2*Math.PI*breathTime/DURATION);
    headGroup.position.set(0,-anatomy.headDrop+.7*breath,0);
    const values=prone.mesh.geometry.attributes.position;
    for(let i=0;i<values.count;i++){
      const x=prone.positions[i*3]+W/2,sourceY=H/2-prone.positions[i*3+1];
      const y=sourceY>474?474+(sourceY-474)*anatomy.proneRegistration.floorScale:sourceY;
      const chest=clamp((520-y)/180)*clamp((y-300)/90);
      values.setXYZ(i,prone.positions[i*3]+(x-260)*.005*breath*chest,H/2-y+1.5*breath*chest,0);
    }
    values.needsUpdate=true;setEyes(1);
  }
  function setActivityPose({bodyX=0,bodyY=0,headTurn=0,headDroop=0,headShiftX=0,earSag=0,eyeClose=0,nosePulse=0,wrists={}}={}){
    if(![bodyX,bodyY,headTurn,headDroop,headShiftX,earSag,eyeClose,nosePulse].every(Number.isFinite)||eyeClose<0||eyeClose>1||nosePulse<0||nosePulse>1)throw new RangeError('Invalid activity pose');
    pose(DURATION);effects.setSleepEffects({enabled:false,mode:'all'});
    group.position.set(bodyX,-bodyY,0);
    const [x,y]=anatomy.headPivot,px=x-W/2,py=H/2-y,c=Math.cos(headTurn),s=Math.sin(headTurn);
    headGroup.position.set(px-(px*c-py*s)+headShiftX,py-(px*s+py*c)-headDroop,0);headGroup.rotation.z=headTurn;
    nose.visible=nosePulse>1e-5;
    const noseScale=1+(noseData.maxPulseScale-1)*nosePulse;
    nose.scale.set(noseScale,noseScale,1);
    for(const ear of ears){
      const values=ear.mesh.geometry.attributes.position;
      for(let i=0;i<values.count;i++){
        const y=H/2-ear.positions[i*3+1],u=clamp((y-100)/246);
        values.setXYZ(i,ear.positions[i*3],ear.positions[i*3+1]-earSag*u*u,0);
      }
      values.needsUpdate=true;
    }
    transformLegs(1,wrists);setEyes(eyeClose);
  }
  function hindStandPose(time){
    if(!Number.isFinite(time)||time<0||time>1)throw new RangeError('Standing cycle time outside range');
    pose(DURATION);effects.setSleepEffects({enabled:false,mode:'all'});
    body.mesh.visible=false;standing.mesh.visible=true;
    for(const part of forelegs){part.limb.mesh.visible=false;part.foot.mesh.visible=false;}
    const rise=(1-Math.cos(2*Math.PI*time))/2;
    headGroup.position.set(0,28+8*rise,0);
    const values=standing.mesh.geometry.attributes.position;
    for(let i=0;i<values.count;i++){
      const x=standing.positions[i*3]+W/2,y=H/2-standing.positions[i*3+1];
      const weight=clamp((515-y)/225);
      const pawWeight=Math.exp(-(((y-366)/45)**2))*Math.exp(-(((Math.abs(x-260)-64)/48)**2));
      const ny=y-8*rise*weight-2*rise*pawWeight;
      values.setXYZ(i,x-W/2,H/2-ny,0);
    }
    values.needsUpdate=true;setEyes(0);
  }
  pose(DURATION);
  return {group,width:W,height:H,setActivityPose,
    setHindStandTime:hindStandPose,
    setTime(time,handoffBreath=0){pose(time,null,handoffBreath);effects.setRiseTime(time);},
    setSleepTime(time){pronePose(time);effects.setSleepEffects({enabled:true,mode:'all'});effects.setSleepTime(((time%DURATION)+DURATION)%DURATION);},
    sleepBreathAt:time=>Math.sin(2*Math.PI*time/DURATION),
    setSleepPoseTimes({breathTime,effectTime}){pronePose(breathTime);effects.setSleepEffects({enabled:true,mode:'all'});effects.setSleepTime(effectTime);},
    evidence(){return {canvas:[W,H],headVertices:Array.from(face.mesh.geometry.attributes.position.array),headTransform:{position:headGroup.position.toArray(),rotation:headGroup.rotation.z},noseScale:nose.scale.x,noseVisible:nose.visible,eyeCenters:anatomy.eyes,footVertices:forelegs.map(part=>Array.from(part.foot.mesh.geometry.attributes.position.array))};},
    dispose(){effects.dispose();for(const {mesh} of surfaces){mesh.geometry.dispose();mesh.material.dispose();}for(const map of maps)map.dispose();}
  };
}
