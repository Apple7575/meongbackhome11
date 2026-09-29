import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

for (const pose of ['home', 'search', 'alert', 'reunion']) {
  test(`mascot ${pose} has real transparent background in PNG and WebP`, async () => {
    for (const extension of ['png', 'webp']) {
      const file = `public/assets/mascot-${pose}.${extension}`;
      assert.equal((await sharp(file).metadata()).hasAlpha, true, file);
      const {data, info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const alpha = (x,y) => data[(y * info.width + x) * 4 + 3];
      // Generated alpha can retain one quantization level (1/255).
      for (const [x,y] of [[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]]) assert.ok(alpha(x,y)<=1,file);
      assert.ok(alpha(Math.floor(info.width/2),Math.floor(info.height/2))>200,file);
      let transparent = 0;
      for(let i=3;i<data.length;i+=4) if(data[i]<=1) transparent++;
      assert.ok(transparent/(info.width*info.height)>0.15,file);
    }
  });
}
