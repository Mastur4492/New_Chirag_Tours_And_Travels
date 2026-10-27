export type DestinationRegion =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'CENTRAL'
  | 'NORTH_EAST'
  | 'ISLANDS'
  | 'INTERNATIONAL';

export interface DestinationDto {
  id: string;
  name: string;
  slug: string;
  country: string;
  state?: string;
  region: DestinationRegion;
  description?: string;
  coverImages: string[];
  highlights: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDestinationInput {
  name: string;
  slug?: string;
  country?: string;
  state?: string;
  region: DestinationRegion;
  description?: string;
  coverImages?: string[];
  highlights?: string[];
  isActive?: boolean;
}

export interface UpdateDestinationInput {
  name?: string;
  slug?: string;
  country?: string;
  state?: string;
  region?: DestinationRegion;
  description?: string;
  coverImages?: string[];
  highlights?: string[];
  isActive?: boolean;
}
