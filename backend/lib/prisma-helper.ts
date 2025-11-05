/**
 * Helper utilities for Prisma queries with retry logic
 * to handle connection pooling issues (prepared statement conflicts)
 */

export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delay = 100
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn()
    } catch (error: any) {
      const isPreparedStatementError = 
        error.message?.includes('prepared statement') || 
        error.code === '42P05' ||
        error.message?.includes('does not exist')
      
      if (isPreparedStatementError && attempt < maxRetries - 1) {
        console.warn(`Prepared statement conflict (attempt ${attempt + 1}/${maxRetries}), retrying...`)
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}


