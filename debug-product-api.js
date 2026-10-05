const { createServer, initDb } = require('./server');
const { FakeMongoDb } = require('./test/fakeMongo');
(async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  let cookie = '';
  const req = async (path, options = {}) => {
    const res = await fetch(baseUrl + path, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const body = await res.text();
    console.log('REQ', options.method || 'GET', path, 'status', res.status, body);
    return { ok: res.ok, status: res.status, body: body ? JSON.parse(body) : null };
  };
  try {
    await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'Catalog User', email: 'catalog@example.com', password: 'secret123' }) });
    const add = await req('/api/products', { method: 'POST', body: JSON.stringify({ product_name: 'Widget A', sku: 'WID-1001', description: 'A useful widget.', unit_price: 99.95, category: 'Hardware' }) });
    console.log('ADD', add);
    const list = await req('/api/products');
    console.log('LIST', list);
    const id = add.body.product.id;
    const upd = await req(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ product_name: 'Widget A+', sku: 'WID-1001', description: 'Updated widget description.', unit_price: 109.95, category: 'Hardware' }) });
    console.log('UPD', upd);
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
})();
