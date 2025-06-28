import chai from 'chai';
import redisClient from '../utils/redis';

const { expect } = chai;

describe('redisClient', () => {
	  it('should be alive', () => {
		      expect(redisClient.isAlive()).to.be.true;
		    });

	  it('should set and get a value', async () => {
		      await redisClient.set('test_key', 'test_value', 10);
		      const value = await redisClient.get('test_key');
		      expect(value).to.equal('test_value');
		    });

	  it('should delete a value', async () => {
		      await redisClient.set('test_key', 'test_value', 10);
		      await redisClient.del('test_key');
		      const value = await redisClient.get('test_key');
		      expect(value).to.be.null;
		    });

	  it('should expire a value', async () => {
		      await redisClient.set('test_key', 'test_value', 1);
		      setTimeout(async () => {
			            const value = await redisClient.get('test_key');
			            expect(value).to.be.null;
			          }, 2000);
		    });
});
