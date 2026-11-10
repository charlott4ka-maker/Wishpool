import sys
from PIL import Image, ImageFilter, ImageChops, ImageOps
import numpy as np
tb=Image.open('t_back.png').split()[3]; tf=Image.open('t_front.png').split()[3]
def bbox_center(a):
    x0,y0,x1,y1=a.getbbox(); return (x0+x1)/2,(y0+y1)/2
FITBOX=('cyano','stripes2','bliss','horses_Wishful')
def fitbox(k,part,t):
    # take the inside of whatever the model drew (its own edge trimmed off) and stretch it over our shape
    im=Image.open(f'{k}_{part}.png').convert('RGBA')
    ax0,ay0,ax1,ay1=im.split()[3].point(lambda v:255 if v>200 else 0).getbbox()
    ix=(ax1-ax0)*0.07; iy=(ay1-ay0)*0.07
    crop=im.crop((int(ax0+ix),int(ay0+iy),int(ax1-ix),int(ay1-iy)))
    x0,y0,x1,y1=t.getbbox()
    out=crop.resize((x1-x0+8,y1-y0+8),Image.LANCZOS).convert('RGB')
    bg=Image.new('RGB',(1024,1024),(0,0,0)); bg.paste(out,(x0-4,y0-4)); return bg
def material(k,part,t,scale,dy=0):
    if k in FITBOX: return fitbox(k,part,t)
    im=Image.open(f'{k}_{part}.png').convert('RGBA')
    # the model's own edge stays outside our shape: blow the picture up around the shape's centre
    cx,cy=bbox_center(t)
    W=int(1024*scale); big=im.resize((W,W),Image.LANCZOS)
    out=Image.new('RGBA',(1024,1024),(0,0,0,0)); out.alpha_composite(big,(int(cx-cx*scale),int(cy-cy*scale)+dy))
    # any gaps left inside: fill from a blurred copy so nothing shows through
    # gaps left inside (a picture moved or shrunk): the material's own middle colour, softened in
    import numpy as _np
    px=_np.asarray(im)[...,:4].reshape(-1,4); px=px[px[:,3]>200][:,:3]
    med=tuple(int(v) for v in _np.median(px,axis=0)) if len(px) else (128,128,128)
    bg=Image.new('RGBA',(1024,1024),med+(255,)); soft=out.filter(ImageFilter.GaussianBlur(6)); bg.alpha_composite(soft); bg.alpha_composite(out); return bg.convert('RGB')
def bevel(rgb,t):
    a=np.asarray(t).astype(np.float32)/255
    inner=1-np.asarray(t.filter(ImageFilter.GaussianBlur(9))).astype(np.float32)/255
    inner=np.clip(inner*a,0,1)                       # 0 inside, rising to the edge
    shifted=np.asarray(ImageChops.offset(t,0,10).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
    top=np.clip(a-shifted,0,1)                       # the top edges
    c=np.asarray(rgb).astype(np.float32)
    # a touch of shade on the sides only, fading out towards the bottom (no dark band under the folder)
    ys=np.linspace(0,1,1024)[:,None]; x0_,y0_,x1_,y1_=t.getbbox(); g=np.clip((ys*1024-y0_)/(y1_-y0_),0,1)
    c=c*(1-0.14*inner[...,None]*(1-g)[...,None])
    c=c+(255-c)*(0.22*top[...,None])                 # light from the top
    out=Image.fromarray(np.clip(c,0,255).astype(np.uint8)).convert('RGBA'); out.putalpha(t.filter(ImageFilter.GaussianBlur(0.8)))
    return out
for k in sys.argv[1:]:
    b=bevel(material(k,'back',tb,1.16),tb)
    # the back sits in the shade
    bb=np.asarray(b).astype(np.float32); bb[...,:3]*=0.78; b=Image.fromarray(bb.astype(np.uint8))
    # fronts with a picture on them (a bow, a frog, stamps, deer) are blown up less, so it stays whole
    f=bevel(material(k,'front',tf,1.14 if k=='airmail' else 1.16 if k=='giftwrap' else 0.98 if k.startswith('horses_') else 1.13 if k in ('frog','xmas') else 1.18, 120 if k=='giftwrap' else 0),tf)
    b.save(f'{k}_b.png'); f.save(f'{k}_f.png')
