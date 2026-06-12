export interface SectorStats {
  sectorName: string;
  capacity: number;
  sold: number;
  available: number;
  revenue: number;
}

export interface EventStats {
  eventId: string;
  eventName: string;
  date: string;
  totalCapacity: number;
  totalSold: number;
  revenue: number;
  sectors: SectorStats[];
}

export interface OrganizerDashboard {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  events: EventStats[];
}

export interface TicketValidationResult {
  valid: boolean;
  reason: string;
  eventName: string | null;
  sectorName: string | null;
  holderName: string | null;
  quantity: number | null;
  checkedInAt: string | null;
}
