import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProfessionalLayout from '../components/layout/ProfessionalLayout';
import ProtectedRoute from './ProtectedRoute';

// Páginas de Paciente y Públicas
import HomePage from '../pages/patient/HomePage';
import SearchResultsPage from '../pages/patient/SearchResultsPage';
import ProfessionalProfilePage from '../pages/patient/ProfessionalProfilePage';
import BookingPage from '../pages/patient/BookingPage';
import CheckoutPage from '../pages/patient/CheckoutPage';
import MyAppointmentsPage from '../pages/patient/MyAppointmentsPage';

// Páginas de Autenticación
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Páginas de Panel Profesional
import DashboardPage from '../pages/professional/DashboardPage';

// Error 404
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas con Layout Principal (Portal Paciente & Público) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="resultados" element={<SearchResultsPage />} />
        <Route path="profesional/:id" element={<ProfessionalProfilePage />} />
        <Route path="reservar/:id" element={<BookingPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="mis-turnos" element={<MyAppointmentsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Rutas Protegidas del Panel Profesional */}
      <Route
        path="/profesional"
        element={
          <ProtectedRoute requiredRole="profesional">
            <ProfessionalLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agenda" element={<DashboardPage />} />
        <Route path="documentacion" element={<DashboardPage />} />
        <Route path="matricula" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

