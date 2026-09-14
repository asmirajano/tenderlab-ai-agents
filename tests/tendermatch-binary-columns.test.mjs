import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {writableBinaryColumns} from '../scripts/lib/tendermatch-binary-columns.mjs';
const header=Buffer.from('5047434f50590aff0d0a000000000000000000','hex');
function row(fields){const count=Buffer.alloc(2);count.writeInt16BE(fields.length);return Buffer.concat([count,...fields.map(value=>{const n=Buffer.alloc(4);n.writeInt32BE(value===null?-1:value.length);return value===null?n:Buffer.concat([n,value]);})]);}
async function run(input,columns,chunkSize){const out=[];const chunks=[];for(let i=0;i<input.length;i+=chunkSize)chunks.push(input.subarray(i,i+chunkSize));await pipeline(Readable.from(chunks),writableBinaryColumns(columns),new Writable({write(x,e,cb){out.push(x);cb();}}));return Buffer.concat(out);}
test('binary filter preserves null and arbitrary byte fields across every split',async()=>{
  const values=[Buffer.from([0,255,12,0]),Buffer.from('generated'),null];
  const input=Buffer.concat([header,row(values),row(values),Buffer.from([255,255])]);
  const expected=Buffer.concat([header,row([values[0],null]),row([values[0],null]),Buffer.from([255,255])]);
  for(let size=1;size<=input.length;size++)assert.deepEqual(await run(input,[{}, {generated:'s'},{}],size),expected);
});
test('binary filter rejects truncation, wrong field count and trailing bytes',async()=>{
  const valid=Buffer.concat([header,row([Buffer.from('a')]),Buffer.from([255,255])]);
  await assert.rejects(()=>run(valid.subarray(0,valid.length-1),[{}],3),/Truncated/);
  await assert.rejects(()=>run(valid,[{},{}],2),/field count/);
  await assert.rejects(()=>run(Buffer.concat([valid,Buffer.from([0])]),[{}],100),/Truncated/);
});
