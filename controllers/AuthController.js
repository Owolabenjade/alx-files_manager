import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
	  static async getConnect(req, res) {
		      const authData = req.header('Authorization');
		      let userEmail = authData.split(' ')[1];
		      const buff = Buffer.from(userEmail, 'base64');
		      userEmail = buff.toString('ascii');
		      const data = userEmail.split(':');
		      if (data.length !== 2) {
			            return res.status(401).json({ error: 'Unauthorized' });
			          }
		      const hashedPassword = sha1(data[1]);
		      const users = dbClient.db.collection('users');
		      const user = await users.findOne({ email: data[0], password: hashedPassword });
		      if (!user) {
			            return res.status(401).json({ error: 'Unauthorized' });
			          }
		      const token = uuidv4();
		      const key = `auth_${token}`;
		      await redisClient.set(key, user._id.toString(), 86400);
		      return res.status(200).json({ token });
		    }

	  static async getDisconnect(req, res) {
		      const token = req.header('X-Token');
		      const key = `auth_${token}`;
		      const userId = await redisClient.get(key);
		      if (!userId) {
			            return res.status(401).json({ error: 'Unauthorized' });
			          }
		      await redisClient.del(key);
		      return res.status(204).send();
		    }
}

export default AuthController;
