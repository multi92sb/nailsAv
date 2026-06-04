import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { describe, it, expect, beforeEach } from 'vitest';

function ConsumerComponent() {
  const { user, token, adminToken, login, loginAdmin, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="token">{token ? token : 'null'}</span>
      <span data-testid="adminToken">{adminToken ? adminToken : 'null'}</span>
      <button
        data-testid="login-btn"
        onClick={() =>
          login('test-token', {
            userId: '1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            phone: '123',
            role: 'USER',
          })
        }
      >
        Login
      </button>
      <button data-testid="login-admin-btn" onClick={() => loginAdmin('admin-token')}>
        Login Admin
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should initialize with null values if storage is empty', () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(screen.getByTestId('adminToken').textContent).toBe('null');
  });

  it('should log in a user and persist state to localStorage', () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('token').textContent).toBe('test-token');
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(JSON.parse(localStorage.getItem('user') || '{}').email).toBe('jane@example.com');
  });

  it('should log in an admin and persist state to sessionStorage', () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );

    act(() => {
      screen.getByTestId('login-admin-btn').click();
    });

    expect(screen.getByTestId('adminToken').textContent).toBe('admin-token');
    expect(sessionStorage.getItem('adminToken')).toBe('admin-token');
  });

  it('should clear everything on logout', () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>,
    );

    act(() => {
      screen.getByTestId('login-btn').click();
      screen.getByTestId('login-admin-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('adminToken').textContent).toBe('admin-token');

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(screen.getByTestId('adminToken').textContent).toBe('null');

    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('adminToken')).toBeNull();
  });
});
