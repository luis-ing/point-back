import { PrismaClient } from '@prisma/client';
import { AuthUtils, requireCuentaPrincipal, requireUsuario, Context } from '../../utils/auth';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

export const authResolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      const idCuentaPrincipal = requireCuentaPrincipal(context);
      
      const cuenta = await prisma.cuentaPrincipal.findUnique({
        where: { idCuentaPrincipal },
        include: {
          suscripciones: {
            include: { plan: true },
            orderBy: { fechaCreacion: 'desc' }
          },
          tiendas: {
            where: { activo: true }
          }
        }
      });

      if (!cuenta) {
        throw new GraphQLError('Cuenta no encontrada');
      }

      return cuenta;
    },

    meUsuario: async (_: any, __: any, context: Context) => {
      const { userId } = requireUsuario(context);
      
      const usuario = await prisma.usuario.findUnique({
        where: { idUsuario: userId },
        include: {
          tienda: true,
          rol: {
            include: {
              permisos: {
                include: { permiso: true }
              }
            }
          }
        }
      });

      if (!usuario) {
        throw new GraphQLError('Usuario no encontrado');
      }

      return usuario;
    }
  },

  Mutation: {
    registrarCuenta: async (_: any, { input }: any) => {
      const { email, contrasena, pNombre, sNombre, apellidoP, apellidoM, telefono, idPlan } = input;

      // Verificar si el email ya existe
      const existente = await prisma.cuentaPrincipal.findUnique({
        where: { email }
      });

      if (existente) {
        throw new GraphQLError('El email ya está registrado');
      }

      // Verificar que el plan existe
      const plan = await prisma.planSuscripcion.findUnique({
        where: { idPlan }
      });

      if (!plan) {
        throw new GraphQLError('Plan de suscripción no válido');
      }

      // Hash de la contraseña
      const hashedPassword = await AuthUtils.hashPassword(contrasena);

      // Crear cuenta principal
      const cuenta = await prisma.cuentaPrincipal.create({
        data: {
          email,
          contrasena: hashedPassword,
          pNombre,
          sNombre,
          apellidoP,
          apellidoM,
          telefono
        }
      });

      // Crear suscripción
      const fechaInicio = new Date();
      const fechaProximoPago = new Date();
      fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);

      const suscripcion = await prisma.suscripcion.create({
        data: {
          idCuentaPrincipal: cuenta.idCuentaPrincipal,
          idPlan: plan.idPlan,
          fechaInicio,
          fechaProximoPago,
          estado: 'activa',
          cantidadSucursales: 1,
          montoTotal: plan.precioMensual
        },
        include: { plan: true }
      });

      // Crear primera tienda
      const tienda = await prisma.tienda.create({
        data: {
          idCuentaPrincipal: cuenta.idCuentaPrincipal,
          nombre: 'Mi Tienda Principal',
          activo: true
        }
      });

      // Generar token JWT
      const token = AuthUtils.generateToken({
        idCuentaPrincipal: cuenta.idCuentaPrincipal,
        tipo: 'cuenta'
      });

      return {
        token,
        usuario: cuenta,
        tienda
      };
    },

    login: async (_: any, { input }: any) => {
      const { email, contrasena } = input;

      const cuenta = await prisma.cuentaPrincipal.findUnique({
        where: { email },
        include: {
          suscripciones: {
            where: { activo: true, estado: 'activa' },
            include: { plan: true },
            orderBy: { fechaCreacion: 'desc' },
            take: 1
          },
          tiendas: {
            where: { activo: true },
            take: 1
          }
        }
      });

      if (!cuenta) {
        throw new GraphQLError('Credenciales inválidas');
      }

      if (!cuenta.activo) {
        throw new GraphQLError('Cuenta inactiva');
      }

      const validPassword = await AuthUtils.comparePassword(contrasena, cuenta.contrasena);
      
      if (!validPassword) {
        throw new GraphQLError('Credenciales inválidas');
      }

      // Verificar suscripción activa
      if (cuenta.suscripciones.length === 0) {
        throw new GraphQLError('No tienes una suscripción activa');
      }

      const token = AuthUtils.generateToken({
        idCuentaPrincipal: cuenta.idCuentaPrincipal,
        tipo: 'cuenta'
      });

      return {
        token,
        usuario: cuenta,
        tienda: cuenta.tiendas[0] || null
      };
    },

    loginUsuario: async (_: any, { email, contrasena, idTienda }: any) => {
      const usuario = await prisma.usuario.findFirst({
        where: {
          email,
          idTienda,
          activo: true
        },
        include: {
          tienda: true,
          rol: {
            include: {
              permisos: {
                include: { permiso: true }
              }
            }
          }
        }
      });

      if (!usuario) {
        throw new GraphQLError('Credenciales inválidas');
      }

      if (!usuario.tienda.activo) {
        throw new GraphQLError('Tienda inactiva');
      }

      const validPassword = await AuthUtils.comparePassword(contrasena, usuario.contrasena);
      
      if (!validPassword) {
        throw new GraphQLError('Credenciales inválidas');
      }

      const token = AuthUtils.generateToken({
        idUsuario: usuario.idUsuario,
        idTienda: usuario.idTienda,
        tipo: 'usuario'
      });

      return {
        token,
        usuario
      };
    }
  },

  CuentaPrincipal: {
    nombreCompleto: (parent: any) => {
      const partes = [parent.pNombre, parent.sNombre, parent.apellidoP, parent.apellidoM]
        .filter(Boolean);
      return partes.join(' ');
    },

    suscripcionActiva: async (parent: any) => {
      const suscripcion = await prisma.suscripcion.findFirst({
        where: {
          idCuentaPrincipal: parent.idCuentaPrincipal,
          activo: true,
          estado: 'activa'
        },
        include: { plan: true },
        orderBy: { fechaCreacion: 'desc' }
      });

      return suscripcion;
    }
  }
};