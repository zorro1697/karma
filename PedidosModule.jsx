import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/apiConfig';
import './Pedidos.css';

const PedidosModule = () => {
  const { mesaId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  
  const [mesa, setMesa] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [nuevoPedido, setNuevoPedido] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista', 'nuevo', 'detalle'
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  useEffect(() => {
    const fetchInicial = async () => {
      try {
        setLoading(true);
        
        // Obtener información de la mesa
        if (mesaId) {
          const responseMesa = await fetch(getApiUrl(`/mesas/${mesaId}`), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!responseMesa.ok) {
            throw new Error('Error al cargar información de la mesa');
          }
          
          const dataMesa = await responseMesa.json();
          setMesa(dataMesa);
        }
        
        // Obtener productos
        const responseProductos = await fetch(getApiUrl('/productos'), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!responseProductos.ok) {
          throw new Error('Error al cargar productos');
        }
        
        const dataProductos = await responseProductos.json();
        setProductos(dataProductos);
        
        // Extraer categorías únicas
        const categoriasUnicas = [...new Set(dataProductos.map(p => p.categoria))];
        setCategorias(categoriasUnicas);
        
        // Obtener pedidos activos de la mesa si hay mesaId
        if (mesaId) {
          const responsePedidos = await fetch(getApiUrl(`/pedidos/mesa/${mesaId}`), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!responsePedidos.ok) {
            throw new Error('Error al cargar pedidos');
          }
          
          const dataPedidos = await responsePedidos.json();
          setPedidosActivos(dataPedidos);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchInicial();
  }, [mesaId]);

  const filtrarProductosPorCategoria = () => {
    if (categoriaSeleccionada === 'todas') {
      return productos;
    }
    return productos.filter(producto => producto.categoria === categoriaSeleccionada);
  };

  const agregarProductoAPedido = (producto) => {
    // Verificar si el producto ya está en el pedido
    const productoExistente = nuevoPedido.find(item => item.id === producto.id);
    
    if (productoExistente) {
      // Incrementar cantidad
      setNuevoPedido(nuevoPedido.map(item => 
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      // Agregar nuevo producto al pedido
      setNuevoPedido([...nuevoPedido, { ...producto, cantidad: 1 }]);
    }
  };

  const quitarProductoDePedido = (productoId) => {
    setNuevoPedido(nuevoPedido.filter(item => item.id !== productoId));
  };

  const actualizarCantidadProducto = (productoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      quitarProductoDePedido(productoId);
      return;
    }
    
    setNuevoPedido(nuevoPedido.map(item => 
      item.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const calcularTotal = () => {
    return nuevoPedido.reduce((total, item) => total + (item.precio * item.cantidad), 0).toFixed(2);
  };

  const crearPedido = async () => {
    if (nuevoPedido.length === 0) {
      setError('No hay productos en el pedido');
      return;
    }
    
    try {
      const detallesPedido = nuevoPedido.map(item => ({
        id_producto: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        notas: ''
      }));
      
      const pedidoData = {
        id_mesa: mesa.id,
        id_usuario: userInfo.id,
        estado: 'pendiente',
        observaciones: observaciones,
        detalles: detallesPedido
      };
      
      const response = await fetch(getApiUrl('/pedidos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(pedidoData)
      });
      
      if (!response.ok) {
        throw new Error('Error al crear el pedido');
      }
      
      // Actualizar estado de la mesa a 'ocupada' si estaba libre
      if (mesa.estado === 'libre') {
        await fetch(getApiUrl(`/mesas/${mesa.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ estado: 'ocupada' })
        });
      }
      
      // Limpiar formulario
      setNuevoPedido([]);
      setObservaciones('');
      
      // Volver a la lista de pedidos y actualizar
      setVistaActual('lista');
      
      // Recargar pedidos activos
      const responsePedidos = await fetch(getApiUrl(`/pedidos/mesa/${mesaId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const dataPedidos = await responsePedidos.json();
      setPedidosActivos(dataPedidos);
      
    } catch (err) {
      setError(err.message);
    }
  };

  const actualizarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      const response = await fetch(getApiUrl(`/pedidos/${pedidoId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el estado del pedido');
      }
      
      // Actualizar estado local
      setPedidosActivos(pedidosActivos.map(pedido => 
        pedido.id === pedidoId ? { ...pedido, estado: nuevoEstado } : pedido
      ));
      
      // Si estamos viendo el detalle del pedido que se actualiza, actualizarlo también
      if (pedidoSeleccionado && pedidoSeleccionado.id === pedidoId) {
        setPedidoSeleccionado({ ...pedidoSeleccionado, estado: nuevoEstado });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const verDetallePedido = async (pedidoId) => {
    try {
      const response = await fetch(getApiUrl(`/pedidos/${pedidoId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar detalle del pedido');
      }
      
      const data = await response.json();
      setPedidoSeleccionado(data);
      setVistaActual('detalle');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatearTiempo = (timestamp) => {
    const fecha = new Date(timestamp);
    return fecha.toLocaleString();
  };

  const calcularTiempoTranscurrido = (timestamp) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diferencia = Math.floor((ahora - fecha) / 1000 / 60); // en minutos
    
    if (diferencia < 60) {
      return `${diferencia} min`;
    } else {
      const horas = Math.floor(diferencia / 60);
      const minutos = diferencia % 60;
      return `${horas}h ${minutos}m`;
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'pendiente': return 'estado-pendiente';
      case 'en_preparacion': return 'estado-preparacion';
      case 'listo': return 'estado-listo';
      case 'entregado': return 'estado-entregado';
      case 'cancelado': return 'estado-cancelado';
      default: return '';
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">Error: {error}</div>
        <button 
          onClick={() => {
            setError(null);
            navigate('/mesas');
          }}
          className="btn-volver"
        >
          Volver a Mesas
        </button>
      </div>
    );
  }

  // Vista de lista de pedidos activos
  if (vistaActual === 'lista') {
    return (
      <div className="pedidos-container">
        <div className="pedidos-header">
          <h2>Pedidos Mesa {mesa?.numero}</h2>
          <div className="header-actions">
            <button 
              className="btn-nuevo"
              onClick={() => setVistaActual('nuevo')}
            >
              Nuevo Pedido
            </button>
            <button 
              className="btn-volver"
              onClick={() => navigate('/mesas')}
            >
              Volver a Mesas
            </button>
          </div>
        </div>

        {pedidosActivos.length === 0 ? (
          <div className="sin-pedidos">
            <p>No hay pedidos activos para esta mesa</p>
          </div>
        ) : (
          <div className="lista-pedidos">
            {pedidosActivos.map(pedido => (
              <div 
                key={pedido.id} 
                className={`pedido-card ${getEstadoClass(pedido.estado)}`}
                onClick={() => verDetallePedido(pedido.id)}
              >
                <div className="pedido-header">
                  <div className="pedido-id">Pedido #{pedido.id}</div>
                  <div className="pedido-estado">{pedido.estado.replace('_', ' ')}</div>
                </div>
                <div className="pedido-tiempo">
                  <span>Tiempo: {calcularTiempoTranscurrido(pedido.tiempo_inicio)}</span>
                </div>
                <div className="pedido-resumen">
                  <span>{pedido.total_items} productos</span>
                  <span>S/. {pedido.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vista de crear nuevo pedido
  if (vistaActual === 'nuevo') {
    return (
      <div className="pedidos-container">
        <div className="pedidos-header">
          <h2>Nuevo Pedido - Mesa {mesa?.numero}</h2>
          <button 
            className="btn-volver"
            onClick={() => setVistaActual('lista')}
          >
            Cancelar
          </button>
        </div>

        <div className="nuevo-pedido-grid">
          <div className="productos-section">
            <div className="categorias-tabs">
              <button 
                className={categoriaSeleccionada === 'todas' ? 'active' : ''}
                onClick={() => setCategoriaSeleccionada('todas')}
              >
                Todas
              </button>
              {categorias.map(categoria => (
                <button 
                  key={categoria}
                  className={categoriaSeleccionada === categoria ? 'active' : ''}
                  onClick={() => setCategoriaSeleccionada(categoria)}
                >
                  {categoria}
                </button>
              ))}
            </div>

            <div className="productos-grid">
              {filtrarProductosPorCategoria().map(producto => (
                <div 
                  key={producto.id} 
                  className="producto-card"
                  onClick={() => agregarProductoAPedido(producto)}
                >
                  <div className="producto-nombre">{producto.nombre}</div>
                  <div className="producto-precio">S/. {producto.precio.toFixed(2)}</div>
                  <div className="producto-stock">Stock: {producto.stock_actual} {producto.unidad_medida}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="resumen-pedido">
            <h3>Resumen del Pedido</h3>
            
            {nuevoPedido.length === 0 ? (
              <div className="pedido-vacio">
                <p>Selecciona productos para agregar al pedido</p>
              </div>
            ) : (
              <>
                <div className="items-pedido">
                  {nuevoPedido.map(item => (
                    <div key={item.id} className="item-pedido">
                      <div className="item-info">
                        <div className="item-nombre">{item.nombre}</div>
                        <div className="item-precio">S/. {item.precio.toFixed(2)}</div>
                      </div>
                      <div className="item-controles">
                        <button 
                          className="btn-cantidad"
                          onClick={() => actualizarCantidadProducto(item.id, item.cantidad - 1)}
                        >
                          -
                        </button>
                        <span className="item-cantidad">{item.cantidad}</span>
                        <button 
                          className="btn-cantidad"
                          onClick={() => actualizarCantidadProducto(item.id, item.cantidad + 1)}
                        >
                          +
                        </button>
                        <button 
                          className="btn-eliminar"
                          onClick={() => quitarProductoDePedido(item.id)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="item-subtotal">
                        S/. {(item.precio * item.cantidad).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="observaciones">
                  <label htmlFor="observaciones">Observaciones:</label>
                  <textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Agregar indicaciones especiales..."
                    rows={3}
                  />
                </div>

                <div className="total-pedido">
                  <div className="label">Total:</div>
                  <div className="monto">S/. {calcularTotal()}</div>
                </div>

                <button 
                  className="btn-crear-pedido"
                  onClick={crearPedido}
                >
                  Crear Pedido
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vista de detalle de pedido
  if (vistaActual === 'detalle' && pedidoSeleccionado) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-header">
          <h2>Pedido #{pedidoSeleccionado.id} - Mesa {mesa?.numero}</h2>
          <button 
            className="btn-volver"
            onClick={() => setVistaActual('lista')}
          >
            Volver a Pedidos
          </button>
        </div>

        <div className="detalle-pedido">
          <div className="info-pedido">
            <div className="info-item">
              <span className="label">Estado:</span>
              <span className={`valor ${getEstadoClass(pedidoSeleccionado.estado)}`}>
                {pedidoSeleccionado.estado.replace('_', ' ')}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Inicio:</span>
              <span className="valor">{formatearTiempo(pedidoSeleccionado.tiempo_inicio)}</span>
            </div>
            {pedidoSeleccionado.tiempo_entrega && (
              <div className="info-item">
                <span className="label">Entrega:</span>
                <span className="valor">{formatearTiempo(pedidoSeleccionado.tiempo_entrega)}</span>
              </div>
            )}
            <div className="info-item">
              <span className="label">Tiempo transcurrido:</span>
              <span className="valor">{calcularTiempoTranscurrido(pedidoSeleccionado.tiempo_inicio)}</span>
            </div>
            <div className="info-item">
              <span className="label">Mesero:</span>
              <span className="valor">{pedidoSeleccionado.usuario_nombre || pedidoSeleccionado.id_usuario}</span>
            </div>
          </div>

          <div className="detalles-pedido">
            <h3>Productos</h3>
            <div className="tabla-detalles">
              <div className="encabezado">
                <div className="col-producto">Producto</div>
                <div className="col-cantidad">Cant.</div>
                <div className="col-precio">Precio</div>
                <div className="col-subtotal">Subtotal</div>
                <div className="col-estado">Estado</div>
              </div>
              {pedidoSeleccionado.detalles.map(detalle => (
                <div key={detalle.id} className="fila-detalle">
                  <div className="col-producto">{detalle.producto_nombre || `Producto #${detalle.id_producto}`}</div>
                  <div className="col-cantidad">{detalle.cantidad}</div>
                  <div className="col-precio">S/. {detalle.precio_unitario.toFixed(2)}</div>
                  <div className="col-subtotal">S/. {(detalle.precio_unitario * detalle.cantidad).toFixed(2)}</div>
                  <div className={`col-estado ${getEstadoClass(detalle.estado)}`}>
                    {detalle.estado.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pedidoSeleccionado.observaciones && (
            <div className="observaciones-pedido">
              <h3>Observaciones</h3>
              <p>{pedidoSeleccionado.observaciones}</p>
            </div>
          )}

          <div className="total-pedido-detalle">
            <div className="label">Total:</div>
            <div className="monto">S/. {pedidoSeleccionado.total}</div>
          </div>

          {userInfo.rol === 'mesero' || userInfo.rol === 'administrador' ? (
            <div className="acciones-pedido">
              {pedidoSeleccionado.estado === 'pendiente' && (
                <button 
                  className="btn-preparacion"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'en_preparacion')}
                >
                  Enviar a Preparación
                </button>
              )}
              
              {pedidoSeleccionado.estado === 'en_preparacion' && (
                <button 
                  className="btn-listo"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'listo')}
                >
                  Marcar como Listo
                </button>
              )}
              
              {pedidoSeleccionado.estado === 'listo' && (
                <button 
                  className="btn-entregado"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'entregado')}
                >
                  Marcar como Entregado
                </button>
              )}
              
              {['pendiente', 'en_preparacion'].includes(pedidoSeleccionado.estado) && (
                <button 
                  className="btn-cancelar"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'cancelado')}
                >
                  Cancelar Pedido
                </button>
              )}
            </div>
          ) : userInfo.rol === 'cocinero' ? (
            <div className="acciones-pedido">
              {pedidoSeleccionado.estado === 'pendiente' && (
                <button 
                  className="btn-preparacion"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'en_preparacion')}
                >
                  Iniciar Preparación
                </button>
              )}
              
              {pedidoSeleccionado.estado === 'en_preparacion' && (
                <button 
                  className="btn-listo"
                  onClick={() => actualizarEstadoPedido(pedidoSeleccionado.id, 'listo')}
                >
                  Marcar como Listo
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return <div>Vista no definida</div>;
};

export default PedidosModule;