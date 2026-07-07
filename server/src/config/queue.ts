import {  Queue  } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

// BullMQ expects a redis configuration object or ioredis connection.
// If your process.env.REDIS_URL is something like redis://localhost:6379,
// we parse it to host and port for ioredis (the default client used by bullmq).
import {  URL  } from 'url';
const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

const redisOptions = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
  maxRetriesPerRequest: null, // Required by BullMQ
};

const thumbnailQueue = new Queue('thumbnailQueue', { connection: redisOptions });

async function addThumbnailJob(fileId, s3Key, mimetype) {
  await thumbnailQueue.add('generateThumbnail', {
    fileId,
    s3Key,
    mimetype
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
}

export {
  thumbnailQueue,
  addThumbnailJob,
  redisOptions, // Exporting so worker can use the same connection object
};
