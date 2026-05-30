import type { TelemetryClient } from 'applicationinsights';

let client: TelemetryClient | null = null;

export async function getAppInsightsClient(): Promise<TelemetryClient | null> {
  if (typeof window !== 'undefined') return null;
  if (client) return client;
  try {
    const appInsights = await import('applicationinsights');
    const connStr = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (!connStr) return null;
    appInsights.setup(connStr).setAutoCollectRequests(true).start();
    client = appInsights.defaultClient;
    return client;
  } catch {
    return null;
  }
}

export function trackEvent(name: string, properties?: Record<string, string>) {
  getAppInsightsClient().then(c => c?.trackEvent({ name, properties })).catch(() => {});
}

export function trackException(error: Error, properties?: Record<string, string>) {
  getAppInsightsClient().then(c => c?.trackException({ exception: error, properties })).catch(() => {});
}
