const request = require('supertest');
const app = require('../index');
const db = require('./setupTestDB');
const User = require('../models/User');
const Pin = require('../models/Pin');

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe("Pin API Routes", () => {
    beforeEach(async () => {
        await new User({ user_id: "12345", username: "Alice" }).save();
    });

    test("✅ Should create a new pin", async () => {
        const response = await request(app)
            .post('/api/pins/create')
            .send({
                pin_id: "p001",
                song: "Shape of You",
                user_id: "12345",
                latitude: 37.7749,
                longitude: -122.4194
            });

        expect(response.status).toBe(201);
        expect(response.body.pin).toHaveProperty("song", "Shape of You");
    });

    test("❌ Should not create a pin if user does not exist", async () => {
        const response = await request(app)
            .post('/api/pins/create')
            .send({
                pin_id: "p002",
                song: "Blinding Lights",
                user_id: "99999", // Non-existent user
                latitude: 40.7128,
                longitude: -74.0060
            });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("User not found");
    });

    test("✅ Should get all pins for a user", async () => {
        await new Pin({
            pin_id: "p001",
            song: "Shape of You",
            user_id: "12345",
            location: { type: "Point", coordinates: [-122.4194, 37.7749] }
        }).save();

        const response = await request(app).get('/api/pins/user/12345');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
    });

    test("✅ Should get nearby pins", async () => {
        await new Pin({
            pin_id: "p001",
            song: "Shape of You",
            user_id: "12345",
            location: { type: "Point", coordinates: [-122.4194, 37.7749] }
        }).save();

        const response = await request(app)
            .get('/api/pins/nearby?latitude=37.7749&longitude=-122.4194&maxDistance=10000');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
    });
});
