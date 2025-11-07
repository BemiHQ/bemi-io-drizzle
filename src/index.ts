import { AsyncLocalStorage } from "node:async_hooks";
import { Request, Response, NextFunction } from "express";

declare global {
  var BEMI_ASYNC_LOCAL_STORAGE: AsyncLocalStorage<any>;
}
if (!globalThis.BEMI_ASYNC_LOCAL_STORAGE) {
  globalThis.BEMI_ASYNC_LOCAL_STORAGE = new AsyncLocalStorage();
}

const MAX_CONTEXT_SIZE = 1000000 // ~ 1MB

export const withBemi = <T>(drizzle: T): T => {
  const { session } = drizzle as any;
  const proto = Object.getPrototypeOf(session)

  proto.prepareQuery = new Proxy(proto.prepareQuery, {
    apply(target, thisArg, args) {
      const sql = args[0]?.sql
      const writeOperationsRegex = /(INSERT|UPDATE|DELETE)\s/gi;
      const context = currentBemiContext();

      if (context && sql && writeOperationsRegex.test(sql) && !sql.endsWith('Bemi*/')) {
        const contextComment = `/*Bemi ${JSON.stringify(context)} Bemi*/`
        if (contextComment.length <= MAX_CONTEXT_SIZE) {
          args[0].sql = `${sql} ${contextComment}`;
          if (process.env.BEMI_DEBUG) console.log(`>>[Bemi] ${args[0].sql}`);
        } else {
          console.warn('[Bemi] Context size exceeds maximum limit.');
        }
      }

      return Reflect.apply(target, thisArg, args);
    },
  });

  return drizzle;
}

export const currentBemiContext = () => {
  return globalThis.BEMI_ASYNC_LOCAL_STORAGE.getStore();
}

export const setBemiContext = (context: any) => {
  globalThis.BEMI_ASYNC_LOCAL_STORAGE.enterWith(context);
}

export const mergeBemiContext = (context: any) => {
  const currentContext = currentBemiContext() || {};
  setBemiContext({ ...currentContext, ...context });
}

// Express.js
export const bemiExpressMiddleware = (callback: (req: Request) => any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const context = callback(req);

    globalThis.BEMI_ASYNC_LOCAL_STORAGE.run(context, () => {
      next();
    });
  };
};

// tRPC
export const bemiTRPCMiddleware = (callback: (opts: any) => any) => {
  return (opts: any) => {
    const context = callback(opts);
    return globalThis.BEMI_ASYNC_LOCAL_STORAGE.run(context, () => {
      return opts.next();
    });
  }
}
