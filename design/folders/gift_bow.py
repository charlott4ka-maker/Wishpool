from PIL import Image, ImageFilter, ImageDraw
import numpy as np
tf=Image.open('t_front.png').split()[3]; x0,y0,x1,y1=tf.getbbox(); W=x1-x0; H=y1-y0
# glossy red paper: a soft top-to-bottom gradient, a bit of light at the top
ys=np.linspace(0,1,1024)[:,None]
top=np.array([212,22,22]); bot=np.array([150,8,10])
g=np.clip((ys*1024-y0)/H,0,1)
rgb=(top*(1-g)+bot*g)[:, None, :].repeat(1024,axis=1)
rgb=rgb+np.random.default_rng(1).normal(0,2.2,rgb.shape)
canvas=Image.fromarray(np.clip(rgb,0,255).astype(np.uint8)).convert('RGBA')
def band(w,h,vertical):
    # cream satin ribbon: lighter in the middle, soft edges
    t=np.linspace(-1,1,w if vertical else h)
    shade=(232-28*t**2)
    arr=np.repeat(shade[None,:],h,0) if vertical else np.repeat(shade[:,None],w,1)
    a=np.stack([arr,arr*0.99,arr*0.96,np.full_like(arr,255)],-1)
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8),'RGBA')
rw=int(W*0.075); cx=x0+W//2; cy=y0+int(H*0.52)
sh=Image.new('RGBA',(1024,1024),(0,0,0,0)); d=ImageDraw.Draw(sh)
d.rectangle((cx-rw//2+4,y0,cx+rw//2+4,y1),fill=(60,0,0,90)); d.rectangle((x0,cy-rw//2+5,x1,cy+rw//2+5),fill=(60,0,0,90))
canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
canvas.alpha_composite(band(rw,H+10,True),(cx-rw//2,y0-5)); canvas.alpha_composite(band(W+10,rw,False),(x0-5,cy-rw//2))
bow=Image.open('bow.png').convert('RGBA'); bow=bow.crop(bow.getbbox()); bow.thumbnail((int(W*0.62),int(H*0.78)))
bsh=Image.new('RGBA',bow.size,(0,0,0,0)); bsh.putalpha(bow.split()[3].point(lambda v:int(v*0.35)).filter(ImageFilter.GaussianBlur(10)))
bx=cx-bow.width//2; by=cy-int(bow.height*0.40)
canvas.alpha_composite(bsh,(bx+5,by+10)); canvas.alpha_composite(bow,(bx,by))
canvas.save('giftwrap_front_built.png')
