import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/apiConfig';
import './Mesas.css';

const MesasModule = () => {
  const [mesas, setMesas] = useState([]);
  const [pisoActual, setPisoActual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const { userInfo } = useAuth();

  useEffect(() => {
    fetchMesas();
  }, []);

  const fetchMesas = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/mesas'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar las mesas');
      }
      
      const data = await response.json();
      setMesas(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const actualizarEstadoMesa = async (id, nuevoEstado) => {
    try {
      const response = await fetch(getApiUrl(`/mesas/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el estado de la mesa');
      }
      
      // Actualizar estado local
      setMesas(mesas.map(mesa => 
        mesa.id === id ? { ...mesa, estado: nuevoEstado } : mesa
      ));
      
      // Si estamos liberando una mesa, cerramos el detalle
      if (nuevoEstado === 'libre' && mesaSeleccionada?.id === id) {
        setMostrarDetalle(false);
        setMesaSeleccionada(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const asignarMesero = async (idMesa, idMesero) => {
    try {
      const response = await fetch(getApiUrl(`/mesas/${idMesa}/asignar`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id_mesero: idMesero })
      });
      
      if (!response.ok) {
        throw new Error('Error al asignar mesero');
      }
      
      // Actualizar estado local
      setMesas(mesas.map(mesa => 
        mesa.id === idMesa ? { ...mesa, id_mesero: idMesero } : mesa
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMesaClick = (mesa) => {
    setMesaSeleccionada(mesa);
    setMostrarDetalle(true);
  };

  const getColorEstado = (estado) => {
    switch(estado) {
      case 'libre': return 'mesa-libre';
      case 'ocupada': return 'mesa-ocupada';
      case 'pendiente_pago': return 'mesa-pendiente';
      default: return '';
    }
  };

  const filtrarMesasPorPiso = (piso) => {
    return mesas.filter(mesa => {
      // Asumiendo que las mesas 1-10 están en el piso 1 y 11-20 en el piso 2
      if (piso === 1) {
        return mesa.numero <= 10;
      } else {
        return mesa.numero > 10;
      }
    });
  };

  if (loading) {
    return <div className="loading">Cargando mesas...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const mesasFiltradas = filtrarMesasPorPiso(pisoActual);

  return (
    <div className="mesas-container">
      <div className="mesas-header">
        <h2>Mapa de Mesas - Piso {pisoActual}</h2>
        <div className="piso-selector">
          <button 
            className={pisoActual === 1 ? 'active' : ''} 
            onClick={() => setPisoActual(1)}
          >
            Piso 1
          </button>
          <button 
            className={pisoActual === 2 ? 'active' : ''} 
            onClick={() => setPisoActual(2)}
          >
            Piso 2
          </button>
        </div>
      </div>

      <div className="mesas-grid">
        {mesasFiltradas.map(mesa => (
          <div 
            key={mesa.id} 
            className={`mesa-item ${getColorEstado(mesa.estado)}`}
            onClick={() => handleMesaClick(mesa)}
          >
            <div className="mesa-numero">{mesa.numero}</div>
            <div className="mesa-capacidad">{mesa.capacidad} personas</div>
            <div className="mesa-estado">{mesa.estado.replace('_', ' ')}</div>
            {mesa.id_mesero && (
              <div className="mesa-mesero">
                Mesero: {mesa.id_mesero}
              </div>
            )}
          </div>
        ))}
      </div>

      {mostrarDetalle && mesaSeleccionada && (
        <div className="detalle-mesa">
          <h3>Mesa {mesaSeleccionada.numero}</h3>
          <p>Estado: {mesaSeleccionada.estado.replace('_', ' ')}</p>
          <p>Capacidad: {mesaSeleccionada.capacidad} personas</p>
          
          {userInfo.rol === 'administrador' && (
            <div className="acciones-mesa">
              <h4>Cambiar Estado</h4>
              <div className="botones-estado">
                <button 
                  className="btn-libre"
                  onClick={() => actualizarEstadoMesa(mesaSeleccionada.id, 'libre')}
                  disabled={mesaSeleccionada.estado === 'libre'}
                >
                  Libre
                </button>
                <button 
                  className="btn-ocupada"
                  onClick={() => actualizarEstadoMesa(mesaSeleccionada.id, 'ocupada')}
                  disabled={mesaSeleccionada.estado === 'ocupada'}
                >
                  Ocupada
                </button>
                <button 
                  className="btn-pendiente"
                  onClick={() => actualizarEstadoMesa(mesaSeleccionada.id, 'pendiente_pago')}
                  disabled={mesaSeleccionada.estado === 'pendiente_pago'}
                >
                  Pendiente de Pago
                </button>
              </div>

              <h4>Asignar Mesero</h4>
              <select 
                value={mesaSeleccionada.id_mesero || ''}
                onChange={(e) => asignarMesero(mesaSeleccionada.id, e.target.value)}
              >
                <option value="">Seleccionar mesero</option>
                <option value="mesero1">Mesero 1</option>
                <option value="mesero2">Mesero 2</option>
                <option value="mesero3">Mesero 3</option>
              </select>
            </div>
          )}

          {(userInfo.rol === 'mesero' || userInfo.rol === 'administrador') && (
            <div className="acciones-pedidos">
              <button 
                className="btn-nuevo-pedido"
                onClick={() => {
                  // Redireccionar o abrir componente de nuevo pedido
                  window.location.href = `/pedidos/nuevo/${mesaSeleccionada.id}`;
                }}
              >
                Nuevo Pedido
              </button>

              <button 
                className="btn-ver-pedidos"
                onClick={() => {
                  // Redireccionar o abrir componente de lista de pedidos
                  window.location.href = `/pedidos/mesa/${mesaSeleccionada.id}`;
                }}
              >
                Ver Pedidos Activos
              </button>
            </div>
          )}

          <button 
            className="btn-cerrar"
            onClick={() => setMostrarDetalle(false)}
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default MesasModule;