export type SeasonType =
  | 'REGULAR'
  | 'PEAK'
  | 'SUPER_PEAK'
  | 'OFF_SEASON'
  | 'FESTIVAL';

export interface SeasonDto {
  id: string;
  name: string;
  seasonType: SeasonType;
  destinationId: string;
  startDate: string;
  endDate: string;
  priority: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSeasonInput {
  name: string;
  seasonType: SeasonType;
  destinationId: string;
  startDate: string;
  endDate: string;
  priority?: number;
  description?: string;
}

export interface UpdateSeasonInput {
  name?: string;
  seasonType?: SeasonType;
  destinationId?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  description?: string;
}
