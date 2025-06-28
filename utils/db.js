import { MongoClient } from 'mongodb';

class DBClient {
	  constructor() {
		      const host = process.env.DB_HOST || 'localhost';
		      const port = process.env.DB_PORT || 27017;
		      const database = process.env.DB_DATABASE || 'files_manager';
		      const url = `mongodb://${host}:${port}`;

		      this.client = new MongoClient(url, { useUnifiedTopology: true });
		      this.client.connect().then(() => {
			            this.db = this.client.db(database);
			          }).catch((err) => {
					        console.log(err);
					      });
		    }

	  isAlive() {
		      return this.client.isConnected();
		    }

	  async nbUsers() {
		      const users = this.db.collection('users');
		      const userNum = await users.countDocuments();
		      return userNum;
		    }

	  async nbFiles() {
		      const files = this.db.collection('files');
		      const filesNum = await files.countDocuments();
		      return filesNum;
		    }
}

const dbClient = new DBClient();
export default dbClient;
