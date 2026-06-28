export type ActivityType = 'running' | 'walking' | 'cycling';

export interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

export interface ActivityLog {
  id: string;
  type: ActivityType;
  date: string;
  distance: number;
  duration: number;
  formattedStat: string;
  coordinates?: LocationCoordinate[];
}