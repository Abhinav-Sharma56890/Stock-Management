import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return null;
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/dashboard"><h1> StockFolio</h1></Link>
        <div className="nav-links">
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
          <Link to="/portfolio" className={location.pathname === '/portfolio' ? 'active' : ''}>Portfolio</Link>
          <Link to="/transactions" className={location.pathname === '/transactions' ? 'active' : ''}>Transactions</Link>
          <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>Profile</Link>
          <a href="#" onClick={logout}>Logout</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
