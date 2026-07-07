const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { ensureBucket } = require('./config/s3');
const { connectRedis } = require('./config/redis');

const errorHandler = require('./middlewares/errorHandler');

const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');
const uploadRouter = require('./routes/upload');
const downloadRouter = require('./routes/download');
const trashRouter = require('./routes/trash');
const contentRouter = require('./routes/content');
const starredRouter = require('./routes/starred');

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
