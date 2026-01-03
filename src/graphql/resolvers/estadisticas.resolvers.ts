import { PrismaClient } from '@prisma/client';
import { requireUsuario, Context } from '../../utils/auth';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

export const estadisticasResolvers = {
  Query: {
    estadisticasGenerales: async (_: any, { idTienda }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Total ventas hoy
      const ventasHoy = await prisma.venta.aggregate({
        where: {
          idTienda,
          estado: 'completada',
          fechaCreacion: { gte: hoy }
        },
        _sum: { total: true },
        _count: true
      });

      // Total ventas del mes
      const ventasMes = await prisma.venta.aggregate({
        where: {
          idTienda,
          estado: 'completada',
          fechaCreacion: { gte: primerDiaMes }
        },
        _sum: { total: true },
        _count: true
      });

      // Productos con stock bajo
      const productosStockBajo = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM producto 
        WHERE idTienda = ${idTienda} 
        AND activo = 1 
        AND usarInventario = 1 
        AND stock <= stockMin
      `;

      // Clientes nuevos hoy
      const clientesNuevos = await prisma.cliente.count({
        where: {
          idTienda,
          fechaCreacion: { gte: hoy }
        }
      });

      return {
        totalVentasHoy: ventasHoy._sum.total || 0,
        totalVentasMes: ventasMes._sum.total || 0,
        cantidadVentasHoy: ventasHoy._count || 0,
        cantidadVentasMes: ventasMes._count || 0,
        productosStockBajo: productosStockBajo[0]?.count || 0,
        clientesNuevosHoy: clientesNuevos
      };
    },

    productosTopVentas: async (_: any, { idTienda, limite = 10 }: any, context: Context) => {
      const { tiendaId } = requireUsuario(context);

      if (idTienda !== tiendaId) {
        throw new GraphQLError('No tienes acceso a esta tienda');
      }

      const topProductos = await prisma.$queryRaw<any[]>`
        SELECT 
          p.idProducto,
          p.nombre,
          p.precio,
          SUM(dv.cantidad) as cantidadVendida,
          SUM(dv.subtotal) as totalVentas
        FROM producto p
        INNER JOIN detalle_venta dv ON p.idProducto = dv.idProducto
        INNER JOIN venta v ON dv.idVenta = v.idVenta
        WHERE v.idTienda = ${idTienda}
        AND v.estado = 'completada'
        AND p.activo = 1
        GROUP BY p.idProducto, p.nombre, p.precio
        ORDER BY cantidadVendida DESC
        LIMIT ${limite}
      `;

      const result = [];
      for (const item of topProductos) {
        const producto = await prisma.producto.findUnique({
          where: { idProducto: item.idProducto },
          include: {
            clasificacion: true,
            proveedor: true,
            tienda: true
          }
        });

        if (producto) {
          result.push({
            producto,
            cantidadVendida: Number(item.cantidadVendida),
            totalVentas: Number(item.totalVentas)
          });
        }
      }

      return result;
    }
  }
};