# extra gloss for the glassy folders: a soft light streak along the top inside edge,
# a thin rim light round the edge, and a pink and a green glint, like a puffy 3D icon
import sys
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import numpy as np
def glossify(path, tpl):
    im=Image.open(path).convert('RGBA'); t=Image.open(tpl).split()[3]
    a=np.asarray(t).astype(np.float32)/255
    c=np.asarray(im).astype(np.float32)
    # puffy: lighter at the top, deeper at the bottom
    ys=np.linspace(0,1,1024)[:,None]; x0_,y0_,x1_,y1_=t.getbbox(); g=np.clip((ys*1024-y0_)/(y1_-y0_),0,1)
    c[...,:3]*= (1.12-0.38*g)[...,None]
    # rim light: just inside the edge
    inner=np.asarray(t.filter(ImageFilter.MinFilter(13))).astype(np.float32)/255
    rim=np.clip(a-inner,0,1); rim=np.asarray(Image.fromarray((rim*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32)/255
    c[...,:3]+= (255-c[...,:3])*(0.35*rim[...,None])
    # the streak: the top edge pushed in and blurred into a band
    band=np.clip(np.asarray(ImageChops.offset(t,0,28)).astype(np.float32)/255 - np.asarray(ImageChops.offset(t,0,70)).astype(np.float32)/255,0,1)*a
    x0,y0,x1,y1=t.getbbox(); xs=np.linspace(0,1,1024)[None,:]; fade=np.clip(np.minimum((xs*1024-x0)/(x1-x0)*5,(x1-xs*1024)/(x1-x0)*5),0,1)
    band=np.asarray(Image.fromarray((band*fade*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12))).astype(np.float32)/255
    c[...,:3]+= (255-c[...,:3])*(0.55*band[...,None])
    out=Image.fromarray(np.clip(c,0,255).astype(np.uint8))
    out.putalpha(im.split()[3]); out.save(path)
glossify(sys.argv[1], sys.argv[2])
