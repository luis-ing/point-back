export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  # ===== ENUMS =====
  enum EstadoSuscripcion {
    activa
    pausada
    cancelada
    vencida
  }

  enum EstadoVenta {
    pendiente
    completada
    cancelada
  }

  enum TipoVenta {
    local
    online
  }

  enum TipoMovimiento {
    entrada
    salida
    ajuste
    venta
  }

  # ===== TIPOS PRINCIPALES =====
  
  type CuentaPrincipal {
    idCuentaPrincipal: Int!
    email: String!
    pNombre: String!
    sNombre: String
    apellidoP: String
    apellidoM: String
    telefono: String
    nombreCompleto: String!
    emailVerificado: Boolean!
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    suscripciones: [Suscripcion!]!
    tiendas: [Tienda!]!
    suscripcionActiva: Suscripcion
  }

  type PlanSuscripcion {
    idPlan: Int!
    nombre: String!
    descripcion: String
    precioMensual: Float!
    maxSucursales: Int!
    maxUsuariosPorSucursal: Int!
    caracteristicas: JSON
    activo: Boolean!
    fechaCreacion: DateTime!
  }

  type Suscripcion {
    idSuscripcion: Int!
    fechaInicio: DateTime!
    fechaFin: DateTime
    fechaProximoPago: DateTime!
    estado: EstadoSuscripcion!
    cantidadSucursales: Int!
    montoTotal: Float!
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    cuentaPrincipal: CuentaPrincipal!
    plan: PlanSuscripcion!
    diasRestantes: Int
  }

  type Tienda {
    idTienda: Int!
    nombre: String!
    direccion: String
    telefono: String
    email: String
    configuracion: JSON
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    cuentaPrincipal: CuentaPrincipal!
    usuarios: [Usuario!]!
    totalProductos: Int!
    totalVentas: Int!
  }

  type Rol {
    idRol: Int!
    nombre: String!
    descripcion: String
    nivel: Int!
    activo: Boolean!
    fechaCreacion: DateTime!
    permisos: [RolPermiso!]!
  }

  type Usuario {
    idUsuario: Int!
    email: String!
    pNombre: String!
    sNombre: String
    apellidoP: String
    apellidoM: String
    nombreCompleto: String!
    curp: String
    rfc: String
    fechaNacimiento: DateTime
    telefono: String
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    rol: Rol!
  }

  type Permiso {
    idPermiso: Int!
    modulo: String!
    descripcion: String
    codigo: String!
    activo: Boolean!
  }

  type RolPermiso {
    rol: Rol!
    permiso: Permiso!
    leer: Boolean!
    crear: Boolean!
    editar: Boolean!
    eliminar: Boolean!
  }

  type Clasificacion {
    idClasificacion: Int!
    nombre: String!
    descripcion: String
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    totalProductos: Int!
  }

  type Proveedor {
    idProveedor: Int!
    nombre: String!
    nombreContacto: String
    email: String
    telefono: String
    direccion: String
    rfc: String
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    totalProductos: Int!
  }

  type Producto {
    idProducto: Int!
    codigoBarras: String
    sku: String
    nombre: String!
    descripcion: String
    precio: Float!
    precioCompra: Float!
    margenGanancia: Float!
    usarInventario: Boolean!
    stock: Int!
    stockMin: Int!
    stockMax: Int!
    unidadMedida: String
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    clasificacion: Clasificacion
    proveedor: Proveedor
    requiereReposicion: Boolean!
  }

  type Cliente {
    idCliente: Int!
    email: String
    pNombre: String
    sNombre: String
    apellidoP: String
    apellidoM: String
    nombreCompleto: String
    telefono: String
    fechaNacimiento: DateTime
    direccion: String
    rfc: String
    activo: Boolean!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    totalCompras: Float!
    cantidadCompras: Int!
  }

  type MetodoPago {
    idMetodoPago: Int!
    nombre: String!
    activo: Boolean!
  }

  type Venta {
    idVenta: Int!
    folio: String
    subtotal: Float!
    descuento: Float!
    impuestos: Float!
    propina: Float!
    total: Float!
    estado: EstadoVenta!
    tipo: TipoVenta!
    fechaCreacion: DateTime!
    fechaActualizacion: DateTime!
    tienda: Tienda!
    cliente: Cliente
    metodoPago: MetodoPago!
    usuario: Usuario
    detalles: [DetalleVenta!]!
  }

  type DetalleVenta {
    idDetalleVenta: Int!
    cantidad: Int!
    precioUnitario: Float!
    descuento: Float!
    subtotal: Float!
    venta: Venta!
    producto: Producto!
  }

  type HistorialInventario {
    idHistorial: Int!
    tipoMovimiento: TipoMovimiento!
    cantidad: Int!
    stockAnterior: Int!
    stockNuevo: Int!
    motivo: String
    fechaCreacion: DateTime!
    producto: Producto!
    venta: Venta
  }

  # ===== INPUTS =====

  input RegistroCuentaInput {
    email: String!
    contrasena: String!
    pNombre: String!
    sNombre: String
    apellidoP: String
    apellidoM: String
    telefono: String
    idPlan: Int!
  }

  input LoginInput {
    email: String!
    contrasena: String!
  }

  input CrearTiendaInput {
    nombre: String!
    direccion: String
    telefono: String
    email: String
    configuracion: JSON
  }

  input ActualizarTiendaInput {
    nombre: String
    direccion: String
    telefono: String
    email: String
    configuracion: JSON
    activo: Boolean
  }

  input CrearUsuarioInput {
    email: String!
    contrasena: String!
    pNombre: String!
    sNombre: String
    apellidoP: String
    apellidoM: String
    curp: String
    rfc: String
    fechaNacimiento: DateTime
    telefono: String
    idRol: Int!
  }

  input ActualizarUsuarioInput {
    email: String
    pNombre: String
    sNombre: String
    apellidoP: String
    apellidoM: String
    curp: String
    rfc: String
    fechaNacimiento: DateTime
    telefono: String
    idRol: Int
    activo: Boolean
  }

  input CrearProductoInput {
    codigoBarras: String
    sku: String
    nombre: String!
    descripcion: String
    precio: Float!
    precioCompra: Float!
    usarInventario: Boolean
    stock: Int
    stockMin: Int
    stockMax: Int
    unidadMedida: String
    idClasificacion: Int
    idProveedor: Int
  }

  input ActualizarProductoInput {
    codigoBarras: String
    sku: String
    nombre: String
    descripcion: String
    precio: Float
    precioCompra: Float
    usarInventario: Boolean
    stock: Int
    stockMin: Int
    stockMax: Int
    unidadMedida: String
    idClasificacion: Int
    idProveedor: Int
    activo: Boolean
  }

  input CrearClienteInput {
    email: String
    pNombre: String
    sNombre: String
    apellidoP: String
    apellidoM: String
    telefono: String
    fechaNacimiento: DateTime
    direccion: String
    rfc: String
  }

  input CrearVentaInput {
    idCliente: Int
    idMetodoPago: Int!
    descuento: Float
    impuestos: Float
    propina: Float
    tipo: TipoVenta
    detalles: [DetalleVentaInput!]!
  }

  input DetalleVentaInput {
    idProducto: Int!
    cantidad: Int!
    precioUnitario: Float!
    descuento: Float
  }

  input FiltroProductosInput {
    busqueda: String
    idClasificacion: Int
    idProveedor: Int
    activo: Boolean
    soloStockBajo: Boolean
  }

  input FiltroVentasInput {
    fechaInicio: DateTime
    fechaFin: DateTime
    estado: EstadoVenta
    tipo: TipoVenta
    idCliente: Int
  }

  # ===== RESPONSES =====

  type AuthResponse {
    token: String!
    usuario: CuentaPrincipal
    tienda: Tienda
  }

  type AuthUsuarioResponse {
    token: String!
    usuario: Usuario!
  }

  type EstadisticasGenerales {
    totalVentasHoy: Float!
    totalVentasMes: Float!
    cantidadVentasHoy: Int!
    cantidadVentasMes: Int!
    productosStockBajo: Int!
    clientesNuevosHoy: Int!
  }

  type EstadisticasProducto {
    producto: Producto!
    cantidadVendida: Int!
    totalVentas: Float!
  }

  # ===== QUERIES =====

  type Query {
    # Auth
    me: CuentaPrincipal
    meUsuario: Usuario

    # Planes
    planes: [PlanSuscripcion!]!
    plan(idPlan: Int!): PlanSuscripcion

    # Suscripciones
    miSuscripcion: Suscripcion

    # Tiendas
    misTiendas: [Tienda!]!
    tienda(idTienda: Int!): Tienda

    # Usuarios
    usuarios(idTienda: Int!): [Usuario!]!
    usuario(idUsuario: Int!): Usuario

    # Roles
    roles: [Rol!]!
    rol(idRol: Int!): Rol

    # Clasificaciones
    clasificaciones(idTienda: Int!): [Clasificacion!]!
    clasificacion(idClasificacion: Int!): Clasificacion

    # Proveedores
    proveedores(idTienda: Int!): [Proveedor!]!
    proveedor(idProveedor: Int!): Proveedor

    # Productos
    productos(idTienda: Int!, filtro: FiltroProductosInput): [Producto!]!
    producto(idProducto: Int!): Producto
    productosPorReposicion(idTienda: Int!): [Producto!]!

    # Clientes
    clientes(idTienda: Int!): [Cliente!]!
    cliente(idCliente: Int!): Cliente

    # Ventas
    ventas(idTienda: Int!, filtro: FiltroVentasInput): [Venta!]!
    venta(idVenta: Int!): Venta
    
    # Historial
    historialInventario(idProducto: Int!): [HistorialInventario!]!

    # Estadísticas
    estadisticasGenerales(idTienda: Int!): EstadisticasGenerales!
    productosTopVentas(idTienda: Int!, limite: Int): [EstadisticasProducto!]!
    
    # Métodos de Pago
    metodosPago: [MetodoPago!]!
  }

  # ===== MUTATIONS =====

  type Mutation {
    # Auth
    registrarCuenta(input: RegistroCuentaInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!
    loginUsuario(email: String!, contrasena: String!, idTienda: Int!): AuthUsuarioResponse!

    # Tiendas
    crearTienda(input: CrearTiendaInput!): Tienda!
    actualizarTienda(idTienda: Int!, input: ActualizarTiendaInput!): Tienda!
    eliminarTienda(idTienda: Int!): Boolean!

    # Usuarios
    crearUsuario(idTienda: Int!, input: CrearUsuarioInput!): Usuario!
    actualizarUsuario(idUsuario: Int!, input: ActualizarUsuarioInput!): Usuario!
    eliminarUsuario(idUsuario: Int!): Boolean!
    cambiarContrasenaUsuario(idUsuario: Int!, contrasenaActual: String!, contrasenaNueva: String!): Boolean!

    # Clasificaciones
    crearClasificacion(idTienda: Int!, nombre: String!, descripcion: String): Clasificacion!
    actualizarClasificacion(idClasificacion: Int!, nombre: String, descripcion: String, activo: Boolean): Clasificacion!
    eliminarClasificacion(idClasificacion: Int!): Boolean!

    # Proveedores
    crearProveedor(idTienda: Int!, input: CrearClienteInput!): Proveedor!
    actualizarProveedor(idProveedor: Int!, input: CrearClienteInput!): Proveedor!
    eliminarProveedor(idProveedor: Int!): Boolean!

    # Productos
    crearProducto(idTienda: Int!, input: CrearProductoInput!): Producto!
    actualizarProducto(idProducto: Int!, input: ActualizarProductoInput!): Producto!
    eliminarProducto(idProducto: Int!): Boolean!
    ajustarInventario(idProducto: Int!, cantidad: Int!, motivo: String): Producto!

    # Clientes
    crearCliente(idTienda: Int!, input: CrearClienteInput!): Cliente!
    actualizarCliente(idCliente: Int!, input: CrearClienteInput!): Cliente!
    eliminarCliente(idCliente: Int!): Boolean!

    # Ventas
    crearVenta(idTienda: Int!, input: CrearVentaInput!): Venta!
    completarVenta(idVenta: Int!): Venta!
    cancelarVenta(idVenta: Int!): Venta!
  }

  # ===== SUBSCRIPTIONS =====

  type Subscription {
    # Ventas en tiempo real
    ventaCreada(idTienda: Int!): Venta!
    ventaActualizada(idTienda: Int!): Venta!
    
    # Productos
    productoStockBajo(idTienda: Int!): Producto!
    productoActualizado(idTienda: Int!): Producto!
    
    # Estadísticas en tiempo real
    estadisticasActualizadas(idTienda: Int!): EstadisticasGenerales!
  }
`;