import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (opcional - comentar en producción)
  // await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  // await prisma.usuario.deleteMany();
  // await prisma.tienda.deleteMany();
  // await prisma.suscripcion.deleteMany();
  // await prisma.cuentaPrincipal.deleteMany();
  // await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

  // 1. Crear Planes de Suscripción
  console.log('📋 Creando planes de suscripción...');
  
  const planBasico = await prisma.planSuscripcion.upsert({
    where: { idPlan: 1 },
    update: {},
    create: {
      nombre: 'Básico',
      descripcion: 'Plan básico para emprendedores',
      precioMensual: 299.00,
      maxSucursales: 1,
      maxUsuariosPorSucursal: 3,
      caracteristicas: {
        features: [
          'Gestión de inventario',
          'Punto de venta',
          'Reportes básicos',
          '1 Sucursal',
          'Hasta 3 usuarios'
        ]
      }
    }
  });

  const planProfesional = await prisma.planSuscripcion.upsert({
    where: { idPlan: 2 },
    update: {},
    create: {
      nombre: 'Profesional',
      descripcion: 'Plan para negocios en crecimiento',
      precioMensual: 599.00,
      maxSucursales: 3,
      maxUsuariosPorSucursal: 10,
      caracteristicas: {
        features: [
          'Todo del plan Básico',
          'Reportes avanzados',
          'Gestión de proveedores',
          'Hasta 3 Sucursales',
          'Hasta 10 usuarios por sucursal',
          'Soporte prioritario'
        ]
      }
    }
  });

  const planEmpresarial = await prisma.planSuscripcion.upsert({
    where: { idPlan: 3 },
    update: {},
    create: {
      nombre: 'Empresarial',
      descripcion: 'Plan para empresas establecidas',
      precioMensual: 1299.00,
      maxSucursales: 10,
      maxUsuariosPorSucursal: 50,
      caracteristicas: {
        features: [
          'Todo del plan Profesional',
          'Dashboard en tiempo real',
          'API de integración',
          'Hasta 10 Sucursales',
          'Hasta 50 usuarios por sucursal',
          'Capacitación personalizada',
          'Soporte 24/7'
        ]
      }
    }
  });

  // 2. Crear Roles
  console.log('👥 Creando roles...');

  const rolSuperAdmin = await prisma.rol.upsert({
    where: { idRol: 1 },
    update: {},
    create: {
      nombre: 'Super Administrador',
      descripcion: 'Acceso total al sistema',
      nivel: 0
    }
  });

  const rolAdmin = await prisma.rol.upsert({
    where: { idRol: 2 },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Administrador de sucursal',
      nivel: 1
    }
  });

  const rolGerente = await prisma.rol.upsert({
    where: { idRol: 3 },
    update: {},
    create: {
      nombre: 'Gerente',
      descripcion: 'Gerente de tienda',
      nivel: 2
    }
  });

  const rolCajero = await prisma.rol.upsert({
    where: { idRol: 4 },
    update: {},
    create: {
      nombre: 'Cajero',
      descripcion: 'Personal de caja',
      nivel: 3
    }
  });

  const rolAlmacenista = await prisma.rol.upsert({
    where: { idRol: 5 },
    update: {},
    create: {
      nombre: 'Almacenista',
      descripcion: 'Personal de almacén',
      nivel: 3
    }
  });

  // 3. Crear Permisos
  console.log('🔐 Creando permisos...');

  const permisos = [
    { modulo: 'Productos', codigo: 'productos', descripcion: 'Gestión de productos' },
    { modulo: 'Ventas', codigo: 'ventas', descripcion: 'Gestión de ventas' },
    { modulo: 'Clientes', codigo: 'clientes', descripcion: 'Gestión de clientes' },
    { modulo: 'Usuarios', codigo: 'usuarios', descripcion: 'Gestión de usuarios' },
    { modulo: 'Reportes', codigo: 'reportes', descripcion: 'Visualización de reportes' },
    { modulo: 'Configuración', codigo: 'configuracion', descripcion: 'Configuración del sistema' },
    { modulo: 'Proveedores', codigo: 'proveedores', descripcion: 'Gestión de proveedores' },
    { modulo: 'Inventario', codigo: 'inventario', descripcion: 'Gestión de inventario' },
  ];

  for (const permiso of permisos) {
    await prisma.permiso.upsert({
      where: { codigo: permiso.codigo },
      update: {},
      create: permiso
    });
  }

  // 4. Crear Métodos de Pago
  console.log('💳 Creando métodos de pago...');

  const metodosPago = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia', 'Otros'];

  for (const metodo of metodosPago) {
    await prisma.metodoPago.upsert({
      where: { idMetodoPago: metodosPago.indexOf(metodo) + 1 },
      update: {},
      create: { nombre: metodo }
    });
  }

  // 5. Crear Cuenta de Demostración
  console.log('🧪 Creando cuenta de demostración...');

  const hashedPassword = await bcrypt.hash('demo123', 10);

  const cuentaDemo = await prisma.cuentaPrincipal.upsert({
    where: { email: 'demo@tienda.com' },
    update: {},
    create: {
      email: 'demo@tienda.com',
      contrasena: hashedPassword,
      pNombre: 'Usuario',
      apellidoP: 'Demo',
      telefono: '9999999999',
      emailVerificado: true
    }
  });

  // Crear suscripción activa
  const fechaInicio = new Date();
  const fechaProximoPago = new Date();
  fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);

  const suscripcionDemo = await prisma.suscripcion.create({
    data: {
      idCuentaPrincipal: cuentaDemo.idCuentaPrincipal,
      idPlan: planProfesional.idPlan,
      fechaInicio,
      fechaProximoPago,
      estado: 'activa',
      cantidadSucursales: 1,
      montoTotal: planProfesional.precioMensual
    }
  });

  // Crear tienda demo
  const tiendaDemo = await prisma.tienda.create({
    data: {
      idCuentaPrincipal: cuentaDemo.idCuentaPrincipal,
      nombre: 'Tienda Demo',
      direccion: 'Av. Principal #123',
      telefono: '9999999999',
      email: 'tienda@demo.com'
    }
  });

  // Crear usuario administrador de la tienda
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      idTienda: tiendaDemo.idTienda,
      idRol: rolAdmin.idRol,
      email: 'admin@tienda.com',
      contrasena: hashedPassword,
      pNombre: 'Admin',
      apellidoP: 'Demo',
      telefono: '9999999999'
    }
  });

  // Crear algunas clasificaciones
  console.log('📦 Creando clasificaciones...');
  
  const clasificaciones = ['Electrónica', 'Ropa', 'Alimentos', 'Bebidas', 'Accesorios'];
  
  for (const nombre of clasificaciones) {
    await prisma.clasificacion.create({
      data: {
        idTienda: tiendaDemo.idTienda,
        nombre,
        creadoPor: usuarioAdmin.idUsuario
      }
    });
  }

  // Crear algunos productos de ejemplo
  console.log('🛍️ Creando productos de ejemplo...');
  
  const productos = [
    {
      nombre: 'Laptop HP 15"',
      precio: 12999.00,
      precioCompra: 10000.00,
      stock: 10,
      stockMin: 2,
      stockMax: 50,
      codigoBarras: '7501234567890'
    },
    {
      nombre: 'Mouse Inalámbrico',
      precio: 299.00,
      precioCompra: 150.00,
      stock: 50,
      stockMin: 10,
      stockMax: 100,
      codigoBarras: '7501234567891'
    },
    {
      nombre: 'Teclado Mecánico',
      precio: 899.00,
      precioCompra: 500.00,
      stock: 25,
      stockMin: 5,
      stockMax: 50,
      codigoBarras: '7501234567892'
    }
  ];

  for (const producto of productos) {
    await prisma.producto.create({
      data: {
        ...producto,
        idTienda: tiendaDemo.idTienda,
        creadoPor: usuarioAdmin.idUsuario
      }
    });
  }

  console.log('✅ Seed completado exitosamente!');
  console.log('\n📧 Credenciales de demostración:');
  console.log('   Cuenta Principal:');
  console.log('   Email: demo@tienda.com');
  console.log('   Password: demo123');
  console.log('\n   Usuario Administrador:');
  console.log('   Email: admin@tienda.com');
  console.log('   Password: demo123');
  console.log('   ID Tienda:', tiendaDemo.idTienda);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });