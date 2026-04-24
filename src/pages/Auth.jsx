import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GraduationCap } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true); // Default to Signup as per request "otherwise default will be signup"
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, isAuthenticated } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      await login(formData.email, formData.password);
    } else {
      const success = await register(formData.email, formData.fullName, formData.password);
      if (success) setIsLogin(true); // Switch to login after successful registry
    }

    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfaf6] px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl shadow-orange-100/50">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-white">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to manage your lessons' : 'Start your journey as a teacher today'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {!isLogin && (
              <div className="cc-form-group">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            )}
            <div className="cc-form-group">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="teacher@example.com"
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div className="cc-form-group">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center bg-orange-600 hover:bg-orange-700 h-12 text-lg font-semibold"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-orange-600 hover:text-orange-500"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
