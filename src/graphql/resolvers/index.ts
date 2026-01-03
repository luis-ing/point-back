import { PrismaClient } from '@prisma/client';
import { authResolvers } from './auth.resolvers';
import { tiendaResolvers } from './tienda.resolvers';
// import { productoResolvers } from './producto.resolvers';
import { ventaResolvers } from './venta.resolvers';
import { estadisticasResolvers } from './estadisticas.resolvers';
// import { subscriptionResolvers } from './subscriptions.resolvers';
import { requireUsuario, Context } from '../../utils/auth';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

// Resolvers adicionales para completar el schema
const additionalResolvers = {
  Query: {
    planes: async () => {
      return prisma.planSuscripcion.findMany({
        where: { activo: true },
        orderBy: { precioMensual: 'asc' }
      });
    },

    plan: async (_: any, { idPlan }: any) => {
      return prisma.planSuscripcion.findUnique({
        where: { idPlan }
      });
    },

    miSuscripcion: async (_: any, __: any, context: Context) => {
      if (!context.cuentaPrincipalId) {
        throw new GraphQLError('No autenticado');
      }

      return prisma.suscripcion.findFirst({
        where: {
          idCuentaPrincipal: context.cuentaPrincipalId,
          activo: true,
          estado: 'activa'
        },
        include: {
          plan: true,
          cuentaPrincipal: true
        }
      });
    },

    usuarios: async (_: any, { idTienda }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.usuario.findMany({
        where: {
          idTienda,
          activo: true
        },
        include: {
          rol: true,
          tienda: true
        }
      });
    },

    usuario: async (_: any, { idUsuario }: any, context: Context) => {
      requireUsuario(context);

      return prisma.usuario.findUnique({
        where: { idUsuario },
        include: {
          rol: true,
          tienda: true
        }
      });
    },

    roles: async () => {
      return prisma.rol.findMany({
        where: { activo: true },
        include: {
          permisos: {
            include: { permiso: true }
          }
        }
      });
    },

    rol: async (_: any, { idRol }: any) => {
      return prisma.rol.findUnique({
        where: { idRol },
        include: {
          permisos: {
            include: { permiso: true }
          }
        }
      });
    },

    clasificaciones: async (_: any, { idTienda }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.clasificacion.findMany({
        where: {
          idTienda,
          activo: true
        },
        include: { tienda: true }
      });
    },

    clasificacion: async (_: any, { idClasificacion }: any, context: Context) => {
      requireUsuario(context);

      return prisma.clasificacion.findUnique({
        where: { idClasificacion },
        include: { tienda: true }
      });
    },

    proveedores: async (_: any, { idTienda }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.proveedor.findMany({
        where: {
          idTienda,
          activo: true
        },
        include: { tienda: true }
      });
    },

    proveedor: async (_: any, { idProveedor }: any, context: Context) => {
      requireUsuario(context);

      return prisma.proveedor.findUnique({
        where: { idProveedor },
        include: { tienda: true }
      });
    },

    clientes: async (_: any, { idTienda }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.cliente.findMany({
        where: {
          idTienda,
          activo: true
        },
        include: { tienda: true }
      });
    },

    cliente: async (_: any, { idCliente }: any, context: Context) => {
      requireUsuario(context);

      return prisma.cliente.findUnique({
        where: { idCliente },
        include: { tienda: true }
      });
    },

    historialInventario: async (_: any, { idProducto }: any, context: Context) => {
      requireUsuario(context);

      return prisma.historialInventario.findMany({
        where: { idProducto },
        include: {
          producto: true,
          venta: true
        },
        orderBy: { fechaCreacion: 'desc' }
      });
    },

    metodosPago: async () => {
      return prisma.metodoPago.findMany({
        where: { activo: true }
      });
    }
  },

  // Mutations adicionales
  Mutation: {
    crearUsuario: async (_: any, { idTienda, input }: any, context: Context) => {
      const { userId, tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      const hashedPassword = await import('../../utils/auth').then(m => 
        m.AuthUtils.hashPassword(input.contrasena)
      );

      return prisma.usuario.create({
        data: {
          ...input,
          contrasena: hashedPassword,
          idTienda,
          creadoPor: userId
        },
        include: {
          rol: true,
          tienda: true
        }
      });
    },

    crearClasificacion: async (_: any, { idTienda, nombre, descripcion }: any, context: Context) => {
      const { userId, tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.clasificacion.create({
        data: {
          nombre,
          descripcion,
          idTienda,
          creadoPor: userId
        },
        include: { tienda: true }
      });
    },

    crearCliente: async (_: any, { idTienda, input }: any, context: Context) => {
      const { userId, tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      return prisma.cliente.create({
        data: {
          ...input,
          idTienda,
          creadoPor: userId
        },
        include: { tienda: true }
      });
    }
  },

  // Resolvers de campos
  Usuario: {
    nombreCompleto: (parent: any) => {
      return [parent.pNombre, parent.sNombre, parent.apellidoP, parent.apellidoM]
        .filter(Boolean)
        .join(' ');
    }
  },

  Cliente: {
    nombreCompleto: (parent: any) => {
      return [parent.pNombre, parent.sNombre, parent.apellidoP, parent.apellidoM]
        .filter(Boolean)
        .join(' ') || 'Cliente sin nombre';
    },

    totalCompras: async (parent: any) => {
      const result = await prisma.venta.aggregate({
        where: {
          idCliente: parent.idCliente,
          estado: 'completada'
        },
        _sum: { total: true }
      });
      return result._sum.total || 0;
    },

    cantidadCompras: async (parent: any) => {
      return prisma.venta.count({
        where: {
          idCliente: parent.idCliente,
          estado: 'completada'
        }
      });
    }
  },

  Clasificacion: {
    totalProductos: async (parent: any) => {
      return prisma.producto.count({
        where: {
          idClasificacion: parent.idClasificacion,
          activo: true
        }
      });
    }
  },

  Proveedor: {
    totalProductos: async (parent: any) => {
      return prisma.producto.count({
        where: {
          idProveedor: parent.idProveedor,
          activo: true
        }
      });
    }
  },

  Suscripcion: {
    diasRestantes: (parent: any) => {
      if (!parent.fechaProximoPago) return null;
      const hoy = new Date();
      const proximoPago = new Date(parent.fechaProximoPago);
      const diff = proximoPago.getTime() - hoy.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }
};

// Combinar todos los resolvers
export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...tiendaResolvers.Query,
    // ...productoResolvers.Query,
    ...ventaResolvers.Query,
    ...estadisticasResolvers.Query,
    ...additionalResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...tiendaResolvers.Mutation,
    // ...productoResolvers.Mutation,
    ...ventaResolvers.Mutation,
    ...additionalResolvers.Mutation
  },
  Subscription: {
    // ...subscriptionResolvers.Subscription
  },
  CuentaPrincipal: authResolvers.CuentaPrincipal,
  Tienda: tiendaResolvers.Tienda,
  // Producto: productoResolvers.Producto,
  Usuario: additionalResolvers.Usuario,
  Cliente: additionalResolvers.Cliente,
  Clasificacion: additionalResolvers.Clasificacion,
  Proveedor: additionalResolvers.Proveedor,
  Suscripcion: additionalResolvers.Suscripcion
};