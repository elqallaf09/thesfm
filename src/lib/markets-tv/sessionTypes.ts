export type TvSessionRegion = 'gulf' | 'arab' | 'europe' | 'americas' | 'asia' | 'africa' | 'oceania';
export type TvSession = {
  id:string; region:string; names:readonly [string,string,string]; zone:string;
  hours:string; days:'sundayThursday'|'mondayFriday'|'saturdayWednesday'; source:string; url:string;
  area?:TvSessionRegion;
  scheduleZone?:string;
  weekdayHours?:Record<number,string>;
  monthHours?:Record<number,string>;
  holidays?:readonly string[];
  exceptions?:Record<string,string|null>;
};
