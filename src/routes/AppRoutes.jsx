import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';

import Auth from '../pages/Auth';
import Dashboard from '../pages/Dashboard';
import CreateCourse from '../pages/courses/CreateCourse';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Auth />} />
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Main App Layout */}
        <Route >
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Course Creation - Full width, no main layout chrome */}
        <Route path="/courses/create" element={<CreateCourse />} />
        <Route path="/courses/:courseId/edit" element={<CreateCourse isEditMode={true} />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

