import { apiFetch } from './apiClient';
import type { SatoGreetingResponse, SatoCardsResponse, SatoData } from '../../types/sato';
import type { CompanionIntent } from '../../services/t1dCompanionService';

/**
 * Sato API Service
 *
 * Provides API calls to the Sato emotional greeting endpoints
 */

export const satoApi = {
  /**
   * Gets Sato emotional greeting for a user
   */
  async getGreeting(text?: string): Promise<SatoGreetingResponse> {
    return apiFetch<SatoGreetingResponse>({
      endpoint: '/api/t1d/sato/greeting',
      serviceName: 'Sato',
      operation: 'getGreeting',
      method: 'GET',
      headers: text ? { 'X-Sato-Text': text } : undefined,
    });
  },

  /**
   * Gets Sato-enriched cards for a user
   */
  async getCards(intent: CompanionIntent = 'meal', text: string = ''): Promise<SatoCardsResponse> {
    return apiFetch<SatoCardsResponse>({
      endpoint: '/api/t1d/sato/cards',
      serviceName: 'Sato',
      operation: 'getCards',
      method: 'POST',
      body: { action: intent, text },
    });
  },

  /**
   * Gets Sato-augmented atlas memory query results
   */
  async getAtlasMemory(query: string): Promise<SatoData> {
    return apiFetch<SatoData>({
      endpoint: '/api/t1d/sato/atlas/memory',
      serviceName: 'Sato',
      operation: 'getAtlasMemory',
      method: 'GET',
      headers: { 'X-Sato-Query': query },
    });
  },

  /**
   * Gets all raw companion data for nerd stats (power user view)
   */
  async getNerdStatsCards(intent: CompanionIntent = 'meal', text: string = ''): Promise<any> {
    return apiFetch({
      endpoint: '/api/t1d/nerd-stats/cards',
      serviceName: 'NerdStats',
      operation: 'getNerdStatsCards',
      method: 'POST',
      body: { action: intent, text },
    });
  },

  /**
   * Gets chart data for 14-day trends
   */
  async getCharts(metric: string = 'calories'): Promise<any> {
    return apiFetch({
      endpoint: '/api/t1d/nerd-stats/charts',
      serviceName: 'NerdStats',
      operation: 'getCharts',
      method: 'GET',
      headers: { 'X-Sato-Metric': metric },
    });
  },

  /**
   * Gets CGM graph data
   */
  async getGraphs(startDate?: string, endDate?: string): Promise<any> {
    return apiFetch({
      endpoint: '/api/t1d/nerd-stats/graphs',
      serviceName: 'NerdStats',
      operation: 'getGraphs',
      method: 'GET',
      headers: {
        ...(startDate ? { 'X-Sato-Start-Date': startDate } : {}),
        ...(endDate ? { 'X-Sato-End-Date': endDate } : {}),
      },
    });
  },
};

export default satoApi;