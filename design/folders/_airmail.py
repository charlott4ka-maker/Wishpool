import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
random.seed(4)
def stamp(name,size,rot):
    st=Image.open(name+'.png').convert('RGBA'); st=st.crop(st.getbbox()); st.thumbnail((size,size)); return st.rotate(rot,expand=True,resample=Image.BICUBIC)
def put(base,mask,items):
    layer=Image.new('RGBA',(1024,1024),(0,0,0,0))
    for st,(x,y) in items:
        sh=Image.new('RGBA',st.size,(0,0,0,0)); sh.putalpha(st.split()[3].point(lambda v:int(v*0.28)).filter(ImageFilter.GaussianBlur(5)))
        layer.alpha_composite(sh,(x+3,y+5)); layer.alpha_composite(st,(x,y))
    layer.putalpha(ImageChops.multiply(layer.split()[3],mask)); base.alpha_composite(layer); return base
def postmark(cx,cy,r):
    pm=Image.new('L',(1024,1024),0); d=ImageDraw.Draw(pm)
    d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=255,width=5); d.ellipse((cx-r+16,cy-r+16,cx+r-16,cy+r-16),outline=255,width=3)
    for i in range(14):  # little marks round the ring instead of lettering
        a=math.radians(i*360/14+8); x1=cx+math.cos(a)*(r-9); y1=cy+math.sin(a)*(r-9)
        d.line((x1-4*math.cos(a),y1-4*math.sin(a),x1+4*math.cos(a),y1+4*math.sin(a)),fill=255,width=3)
    d.line((cx-r+30,cy,cx+r-30,cy),fill=255,width=3)
    for k in range(4):  # cancellation waves
        y=cy-42+k*26; pts=[(x,y+8*math.sin((x-cx)/22)) for x in range(cx+r-6,cx+r+190,4)]
        d.line(pts,fill=255,width=5)
    noise=Image.effect_noise((1024,1024),90).point(lambda v:255 if v>110 else int(v*1.6))
    pm=ImageChops.multiply(pm,noise).filter(ImageFilter.GaussianBlur(0.6))
    col=Image.new('RGBA',(1024,1024),(52,66,92,255)); col.putalpha(pm.point(lambda v:int(v*0.72))); return col
b=Image.open('airmail_b.png'); f=Image.open('airmail_f.png')
tb=Image.open('t_back.png').split()[3]; tf=Image.open('t_front.png').split()[3]
# two stamps tucked in behind the front, peeking out above it
b=put(b,tb,[(stamp('vs_arch',150,-3),(560,236)),(stamp('vs_dog',160,4),(720,222))])
# on the front: the postmark and a green stamp
f=put(f,tf,[(stamp('vs_leaf',135,3),(760,520))])
pm=postmark(700,505,78); pm.putalpha(ImageChops.multiply(pm.split()[3],tf)); f.alpha_composite(pm)
b.save('airmail_b.png'); f.save('airmail_f.png')
c=b.copy(); c.alpha_composite(f); c=c.crop((0,60,1024,1000)); c.thumbnail((400,370)); bg=Image.new('RGBA',c.size,(21,24,29,255)); bg.alpha_composite(c); bg.save('airmail_zoom.png')
