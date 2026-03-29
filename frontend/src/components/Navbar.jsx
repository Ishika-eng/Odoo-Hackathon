import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    switch(user?.role) {
      case 'ADMIN': return '/admin';
      case 'MANAGER': return '/manager';
      default: return '/';
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to={getDashboardLink()} className="text-xl font-bold text-indigo-400">
          Reimburse<span className="text-emerald-400">Hub</span>
        </Link>
        <div className="flex items-center space-x-6">
          <div className="flex items-center text-slate-300">
            <UserIcon className="w-5 h-5 mr-2" />
            <span>{user.name} ({user.role})</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-1" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
