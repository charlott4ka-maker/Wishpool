import sys
from PIL import Image, ImageFilter, ImageChops, ImageOps
import numpy as np
tb=Image.open('t_back.png').split()[3]; tf=Image.open('t_front.png').split()[3]
def bbox_center(a):
    x0,y0,x1,y1=a.getbbox(); return (x0+x1)/2,(y0+y1)/2
def material(k,part,t,scale):
    im=Image.open(f'{k}_{part}.png').convert('RGBA')
    # the model's own edge stays outside our shape: blow the picture up around the shape's centre
    cx,cy=bbox_center(t)
    W=int(1024*scale); big=im.resize((W,W),Image.LANCZOS)
    out=Image.new('RGBA',(1024,1024),(0,0,0,0)); out.alpha_composite(big,(int(cx-cx*scale),int(cy-cy*scale)))
    # any gaps left inside: fill from a blurred copy so nothing shows through
    bg=out.filter(ImageFilter.GaussianBlur(30)); bg.putalpha(255); bg.alpha_composite(out); return bg.convert('RGB')
def bevel(rgb,t):
    a=np.asarray(t).astype(np.float32)/255
    inner=1-np.asarray(t.filter(ImageFilter.GaussianBlur(14))).astype(np.float32)/255
    inner=np.clip(inner*a,0,1)                       # 0 inside, rising to the edge
    shifted=np.asarray(ImageChops.offset(t,0,10).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
    top=np.clip(a-shifted,0,1)                       # the top edges
    c=np.asarray(rgb).astype(np.float32)
    c=c*(1-0.42*inner[...,None])                     # rounded edges go into shadow
    c=c+(255-c)*(0.30*top[...,None])                 # light from the top
    out=Image.fromarray(np.clip(c,0,255).astype(np.uint8)).convert('RGBA'); out.putalpha(t.filter(ImageFilter.GaussianBlur(0.8)))
    return out
for k in sys.argv[1:]:
    b=bevel(material(k,'back',tb,1.16),tb)
    # the back sits in the shade
    bb=np.asarray(b).astype(np.float32); bb[...,:3]*=0.78; b=Image.fromarray(bb.astype(np.uint8))
    f=bevel(material(k,'front',tf,1.18),tf)
    b.save(f'{k}_b.png'); f.save(f'{k}_f.png')
