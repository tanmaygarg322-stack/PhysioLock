import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createExerciseCache} from './exercise-cache.mjs';
const source='https://hep2go.com/exercises.php?id=fixture';
// Synthetic fixture, not an extracted exercise or real image path.
const rows=[{Exercise_Title:'Fixture',Text_Instructions:'Fixture only',Image_URL:'https://hep2go.com/fixture.png'}];
test('cache persists across restarts and invalidation triggers extraction',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'exercise-cache-')); let cache;
  try {
    let calls=0;
    const options={databasePath:join(dir,'cache.sqlite'),extractor:async()=>{calls++;return rows;}};
    cache=createExerciseCache(options);
    assert.equal((await cache.get(source)).cacheHit,false);
    cache.close();cache=createExerciseCache(options);
    assert.equal((await cache.get(source)).cacheHit,true);assert.equal(calls,1);
    cache.invalidate(source);await cache.get(source);assert.equal(calls,2);
  } finally {cache?.close();await rm(dir,{recursive:true,force:true});}
});
test('parallel misses share extraction; failures are retried without caching',async()=>{
  let calls=0;
  const cache=createExerciseCache({databasePath:':memory:',extractor:async()=>{calls++;if(calls===1)throw new Error('Unavailable');return rows;}});
  try {
    await assert.rejects(cache.get(source),/Unavailable/);
    const results=await Promise.all([cache.get(source),cache.get(source)]);
    assert.equal(calls,2);assert.deepEqual(results[0].exercises,rows);
    assert.equal((await cache.get(source)).cacheHit,true);
  } finally {cache.close();}
});
test('untrusted sources and invalid extracted images never enter cache',async()=>{
  let calls=0;
  const cache=createExerciseCache({databasePath:':memory:',extractor:async()=>{calls++;return [{...rows[0],Image_URL:'https://other.test/a.png'}];}});
  try {
    await assert.rejects(cache.get('https://other.test/'));
    await assert.rejects(cache.get(source),/image URL/);
    await assert.rejects(cache.get(source),/image URL/);assert.equal(calls,2);
  } finally {cache.close();}
});
