import {  Worker  } from 'bullmq';
import sharp from 'sharp';
import db from './config/db';
import {  downloadBuffer, uploadBuffer  } from './config/s3';
import {  redisOptions  } from './config/queue';
import dotenv from 'dotenv';
dotenv.config();

console.log('Worker is starting and listening for jobs...');

const worker = new Worker('thumbnailQueue', async job => {
  const { fileId, s3Key, mimetype } = job.data;
  console.log(`Processing job ${job.id} for file ${fileId} (${s3Key})`);

  try {
    // 1. Download original image
    console.log(`Downloading ${s3Key} from RustFS...`);
    const imageBuffer = await downloadBuffer(s3Key);

    // 2. Process with sharp
    console.log(`Generating thumbnail for ${s3Key}...`);
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover' })
      .toBuffer();

    // 3. Upload thumbnail back
    const thumbKey = `thumb-${s3Key}`;
    console.log(`Uploading thumbnail ${thumbKey} to RustFS...`);
    await uploadBuffer(thumbKey, thumbnailBuffer, mimetype);

    // 4. Update Database
    console.log(`Updating database for file ${fileId}...`);
    await db.query(`UPDATE files SET thumbnail_key = $1 WHERE id = $2`, [thumbKey, fileId]);

    console.log(`Job ${job.id} completed successfully.`);
    return thumbKey;
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
}, { connection: redisOptions });

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
