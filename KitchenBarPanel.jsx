import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/apiConfig';
import './KitchenBarPanel.css';

const KitchenBarPanel = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'food', 'drinks'
  const { user } = useAuth();

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/pedidos/pendientes'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los pedidos pendientes');
      }

      const data = await response.json();
      setPendingOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error al cargar pedidos pendientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    
    // Configurar actualización periódica (cada 30 segundos)
    const intervalId = setInterval(() => {
      fetchPendingOrders();
    }, 30000);
    
    // Limpieza al desmontar el componente
    return () => clearInterval(intervalId);
  }, []);

  const handleUpdateStatus = async (pedidoId, detalleId, nuevoEstado) => {
    try {
      const response = await fetch(getApiUrl(`/pedidos/detalle/${detalleId}/estado`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado del pedido');
      }

      // Actualizar estado local para reflejar el cambio sin necesidad de recargar
      setPendingOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === pedidoId) {
            return {
              ...order,
              detalles: order.detalles.map(detalle => 
                detalle.id === detalleId 
                  ? { ...detalle, estado: nuevoEstado } 
                  : detalle
              )
            };
          }
          return order;
        })
      );
    } catch (err) {
      setError(err.message);
      console.error('Error al actualizar estado:', err);
    }
  };

  const getElapsedTime = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now - start) / (1000 * 60));
    
    return diffInMinutes;
  };

  const getTimeClass = (minutes) => {
    if (minutes < 10) return 'time-normal';
    if (minutes < 20) return 'time-warning';
    return 'time-danger';
  };

  const filterOrders = (orders) => {
    if (activeTab === 'all') return orders;
    
    return orders.map(order => ({
      ...order,
      detalles: order.detalles.filter(detalle => {
        const isFood = detalle.producto.categoria === 'Plato';
        return activeTab === 'food' ? isFood : !isFood;
      })
    })).filter(order => order.detalles.length > 0);
  };

  const filteredOrders = filterOrders(pendingOrders);

  if (loading && pendingOrders.length === 0) {
    return <div className="loading-container">Cargando pedidos pendientes...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="kitchen-panel-container">
      <div className="kitchen-panel-header">
        <h2>Panel de Comandas</h2>
        <div className="kitchen-panel-tabs">
          <button 
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos
          </button>
          <button 
            className={`tab-button ${activeTab === 'food' ? 'active' : ''}`}
            onClick={() => setActiveTab('food')}
          >
            Cocina
          </button>
          <button 
            className={`tab-button ${activeTab === 'drinks' ? 'active' : ''}`}
            onClick={() => setActiveTab('drinks')}
          >
            Barra
          </button>
        </div>
        <button className="refresh-button" onClick={fetchPendingOrders}>
          Actualizar
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          No hay pedidos pendientes en este momento
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map(order => {
            const elapsedTime = getElapsedTime(order.tiempo_inicio);
            return (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Mesa {order.mesa.numero}</h3>
                    <p>Mesero: {order.usuario.nombre}</p>
                  </div>
                  <div className={`order-time ${getTimeClass(elapsedTime)}`}>
                    {elapsedTime} min
                  </div>
                </div>
                
                <div className="order-items">
                  {order.detalles
                    .filter(detalle => detalle.estado !== 'entregado')
                    .map(detalle => (
                      <div key={detalle.id} className="order-item">
                        <div className="item-info">
                          <span className="item-quantity">{detalle.cantidad}x</span>
                          <span className="item-name">{detalle.producto.nombre}</span>
                          {detalle.notas && <p className="item-notes">{detalle.notas}</p>}
                        </div>
                        <div className="item-actions">
                          {detalle.estado === 'pendiente' && (
                            <button 
                              className="action-button preparing"
                              onClick={() => handleUpdateStatus(order.id, detalle.id, 'en preparación')}
                            >
                              Iniciar
                            </button>
                          )}
                          {detalle.estado === 'en preparación' && (
                            <button 
                              className="action-button ready"
                              onClick={() => handleUpdateStatus(order.id, detalle.id, 'listo')}
                            >
                              Listo
                            </button>
                          )}
                          {detalle.estado === 'listo' && (
                            <span className="status-badge ready">Listo para servir</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenBarPanel;