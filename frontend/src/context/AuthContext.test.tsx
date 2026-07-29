import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { api } from '../api/apiClient';

vi.mock('../api/apiClient', () => ({
  api: {
    getMe: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  getMe: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

function ConsumerComponent() {
  const { user, authenticated, adminVerified, loading, login, loginAdmin, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="authenticated">{authenticated ? 'true' : 'false'}</span>
      <span data-testid="adminVerified">{adminVerified ? 'true' : 'false'}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <button
        data-testid="login-btn"
        onClick={() =>
          login({
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
      <button
        data-testid="login-admin-btn"
        onClick={() =>
          loginAdmin({
            userId: '1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            phone: '123',
            role: 'ADMIN',
          })
        }
      >
        Login Admin
      </button>
      <button data-testid="logout-btn" onClick={() => { void logout(); }}>
        Logout
      </button>
    </div>
  );
}

const sampleUser = {
  userId: '1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '123',
  role: 'USER' as const,
};

function renderProvider() {
  return render(
    <AuthProvider>
      <ConsumerComponent />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the user on mount via getMe', async () => {
    mockApi.getMe.mockResolvedValue({ user: sampleUser });
    mockApi.refresh.mockResolvedValue({ user: sampleUser });

    renderProvider();

    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('adminVerified').textContent).toBe('false');
    expect(mockApi.getMe).toHaveBeenCalledTimes(1);
    expect(mockApi.refresh).not.toHaveBeenCalled();
  });

  it('falls back to refresh when getMe fails', async () => {
    mockApi.getMe.mockRejectedValue(new Error('401'));
    mockApi.refresh.mockResolvedValue({ user: sampleUser });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(mockApi.getMe).toHaveBeenCalledTimes(1);
    expect(mockApi.refresh).toHaveBeenCalledTimes(1);
  });

  it('stays unauthenticated when both getMe and refresh fail', async () => {
    mockApi.getMe.mockRejectedValue(new Error('401'));
    mockApi.refresh.mockRejectedValue(new Error('401'));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('login sets the user and resets admin verification', async () => {
    mockApi.getMe.mockResolvedValue({ user: sampleUser });
    mockApi.refresh.mockResolvedValue({ user: sampleUser });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('adminVerified').textContent).toBe('false');
  });

  it('loginAdmin sets the user and marks admin as verified', async () => {
    mockApi.getMe.mockResolvedValue({ user: sampleUser });
    mockApi.refresh.mockResolvedValue({ user: sampleUser });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    act(() => {
      screen.getByTestId('login-admin-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('jane@example.com');
    expect(screen.getByTestId('adminVerified').textContent).toBe('true');
  });

  it('logout calls the API and clears user state', async () => {
    mockApi.getMe.mockResolvedValue({ user: sampleUser });
    mockApi.refresh.mockResolvedValue({ user: sampleUser });
    mockApi.logout.mockResolvedValue({ message: 'Logged out' });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    act(() => {
      screen.getByTestId('login-admin-btn').click();
    });

    expect(screen.getByTestId('adminVerified').textContent).toBe('true');

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('adminVerified').textContent).toBe('false');
    expect(mockApi.logout).toHaveBeenCalledTimes(1);
  });
});
