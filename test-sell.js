const http = require('http');
const { spawn } = require('child_process');

function request(port, path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
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
          resolve({ body: JSON.parse(body), headers: res.headers, status: res.statusCode });
        } catch {
          resolve({ body, headers: res.headers, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function waitForServer(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await request(port, '/', 'GET');
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not start on port ${port} within ${timeout}ms`);
}

async function main() {
  // Use a random available port to avoid conflicts
  const port = 8765;
  
  console.log('Starting server...');
  
  // Start the server as a child process
  const server = spawn('node', ['server.js'], { 
    cwd: __dirname,
    env: { ...process.env, PORT: String(port) }
  });
  
  let serverOutput = [];
  server.stdout.on('data', (data) => serverOutput.push(data.toString()));
  server.stderr.on('data', (data) => serverOutput.push(data.toString()));
  
  try {
    // Wait for server to be ready
    await waitForServer(port, 10000);
    console.log(`Server ready on port ${port}\n`);
    
    // 1. Signup
    const signup = await request(port, '/api/auth/signup', 'POST', {
      name: 'Sell Test User',
      email: `selltest${Date.now()}@example.com`,
      password: 'Password123!'
    });
    console.log('Signup:', signup.status, signup.body.message || signup.body.error);
    const cookie = signup.headers['set-cookie']?.[0];
    
    if (!cookie) {
      throw new Error('No session cookie received after signup');
    }

    // 2. Add a stock
    const addStock = await request(port, '/api/portfolio', 'POST', {
      stock_name: 'Reliance Industries',
      stock_symbol: 'RELIANCE',
      quantity: 100,
      buy_price: 2500,
      current_price: 2750
    }, cookie);
    console.log('Add stock:', addStock.status, addStock.body.message || addStock.body.error);
    const stockId = addStock.body.stock?.id;
    
    if (!stockId) {
      throw new Error('No stock ID received after adding stock');
    }

    // 3. Sell part of the stock
    const sellPartial = await request(port, `/api/portfolio/${stockId}/sell`, 'POST', {
      sell_quantity: 40,
      sell_price: 2800
    }, cookie);
    console.log('Sell partial:', sellPartial.status, sellPartial.body.message || sellPartial.body.error);
    console.log('Remaining qty:', sellPartial.body.stock?.quantity);

    // 4. Sell remaining stock
    const sellAll = await request(port, `/api/portfolio/${stockId}/sell`, 'POST', {
      sell_quantity: 60,
      sell_price: 2850
    }, cookie);
    console.log('Sell all:', sellAll.status, sellAll.body.message || sellAll.body.error);

    // 5. Check transactions
    const transactions = await request(port, '/api/transactions?type=SELL', 'GET', null, cookie);
    console.log('SELL transactions:', transactions.body.transactions?.length);

    // 6. Check portfolio is empty
    const portfolio = await request(port, '/api/portfolio', 'GET', null, cookie);
    console.log('Portfolio count:', portfolio.body.stocks?.length);

    console.log('\nAll sell tests passed!');
  } catch (err) {
    console.error('\nTEST ERROR:', err.message);
    if (serverOutput.length > 0) {
      console.error('\nServer output:');
      console.error(serverOutput.join(''));
    }
    process.exit(1);
  } finally {
    // Clean up: kill the server
    server.kill();
  }
}

main();
