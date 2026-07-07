import fs from 'fs';

async function test() {
  // Create a 1x1 png file
  const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync('dummy.png', buffer);

  console.log('1. Requesting upload URL...');
  const res1 = await fetch('http://localhost:3000/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'dummy.png', mimetype: 'image/png' })
  });
  const { url, key } = await res1.json();
  console.log('Got Key:', key);

  console.log('2. Uploading file...');
  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer
  });

  console.log('3. Saving metadata (triggers worker)...');
  const res3 = await fetch('http://localhost:3000/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'dummy.png', key, size: buffer.length, mimetype: 'image/png' })
  });
  const { file } = await res3.json();
  console.log('Saved file ID:', file.id);
  console.log('Done! Check the worker logs and the database.');
}

test().catch(console.error);
