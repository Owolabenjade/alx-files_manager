import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import Queue from 'bull'; // Import Bull
// Initialize Bull queue for file processing
const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

class FilesController {
    static async postUpload(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, type, parentId = 0, isPublic = false, data } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }

        const validTypes = ['folder', 'file', 'image'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }

        if (type !== 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        const files = dbClient.db.collection('files');
        if (parentId !== 0) {
            const idObject = new ObjectID(parentId);
            const file = await files.findOne({ _id: idObject, userId });
            if (!file) {
                return res.status(400).json({ error: 'Parent not found' });
            }
            if (file.type !== 'folder') {
                return res.status(400).json({ error: 'Parent is not a folder' });
            }
        }

        if (type === 'folder') {
            const result = await files.insertOne({
                userId,
                name,
                type,
                isPublic,
                parentId,
            });
            return res.status(201).json({
                id: result.insertedId,
                userId,
                name,
                type,
                isPublic,
                parentId,
            });
        }

        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileUuid = uuidv4();
        const localPath = `${folderPath}/${fileUuid}`;

        await fs.mkdir(folderPath, { recursive: true });
        const buff = Buffer.from(data, 'base64');
        await fs.writeFile(localPath, buff, 'utf-8');

        const result = await files.insertOne({
            userId,
            name,
            type,
            isPublic,
            parentId,
            localPath,
        });

        // Add the file to the Bull queue if it's an image
        if (type === 'image') {
            fileQueue.add({ userId, fileId: result.insertedId });
        }

        return res.status(201).json({
            id: result.insertedId,
            userId,
            name,
            type,
            isPublic,
            parentId,
        });
    }

    static async getShow(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const idFile = req.params.id;
        const files = dbClient.db.collection('files');
        const idObject = new ObjectID(idFile);
        const file = await files.findOne({ _id: idObject, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(file);
    }

    static async getIndex(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { parentId = 0, page = 0 } = req.query;
        const files = dbClient.db.collection('files');
        const pipeline = [
            { $match: { userId, parentId } },
            { $skip: parseInt(page) * 20 },
            { $limit: 20 },
        ];
        const fileCursor = await files.aggregate(pipeline);
        const filesList = await fileCursor.toArray();
        const filesArray = filesList.map((file) => ({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId,
        }));
        return res.status(200).json(filesArray);
    }

    static async putPublish(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const idFile = req.params.id;
        const files = dbClient.db.collection('files');
        const idObject = new ObjectID(idFile);
        const file = await files.findOne({ _id: idObject, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        await files.updateOne({ _id: idObject }, { $set: { isPublic: true } });
        const updatedFile = await files.findOne({ _id: idObject, userId });
        return res.status(200).json(updatedFile);
    }

    static async putUnpublish(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const idFile = req.params.id;
        const files = dbClient.db.collection('files');
        const idObject = new ObjectID(idFile);
        const file = await files.findOne({ _id: idObject, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        await files.updateOne({ _id: idObject }, { $set: { isPublic: false } });
        const updatedFile = await files.findOne({ _id: idObject, userId });
        return res.status(200).json(updatedFile);
    }

    static async getFile(req, res) {
        const idFile = req.params.id;
        const files = dbClient.db.collection('files');
        const idObject = new ObjectID(idFile);
        const file = await files.findOne({ _id: idObject });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!file.isPublic) {
            const token = req.header('X-Token');
            const key = `auth_${token}`;
            const userId = await redisClient.get(key);
            if (!userId || userId !== file.userId) {
                return res.status(404).json({ error: 'Not found' });
            }
        }

        if (file.type === 'folder') {
            return res.status(400).json({ error: "A folder doesn't have content" });
        }

        if (!file.localPath) {
            return res.status(404).json({ error: 'Not found' });
        }

        // Handle file size query and adjust the path accordingly
        const { size } = req.query;
        let path = file.localPath;
        if (size && ['500', '250', '100'].includes(size)) {
            path = `${file.localPath}_${size}`;
        }

        try {
            const fileData = await fs.readFile(path);
            const mimeType = mime.contentType(file.name);
            res.header('Content-Type', mimeType);
            return res.status(200).send(fileData);
        } catch (error) {
            return res.status(404).json({ error: 'Not found' });
        }
    }
}

export default FilesController;
