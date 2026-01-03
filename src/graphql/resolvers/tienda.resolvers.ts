import { PrismaClient } from '@prisma/client';
import { requireCuentaPrincipal, Context } from '../../utils/auth';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

export const tiendaResolvers = {
  Query: {
    misTiendas: async (_: any, __: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);
      
      return prisma.tienda.findMany({
        where: {
          idCuentaPrincipal,
          activo: true
        },
        include: {
          cuentaPrincipal: true
        },
        orderBy: { fechaCreacion: 'desc' }
      });
    },

    tienda: async (_: any, { idTienda }: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);
      
      const tienda = await prisma.tienda.findFirst({
        where: {
          idTienda,
          idCuentaPrincipal,
          activo: true
        },
        include: {
          cuentaPrincipal: true
        }
      });

      if (!tienda) {
        throw new GraphQLError('Tienda no encontrada');
      }

      return tienda;
    }
  },

  Mutation: {
    crearTienda: async (_: any, { input }: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);

      // Verificar suscripción y límites
      const suscripcion = await prisma.suscripcion.findFirst({
        where: {
          idCuentaPrincipal,
          activo: true,
          estado: 'activa'
        },
        include: { plan: true }
      });

      if (!suscripcion) {
        throw new GraphQLError('No tienes una suscripción activa');
      }

      const tiendaCount = await prisma.tienda.count({
        where: {
          idCuentaPrincipal,
          activo: true
        }
      });

      if (tiendaCount >= suscripcion.plan.maxSucursales) {
        throw new GraphQLError(
          `Has alcanzado el límite de ${suscripcion.plan.maxSucursales} sucursales de tu plan`
        );
      }

      const tienda = await prisma.tienda.create({
        data: {
          ...input,
          idCuentaPrincipal
        },
        include: {
          cuentaPrincipal: true
        }
      });

      // Actualizar cantidad de sucursales en suscripción
      await prisma.suscripcion.update({
        where: { idSuscripcion: suscripcion.idSuscripcion },
        data: {
          cantidadSucursales: tiendaCount + 1,
          montoTotal: Number(suscripcion.plan.precioMensual) * (tiendaCount + 1)
        }
      });

      return tienda;
    },

    actualizarTienda: async (_: any, { idTienda, input }: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);

      const tienda = await prisma.tienda.findFirst({
        where: {
          idTienda,
          idCuentaPrincipal
        }
      });

      if (!tienda) {
        throw new GraphQLError('Tienda no encontrada');
      }

      return prisma.tienda.update({
        where: { idTienda },
        data: input,
        include: {
          cuentaPrincipal: true
        }
      });
    },

    eliminarTienda: async (_: any, { idTienda }: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);

      const tienda = await prisma.tienda.findFirst({
        where: {
          idTienda,
          idCuentaPrincipal
        }
      });

      if (!tienda) {
        throw new GraphQLError('Tienda no encontrada');
      }

      // Soft delete
      await prisma.tienda.update({
        where: { idTienda },
        data: { activo: false }
      });

      return true;
    }
  },

  Tienda: {
    totalProductos: async (parent: any) => {
      return prisma.producto.count({
        where: {
          idTienda: parent.idTienda,
          activo: true
        }
      });
    },

    totalVentas: async (parent: any) => {
      return prisma.venta.count({
        where: {
          idTienda: parent.idTienda
        }
      });
    }
  }
};