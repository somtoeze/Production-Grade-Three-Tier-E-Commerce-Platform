import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 500 },   // Spike to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '2m', target: 1000 },  // Spike to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% error rate
    errors: ['rate<0.05'],             // Less than 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Test product listing
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products status 200': (r) => r.status === 200,
    'products response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(productsRes.status !== 200);
  
  // Test adding to cart
  const cartPayload = JSON.stringify({
    product_id: 'prod_123',
    quantity: 1,
  });
  
  const cartRes = http.post(`${BASE_URL}/api/cart`, cartPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(cartRes, {
    'cart status 200': (r) => r.status === 200,
    'cart response time < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(cartRes.status !== 200);
  
  sleep(1);
  
  // Test checkout flow
  const checkoutPayload = JSON.stringify({
    items: [{ product_id: 'prod_123', quantity: 1 }],
    shipping_address: {
      street: '123 Main St',
      city: 'Anytown',
      zip: '12345',
    },
  });
  
  const checkoutRes = http.post(`${BASE_URL}/api/checkout`, checkoutPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(checkoutRes, {
    'checkout status 200': (r) => r.status === 200,
    'checkout response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  errorRate.add(checkoutRes.status !== 200);
  
  sleep(2);
}