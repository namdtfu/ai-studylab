// Produce one self-contained module per function for Supabase Dashboard's editor.
// Source remains in supabase/functions; npm dependencies stay external in Deno.
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
const output=process.argv[2];
if(!output?.startsWith('/'))throw new Error('Pass an absolute output directory');
for(const name of ['import-lesson','grade-quiz','edit-lesson']){
 await mkdir(`${output}/${name}`,{recursive:true});
 await build({entryPoints:[`supabase/functions/${name}/index.ts`],outfile:`${output}/${name}/index.ts`,bundle:true,format:'esm',platform:'neutral',target:'es2022',plugins:[{name:'deno-npm',setup(b){b.onResolve({filter:/^(zod|@supabase\/supabase-js)$/},args=>({path:args.path==='zod'?'npm:zod@4.6.7':'npm:@supabase/supabase-js@2.80.0',external:true}));}}]});
 console.log(`Prepared ${name}`);
}
