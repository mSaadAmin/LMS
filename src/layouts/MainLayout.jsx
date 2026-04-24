import { Outlet, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { Button } from '../components/ui/button';

export default function MainLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">
            <Link to="/">LMS Boilerplate</Link>
          </h1>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary">
                  Dashboard
                </Link>
                <div className="text-sm text-muted-foreground mr-4">
                  Hello, {user.name}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6 bg-card text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} LMS Platform. All rights reserved.
      </footer>
    </div>
  );
}
