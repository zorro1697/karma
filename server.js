const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
    host: 'localhost',
    database: 'base2',
    user: 'jhordam_jk',
    password: '123Mibase',
    port: 5432
});

// Verificar conexión a la base de datos
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión a PostgreSQL establecida correctamente');
    release();
});

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'No se proporcionó token de acceso' });
    
    jwt.verify(token, 'resto_bar_secret_key', (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
        req.user = user;
        next();
    });
};

// Crear tablas si no existen
const initDatabase = async () => {
    try {
        // Tabla de usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                rol VARCHAR(20) NOT NULL,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                contraseña VARCHAR(100) NOT NULL,
                estado BOOLEAN DEFAULT true,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de mesas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mesas (
                id SERIAL PRIMARY KEY,
                numero INTEGER UNIQUE NOT NULL,
                capacidad INTEGER NOT NULL,
                estado VARCHAR(20) DEFAULT 'libre',
                id_mesero INTEGER REFERENCES usuarios(id),
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de productos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                categoria VARCHAR(50) NOT NULL,
                precio DECIMAL(10,2) NOT NULL,
                costo DECIMAL(10,2) NOT NULL,
                stock_actual INTEGER NOT NULL,
                stock_minimo INTEGER DEFAULT 5,
                unidad_medida VARCHAR(20) NOT NULL
            )
        `);

        // Tabla de pedidos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                id_mesa INTEGER REFERENCES mesas(id),
                id_usuario INTEGER REFERENCES usuarios(id),
                estado VARCHAR(20) DEFAULT 'pendiente',
                tiempo_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tiempo_entrega TIMESTAMP,
                total DECIMAL(10,2) DEFAULT 0,
                metodo_pago VARCHAR(50),
                observaciones TEXT
            )
        `);

        // Tabla de detalles de pedido
        await pool.query(`
            CREATE TABLE IF NOT EXISTS detalles_pedido (
                id SERIAL PRIMARY KEY,
                id_pedido INTEGER REFERENCES pedidos(id),
                id_producto INTEGER REFERENCES productos(id),
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                notas TEXT,
                estado VARCHAR(20) DEFAULT 'pendiente'
            )
        `);

        // Crear usuario administrador por defecto si no existe
        const adminExists = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', ['administrador']);
        
        if (adminExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.query(`
                INSERT INTO usuarios (nombre, apellido, rol, usuario, contraseña)
                VALUES ('Admin', 'Sistema', 'administrador', 'administrador', $1)
            `, [hashedPassword]);
            console.log('Usuario administrador creado con éxito');
        }

        // Crear usuarios predefinidos
        const mesero1Exists = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', ['mesero1']);
        if (mesero1Exists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.query(`
                INSERT INTO usuarios (nombre, apellido, rol, usuario, contraseña)
                VALUES ('Mesero', 'Uno', 'mesero', 'mesero1', $1)
            `, [hashedPassword]);
        }

        const mesero2Exists = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', ['mesero2']);
        if (mesero2Exists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.query(`
                INSERT INTO usuarios (nombre, apellido, rol, usuario, contraseña)
                VALUES ('Mesero', 'Dos', 'mesero', 'mesero2', $1)
            `, [hashedPassword]);
        }

        const cocineroExists = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', ['cocinero1']);
        if (cocineroExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await pool.query(`
                INSERT INTO usuarios (nombre, apellido, rol, usuario, contraseña)
                VALUES ('Cocinero', 'Uno', 'cocinero', 'cocinero1', $1)
            `, [hashedPassword]);
        }

        // Inicializar mesas
        const mesasCount = await pool.query('SELECT COUNT(*) FROM mesas');
        if (parseInt(mesasCount.rows[0].count) === 0) {
            // Crear 20 mesas (10 en primer piso, 10 en segundo piso)
            for (let i = 1; i <= 20; i++) {
                await pool.query(`
                    INSERT INTO mesas (numero, capacidad, estado)
                    VALUES ($1, $2, 'libre')
                `, [i, 4]); // Por defecto 4 personas por mesa
            }
            console.log('Mesas inicializadas con éxito');
        }

        // Inicializar productos de ejemplo
        const productosCount = await pool.query('SELECT COUNT(*) FROM productos');
        if (parseInt(productosCount.rows[0].count) === 0) {
            const productosIniciales = [
                { nombre: 'Cerveza Artesanal', descripcion: 'Botella de 500ml', categoria: 'Bebida', precio: 15.00, costo: 8.00, stock: 50, unidad: 'Unidad' },
                { nombre: 'Pisco Sour', descripcion: 'Cóctel con pisco y limón', categoria: 'Bebida', precio: 18.00, costo: 10.00, stock: 30, unidad: 'Vaso' },
                { nombre: 'Mojito', descripcion: 'Coctel de pisco con limon y hierbas', categoria: 'Bebida', precio: 18.00, costo: 10.00, stock: 30, unidad: 'Vaso' },
                { nombre: 'Hamburguesa Rústica', descripcion: 'Carne artesanal con papas', categoria: 'Plato', precio: 25.00, costo: 12.00, stock: 20, unidad: 'Plato' },
                { nombre: 'Tacos de Pollo', descripcion: '3 tacos con guacamole', categoria: 'Plato', precio: 20.00, costo: 10.00, stock: 15, unidad: 'Porción' }
            ];

            for (const producto of productosIniciales) {
                await pool.query(`
                    INSERT INTO productos (nombre, descripcion, categoria, precio, costo, stock_actual, unidad_medida)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [producto.nombre, producto.descripcion, producto.categoria, producto.precio, producto.costo, producto.stock, producto.unidad]);
            }
            console.log('Productos iniciales cargados con éxito');
        }

        console.log('Base de datos inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
};

// Inicializar la base de datos al arrancar el servidor
initDatabase();

// ==================== RUTAS DE API ====================

// --- Autenticación ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        // Verificar si el usuario existe
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        
        // Verificar si la contraseña es correcta
        const passwordMatch = await bcrypt.compare(password, user.contraseña);
        
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        
        // Generar token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                usuario: user.usuario, 
                rol: user.rol,
                nombre: user.nombre,
                apellido: user.apellido
            }, 
            'resto_bar_secret_key', 
            { expiresIn: '8h' }
        );
        
        res.json({ 
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// --- Usuarios ---
app.get('/api/usuarios', authenticateToken, async (req, res) => {
    try {
        // Solo administrador puede ver todos los usuarios
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ message: 'Acceso denegado' });
        }
        
        const result = await pool.query('SELECT id, nombre, apellido, rol, usuario, estado, fecha_creacion FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// --- Mesas ---
app.get('/api/mesas', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT m.*, u.nombre || ' ' || u.apellido as mesero_nombre
            FROM mesas m
            LEFT JOIN usuarios u ON m.id_mesero = u.id
            ORDER BY m.numero
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener mesas:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

app.put('/api/mesas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, id_mesero } = req.body;
        
        const query = `
            UPDATE mesas
            SET estado = $1, id_mesero = $2, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        
        const result = await pool.query(query, [estado, id_mesero, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// --- Productos ---
app.get('/api/productos', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

app.get('/api/productos/categorias', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT categoria FROM productos ORDER BY categoria');
        res.json(result.rows.map(row => row.categoria));
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// --- Pedidos ---
app.post('/api/pedidos', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id_mesa, productos, observaciones } = req.body;
        const id_usuario = req.user.id;
        
        // Crear el pedido
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (id_mesa, id_usuario, observaciones) 
             VALUES ($1, $2, $3) RETURNING *`,
            [id_mesa, id_usuario, observaciones]
        );
        
        const pedido = pedidoResult.rows[0];
        let totalPedido = 0;
        
        // Insertar detalles del pedido
        for (const item of productos) {
            // Obtener información del producto
            const productoResult = await client.query(
                'SELECT precio, stock_actual FROM productos WHERE id = $1',
                [item.id_producto]
            );
            
            if (productoResult.rows.length === 0) {
                throw new Error(`Producto con ID ${item.id_producto} no encontrado`);
            }
            
            const producto = productoResult.rows[0];
            
            // Verificar stock
            if (producto.stock_actual < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto con ID ${item.id_producto}`);
            }
            
            // Calcular subtotal
            const subtotal = producto.precio * item.cantidad;
            totalPedido += subtotal;
            
            // Insertar detalle
            await client.query(
                `INSERT INTO detalles_pedido (id_pedido, id_producto, cantidad, precio_unitario) 
                 VALUES ($1, $2, $3, $4)`,
                [pedido.id, item.id_producto, item.cantidad, producto.precio]
            );
            
            // Actualizar stock
            await client.query(
                'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2',
                [item.cantidad, item.id_producto]
            );
        }
        
        // Actualizar total del pedido
        await client.query(
            'UPDATE pedidos SET total = $1 WHERE id = $2',
            [totalPedido, pedido.id]
        );
        
        // Actualizar estado de la mesa
        await client.query(
            'UPDATE mesas SET estado = $1 WHERE id = $2',
            ['ocupada', id_mesa]
        );
        
        await client.query('COMMIT');
        
        // Devolver el pedido creado con su total actualizado
        pedido.total = totalPedido;
        res.status(201).json(pedido);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear pedido:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    } finally {
        client.release();
    }
});

app.get('/api/pedidos', authenticateToken, async (req, res) => {
    try {
        const { estado } = req.query;
        
        let query = `
            SELECT p.*, m.numero as numero_mesa, 
                   u.nombre || ' ' || u.apellido as nombre_usuario
            FROM pedidos p
            JOIN mesas m ON p.id_mesa = m.id
            JOIN usuarios u ON p.id_usuario = u.id
        `;
        
        const params = [];
        
        if (estado) {
            query += ' WHERE p.estado = $1';
            params.push(estado);
        }
        
        query += ' ORDER BY p.tiempo_inicio DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

app.get('/api/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener datos del pedido
        const pedidoQuery = `
            SELECT p.*, m.numero as numero_mesa, 
                   u.nombre || ' ' || u.apellido as nombre_usuario
            FROM pedidos p
            JOIN mesas m ON p.id_mesa = m.id
            JOIN usuarios u ON p.id_usuario = u.id
            WHERE p.id = $1
        `;
        
        const pedidoResult = await pool.query(pedidoQuery, [id]);
        
        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        
        const pedido = pedidoResult.rows[0];
        
        // Obtener detalles del pedido
        const detallesQuery = `
            SELECT dp.*, p.nombre as nombre_producto, p.descripcion
            FROM detalles_pedido dp
            JOIN productos p ON dp.id_producto = p.id
            WHERE dp.id_pedido = $1
        `;
        
        const detallesResult = await pool.query(detallesQuery, [id]);
        pedido.detalles = detallesResult.rows;
        
        res.json(pedido);
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

app.put('/api/pedidos/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { estado, metodo_pago } = req.body;
        
        // Actualizar el pedido
        const updateQuery = `
            UPDATE pedidos
            SET estado = $1, 
                ${estado === 'entregado' ? 'tiempo_entrega = CURRENT_TIMESTAMP,' : ''}
                ${metodo_pago ? 'metodo_pago = $3,' : ''}
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const params = metodo_pago 
            ? [estado, id, metodo_pago]
            : [estado, id];
        
        const result = await client.query(updateQuery, params);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        
        // Si el pedido está completado (pagado), liberar la mesa
        if (estado === 'pagado') {
            await client.query(
                'UPDATE mesas SET estado = $1 WHERE id = $2',
                ['libre', result.rows[0].id_mesa]
            );
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar pedido:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    } finally {
        client.release();
    }
});

app.put('/api/pedidos/:id/detalles/:detalleId', authenticateToken, async (req, res) => {
    try {
        const { id, detalleId } = req.params;
        const { estado } = req.body;
        
        const query = `
            UPDATE detalles_pedido
            SET estado = $1
            WHERE id = $2 AND id_pedido = $3
            RETURNING *
        `;
        
        const result = await pool.query(query, [estado, detalleId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Detalle de pedido no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar detalle de pedido:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// --- Inventario ---
app.get('/api/inventario/alertas', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, categoria, stock_actual, stock_minimo, unidad_medida
            FROM productos
            WHERE stock_actual <= stock_minimo
            ORDER BY (stock_actual::float / stock_minimo::float)
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener alertas de inventario:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// === Puerto y arranque del servidor ===
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});