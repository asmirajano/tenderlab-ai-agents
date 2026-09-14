import {Transform} from 'node:stream';
const signature=Buffer.from('5047434f50590aff0d0a00','hex');
/** Remove only generated columns from COPY input; full source bytes are hashed upstream.
 * PostgreSQL evaluates the identical stored expressions. Full readback MUST match
 * the original all-column binary hash before any runtime access is provisioned. */
export function writableBinaryColumns(columns){
  const keep=columns.map(x=>!x.generated),count=keep.filter(Boolean).length;
  let buffered=Buffer.alloc(0),header=false,ended=false;
  return new Transform({transform(chunk,encoding,done){
    try{
      buffered=Buffer.concat([buffered,chunk]);
      if(!header){
        if(buffered.length<19)return done();
        if(!buffered.subarray(0,11).equals(signature)||buffered.readInt32BE(11)!==0)throw Error('Unsupported COPY binary header');
        const length=19+buffered.readInt32BE(15);if(length!==19)throw Error('Unexpected COPY extension');
        this.push(buffered.subarray(0,length));buffered=buffered.subarray(length);header=true;
      }
      while(buffered.length>=2){
        const fields=buffered.readInt16BE(0);
        if(fields===-1){this.push(buffered.subarray(0,2));buffered=buffered.subarray(2);ended=true;break;}
        if(ended||fields!==columns.length)throw Error('COPY field count mismatch');
        let offset=2;const parts=[];let incomplete=false;
        for(let i=0;i<fields;i++){
          if(offset+4>buffered.length){incomplete=true;break;}
          const length=buffered.readInt32BE(offset);if(length < -1)throw Error('Invalid COPY field length');
          const end=offset+4+Math.max(0,length);if(end>buffered.length){incomplete=true;break;}
          if(keep[i])parts.push(buffered.subarray(offset,end));offset=end;
        }
        if(incomplete)break;
        const n=Buffer.alloc(2);n.writeInt16BE(count);this.push(Buffer.concat([n,...parts]));buffered=buffered.subarray(offset);
      }
      done();
    }catch(e){done(e);}
  },flush(done){done(header&&ended&&!buffered.length?null:Error('Truncated COPY binary stream'));}});
}
