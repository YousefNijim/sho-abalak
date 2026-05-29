import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, PaymentMethod, PaymentStatus, DriverStatus, UserRole } from '@shu/shared-types';

describe('Orders Lifecycle & Platform Integration (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let customerToken: string;
  let merchantToken: string;
  let driverToken: string;

  let customerId: string;
  let merchantId: string;
  let driverUserId: string;

  let areaId: string;
  let businessId: string;
  let productId: string;
  let driverProfileId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean DB in topological deletion order to avoid foreign key errors
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.business.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.user.deleteMany();

    // Verify or seed an area
    let area = await prisma.area.findFirst();
    if (!area) {
      area = await prisma.area.create({
        data: {
          city: 'رام الله',
          name: 'وسط البلد',
          deliveryFee: 10.0,
        },
      });
    }
    areaId = area.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Register Customer, Merchant, and Driver', async () => {
    // Register Customer
    const custRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'زبون الفحص',
        phone: '0599111222',
        password: 'test1234',
        role: UserRole.CUSTOMER,
        areaId,
      })
      .expect(201);
    expect(custRes.body).toHaveProperty('user');
    customerId = custRes.body.user.id;

    // Register Merchant
    const merRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'صاحب المنشأة',
        phone: '0599333444',
        password: 'test1234',
        role: UserRole.BUSINESS,
        areaId,
      })
      .expect(201);
    expect(merRes.body).toHaveProperty('user');
    merchantId = merRes.body.user.id;

    // Register Driver User
    const drvRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'سائق الفحص',
        phone: '0599555666',
        password: 'test1234',
        role: UserRole.DRIVER,
        areaId,
      })
      .expect(201);
    expect(drvRes.body).toHaveProperty('user');
    driverUserId = drvRes.body.user.id;
  });

  it('2. Login Users to obtain JWT tokens', async () => {
    // Login Customer
    const custLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0599111222', password: 'test1234' })
      .expect(201);
    customerToken = custLogin.body.accessToken;

    // Login Merchant
    const merLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0599333444', password: 'test1234' })
      .expect(201);
    merchantToken = merLogin.body.accessToken;

    // Login Driver
    const drvLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0599555666', password: 'test1234' })
      .expect(201);
    driverToken = drvLogin.body.accessToken;
  });

  it('3. Driver registers driver profile and toggles availability', async () => {
    // Register driver profile
    const drvProfile = await request(app.getHttpServer())
      .post('/drivers/register')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ areaId })
      .expect(201);
    expect(drvProfile.body).toHaveProperty('id');
    driverProfileId = drvProfile.body.id;

    // Toggle status to AVAILABLE
    const statusRes = await request(app.getHttpServer())
      .patch('/drivers/me/status')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: DriverStatus.AVAILABLE, areaId })
      .expect(200);
    expect(statusRes.body.status).toBe(DriverStatus.AVAILABLE);
  });

  it('4. Merchant registers business and creates menu product', async () => {
    // Create Business
    const bizRes = await request(app.getHttpServer())
      .post('/businesses')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'مطعم تجربة الفحص',
        category: 'RESTAURANT',
        areaId,
      })
      .expect(201);
    expect(bizRes.body).toHaveProperty('id');
    businessId = bizRes.body.id;

    // Create Product
    const prodRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'وجبة فحص لذيذة',
        description: 'وصف فحص لذيذ',
        price: 25.5,
      })
      .expect(201);
    expect(prodRes.body).toHaveProperty('id');
    productId = prodRes.body.id;
  });

  it('5. Customer creates order (CASH payment method)', async () => {
    // Dynamically query the area to get its precise delivery fee
    const area = await prisma.area.findUniqueOrThrow({ where: { id: areaId } });
    const deliveryFee = Number(area.deliveryFee);
    const expectedTotal = 25.5 * 2 + deliveryFee;

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        businessId,
        items: [
          { productId, quantity: 2 },
        ],
        paymentMethod: PaymentMethod.CASH,
        note: 'توصيل سريع رجاءً',
      })
      .expect(201);

    expect(orderRes.body).toHaveProperty('id');
    orderId = orderRes.body.id;

    expect(Number(orderRes.body.total)).toBe(expectedTotal);
    expect(orderRes.body.status).toBe(OrderStatus.PENDING);
    expect(orderRes.body.payment.status).toBe(PaymentStatus.PENDING);
  });

  it('6. Merchant transitions order to CONFIRMED, PREPARING, and READY', async () => {
    // Confirm Order
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200);

    // Start Preparing
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: OrderStatus.PREPARING })
      .expect(200);

    // Finish Prep (Set READY)
    const readyRes = await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: OrderStatus.READY })
      .expect(200);

    expect(readyRes.body.status).toBe(OrderStatus.READY);
  });

  it('7. Merchant assigns Driver and transitions order to PICKED_UP', async () => {
    // Assign driver and set status PICKED_UP
    const pickupRes = await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: OrderStatus.PICKED_UP, driverId: driverProfileId })
      .expect(200);

    expect(pickupRes.body.status).toBe(OrderStatus.PICKED_UP);
    expect(pickupRes.body.driverId).toBe(driverProfileId);

    // Assert that driver status is now BUSY
    const drvProfile = await prisma.driver.findUnique({
      where: { id: driverProfileId },
    });
    expect(drvProfile?.status).toBe(DriverStatus.BUSY);
  });

  it('8. Driver transitions order to DELIVERED and cash settles to PAID', async () => {
    // Driver completes delivery
    const delivRes = await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: OrderStatus.DELIVERED })
      .expect(200);

    expect(delivRes.body.status).toBe(OrderStatus.DELIVERED);
    expect(delivRes.body.payment.status).toBe(PaymentStatus.PAID);

    // Assert that driver status is back to AVAILABLE
    const drvProfile = await prisma.driver.findUnique({
      where: { id: driverProfileId },
    });
    expect(drvProfile?.status).toBe(DriverStatus.AVAILABLE);
  });
});
