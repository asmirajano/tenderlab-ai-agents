/** Reproducible secret-free Node 24 bundle using the approved Neon CLI tool dependencies. */
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function buildFunction(){
  const toolRoot=process.env.NEON_STAGE8_TOOL_ROOT;if(!toolRoot)throw new Error('Explicit Neon CLI node_modules tool root required');
  const require=createRequire(path.join(toolRoot,'neon/package.json')),esbuild=require('esbuild'),{zipSync}=require('fflate');
  if(esbuild.version!=='0.28.1'||require('fflate/package.json').version!=='0.8.3')throw new Error('Unreviewed bundler version');
  const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'build/tendermatch-stage8');
  const result=await esbuild.build({absWorkingDir:root,entryPoints:['functions/tendermatch-stage8/index.mjs'],bundle:true,platform:'node',target:'node24',format:'esm',write:false,metafile:true,minify:false,legalComments:'inline',external:['pg-native'],banner:{js:"import{createRequire as ___cr}from'module';import{fileURLToPath as ___f}from'url';import{dirname as ___d}from'path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);"},plugins:[{name:'pure-frozen-formula-projection',setup(build){build.onResolve({filter:/tendermatch-formula\.mjs$/},args=>{
    if(!args.importer.replaceAll('\\','/').endsWith('/scripts/lib/tendermatch-stage8-store.mjs'))throw new Error('Unexpected formula CLI import');
    return {path:path.join(root,'functions/tendermatch-stage8/projection.mjs')};
  });}}]});
  const sha=x=>createHash('sha256').update(x).digest('hex'),inputs=Object.keys(result.metafile.inputs).filter(x=>!x.includes('node_modules')).sort();
  if(inputs.some(x=>/input-manifest|dev-contract|stage8-operator|stage8-vault|stage8-provision/.test(x)))throw new Error('Operator/credential dependency leaked into runtime');
  const sources={};for(const name of [...inputs,'scripts/build-tendermatch-stage8-function.mjs','scripts/lib/tendermatch-stage8-views.mjs'])sources[name]=sha((await readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'));
  const codeHash=sha(JSON.stringify(sources)),bundle=result.outputFiles[0].contents,zip=zipSync({'index.mjs':[bundle,{mtime:new Date('1980-01-01T00:00:00Z')}]},{level:6});
  const manifest={schemaVersion:'tendermatch-stage8-hosted-build/1.0.0',codeHash,sources,tools:{node:process.version,esbuild:esbuild.version,fflate:'0.8.3',pg:'8.16.3'},runtime:'nodejs24',bundle:{bytes:bundle.length,sha256:sha(bundle)},zip:{bytes:zip.length,sha256:sha(zip)}};
  await mkdir(output,{recursive:true});await writeFile(path.join(output,'index.mjs'),bundle);await writeFile(path.join(output,'function.zip'),zip);await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await buildFunction(),null,2));
