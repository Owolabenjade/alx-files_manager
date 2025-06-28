import sha1 from 'sha1';
import dbClient from '../utils/db';
import { ObjectID } from 'mongodb';

class UsersController {
	  static async postNew(req, res) {
		      const { email, password } = req.body;

		      if (!email) {
			            return res.status(400).json({ error: 'Missing email' });
			          }

		      if (!password) {
			            return res.status(400).json({ error: 'Missing password' });
			          }

		      const users = dbClient.db.collection('users');
		      const user = await users.findOne({ email });

		      if (user) {
			            return res.status(400).json({ error: 'Already exist' });
			          }

		      const hashedPassword = sha1(password);
		      const result = await users.insertOne({
			            email,
			            password: hashedPassword,
			          });

		      return res.status(201).json({
			            id: result.insertedId,
			            email,
			          });
		    }
	static async getMe(req, res) {
		  const token = req.header('X-Token');
		  const key = `auth_${token}`;
		  const userId = await redisClient.get(key);
		  if (!userId) {
			      return res.status(401).json({ error: 'Unauthorized' });
			    }
		  const users = dbClient.db.collection('users');
		  const idObject = new ObjectID(userId);
		  const user = await users.findOne({ _id: idObject });
		  if (!user) {
			      return res.status(401).json({ error: 'Unauthorized' });
			    }
		  return res.status(200).json({ id: userId, email: user.email });
	}
}

export default UsersController;
