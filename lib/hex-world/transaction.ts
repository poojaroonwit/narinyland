import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getErrorField } from '@/lib/errors';

export async function runHexTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, retries = 2): Promise<T> {
  try {
    return await prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const code = getErrorField(error, 'code');
    if (retries > 0 && (code === 'P2034' || code === 'P2002')) return runHexTransaction(callback, retries - 1);
    throw error;
  }
}
