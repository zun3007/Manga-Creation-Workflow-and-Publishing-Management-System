import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import type { LoginResponse } from '../types/auth';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('mangaka@mangaflow.local');
  const [password, setPassword] = useState('123456');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (response.data.requiresPasswordChange) {
        navigate('/change-password');
        return;
      }

      navigate('/dashboard');
    } catch {
      setMessage('Sign in failed. Please check your email or password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="professional-login-page">
      <section className="professional-login-shell">
        <div className="login-brand-panel">
          <div className="studio-kicker">🐱 MangaFlow Studio</div>

          <h1>Manage your manga workflow in one place.</h1>

          <p>
            Production, tasks, review, and publishing — organized for creative
            teams.
          </p>

          <div className="cat-scene">
            <div className="cat-head">
              <span>• •</span>
            </div>

            <div className="ground" />
          </div>
        </div>

        <div className="login-form-panel">
          <form className="professional-login-form" onSubmit={handleLogin}>
            <div className="form-heading">
              <h2>Welcome back</h2>
              <p>Sign in to continue.</p>
            </div>

            <label>Email or username</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email or username"
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />

            <button className="signin-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              className="google-button"
              type="button"
              onClick={() =>
                setMessage('Google Login sẽ nối lại ở bước tiếp theo.')
              }
            >
              <span className="google-mark">G</span>
              <span>Continue with Google</span>
            </button>

            <div className="login-footer">
              <button
                type="button"
                onClick={() => setMessage('Please contact Admin to reset password.')}
              >
                Forgot password?
              </button>

              <button
                type="button"
                onClick={() => setMessage('Account is issued by Admin only.')}
              >
                Contact admin
              </button>
            </div>

            {message && <p className="login-message">{message}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}