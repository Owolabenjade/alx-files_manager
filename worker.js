import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

// File queue
const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

// User queue
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

// Process file queue
fileQueue.process(async (job, done) => {
  if (!job.data.fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!job.data.userId) {
    done(new Error('Missing userId'));
    return;
  }

  const files = dbClient.db.collection('files');
  const idObject = new ObjectID(job.data.fileId);
  const file = await files.findOne({ _id: idObject, userId: job.data.userId });
  if (!file) {
    done(new Error('File not found'));
    return;
  }

  const sizes = [500, 250, 100];
  for (const size of sizes) {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    await fs.writeFile(`${file.localPath}_${size}`, thumbnail);
  }
  done();
});

// Process user queue
userQueue.process(async (job, done) => {
  if (!job.data.userId) {
    done(new Error('Missing userId'));
    return;
  }

  const users = dbClient.db.collection('users');
  const idObject = new ObjectID(job.data.userId);
  const user = await users.findOne({ _id: idObject });
  
  if (!user) {
    done(new Error('User not found'));
    return;
  }

  console.log(`Welcome ${user.email}!`);
  done();
});

console.log('Worker is running...');