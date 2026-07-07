const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  endpoint: process.env.RUSTFS_ENDPOINT,
  region: 'us-east-1', // Required by SDK, can be anything for MinIO/RustFS
  credentials: {
    accessKeyId: process.env.RUSTFS_ACCESS_KEY,
    secretAccessKey: process.env.RUSTFS_SECRET_KEY,
  },
  forcePathStyle: true, // Necessary for MinIO and RustFS
});

const BUCKET_NAME = 'uploads';

// Utility to create bucket if it doesn't exist
async function ensureBucket() {
  const { CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404 || error.$metadata?.httpStatusCode === 403) {
      console.log(`Bucket ${BUCKET_NAME} might not exist. Attempting creation...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`Bucket ${BUCKET_NAME} created.`);
      } catch (err) {
        console.error('Failed to create bucket:', err);
      }
    } else {
      console.error('Error checking bucket:', error);
    }
  }
}

async function generateUploadUrl(key, mimetype) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimetype,
  });
  // URL expires in 1 hour for large files
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

async function generateDownloadUrl(key, filename, inline = false) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  if (filename) {
    const disposition = inline ? 'inline' : 'attachment';
    params.ResponseContentDisposition = `${disposition}; filename="${filename.replace(/"/g, '')}"`;
  }
  const command = new GetObjectCommand(params);
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

async function downloadBuffer(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await s3Client.send(command);
  return Buffer.from(await response.Body.transformToByteArray());
}

async function uploadBuffer(key, buffer, mimetype) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  });
  return s3Client.send(command);
}

async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return s3Client.send(command);
}

module.exports = {
  s3Client,
  ensureBucket,
  generateUploadUrl,
  generateDownloadUrl,
  downloadBuffer,
  uploadBuffer,
  deleteObject,
  BUCKET_NAME,
};
