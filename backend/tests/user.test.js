const request = require('supertest');
const app = require('../index'); // Import your Express app
const db = require('./setupTestDB');
const User = require('../models/User');

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe("User API Routes", () => {
    test("✅ Should register a new user", async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({ user_id: "12345", username: "Alice" });

        expect(response.status).toBe(201);
        expect(response.body.user).toHaveProperty("user_id", "12345");
    });

    test("❌ Should not register duplicate user", async () => {
        await new User({ user_id: "12345", username: "Alice" }).save();

        const response = await request(app)
            .post('/api/users/register')
            .send({ user_id: "12345", username: "Alice" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("User already exists");
    });

    test("✅ Should get all users", async () => {
        await new User({ user_id: "12345", username: "Alice" }).save();
        await new User({ user_id: "67890", username: "Bob" }).save();

        const response = await request(app).get('/api/users/');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });

    test("✅ Should get a user by ID", async () => {
        await new User({ user_id: "12345", username: "Alice" }).save();

        const response = await request(app).get('/api/users/12345');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("username", "Alice");
    });

    test("❌ Should return 404 for non-existent user", async () => {
        const response = await request(app).get('/api/users/99999');
        expect(response.status).toBe(404);
        expect(response.body.message).toBe("User not found");
    });
});
