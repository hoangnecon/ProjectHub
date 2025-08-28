import React, { useState } from 'react';
import CircularSpinner from '../components/CircularSpinner';

const AuthPage = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await onLogin({
          email: formData.email,
          password: formData.password
        });
        if (!result.success) {
          setError(result.error);
        }
      } else {
        const result = await onRegister(formData);
        if (result.success) {
          setIsLogin(true);
          setFormData({ username: '', password: '', email: '', full_name: '' });
          setError('Account created successfully! You can now sign in.');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">ProjectHub</h1>
          <p className="text-secondary">Modern Task Management</p>
        </div>

        {/* Auth Form */}
        <div className="form-glass p-6 sm:p-8 slide-in-up">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-secondary text-sm">
              {isLogin ? 'Welcome back to your workspace' : 'Join our modern workspace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert-glass alert-error p-3 rounded-xl">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {!isLogin && (
              <div>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  required
                  className="input-glass w-full focus-glass"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                className="input-glass w-full focus-glass"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Full Name"
                    required
                    className="input-glass w-full focus-glass"
                    value={formData.full_name}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                className="input-glass w-full focus-glass"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-glass w-full py-3 px-4 rounded-xl text-white font-medium bg-accent hover:opacity-90 focus-glass disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <CircularSpinner size="small" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ username: '', password: '', email: '', full_name: '', role_id: '' });
              }}
              className="text-accent hover:opacity-80 text-sm transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
