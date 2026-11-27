import { RouteCorridor, ServiceCentre, Station } from '../domain/types';

export interface LiveWeather {
  temperatureC: number;
  windSpeedKmh: number;
  humidityPercent: number;
  weatherCode: number;
  fetchedAt: string;
  source: string;
}

export interface AssistantStructuredQuery {
  intent:
    | 'find_charger'
    | 'range_check'
    | 'trip_plan'
    | 'service_or_faq'
    | 'unknown';
  maxPriceInr?: number;
  minPowerKw?: number;
  targetLocation?: string;
  sourceLocation?: string;
  socPercent?: number;
  preset?: 'balanced' | 'fastest' | 'cheapest' | 'most_reliable';
  keywords: string[];
}

export interface AssistantCitation {
  id: string;
  title: string;
  detail: string;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const liveApi = {
  async fetchLiveStations(forceRefresh = false): Promise<{
    stations: Station[];
    fetchedAt: string;
  }> {
    const res = await fetch(
      `/api/stations/live${forceRefresh ? '?refresh=1' : ''}`
    );
    return parseJsonOrThrow(res);
  },

  async fetchLiveServiceCentres(forceRefresh = false): Promise<{
    centres: ServiceCentre[];
    fetchedAt: string;
  }> {
    const res = await fetch(
      `/api/service-centres/live${forceRefresh ? '?refresh=1' : ''}`
    );
    return parseJsonOrThrow(res);
  },

  async fetchRoute(
    source: string,
    destination: string
  ): Promise<{ corridor: RouteCorridor }> {
    const res = await fetch('/api/routing/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination }),
    });
    return parseJsonOrThrow(res);
  },

  async fetchWeather(lat = 12.72, lng = 77.28): Promise<LiveWeather> {
    const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
    return parseJsonOrThrow(res);
  },

  async parseAssistantQuery(
    message: string,
    defaultSocPercent?: number
  ): Promise<{ structuredQuery: AssistantStructuredQuery }> {
    const res = await fetch('/api/assistant/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, defaultSocPercent }),
    });
    return parseJsonOrThrow(res);
  },

  async explainAssistantResult(payload: {
    message: string;
    structuredQuery: AssistantStructuredQuery;
    engineSummary: string;
    citations: AssistantCitation[];
  }): Promise<{ reply: string }> {
    const res = await fetch('/api/assistant/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res);
  },
};
