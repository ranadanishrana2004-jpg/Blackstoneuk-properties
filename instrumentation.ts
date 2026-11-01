export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { startMailWorker } = await import('./lib/outbox');
    startMailWorker();
    if (process.env.LEGACY_DATABASE_URL) {
      // One-time data copy from a previous database; never blocks or crashes start-up.
      const { importLegacyData } = await import('./lib/legacy-import');
      void importLegacyData().catch((error: Error) =>
        console.error('Legacy import failed:', error.message),
      );
    }
  }
}
