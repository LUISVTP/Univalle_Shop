export type ErrorCode = 'invalid' | 'missing' | 'conflict' | 'upstream';
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
    throw new DomainError('invalid', 'Identificador inválido');
}
