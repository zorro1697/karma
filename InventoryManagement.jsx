import React, { useState, useEffect, useContext } from 'react';
import { useApiConfig } from '../config/apiConfig';
import { AuthContext } from '../contexts/AuthContext';
import './InventoryManagement.css';

const InventoryManagement = () => {
  const { baseUrl, getUrl } = useApiConfig();
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState('productos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form states
  const [newProduct, setNewProduct] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: 0,
    costo: 0,
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'Unidad'
  });

  const [newIngredient, setNewIngredient] = useState({
    nombre: '',
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'Unidad',
    precio_compra: 0,
    id_proveedor: 1
  });

  const [newPurchase, setNewPurchase] = useState({
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    observaciones: '',
    items: [{ id_insumo: '', cantidad: 1, precio_unitario: 0 }]
  });

  // Verificar si el usuario es administrador
  useEffect(() => {
    if (user && user.rol === 'administrador') {
      setIsAdmin(true);
    }
  }, [user]);

  // Cargar datos del inventario
  useEffect(() => {
    const fetchInventoryData = async () => {
      setIsLoading(true);
      try {
        // Obtener productos
        const productsResponse = await fetch(getUrl('/productos'), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!productsResponse.ok) {
          throw new Error('No se pudieron cargar los productos');
        }
        
        const productsData = await productsResponse.json();
        setProducts(productsData);
        
        // Filtrar productos con stock bajo
        const lowStock = productsData.filter(product => 
          product.stock_actual <= product.stock_minimo
        );
        setLowStockProducts(lowStock);
        
        // Si es administrador, cargar insumos y compras
        if (isAdmin) {
          const ingredientsResponse = await fetch(getUrl('/insumos'), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!ingredientsResponse.ok) {
            throw new Error('No se pudieron cargar los insumos');
          }
          
          const ingredientsData = await ingredientsResponse.json();
          setIngredients(ingredientsData);
          
          const purchasesResponse = await fetch(getUrl('/compras'), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!purchasesResponse.ok) {
            throw new Error('No se pudieron cargar las compras');
          }
          
          const purchasesData = await purchasesResponse.json();
          setPurchases(purchasesData);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error al cargar datos del inventario:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInventoryData();
  }, [getUrl, isAdmin]);

  // Handlers para agregar nuevos elementos
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(getUrl('/productos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newProduct)
      });
      
      if (!response.ok) {
        throw new Error('Error al agregar producto');
      }
      
      const addedProduct = await response.json();
      setProducts([...products, addedProduct]);
      setShowAddProductModal(false);
      setNewProduct({
        nombre: '',
        descripcion: '',
        categoria: '',
        precio: 0,
        costo: 0,
        stock_actual: 0,
        stock_minimo: 0,
        unidad_medida: 'Unidad'
      });
      setSuccessMessage('Producto agregado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error al agregar producto:', err);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(getUrl('/insumos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newIngredient)
      });
      
      if (!response.ok) {
        throw new Error('Error al agregar insumo');
      }
      
      const addedIngredient = await response.json();
      setIngredients([...ingredients, addedIngredient]);
      setShowAddIngredientModal(false);
      setNewIngredient({
        nombre: '',
        stock_actual: 0,
        stock_minimo: 0,
        unidad_medida: 'Unidad',
        precio_compra: 0,
        id_proveedor: 1
      });
      setSuccessMessage('Insumo agregado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error al agregar insumo:', err);
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    try {
      const purchaseData = {
        ...newPurchase,
        id_usuario: user.id,
        total: newPurchase.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0),
        estado: 'completado'
      };
      
      const response = await fetch(getUrl('/compras'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(purchaseData)
      });
      
      if (!response.ok) {
        throw new Error('Error al registrar compra');
      }
      
      const addedPurchase = await response.json();
      setPurchases([...purchases, addedPurchase]);
      setShowAddPurchaseModal(false);
      setNewPurchase({
        fecha: new Date().toISOString().split('T')[0],
        proveedor: '',
        observaciones: '',
        items: [{ id_insumo: '', cantidad: 1, precio_unitario: 0 }]
      });
      setSuccessMessage('Compra registrada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error al registrar compra:', err);
    }
  };

  // Agregar un ítem a la compra
  const addPurchaseItem = () => {
    setNewPurchase({
      ...newPurchase,
      items: [...newPurchase.items, { id_insumo: '', cantidad: 1, precio_unitario: 0 }]
    });
  };

  // Remover un ítem de la compra
  const removePurchaseItem = (index) => {
    const updatedItems = [...newPurchase.items];
    updatedItems.splice(index, 1);
    setNewPurchase({
      ...newPurchase,
      items: updatedItems
    });
  };

  // Actualizar un ítem de la compra
  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...newPurchase.items];
    updatedItems[index][field] = value;
    setNewPurchase({
      ...newPurchase,
      items: updatedItems
    });
  };

  // Filtrar elementos según término de búsqueda
  const filteredProducts = products.filter(product => 
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredIngredients = ingredients.filter(ingredient => 
    ingredient.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPurchases = purchases.filter(purchase => 
    purchase.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.observaciones.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para ajustar stock manualmente
  const handleStockAdjustment = async (id, currentStock, type) => {
    const newStock = prompt(`Ingrese la nueva cantidad de stock (actual: ${currentStock}):`, currentStock);
    
    if (newStock === null) return; // Usuario canceló
    
    const stockValue = parseInt(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      alert('Por favor ingrese un número válido');
      return;
    }
    
    try {
      const endpoint = type === 'product' ? `/productos/${id}/ajustar-stock` : `/insumos/${id}/ajustar-stock`;
      const response = await fetch(getUrl(endpoint), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stock_actual: stockValue })
      });
      
      if (!response.ok) {
        throw new Error('Error al ajustar el stock');
      }
      
      if (type === 'product') {
        setProducts(products.map(product => 
          product.id === id ? { ...product, stock_actual: stockValue } : product
        ));
      } else {
        setIngredients(ingredients.map(ingredient => 
          ingredient.id === id ? { ...ingredient, stock_actual: stockValue } : ingredient
        ));
      }
      
      setSuccessMessage('Stock ajustado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error al ajustar stock:', err);
    }
  };

  if (isLoading) {
    return <div className="loading-spinner">Cargando inventario...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="inventory-container">
      <h1 className="inventory-title">Gestión de Inventario</h1>
      
      {/* Alertas de stock bajo */}
      {lowStockProducts.length > 0 && (
        <div className="low-stock-alert">
          <h3>¡Alerta de Stock Bajo!</h3>
          <ul>
            {lowStockProducts.map(product => (
              <li key={product.id}>
                {product.nombre} - Stock actual: {product.stock_actual} {product.unidad_medida} 
                (Mínimo requerido: {product.stock_minimo} {product.unidad_medida})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {/* Pestañas para navegación */}
      <div className="inventory-tabs">
        <button 
          className={`tab-button ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos
        </button>
        
        {isAdmin && (
          <>
            <button 
              className={`tab-button ${activeTab === 'insumos' ? 'active' : ''}`}
              onClick={() => setActiveTab('insumos')}
            >
              Insumos
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'compras' ? 'active' : ''}`}
              onClick={() => setActiveTab('compras')}
            >
              Registro de Compras
            </button>
          </>
        )}
      </div>
      
      {/* Barra de búsqueda y botones de acción */}
      <div className="inventory-actions">
        <div className="search-container">
          <input
            type="text"
            placeholder={`Buscar ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="action-buttons">
          {activeTab === 'productos' && (
            <button 
              className="add-button"
              onClick={() => setShowAddProductModal(true)}
            >
              + Agregar Producto
            </button>
          )}
          
          {isAdmin && activeTab === 'insumos' && (
            <button 
              className="add-button"
              onClick={() => setShowAddIngredientModal(true)}
            >
              + Agregar Insumo
            </button>
          )}
          
          {isAdmin && activeTab === 'compras' && (
            <button 
              className="add-button"
              onClick={() => setShowAddPurchaseModal(true)}
            >
              + Registrar Compra
            </button>
          )}
        </div>
      </div>
      
      {/* Contenido de pestañas */}
      <div className="tab-content">
        {/* Vista de Productos */}
        {activeTab === 'productos' && (
          <div className="products-list">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Precio (S/.)</th>
                  <th>Costo (S/.)</th>
                  <th>Stock</th>
                  <th>Stock Mínimo</th>
                  <th>Unidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className={product.stock_actual <= product.stock_minimo ? 'low-stock-row' : ''}>
                    <td>{product.nombre}</td>
                    <td>{product.descripcion}</td>
                    <td>{product.categoria}</td>
                    <td>{product.precio.toFixed(2)}</td>
                    <td>{product.costo.toFixed(2)}</td>
                    <td>{product.stock_actual}</td>
                    <td>{product.stock_minimo}</td>
                    <td>{product.unidad_medida}</td>
                    <td>
                      <button 
                        className="action-btn adjust-btn"
                        onClick={() => handleStockAdjustment(product.id, product.stock_actual, 'product')}
                      >
                        Ajustar Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Vista de Insumos (solo para administrador) */}
        {isAdmin && activeTab === 'insumos' && (
          <div className="ingredients-list">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Stock</th>
                  <th>Stock Mínimo</th>
                  <th>Unidad</th>
                  <th>Precio Compra (S/.)</th>
                  <th>Proveedor</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map(ingredient => (
                  <tr key={ingredient.id} className={ingredient.stock_actual <= ingredient.stock_minimo ? 'low-stock-row' : ''}>
                    <td>{ingredient.nombre}</td>
                    <td>{ingredient.stock_actual}</td>
                    <td>{ingredient.stock_minimo}</td>
                    <td>{ingredient.unidad_medida}</td>
                    <td>{ingredient.precio_compra.toFixed(2)}</td>
                    <td>{ingredient.id_proveedor}</td>
                    <td>
                      <button 
                        className="action-btn adjust-btn"
                        onClick={() => handleStockAdjustment(ingredient.id, ingredient.stock_actual, 'ingredient')}
                      >
                        Ajustar Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Vista de Compras (solo para administrador) */}
        {isAdmin && activeTab === 'compras' && (
          <div className="purchases-list">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Total (S/.)</th>
                  <th>Estado</th>
                  <th>Registrado por</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>{new Date(purchase.fecha).toLocaleDateString()}</td>
                    <td>{purchase.proveedor}</td>
                    <td>{purchase.total.toFixed(2)}</td>
                    <td>{purchase.estado}</td>
                    <td>{purchase.id_usuario}</td>
                    <td>{purchase.observaciones}</td>
                    <td>
                      <button className="action-btn view-btn">Ver Detalles</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal para agregar producto */}
      {showAddProductModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowAddProductModal(false)}>&times;</span>
            <h2>Agregar Nuevo Producto</h2>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Nombre:</label>
                <input 
                  type="text" 
                  value={newProduct.nombre} 
                  onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Descripción:</label>
                <textarea 
                  value={newProduct.descripcion} 
                  onChange={(e) => setNewProduct({...newProduct, descripcion: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Categoría:</label>
                <select 
                  value={newProduct.categoria} 
                  onChange={(e) => setNewProduct({...newProduct, categoria: e.target.value})}
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Bebida">Bebida</option>
                  <option value="Plato">Plato</option>
                  <option value="Postre">Postre</option>
                  <option value="Entrada">Entrada</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>Precio (S/.):</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={newProduct.precio} 
                    onChange={(e) => setNewProduct({...newProduct, precio: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                
                <div className="form-group half">
                  <label>Costo (S/.):</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={newProduct.costo} 
                    onChange={(e) => setNewProduct({...newProduct, costo: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>Stock Actual:</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newProduct.stock_actual} 
                    onChange={(e) => setNewProduct({...newProduct, stock_actual: parseInt(e.target.value)})}
                    required
                  />
                </div>
                
                <div className="form-group half">
                  <label>Stock Mínimo:</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newProduct.stock_minimo} 
                    onChange={(e) => setNewProduct({...newProduct, stock_minimo: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Unidad de Medida:</label>
                <select 
                  value={newProduct.unidad_medida} 
                  onChange={(e) => setNewProduct({...newProduct, unidad_medida: e.target.value})}
                  required
                >
                  <option value="Unidad">Unidad</option>
                  <option value="Vaso">Vaso</option>
                  <option value="Plato">Plato</option>
                  <option value="Porción">Porción</option>
                  <option value="Litro">Litro</option>
                  <option value="Kilogramo">Kilogramo</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddProductModal(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal para agregar insumo */}
      {showAddIngredientModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowAddIngredientModal(false)}>&times;</span>
            <h2>Agregar Nuevo Insumo</h2>
            <form onSubmit={handleAddIngredient}>
              <div className="form-group">
                <label>Nombre:</label>
                <input 
                  type="text" 
                  value={newIngredient.nombre} 
                  onChange={(e) => setNewIngredient({...newIngredient, nombre: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>Stock Actual:</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newIngredient.stock_actual} 
                    onChange={(e) => setNewIngredient({...newIngredient, stock_actual: parseInt(e.target.value)})}
                    required
                  />
                </div>
                
                <div className="form-group half">
                  <label>Stock Mínimo:</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newIngredient.stock_minimo} 
                    onChange={(e) => setNewIngredient({...newIngredient, stock_minimo: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>Unidad de Medida:</label>
                  <select 
                    value={newIngredient.unidad_medida} 
                    onChange={(e) => setNewIngredient({...newIngredient, unidad_medida: e.target.value})}
                    required
                  >
                    <option value="Unidad">Unidad</option>
                    <option value="Litro">Litro</option>
                    <option value="Mililitro">Mililitro</option>
                    <option value="Kilogramo">Kilogramo</option>
                    <option value="Gramo">Gramo</option>
                    <option value="Botella">Botella</option>
                  </select>
                </div>
                
                <div className="form-group half">
                  <label>Precio de Compra (S/.):</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={newIngredient.precio_compra} 
                    onChange={(e) => setNewIngredient({...newIngredient, precio_compra: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Proveedor:</label>
                <input 
                  type="number" 
                  value={newIngredient.id_proveedor} 
                  onChange={(e) => setNewIngredient({...newIngredient, id_proveedor: parseInt(e.target.value)})}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddIngredientModal(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Guardar Insumo</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal para registrar compra */}
      {showAddPurchaseModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowAddPurchaseModal(false)}>&times;</span>
            <h2>Registrar Nueva Compra</h2>
            <form onSubmit={handleAddPurchase}>
              <div className="form-row">
                <div className="form-group half">
                  <label>Fecha:</label>
                  <input 
                    type="date" 
                    value={newPurchase.fecha} 
                    onChange={(e) => setNewPurchase({...newPurchase, fecha: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group half">
                  <label>Proveedor:</label>
                  <input 
                    type="text" 
                    value={newPurchase.proveedor} 
                    onChange={(e) => setNewPurchase({...newPurchase, proveedor: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Observaciones:</label>
                <textarea 
                  value={newPurchase.observaciones} 
                  onChange={(e) => setNewPurchase({...newPurchase, observaciones: e.target.value})}
                />
              </div>
              
              <h3>Insumos Comprados</h3>
              {newPurchase.items.map((item, index) => (
                <div key={index} className="purchase-item">
                  <div className="form-row">
                    <div className="form-group third">
                      <label>Insumo:</label>
                      <select 
                        value={item.id_insumo} 
                        onChange={(e) => updatePurchaseItem(index, 'id_insumo', e.target.value)}
                        required
                      >
                        <option value="">Seleccionar insumo</option>
                        {ingredients.map(ingredient => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group third">
                      <label>Cantidad:</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.cantidad} 
                        onChange={(e) => updatePurchaseItem(index, 'cantidad', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    
                    <div className="form-group third">
                      <label>Precio Unitario (S/.):</label>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.precio_unitario} 
                        onChange={(e) => updatePurchaseItem(index, 'precio_unitario', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="item-buttons">
                      {newPurchase.items.length > 1 && (
                        <button 
                          type="button" 
                          className="remove-item-btn"
                          onClick={() => removePurchaseItem(index)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="form-group">
                <button 
                  type="button" 
                  className="add-item-btn"
                  onClick={addPurchaseItem}
                >
                  + Agregar Insumo
                </button>
              </div>
              
              <div className="purchase-summary">
                <h4>Total estimado: S/. {newPurchase.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}</h4>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddPurchaseModal(false)}>Cancelar</button>
                <button type="submit" className="submit-btn">Registrar Compra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;                