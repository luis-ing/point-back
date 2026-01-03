import { PrismaClient } from '@prisma/client';
import { requireUsuario, Context } from '../../utils/auth';
import { GraphQLError } from 'graphql';
import { pubsub } from '../../index';

const prisma = new PrismaClient();

export const ventaResolvers = {
  Query: {
    ventas: async (_: any, { idTienda, filtro }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      const where: any = { idTienda };

      if (filtro) {
        if (filtro.fechaInicio && filtro.fechaFin) {
          where.fechaCreacion = {
            gte: new Date(filtro.fechaInicio),
            lte: new Date(filtro.fechaFin)
          };
        }

        if (filtro.estado) {
          where.estado = filtro.estado;
        }

        if (filtro.tipo) {
          where.tipo = filtro.tipo;
        }

        if (filtro.idCliente) {
          where.idCliente = filtro.idCliente;
        }
      }

      return prisma.venta.findMany({
        where,
        include: {
          cliente: true,
          metodoPago: true,
          usuario: true,
          tienda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        },
        orderBy: { fechaCreacion: 'desc' }
      });
    },

    venta: async (_: any, { idVenta }: any, context: Context) => {
      requireUsuario(context);

      const venta = await prisma.venta.findUnique({
        where: { idVenta },
        include: {
          cliente: true,
          metodoPago: true,
          usuario: true,
          tienda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      if (!venta) {
        throw new GraphQLError('Venta no encontrada');
      }

      return venta;
    }
  },

  Mutation: {
    crearVenta: async (_: any, { idTienda, input }: any, context: Context) => {
      const { userId, tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      // Validar productos y stock
      for (const detalle of input.detalles) {
        const producto = await prisma.producto.findUnique({
          where: { idProducto: detalle.idProducto }
        });

        if (!producto) {
          throw new GraphQLError(`Producto ${detalle.idProducto} no encontrado`);
        }

        if (!producto.activo) {
          throw new GraphQLError(`Producto ${producto.nombre} está inactivo`);
        }

        if (producto.usarInventario && producto.stock < detalle.cantidad) {
          throw new GraphQLError(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
          );
        }
      }

      // Calcular totales
      let subtotal = 0;
      for (const detalle of input.detalles) {
        const subtotalDetalle = detalle.precioUnitario * detalle.cantidad - (detalle.descuento || 0);
        subtotal += subtotalDetalle;
      }

      const descuento = input.descuento || 0;
      const impuestos = input.impuestos || 0;
      const propina = input.propina || 0;
      const total = subtotal - descuento + impuestos + propina;

      // Generar folio único
      const count = await prisma.venta.count({ where: { idTienda } });
      const folio = `V-${idTienda}-${count + 1}`;

      // Crear venta con transacción
      const venta = await prisma.$transaction(async (tx) => {
        // Crear venta
        const nuevaVenta = await tx.venta.create({
          data: {
            idTienda,
            idCliente: input.idCliente,
            idMetodoPago: input.idMetodoPago,
            folio,
            subtotal,
            descuento,
            impuestos,
            propina,
            total,
            estado: 'pendiente',
            tipo: input.tipo || 'local',
            creadoPor: userId
          }
        });

        // Crear detalles de venta
        for (const detalle of input.detalles) {
          const subtotalDetalle = detalle.precioUnitario * detalle.cantidad - (detalle.descuento || 0);
          
          await tx.detalleVenta.create({
            data: {
              idVenta: nuevaVenta.idVenta,
              idProducto: detalle.idProducto,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario,
              descuento: detalle.descuento || 0,
              subtotal: subtotalDetalle
            }
          });

          // Actualizar stock del producto
          const producto = await tx.producto.findUnique({
            where: { idProducto: detalle.idProducto }
          });

          if (producto && producto.usarInventario) {
            const nuevoStock = producto.stock - detalle.cantidad;
            
            await tx.producto.update({
              where: { idProducto: detalle.idProducto },
              data: { stock: nuevoStock }
            });

            // Registrar en historial
            await tx.historialInventario.create({
              data: {
                idProducto: detalle.idProducto,
                idVenta: nuevaVenta.idVenta,
                tipoMovimiento: 'venta',
                cantidad: detalle.cantidad,
                stockAnterior: producto.stock,
                stockNuevo: nuevoStock,
                motivo: `Venta ${folio}`,
                creadoPor: userId
              }
            });
          }
        }

        return nuevaVenta;
      });

      // Obtener venta completa
      const ventaCompleta = await prisma.venta.findUnique({
        where: { idVenta: venta.idVenta },
        include: {
          cliente: true,
          metodoPago: true,
          usuario: true,
          tienda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      // Publicar evento de venta creada
      pubsub.publish(`VENTA_CREADA_${idTienda}`, {
        ventaCreada: ventaCompleta
      });

      // Actualizar estadísticas
      const estadisticas = await calcularEstadisticas(idTienda);
      pubsub.publish(`ESTADISTICAS_ACTUALIZADAS_${idTienda}`, {
        estadisticasActualizadas: estadisticas
      });

      return ventaCompleta;
    },

    completarVenta: async (_: any, { idVenta }: any, context: Context) => {
      requireUsuario(context);

      const venta = await prisma.venta.findUnique({
        where: { idVenta }
      });

      if (!venta) {
        throw new GraphQLError('Venta no encontrada');
      }

      if (venta.estado === 'completada') {
        throw new GraphQLError('La venta ya está completada');
      }

      if (venta.estado === 'cancelada') {
        throw new GraphQLError('No se puede completar una venta cancelada');
      }

      const ventaActualizada = await prisma.venta.update({
        where: { idVenta },
        data: { estado: 'completada' },
        include: {
          cliente: true,
          metodoPago: true,
          usuario: true,
          tienda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      // Publicar actualización
      pubsub.publish(`VENTA_ACTUALIZADA_${ventaActualizada.idTienda}`, {
        ventaActualizada
      });

      return ventaActualizada;
    },

    cancelarVenta: async (_: any, { idVenta }: any, context: Context) => {
      const { userId } = requireUsuario(context);

      const venta = await prisma.venta.findUnique({
        where: { idVenta },
        include: {
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      if (!venta) {
        throw new GraphQLError('Venta no encontrada');
      }

      if (venta.estado === 'cancelada') {
        throw new GraphQLError('La venta ya está cancelada');
      }

      // Devolver productos al inventario
      await prisma.$transaction(async (tx) => {
        for (const detalle of venta.detalles) {
          if (detalle.producto.usarInventario) {
            const nuevoStock = detalle.producto.stock + detalle.cantidad;
            
            await tx.producto.update({
              where: { idProducto: detalle.idProducto },
              data: { stock: nuevoStock }
            });

            // Registrar en historial
            await tx.historialInventario.create({
              data: {
                idProducto: detalle.idProducto,
                idVenta: venta.idVenta,
                tipoMovimiento: 'entrada',
                cantidad: detalle.cantidad,
                stockAnterior: detalle.producto.stock,
                stockNuevo: nuevoStock,
                motivo: `Cancelación de venta ${venta.folio}`,
                creadoPor: userId
              }
            });
          }
        }

        await tx.venta.update({
          where: { idVenta },
          data: { estado: 'cancelada' }
        });
      });

      const ventaActualizada = await prisma.venta.findUnique({
        where: { idVenta },
        include: {
          cliente: true,
          metodoPago: true,
          usuario: true,
          tienda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      // Publicar actualización
      pubsub.publish(`VENTA_ACTUALIZADA_${ventaActualizada!.idTienda}`, {
        ventaActualizada
      });

      return ventaActualizada;
    }
  }
};

// Función auxiliar para calcular estadísticas
async function calcularEstadisticas(idTienda: number) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Total ventas hoy
  const ventasHoy = await prisma.venta.aggregate({
    where: {
      idTienda,
      estado: 'completada',
      fechaCreacion: {
        gte: hoy
      }
    },
    _sum: { total: true },
    _count: true
  });

  // Total ventas del mes
  const ventasMes = await prisma.venta.aggregate({
    where: {
      idTienda,
      estado: 'completada',
      fechaCreacion: {
        gte: primerDiaMes
      }
    },
    _sum: { total: true },
    _count: true
  });

  // Productos con stock bajo
  const productosStockBajo = await prisma.producto.count({
    where: {
      idTienda,
      activo: true,
      usarInventario: true,
      stock: {
        lte: prisma.producto.fields.stockMin
      }
    }
  });

  // Clientes nuevos hoy
  const clientesNuevos = await prisma.cliente.count({
    where: {
      idTienda,
      fechaCreacion: {
        gte: hoy
      }
    }
  });

  return {
    totalVentasHoy: ventasHoy._sum.total || 0,
    totalVentasMes: ventasMes._sum.total || 0,
    cantidadVentasHoy: ventasHoy._count || 0,
    cantidadVentasMes: ventasMes._count || 0,
    productosStockBajo,
    clientesNuevosHoy: clientesNuevos
  };
}