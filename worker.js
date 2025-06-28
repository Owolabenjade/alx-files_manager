import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

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

export default fileQueue;
