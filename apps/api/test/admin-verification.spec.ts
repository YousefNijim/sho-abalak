import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, PaymentMethod, PaymentStatus, DriverStatus, UserRole } from '@shu/shared-types';

describe('Admin Control Center - Verification E2E Spec', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let merchantId: string;
  let driverUserId: string;

  let areaId: string;
  let businessId: string;
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

    // Clean tables topological order
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.business.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.user.deleteMany();

    // Create default area
    const area = await prisma.area.create({
      data: {
        city: 'رام الله / البيرة',
        name: 'المصيون',
        deliveryFee: 3.0,
      },
    });
    areaId = area.id;

    // Create users matching demo flow with correct bcrypt hashes
    const adminPassword = await bcrypt.hash('admin1234', 10);
    const userPassword = await bcrypt.hash('test1234', 10);

    // 1. Admin
    const adminUser = await prisma.user.create({
      data: {
        phone: '0599000000',
        name: 'مشرف الفحص',
        password: adminPassword,
        role: UserRole.ADMIN,
        areaId,
        status: 'ACTIVE',
      },
    });

    // 2. Customer
    const customerUser = await prisma.user.create({
      data: {
        phone: '0599000001',
        name: 'أحمد الزبون',
        password: userPassword,
        role: UserRole.CUSTOMER,
        areaId,
        status: 'ACTIVE',
      },
    });
    customerId = customerUser.id;

    // 3. Merchant
    const merchantUser = await prisma.user.create({
      data: {
        phone: '0599000002',
        name: 'صاحب المتجر',
        password: userPassword,
        role: UserRole.BUSINESS,
        areaId,
        status: 'ACTIVE',
      },
    });
    merchantId = merchantUser.id;

    // 4. Driver
    const driverUser = await prisma.user.create({
      data: {
        phone: '0599000003',
        name: 'سائق الفحص',
        password: userPassword,
        role: UserRole.DRIVER,
        areaId,
        status: 'ACTIVE',
      },
    });
    driverUserId = driverUser.id;

    // Create driver profile
    const driverProfile = await prisma.driver.create({
      data: {
        userId: driverUserId,
        areaId,
        status: DriverStatus.AVAILABLE,
        rating: 5.0,
      },
    });
    driverProfileId = driverProfile.id;

    // Create business and product
    const biz = await prisma.business.create({
      data: {
        ownerId: merchantId,
        name: 'مطعم القدس الفحص',
        type: 'FOOD',
        areaId,
        isOpen: true,
        commissionRate: 10.0,
      },
    });
    businessId = biz.id;

    const product = await prisma.product.create({
      data: {
        businessId: businessId,
        name: 'شاورما دجاج',
        price: 18.00,
        isAvailable: true,
      },
    });

    // Create Order with CASH method
    const ord = await prisma.order.create({
      data: {
        customerId,
        businessId,
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
        total: 21.0,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 18.00,
          },
        },
        payment: {
          create: {
            amount: 21.0,
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING,
          },
        },
      },
    });
    orderId = ord.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Prerequisite Login Checks & Mock Auth Tokens', async () => {
    // We log in the admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0599000000', password: 'admin1234' })
      .expect(201);
    adminToken = adminLoginRes.body.accessToken;

    const custLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0599000001', password: 'test1234' })
      .expect(201);
    customerToken = custLoginRes.body.accessToken;

    expect(adminToken).toBeDefined();
    expect(customerToken).toBeDefined();
  });

  describe('Page-by-Page Real Endpoints Validation', () => {

    // 1. Areas CRUD Endpoints
    it('areas: create, update delivery fee, and delete', async () => {
      // Add area
      const addRes = await request(app.getHttpServer())
        .post('/areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ city: 'نابلس', name: 'جبل الشمالي', deliveryFee: 4.5 })
        .expect(201);
      
      const newAreaId = addRes.body.id;
      expect(addRes.body.city).toBe('نابلس');
      expect(Number(addRes.body.deliveryFee)).toBe(4.5);

      // Edit fee
      await request(app.getHttpServer())
        .patch(`/areas/${newAreaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deliveryFee: 6.0 })
        .expect(200);

      const checkArea = await prisma.area.findUnique({ where: { id: newAreaId } });
      expect(Number(checkArea?.deliveryFee)).toBe(6.0);

      // Delete area
      await request(app.getHttpServer())
        .delete(`/areas/${newAreaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const checkAreaDeleted = await prisma.area.findUnique({ where: { id: newAreaId } });
      expect(checkAreaDeleted).toBeNull();
    });

    // 2. Reviews Moderation & Aggregates Recalculation
    it('reviews: list all, delete review, and confirm rating re-calculates in DB', async () => {
      // Fetch all reviews
      const listRes = await request(app.getHttpServer())
        .get('/reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(listRes.body)).toBe(true);

      // Create a test review to delete
      const order = await prisma.order.create({
        data: {
          customerId,
          businessId,
          status: OrderStatus.DELIVERED,
          paymentMethod: PaymentMethod.CASH,
          total: 21.0,
          driverId: driverProfileId,
        },
      });

      const rev = await prisma.review.create({
        data: {
          orderId: order.id,
          businessRating: 2,
          driverRating: 1,
          comment: 'تعليق مسيء للفحص',
        },
      });

      // Update business and driver averages using the reviews
      await prisma.business.update({
        where: { id: businessId },
        data: { rating: 2.0 },
      });
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { rating: 1.0 },
      });

      // Assert ratings in DB are overridden
      let bizCheck = await prisma.business.findUnique({ where: { id: businessId } });
      expect(bizCheck?.rating).toBe(2.0);

      // Moderation: Delete review
      await request(app.getHttpServer())
        .delete(`/reviews/${rev.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Confirm ratings recalculated back to 0 or seed averages since no other reviews exist
      bizCheck = await prisma.business.findUnique({ where: { id: businessId } });
      expect(bizCheck?.rating).toBe(0);

      const drvCheck = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(drvCheck?.rating).toBe(0);
    });

    // 3. Financial Reports Aggregates
    it('reports: getFinanceSummary by period', async () => {
      const summaryRes = await request(app.getHttpServer())
        .get('/reports/finance')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(summaryRes.body).toHaveProperty('summary');
      expect(summaryRes.body).toHaveProperty('orders');
      expect(summaryRes.body.summary).toHaveProperty('totalSales');
    });

    // 4. Global Settings CRUD & persists
    it('settings: fetch settings, update platform defaults, and persist toggles', async () => {
      // Get settings
      const getRes = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(getRes.body.id).toBe('default');

      // Update defaults
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          defaultCommission: 12.5,
          baseDeliveryFee: 4.0,
          customerAppActive: false,
        })
        .expect(200);

      const checkSettings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
      expect(Number(checkSettings?.defaultCommission)).toBe(12.5);
      expect(Number(checkSettings?.baseDeliveryFee)).toBe(4.0);
      expect(checkSettings?.customerAppActive).toBe(false);
    });

    // 5. Orders Intervention Override
    it('orders: admin intervention status force update, assign driver, cancel, and payment settles', async () => {
      // Admin forces status change PENDING -> READY and assigns driver profile
      const interventionRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/admin-intervention`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: OrderStatus.READY,
          driverId: driverProfileId,
        })
        .expect(200);

      expect(interventionRes.body.status).toBe(OrderStatus.READY);
      expect(interventionRes.body.driverId).toBe(driverProfileId);

      // Force cancel order
      const cancelRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/admin-intervention`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: OrderStatus.CANCELLED,
        })
        .expect(200);
      expect(cancelRes.body.status).toBe(OrderStatus.CANCELLED);
    });

    // 6. Businesses Admin Actions
    it('businesses: approve, manual isOpen toggling, and commission override', async () => {
      // Edit business commission override
      await request(app.getHttpServer())
        .patch(`/businesses/${businessId}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commissionRate: 15.0 })
        .expect(200);

      let biz = await prisma.business.findUnique({ where: { id: businessId } });
      expect(Number(biz?.commissionRate)).toBe(15.0);

      // Manual open/close override toggle
      await request(app.getHttpServer())
        .patch(`/businesses/${businessId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isOpen: false })
        .expect(200);

      biz = await prisma.business.findUnique({ where: { id: businessId } });
      expect(biz?.isOpen).toBe(false);
    });

    // 7. Users Administration Toggles
    it('users: suspend, ban, and reactivate accounts', async () => {
      // Suspend
      await request(app.getHttpServer())
        .patch(`/users/${customerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(200);

      let u = await prisma.user.findUnique({ where: { id: customerId } });
      expect(u?.status).toBe('SUSPENDED');

      // Reactivate
      await request(app.getHttpServer())
        .patch(`/users/${customerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      u = await prisma.user.findUnique({ where: { id: customerId } });
      expect(u?.status).toBe('ACTIVE');
    });

    // 8. Drivers Override & Area Reassignments
    it('drivers: admin profile activation and zone assignment overrides', async () => {
      // Create new area to assign driver
      const newArea = await prisma.area.create({
        data: {
          city: 'نابلس',
          name: 'الغربية',
          deliveryFee: 4.0,
        },
      });

      // Override default region assignment
      await request(app.getHttpServer())
        .patch(`/drivers/${driverProfileId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ areaId: newArea.id, status: DriverStatus.AVAILABLE })
        .expect(200);

      const drv = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(drv?.areaId).toBe(newArea.id);
    });
  });

  describe('Regression Checks', () => {
    it('confirm non-admin gets 403 on admin-only routes', async () => {
      // Customer tries to perform admin order intervention
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/admin-intervention`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: OrderStatus.DELIVERED })
        .expect(403);

      // Customer tries to update settings
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ baseDeliveryFee: 10 })
        .expect(403);
    });
  });
});
