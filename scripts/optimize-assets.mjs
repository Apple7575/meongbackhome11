import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const dir='public/assets',stats=[];
for(const file of await fs.readdir(dir)){if(!file.endsWith('.png'))continue;const source=path.join(dir,file),output=source.replace(/\.png$/,'.webp');const metadata=await sharp(source).metadata();await sharp(source).resize({width:file.startsWith('mascot-')?820:1000,withoutEnlargement:true}).webp({quality:85,alphaQuality:100,effort:6}).toFile(output);stats.push({file,before:(await fs.stat(source)).size,after:(await fs.stat(output)).size,hasAlpha:metadata.hasAlpha});}
console.log(JSON.stringify(stats));
