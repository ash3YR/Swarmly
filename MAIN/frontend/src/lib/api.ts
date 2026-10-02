const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { GenerateRequest, GenerateResponse } from '@/types/graph';

export async function generateCode(request: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
