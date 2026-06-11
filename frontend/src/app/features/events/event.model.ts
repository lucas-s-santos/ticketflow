export interface EventResponse {
  id: string;
  name: string;
  description: string | null;
  date: string;
  location: string;
  createdAt: string;
}

export interface EventRequest {
  name: string;
  description?: string;
  date: string;
  location: string;
}
