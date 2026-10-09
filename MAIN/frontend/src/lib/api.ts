const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { GenerateRequest, GenerateResponse, ValidationErrorItem, ValidationResponse } from '@/types/graph';

export class ValidationError extends Error {
  errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[]) {
    const errorMessages = errors
      .filter((e) => e.severity === 'error')
      .map((e) => e.message);
    super(errorMessages.join('\n'));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export async function generateCode(request: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (res.status === 422) {
    const body = await res.json();
    if (body.detail && Array.isArray(body.detail.errors)) {
      throw new ValidationError(body.detail.errors);
    }
    throw new Error(`Request validation failed: ${JSON.stringify(body.detail)}`);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function validateWorkflow(request: GenerateRequest): Promise<ValidationResponse> {
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Validation API error: ${res.status}`);
  }

  return res.json();
}
