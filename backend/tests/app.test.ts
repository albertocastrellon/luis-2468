import request from 'supertest';
import { app } from '../src/app';

describe('Caracol API', () => {
  it('returns the health response', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Caracol API');
  });

  it('registers a user without creating a session', async () => {
    const email = `ada-${Date.now()}@example.com`;
    const password = 'password123';
    const register = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Lovelace',
      email,
      password,
    });

    expect(register.status).toBe(201);
    expect(register.body.user.balance).toBe(0);
    expect(JSON.stringify(register.body)).not.toContain(password);
    expect(JSON.stringify(register.body)).not.toContain('passwordHash');
    expect(register.headers['set-cookie']).toBeUndefined();

    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('rejects duplicate emails with a safe normalized response', async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    const password = 'password123';
    const first = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Lovelace',
      email,
      password,
    });
    const duplicate = await request(app).post('/api/auth/register').send({
      fullName: 'Another User',
      email: `  ${email.toUpperCase()}  `,
      password: 'different-password',
    });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: {
        code: 'EMAIL_EXISTS',
        message: 'Este correo ya está registrado.',
      },
    });
    expect(JSON.stringify(duplicate.body)).not.toContain('different-password');
    expect(duplicate.headers['set-cookie']).toBeUndefined();
  });

  it('allows a registered user to log in again', async () => {
    const email = `relogin-${Date.now()}@example.com`;
    const password = 'password123';
    const register = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Lovelace',
      email,
      password,
    });
    expect(register.status).toBe(201);

    const login = await request(app).post('/api/auth/login').send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(email);
    expect(login.headers['set-cookie']).toBeDefined();
  });

  it('approves the demo payment and updates the balance', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Grace Hopper',
      email: `grace-${Date.now()}@example.com`,
      password: 'password123',
    });

    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
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

  it('rejects an expired card before processing the payment', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Katherine Johnson',
      email: `katherine-${Date.now()}@example.com`,
      password: 'password123',
    });
    const currentYear = new Date().getFullYear() - 1;

    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
      password: 'password123',
    });
    const payment = await agent.post('/api/snailpay/pay').send({
      cardNumber: '1234123412341234',
      expirationDate: `12/${String(currentYear).slice(-2)}`,
      cvv: '543',
      fullName: 'Katherine Johnson',
      amount: 100,
    });

    expect(payment.status).toBe(400);
    expect(payment.body.error.fields.expirationDate).toContain('vencida');
  });

  it('rejects the rejection card without changing the balance', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Linus Torvalds',
      email: `linus-${Date.now()}@example.com`,
      password: 'password123',
    });

    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
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
    expect(payment.body.payment.authorization_code).toBeNull();
    expect(payment.body.payment.card_number).toBe('****4000');
    expect(payment.body.payment.cvv).toBe('***');
    expect(payment.body.user.balance).toBe(0);
    expect(JSON.stringify(payment.body)).not.toContain('543');
  });

  it('rejects valid but non-approved card data without changing the balance', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Margaret Hamilton',
      email: `margaret-${Date.now()}@example.com`,
      password: 'password123',
    });
    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
      password: 'password123',
    });

    const payment = await agent.post('/api/snailpay/pay').send({
      cardNumber: '1111222233334444',
      expirationDate: '12/26',
      cvv: '543',
      fullName: 'Margaret Hamilton',
      amount: 125.5,
    });

    expect(payment.status).toBe(402);
    expect(payment.body.payment.status).toBe('rejected');
    expect(payment.body.payment.status_detail).toBe('Datos de tarjeta no válidos.');
    expect(payment.body.payment.transaction_amount).toBe(125.5);
    expect(payment.body.user.balance).toBe(0);
  });

  it('returns a system error without changing the balance', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Grace Hopper',
      email: `system-${Date.now()}@example.com`,
      password: 'password123',
    });
    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
      password: 'password123',
    });

    const payment = await agent
      .post('/api/snailpay/pay')
            .set('X-SnailPay-Error', 'true')
      .send({
        cardNumber: '1234123412341234',
        expirationDate: '12/26',
        cvv: '543',
        fullName: 'Grace Hopper',
        amount: 100,
      });

    expect(payment.status).toBe(502);
    expect(payment.body.payment.status).toBe('error');
    expect(payment.body.payment.status_detail).toBe('Error de conexión con SnailPay.');
    expect(payment.body.payment.authorization_code).toBeNull();
    expect(payment.body.user.balance).toBe(0);
  });

  it('rejects invalid payment data before processing SnailPay', async () => {
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      fullName: 'Katherine Johnson',
      email: `invalid-payment-${Date.now()}@example.com`,
      password: 'password123',
    });
    const login = await agent.post('/api/auth/login').send({
      email: register.body.user.email,
      password: 'password123',
    });

    const payment = await agent
      .post('/api/snailpay/pay')
            .send({
        cardNumber: '1234123412341234',
        expirationDate: '12/26',
        cvv: '543',
        fullName: 'Katherine Johnson',
        amount: 0,
      });

    expect(payment.status).toBe(400);
    expect(payment.body.error.code).toBe('VALIDATION_ERROR');
    expect(payment.body.error.fields.amount).toBeDefined();
  });

  it('requires an authenticated backend session for payments', async () => {
    const payment = await request(app).post('/api/snailpay/pay').send({
      cardNumber: '1234123412341234',
      expirationDate: '12/26',
      cvv: '543',
      fullName: 'Ada Lovelace',
      amount: 100,
    });

    expect(payment.status).toBe(401);
    expect(payment.body.error.code).toBe('UNAUTHENTICATED');
  });
});
