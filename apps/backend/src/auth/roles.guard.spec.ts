import { RolesGuard } from './roles.guard';
import { Role } from '@manga/shared';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

const ctx = (role?: Role): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

describe('RolesGuard', () => {
  const make = (required?: Role[]) => {
    const reflector = {
      getAllAndOverride: () => required,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };
  it('allows when no roles required', () => {
    expect(make(undefined).canActivate(ctx(Role.MANGAKA))).toBe(true);
  });
  it('allows when user role is in the required set', () => {
    expect(make([Role.ADMIN]).canActivate(ctx(Role.ADMIN))).toBe(true);
  });
  it('denies when user role is not allowed', () => {
    expect(make([Role.ADMIN]).canActivate(ctx(Role.MANGAKA))).toBe(false);
  });
  it('denies when there is no user', () => {
    expect(make([Role.ADMIN]).canActivate(ctx(undefined))).toBe(false);
  });
});
