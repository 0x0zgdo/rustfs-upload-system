import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import {  ensureBucket  } from './config/s3';
import { connectRedis, redisClient } from './config/redis';

import errorHandler from './middlewares/errorHandler';

import filesRouter from './routes/files';
import foldersRouter from './routes/folders';
import uploadRouter from './routes/upload';
import downloadRouter from './routes/download';
import trashRouter from './routes/trash';
import contentRouter from './routes/content';
import starredRouter from './routes/starred';
import authRouter from './routes/auth';

import session from 'express-session';
import { RedisStore } from 'connect-redis';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'super_secret_rustfs_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Because local network / HTTP
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// API Routes
app.use('/auth', authRouter);
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
