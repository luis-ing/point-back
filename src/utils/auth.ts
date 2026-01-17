import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  idCuentaPrincipal?: number;
  idUsuario?: number;
  idTienda?: number;
  tipo: 'cuenta' | 'usuario';
}

export interface Context {
  userId?: number;
  tiendaId?: number;
  tipo?: 'cuenta' | 'usuario';
  cuentaPrincipalId?: number;
}

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: JWTPayload): string {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static extractToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }

  static async getContext(authHeader?: string): Promise<Context> {
    const token = this.extractToken(authHeader);
    if (!token) return {};

    const payload = this.verifyToken(token);
    if (!payload) return {};

    if (payload.tipo === 'cuenta') {
      return {
        cuentaPrincipalId: payload.idCuentaPrincipal,
        tipo: 'cuenta'
      };
    } else {
      return {
        userId: payload.idUsuario,
        tiendaId: payload.idTienda,
        tipo: 'usuario'
      };
    }
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'No tienes permisos para realizar esta acción') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function requireAuth(context: Context): void {
  if (!context.userId && !context.cuentaPrincipalId) {
    throw new AuthError('No autenticado');
  }
}

export function requireCuentaPrincipal(context: Context): number {
  if (!context.cuentaPrincipalId) {
    throw new AuthError('Debes iniciar sesión como cuenta principal');
  }
  return context.cuentaPrincipalId;
}

export function requireUsuario(context: Context): { userId: number; tiendaId: number } {
  if (!context.userId || !context.tiendaId) {
    throw new AuthError('Debes iniciar sesión como usuario de tienda');
  }
  return { userId: context.userId, tiendaId: context.tiendaId };
}