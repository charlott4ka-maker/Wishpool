import sys
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter
FONT='/tmp/claude-0/-home-user-Wishpool/553e92af-0468-5d3f-879e-ada6c5cd349a/scratchpad/fontdl/package/files/great-vibes-latin-400-normal.woff'
def letter(front_png, word, out, cell=9, col=(236,236,96)):
    f=Image.open(front_png).convert('RGBA'); t=Image.open('t_front.png').split()[3]
    x0,y0,x1,y1=t.getbbox()
    W=x1-x0
    size=300
    while True:
        font=ImageFont.truetype(FONT,size); bb=font.getbbox(word)
        if bb[2]-bb[0] <= W*0.86 or size<80: break
        size-=10
    m=Image.new('L',(1024,1024),0); d=ImageDraw.Draw(m)
    tw,th=bb[2]-bb[0],bb[3]-bb[1]
    cx=x0+W/2; cy=y0+(y1-y0)*0.60
    d.text((cx-tw/2-bb[0],cy-th/2-bb[1]),word,font=font,fill=255,stroke_width=3,stroke_fill=255)
    # pixelate like knitting: down to a grid and back up, hard edges
    small=m.resize((1024//cell,1024//cell),Image.BOX).point(lambda v:255 if v>90 else 0)
    px=small.resize((1024,1024),Image.NEAREST)
    px=ImageChops.multiply(px,t)
    shadow=Image.new('RGBA',(1024,1024),(110,10,10,0)); shadow.putalpha(ImageChops.offset(px,3,4).point(lambda v:int(v*0.45)))
    layer=Image.new('RGBA',(1024,1024),col+(0,)); layer.putalpha(px)
    f.alpha_composite(shadow); f.alpha_composite(layer); f.save(out)
letter(sys.argv[1],sys.argv[2],sys.argv[3])
