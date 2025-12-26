
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  category: string;
  rating: number;
  reviewCount: number;
  source: string;
  leadStatus: 'Hot' | 'Warm' | 'Cold' | 'New';
  rawInput?: string;
}

export interface ExtractionStats {
  totalExtracted: number;
  cleanedCount: number;
  duplicateCount: number;
  hotLeads: number;
}

export enum AppStep {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  CLEANING = 'CLEANING',
  READY = 'READY'
}

export enum ActiveView {
  DASHBOARD = 'DASHBOARD',
  LEAD_LIST = 'LEAD_LIST',
  MAPS_SEARCH = 'MAPS_SEARCH',
  ANALYTICS = 'ANALYTICS'
}

export const BUSINESS_SECTORS = [
  "All Sectors",
  "Real Estate",
  "Healthcare & Clinics",
  "Gyms & Fitness",
  "Restaurants & Cafes",
  "IT & Software",
  "Retail Stores",
  "Education & Coaching",
  "Legal Services",
  "Manufacturing"
];
