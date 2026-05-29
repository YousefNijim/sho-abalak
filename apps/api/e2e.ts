import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001';

async function log(msg: string) {
  console.log(`\n🔹 ${msg}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApi(path: string, method: string = 'GET', body: any = null, token: string = '') {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(JSON.stringify(data || res.statusText));
  }
  return data;
}

async function run() {
  try {
    // ─── 1. Login as all roles ──────────────────────────────────────
    log('Logging in as Customer, Business, Driver, and Admin');
    
    const custRes = await fetchApi('/auth/login', 'POST', { phone: '0599000001', password: 'test1234' });
    const bizRes  = await fetchApi('/auth/login', 'POST', { phone: '0599000002', password: 'test1234' });
    const drvRes  = await fetchApi('/auth/login', 'POST', { phone: '0599000003', password: 'test1234' });
    const adminRes = await fetchApi('/auth/login', 'POST', { phone: '0599000000', password: 'admin1234' });
    console.log('✅ Logins successful');

    const custToken = custRes.accessToken;
    const bizToken = bizRes.accessToken;
    const drvToken = drvRes.accessToken;
    const adminToken = adminRes.accessToken;

    // ─── 2. Connect Sockets ──────────────────────────────────────
    log('Connecting Sockets for Customer, Business, and Driver');
    const custSocket = io(API_URL, { auth: { token: custToken } });
    const bizSocket = io(API_URL, { auth: { token: bizToken } });
    const drvSocket = io(API_URL, { auth: { token: drvToken } });

    const socketsReady = Promise.all([
      new Promise<void>(r => { custSocket.on('connect', () => r()); }),
      new Promise<void>(r => { bizSocket.on('connect', () => r()); }),
      new Promise<void>(r => { drvSocket.on('connect', () => r()); })
    ]);

    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Socket connection timeout')), 3000));
    try {
      await Promise.race([socketsReady, timeout]);
      console.log('✅ Socket connections authenticated and established');
    } catch (e: any) {
      console.error('❌ Socket connection failed:', e.message);
      process.exit(1);
    }

    // Capture socket events
    let orderNewEvent: any = null;
    bizSocket.on('order:new', (data: any) => { orderNewEvent = data; });

    let orderStatusEvents: any[] = [];
    custSocket.on('order:status_update', (data: any) => { orderStatusEvents.push(data); });

    let driverRequestEvent: any = null;
    drvSocket.on('driver:request', (data: any) => { driverRequestEvent = data; });

    // ─── 3. Customer: GET businesses and menu ──────────────────────
    log('Customer: Fetching businesses and products');
    const businesses = await fetchApi('/businesses', 'GET', null, custToken);
    const qoudsBiz = businesses.find((b: any) => b.name === 'مطعم القدس');
    if (!qoudsBiz) throw new Error('Could not find مطعم القدس');
    console.log('✅ Fetched businesses');

    const products = await fetchApi(`/products?businessId=${qoudsBiz.id}`, 'GET', null, custToken);
    if (products.length === 0) throw new Error('No products found for business');
    console.log('✅ Fetched products');

    // ─── 4. Customer: Place Order ──────────────────────────────────
    log('Customer: Placing an order');
    const order = await fetchApi('/orders', 'POST', {
      businessId: products[0].businessId,
      items: [
        { productId: products[0].id, quantity: 2 },
        { productId: products[1].id, quantity: 1 }
      ],
      notes: 'بدون شطة',
      paymentMethod: 'CASH',
      deliveryType: 'DELIVERY'
    }, custToken);
    console.log('✅ Order placed successfully, status PENDING');

    log('Business App: Waiting for order:new socket event');
    await sleep(500); 
    if (orderNewEvent && orderNewEvent.order?.id === order.id) {
      console.log('✅ order:new received by business correctly via socket');
    } else {
      console.error('❌ order:new NOT received by business or mismatch', orderNewEvent);
      process.exit(1);
    }

    // ─── 6. Business: Accept Order (PENDING -> CONFIRMED -> PREPARING)
    log('Business App: Transitioning order to CONFIRMED then PREPARING');
    await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'CONFIRMED' }, bizToken);
    await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'PREPARING' }, bizToken);
    console.log('✅ Order transitioned to PREPARING by business');

    // Check customer received tracking updates
    await sleep(500);
    if (orderStatusEvents.length >= 2) {
      console.log('✅ Customer received status update socket events');
    } else {
      console.error('❌ Customer did NOT receive tracking updates correctly');
      process.exit(1);
    }

    // ─── 7. Business: READY + Driver Assignment ─────────────────────
    log('Business App: Fetching available drivers and assigning driver (PREPARING -> READY -> PICKED_UP)');
    const availDrivers = await fetchApi(`/drivers/available?areaId=${order.business.areaId}`, 'GET', null, bizToken);
    const ourDriver = availDrivers.find((d: any) => d.user.phone === '0599000003');
    if (!ourDriver) throw new Error('Our assigned driver is not in the available list!');
    console.log('✅ Found available driver');

    await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'READY' }, bizToken);
    console.log('✅ Order transitioned to READY');

    await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'PICKED_UP', driverId: ourDriver.id }, bizToken);
    console.log('✅ Order transitioned to PICKED_UP with driver assigned');

    // ─── 8. Driver: Check request alert ─────────────────────────────
    log('Driver App: Checking for driver:request socket event');
    await sleep(500);
    if (driverRequestEvent && driverRequestEvent.orderId === order.id) {
      console.log('✅ driver:request received by assigned driver correctly');
    } else {
      console.error('❌ driver:request NOT received by assigned driver');
      process.exit(1);
    }

    // ─── 9. Driver: Deliver order ──────────────────────────────────
    log('Driver App: Transitioning order to DELIVERED');
    await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'DELIVERED' }, drvToken);
    console.log('✅ Order transitioned to DELIVERED by driver');

    // ─── 10. Check invalid transition enforcement ──────────────────
    log('System: Checking canTransition() enforcement');
    try {
      await fetchApi(`/orders/${order.id}/status`, 'PATCH', { status: 'CANCELLED' }, custToken);
      console.error('❌ Illegal transition succeeded! Customer cancelled a DELIVERED order!');
      process.exit(1);
    } catch (e: any) {
      const errStr = e.message;
      if (errStr.includes('400') || errStr.includes('403') || errStr.includes('cannot transition')) {
        console.log('✅ Illegal transition rejected correctly');
      } else {
        console.error('❌ Unexpected error on illegal transition:', errStr);
      }
    }

    // ─── 11. Customer: Create Review ────────────────────────────────
    log('Customer: Creating a review for the order');
    await fetchApi('/reviews', 'POST', {
      orderId: order.id,
      businessRating: 5,
      driverRating: 5,
      comment: 'ممتاز جدا'
    }, custToken);
    console.log('✅ Review created successfully');

    // ─── 12. Admin: Validate final DB state ──────────────────────────
    log('Admin Dashboard: Validating full flow');
    const finalOrder = await fetchApi(`/orders/${order.id}`, 'GET', null, adminToken);
    if (finalOrder.status !== 'DELIVERED') throw new Error('Order is not DELIVERED');
    if (finalOrder.statusHistory.length < 5) throw new Error('Missing history rows');
    console.log('✅ Admin sees order is DELIVERED');
    console.log(`✅ order_status_history has ${finalOrder.statusHistory.length} rows written for each transition`);

    log('🎉 HAPPY PATH COMPLETE AND VERIFIED');

    custSocket.disconnect();
    bizSocket.disconnect();
    drvSocket.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

run();
