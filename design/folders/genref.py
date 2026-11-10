# image-to-image with a reference: our exact part shape + the user's reference picture
import base64, json, subprocess, concurrent.futures as cf, sys, os
FRONT=("Image 1 is a flat grey shape: the FRONT panel of our folder icon. Image 2 is a style reference. "
       "Re-render image 1 in exactly the material, texture, lighting and realism of image 2: {x}. "
       "Keep EXACTLY the silhouette, position and size of image 1, filling it edge to edge. "
       "Transparent background, nothing outside the shape, no text, no letters, no logos.")
BACK=("Image 1 is a flat grey rounded rectangle: the BACK panel of our folder icon, slightly in the shade. Image 2 is a style reference. "
      "Re-render image 1 in exactly the material, texture and realism of image 2: {x}, plain, no decorations. "
      "Keep EXACTLY the silhouette, position and size of image 1. Transparent background, no text, no letters, no logos.")
def one(k, part, ref, desc):
    tpl="t_front.png" if part=="front" else "t_back.png"
    p=(FRONT if part=="front" else BACK).format(x=desc)
    for _ in range(3):
        out=subprocess.run(["curl","-sS","https://api.openai.com/v1/images/edits","-F","model=gpt-image-1-mini","-F","image[]=@"+tpl,"-F","image[]=@"+ref,
            "-F","prompt="+p,"-F","size=1024x1024","-F","quality=medium","-F","background=transparent","-F","output_format=png"],capture_output=True,text=True,timeout=400)
        try:
            r=json.loads(out.stdout); open(f"{k}_{part}.png","wb").write(base64.b64decode(r["data"][0]["b64_json"])); return k,part,"ok"
        except Exception: err=out.stdout[:160]
    return k,part,err
if __name__=="__main__":
    k,ref,desc=sys.argv[1],sys.argv[2],sys.argv[3]
    with cf.ThreadPoolExecutor(2) as ex:
        for r in ex.map(lambda p: one(k,p,ref,desc),["back","front"]): print(r)
