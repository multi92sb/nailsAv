import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import GalleryPage from './pages/GalleryPage';

import AdminUsersPage from './pages/AdminUsersPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* USER PROTECTED */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/confirmation" element={<ConfirmationPage />} />
            <Route path="/gallery" element={<GalleryPage />} />

            {/* ADMIN PROTECTED */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            </Route>
          </Route>

          {/* DEFAULT */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}