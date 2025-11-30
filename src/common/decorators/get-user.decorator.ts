// File: src/common/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Usage: @GetUser('id') or @GetUser() to get entire user object
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return null;
    return typeof data === 'string' && data.length ? user[data] : user;
  },
);
