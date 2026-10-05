const http = require('http');

function request(path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ body: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    const signup = await request('/api/auth/signup', 'POST', {
      name: 'Test User',
      email: 'test2@example.com',
      password: 'Password123!'
    });
    console.log('Signup:', signup.body);
    const cookie = signup.headers['set-cookie']?.[0];
    console.log('Cookie:', cookie);

    const me = await request('/api/me', 'GET', null, cookie);
    console.log('Me:', me.body);

    const dashboard = await request('/api/dashboard', 'GET', null, cookie);
    console.log('Dashboard:', dashboard.body);

    const products = await request('/api/products', 'GET', null, cookie);
    console.log('Products:', products.body);

    const inventory = await request('/api/inventory', 'GET', null, cookie);
    console.log('Inventory:', inventory.body);

    const sales = await request('/api/sales-analytics', 'GET', null, cookie);
    console.log('Sales:', sales.body);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();

