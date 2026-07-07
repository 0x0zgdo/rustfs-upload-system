import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import {  ensureBucket  } from './config/s3';
import {  connectRedis  } from './config/redis';

import errorHandler from './middlewares/errorHandler';

import filesRouter from './routes/files';
import foldersRouter from './routes/folders';
import uploadRouter from './routes/upload';
import downloadRouter from './routes/download';
import trashRouter from './routes/trash';
import contentRouter from './routes/content';
import starredRouter from './routes/starred';

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/files', filesRouter);
app.use('/folders', foldersRouter);
app.use('/', uploadRouter);
app.use('/', downloadRouter);
app.use('/trash', trashRouter);
app.use('/content', contentRouter);
app.use('/starred', starredRouter);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectRedis();
  await ensureBucket();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
