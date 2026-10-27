import {DatabaseSync} from 'node:sqlite';

// Store public exercise content only. Patient warnings and approvals stay outside this cache.
export function createExerciseCache({databasePath,extractor,version='1'}) {
  if (!databasePath || typeof extractor !== 'function') throw new Error('Database path and extractor required.');
  const db = new DatabaseSync(databasePath);
  db.exec('CREATE TABLE IF NOT EXISTS exercise_content (source_url TEXT NOT NULL, version TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(source_url, version))');
  const read = db.prepare('SELECT data FROM exercise_content WHERE source_url = ? AND version = ?');
  const write = db.prepare('INSERT OR REPLACE INTO exercise_content VALUES (?, ?, ?)');
  const pending = new Map();

  function sourceKey(sourceURL) {
    const url = new URL(sourceURL);
    if (url.protocol !== 'https:' || !['hep2go.com','www.hep2go.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Expected an HTTPS HEP2go source URL.');
    url.hash = '';
    return url.href;
  }
  function validate(data) {
    if (!Array.isArray(data) || !data.length || data.length > 1000) throw new Error('Invalid exercise dataset.');
    return data.map(row => {
      for (const field of ['Exercise_Title','Text_Instructions','Image_URL']) {
        if (typeof row?.[field] !== 'string' || !row[field].trim() || row[field].length > 20000) throw new Error(`Invalid ${field}.`);
      }
      const image = new URL(row.Image_URL);
      if (image.protocol !== 'https:' || !(image.hostname === 'hep2go.com' || image.hostname.endsWith('.hep2go.com')) || image.username || image.password || image.port || !/\.(jpg|jpeg|png)$/i.test(image.pathname)) throw new Error('Invalid HEP2go image URL.');
      return {Exercise_Title:row.Exercise_Title,Text_Instructions:row.Text_Instructions,Image_URL:row.Image_URL};
    });
  }
  return {
    async get(sourceURL) {
      const key = sourceKey(sourceURL);
      const stored = read.get(key,version);
      if (stored) return {cacheHit:true,exercises:validate(JSON.parse(stored.data))};
      if (!pending.has(key)) {
        const task = (async () => {
          // The injected extractor must read the source HTML and preserve observed src URLs.
          const exercises = validate(await extractor(key));
          write.run(key,version,JSON.stringify(exercises));
          return exercises;
        })();
        pending.set(key,task);
        task.finally(() => pending.delete(key)).catch(() => {});
      }
      return {cacheHit:false,exercises:structuredClone(await pending.get(key))};
    },
    invalidate(sourceURL) { db.prepare('DELETE FROM exercise_content WHERE source_url = ?').run(sourceKey(sourceURL)); },
    close() { if (pending.size) throw new Error('Extraction is still running.'); db.close(); }
  };
}
