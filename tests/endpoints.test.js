import chai from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';
import sha1 from 'sha1';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('API Endpoints', () => {
	  let dbClient;
	  let db;
	  let token;
	  let userId;
	  let fileId;

	  before(async () => {
		      const host = process.env.DB_HOST || 'localhost';
		      const port = process.env.DB_PORT || 27017;
		      const database = process.env.DB_DATABASE || 'files_manager';
		      const url = `mongodb://${host}:${port}`;
		      
		      dbClient = new MongoClient(url, { useUnifiedTopology: true });
		      await dbClient.connect();
		      db = dbClient.db(database);
		    });

	  after(async () => {
		      await db.collection('users').deleteMany({});
		      await db.collection('files').deleteMany({});
		      await dbClient.close();
		    });

	  describe('GET /status', () => {
		      it('should return status', (done) => {
			            chai.request(app)
			              .get('/status')
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.have.property('redis');
					                expect(res.body).to.have.property('db');
					                done();
					              });
			          });
		    });

	  describe('GET /stats', () => {
		      it('should return stats', (done) => {
			            chai.request(app)
			              .get('/stats')
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.have.property('users');
					                expect(res.body).to.have.property('files');
					                expect(res.body.users).to.be.a('number');
					                expect(res.body.files).to.be.a('number');
					                done();
					              });
			          });
		    });

	  describe('POST /users', () => {
		      it('should create a new user', (done) => {
			            chai.request(app)
			              .post('/users')
			              .send({ email: 'test@test.com', password: 'password123' })
			              .end((err, res) => {
					                expect(res).to.have.status(201);
					                expect(res.body).to.have.property('id');
					                expect(res.body).to.have.property('email');
					                expect(res.body.email).to.equal('test@test.com');
					                userId = res.body.id;
					                done();
					              });
			          });

		      it('should return error if email already exists', (done) => {
			            chai.request(app)
			              .post('/users')
			              .send({ email: 'test@test.com', password: 'password123' })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body).to.have.property('error');
					                expect(res.body.error).to.equal('Already exist');
					                done();
					              });
			          });

		      it('should return error if email is missing', (done) => {
			            chai.request(app)
			              .post('/users')
			              .send({ password: 'password123' })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal('Missing email');
					                done();
					              });
			          });

		      it('should return error if password is missing', (done) => {
			            chai.request(app)
			              .post('/users')
			              .send({ email: 'test2@test.com' })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal('Missing password');
					                done();
					              });
			          });
		    });

	  describe('GET /connect', () => {
		      it('should authenticate user and return token', (done) => {
			            const authData = Buffer.from('test@test.com:password123').toString('base64');
			            chai.request(app)
			              .get('/connect')
			              .set('Authorization', `Basic ${authData}`)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.have.property('token');
					                token = res.body.token;
					                done();
					              });
			          });

		      it('should return error for invalid credentials', (done) => {
			            const authData = Buffer.from('test@test.com:wrongpassword').toString('base64');
			            chai.request(app)
			              .get('/connect')
			              .set('Authorization', `Basic ${authData}`)
			              .end((err, res) => {
					                expect(res).to.have.status(401);
					                expect(res.body.error).to.equal('Unauthorized');
					                done();
					              });
			          });
		    });

	  describe('GET /users/me', () => {
		      it('should return user info', (done) => {
			            chai.request(app)
			              .get('/users/me')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.have.property('id');
					                expect(res.body).to.have.property('email');
					                expect(res.body.email).to.equal('test@test.com');
					                done();
					              });
			          });

		      it('should return error for invalid token', (done) => {
			            chai.request(app)
			              .get('/users/me')
			              .set('X-Token', 'invalid-token')
			              .end((err, res) => {
					                expect(res).to.have.status(401);
					                expect(res.body.error).to.equal('Unauthorized');
					                done();
					              });
			          });
		    });

	  describe('POST /files', () => {
		      it('should create a new folder', (done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                name: 'test_folder',
					                type: 'folder',
					              })
			              .end((err, res) => {
					                expect(res).to.have.status(201);
					                expect(res.body).to.have.property('id');
					                expect(res.body.name).to.equal('test_folder');
					                expect(res.body.type).to.equal('folder');
					                fileId = res.body.id;
					                done();
					              });
			          });

		      it('should create a new file', (done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                name: 'test.txt',
					                type: 'file',
					                data: Buffer.from('Hello World').toString('base64'),
					              })
			              .end((err, res) => {
					                expect(res).to.have.status(201);
					                expect(res.body).to.have.property('id');
					                expect(res.body.name).to.equal('test.txt');
					                expect(res.body.type).to.equal('file');
					                done();
					              });
			          });

		      it('should return error if name is missing', (done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                type: 'file',
					                data: Buffer.from('Hello World').toString('base64'),
					              })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal('Missing name');
					                done();
					              });
			          });

		      it('should return error if type is missing', (done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                name: 'test.txt',
					                data: Buffer.from('Hello World').toString('base64'),
					              })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal('Missing type');
					                done();
					              });
			          });

		      it('should return error if data is missing for file', (done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                name: 'test.txt',
					                type: 'file',
					              })
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal('Missing data');
					                done();
					              });
			          });
		    });

	  describe('GET /files/:id', () => {
		      it('should retrieve a file by id', (done) => {
			            chai.request(app)
			              .get(`/files/${fileId}`)
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.have.property('id');
					                expect(res.body.id).to.equal(fileId);
					                done();
					              });
			          });

		      it('should return error for non-existent file', (done) => {
			            chai.request(app)
			              .get('/files/5f1e8896c7ba06511e683b99')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(404);
					                expect(res.body.error).to.equal('Not found');
					                done();
					              });
			          });
		    });

	  describe('GET /files', () => {
		      it('should retrieve all files with pagination', (done) => {
			            chai.request(app)
			              .get('/files')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.be.an('array');
					                done();
					              });
			          });

		      it('should retrieve files with parentId', (done) => {
			            chai.request(app)
			              .get(`/files?parentId=${fileId}`)
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.be.an('array');
					                done();
					              });
			          });

		      it('should retrieve files with pagination', (done) => {
			            chai.request(app)
			              .get('/files?page=0')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body).to.be.an('array');
					                done();
					              });
			          });
		    });

	  describe('PUT /files/:id/publish', () => {
		      it('should publish a file', (done) => {
			            chai.request(app)
			              .put(`/files/${fileId}/publish`)
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body.isPublic).to.be.true;
					                done();
					              });
			          });
		    });

	  describe('PUT /files/:id/unpublish', () => {
		      it('should unpublish a file', (done) => {
			            chai.request(app)
			              .put(`/files/${fileId}/unpublish`)
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.body.isPublic).to.be.false;
					                done();
					              });
			          });
		    });

	  describe('GET /files/:id/data', () => {
		      let fileWithDataId;

		      before((done) => {
			            chai.request(app)
			              .post('/files')
			              .set('X-Token', token)
			              .send({
					                name: 'data.txt',
					                type: 'file',
					                data: Buffer.from('Test file content').toString('base64'),
					                isPublic: true,
					              })
			              .end((err, res) => {
					                fileWithDataId = res.body.id;
					                done();
					              });
			          });

		      it('should retrieve file data', (done) => {
			            chai.request(app)
			              .get(`/files/${fileWithDataId}/data`)
			              .end((err, res) => {
					                expect(res).to.have.status(200);
					                expect(res.text).to.equal('Test file content');
					                done();
					              });
			          });

		      it('should return error for folder', (done) => {
			            chai.request(app)
			              .get(`/files/${fileId}/data`)
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(400);
					                expect(res.body.error).to.equal("A folder doesn't have content");
					                done();
					              });
			          });
		    });

	  describe('GET /disconnect', () => {
		      it('should disconnect user', (done) => {
			            chai.request(app)
			              .get('/disconnect')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(204);
					                done();
					              });
			          });

		      it('should return error after disconnect', (done) => {
			            chai.request(app)
			              .get('/users/me')
			              .set('X-Token', token)
			              .end((err, res) => {
					                expect(res).to.have.status(401);
					                expect(res.body.error).to.equal('Unauthorized');
					                done();
					              });
			          });
		    });
});
