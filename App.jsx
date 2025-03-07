import React, { useEffect, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';
import MesasModule from './components/MesasModule';
import PedidosModule from './components/PedidosModule';
import KitchenBarPanel from './components/KitchenBarPanel';
import InventoryManagement from './components/InventoryManagement';
import './App.css';

// Componente para la barra de navegación
const Navbar = () => {
  const { auth, logout } = useContext(AuthContext);
  
  if (!auth) return null;
  
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className="logo-k">K</span>
      </div>
      <div className="navbar-links">
        {/* Links según rol de usuario */}
        {(auth.role === 'administrador' || auth.role === 'mesero') && (
          <>
            <a href="/mesas">Mesas</a>
            <a href="/pedidos">Pedidos</a>
          </>
        )}
        
        {(auth.role === 'administrador' || auth.role === 'cocinero') && (
          <a href="/cocina">Panel Cocina/Barra</a>
        )}
        
        {auth.role === 'administrador' && (
          <a href="/inventario">Inventario</a>
        )}
      </div>
      <div className="navbar-user">
        <span>{auth.nombre}</span>
        <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
      </div>
    </nav>
  );
};

// Componente principal Dashboard
const Dashboard = () => {
  const { auth } = useContext(AuthContext);
  
  // Redireccionar según el rol
  if (auth.role === 'administrador') {
    return <Navigate to="/mesas" />;
  } else if (auth.role === 'mesero') {
    return <Navigate to="/mesas" />;
  } else if (auth.role === 'cocinero') {
    return <Navigate to="/cocina" />;
  } else {
    return <div>Bienvenido al sistema</div>;
  }
};

// Componente de página no encontrada
const NotFound = () => {
  return (
    <div className="not-found">
      <h2>404 - Página no encontrada</h2>
      <p>La página que estás buscando no existe.</p>
      <a href="/">Volver al inicio</a>
    </div>
  );
};

// Componente principal App
function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simular carga inicial de la aplicación
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="logo-container">
          <span className="logo-k">K</span>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Ruta de dashboard protegida para cualquier usuario autenticado */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Rutas para meseros y administradores */}
              <Route
                path="/mesas"
                element={
                  <ProtectedRoute requiredRoles={['administrador', 'mesero']}>
                    <MesasModule />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/pedidos"
                element={
                  <ProtectedRoute requiredRoles={['administrador', 'mesero']}>
                    <PedidosModule />
                  </ProtectedRoute>
                }
              />
              
              {/* Rutas para cocineros y administradores */}
              <Route
                path="/cocina"
                element={
                  <ProtectedRoute requiredRoles={['administrador', 'cocinero']}>
                    <KitchenBarPanel />
                  </ProtectedRoute>
                }
              />
              
              {/* Rutas solo para administradores */}
              <Route
                path="/inventario"
                element={
                  <ProtectedRoute requiredRoles={['administrador']}>
                    <InventoryManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* Ruta para página no encontrada */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="app-footer">
            <p>© 2025 Sistema de Gestión de RestoBar - KARMA</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;