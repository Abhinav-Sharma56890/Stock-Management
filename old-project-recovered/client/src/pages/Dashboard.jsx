import { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [recentStocks, setRecentStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, stocksRes] = await Promise.all([
        axios.get('/api/portfolio/dashboard'),
        axios.get('/api/portfolio?sort=quantity')
      ]);
      setDashboard(dashRes.data.dashboard);
      setRecentStocks(stocksRes.data.stocks.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"></div>;

  const formatCurrency = (val) => `₹${val?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;

  return (
    <div className="container">
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Investment</h3>
          <div className="value">{formatCurrency(dashboard?.totalInvestment)}</div>
        </div>
        <div className="stat-card green">
          <h3>Current Value</h3>
          <div className="value">{formatCurrency(dashboard?.currentValue)}</div>
        </div>
        <div className={`stat-card ${dashboard?.totalProfitLoss >= 0 ? 'green' : 'red'}`}>
          <h3>Profit / Loss</h3>
          <div className="value">{formatCurrency(dashboard?.totalProfitLoss)}</div>
          <small>{dashboard?.profitLossPercent}%</small>
        </div>
        <div className="stat-card">
          <h3>Total Stocks</h3>
          <div className="value">{dashboard?.totalStocks || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}> Top Performer</h3>
          {dashboard?.topPerformer ? (
            <div>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{dashboard.topPerformer.stockName}</p>
              <p className="positive">+{dashboard.topPerformer.profitLossPercent}%</p>
            </div>
          ) : <p>No stocks yet</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}> Worst Performer</h3>
          {dashboard?.worstPerformer ? (
            <div>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{dashboard.worstPerformer.stockName}</p>
              <p className="negative">{dashboard.worstPerformer.profitLossPercent}%</p>
            </div>
          ) : <p>No stocks yet</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Recent Holdings</h3>
        {recentStocks.length > 0 ? (
          <table className="portfolio-table">
            <thead>
              <tr><th>Stock</th><th>Qty</th><th>Buy Price</th><th>Current</th><th>P/L</th></tr>
            </thead>
            <tbody>
              {recentStocks.map(stock => (
                <tr key={stock._id}>
                  <td>{stock.stockName}</td>
                  <td>{stock.quantity}</td>
                  <td>₹{stock.buyPrice}</td>
                  <td>₹{stock.currentPrice}</td>
                  <td className={stock.profitLoss >= 0 ? 'positive' : 'negative'}>
                    {stock.profitLoss >= 0 ? '+' : ''}{stock.profitLossPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No stocks in portfolio. Add some!</p>}
      </div>
    </div>
  );
};

export default Dashboard;
