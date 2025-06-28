import chai from 'chai';
import dbClient from '../utils/db';

const { expect } = chai;

describe('dbClient', () => {
	  before(function (done) {
		      this.timeout(10000);
		      setTimeout(done, 4000);
		    });

	  it('should be alive', () => {
		      expect(dbClient.isAlive()).to.be.true;
		    });

	  it('should return number of users', async () => {
		      const nbUsers = await dbClient.nbUsers();
		      expect(nbUsers).to.be.a('number');
		    });

	  it('should return number of files', async () => {
		      const nbFiles = await dbClient.nbFiles();
		      expect(nbFiles).to.be.a('number');
		    });
});
