import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

interface CollectionMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        ...(Array.isArray(data)
          ? {
              meta: this.collectionMeta(data.length),
            }
          : {}),
      })),
    );
  }

  private collectionMeta(total: number): CollectionMeta {
    return {
      total,
      page: 1,
      limit: Math.max(total, 1),
      totalPages: total === 0 ? 0 : 1,
    };
  }
}
