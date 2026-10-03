import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiResult(
  model: Type<unknown>,
  collection = false,
  status = 200,
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: collection
          ? ['success', 'data', 'meta']
          : ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: collection
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
          ...(collection
            ? {
                meta: {
                  type: 'object',
                  required: ['total', 'page', 'limit', 'totalPages'],
                  properties: {
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              }
            : {}),
        },
      },
    }),
  );
}
