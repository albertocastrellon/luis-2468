"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
describe('Caracol API', () => {
    it('returns the health response', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/');
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Caracol API');
    });
    it('registers a user and protects the current-user route', async () => {
        const agent = supertest_1.default.agent(app_1.app);
        const register = await agent.post('/api/auth/register').send({
            fullName: 'Ada Lovelace',
            email: `ada-${Date.now()}@example.com`,
            password: 'password123',
        });
        expect(register.status).toBe(201);
        expect(register.body.user.balance).toBe(0);
        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(200);
        expect(me.body.user.email).toBe(register.body.user.email);
    });
    it('approves the demo payment and updates the balance', async () => {
        const agent = supertest_1.default.agent(app_1.app);
        await agent.post('/api/auth/register').send({
            fullName: 'Grace Hopper',
            email: `grace-${Date.now()}@example.com`,
            password: 'password123',
        });
        const payment = await agent.post('/api/snailpay/pay').send({
            cardNumber: '1234123412341234',
            expirationDate: '12/26',
            cvv: '543',
            fullName: 'Grace Hopper',
            amount: 100,
        });
        expect(payment.status).toBe(200);
        expect(payment.body.payment.status).toBe('approved');
        expect(payment.body.user.balance).toBe(100);
        expect(JSON.stringify(payment.body)).not.toContain('543');
    });
    it('rejects the rejection card without changing the balance', async () => {
        const agent = supertest_1.default.agent(app_1.app);
        await agent.post('/api/auth/register').send({
            fullName: 'Linus Torvalds',
            email: `linus-${Date.now()}@example.com`,
            password: 'password123',
        });
        const payment = await agent.post('/api/snailpay/pay').send({
            cardNumber: '4000400040004000',
            expirationDate: '12/26',
            cvv: '543',
            fullName: 'Linus Torvalds',
            amount: 100,
        });
        expect(payment.status).toBe(402);
        expect(payment.body.payment.status).toBe('rejected');
        expect(payment.body.user.balance).toBe(0);
    });
});
//# sourceMappingURL=app.test.js.map