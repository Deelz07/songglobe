const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = {
    connect: async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to In-Memory MongoDB for Testing");
    },

    close: async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
        console.log("❌ In-Memory MongoDB Closed");
    },

    clear: async () => {
        const collections = mongoose.connection.collections;
        for (let key in collections) {
            await collections[key].deleteMany();
        }
    }
};
