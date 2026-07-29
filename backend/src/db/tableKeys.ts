// Single-table key helpers — PK / SK builders for each entity type

export const userPK = (userId: string) => `USER#${userId}`;
export const userSK = () => 'PROFILE';

export const slotPK = (date: string) => `SLOT#${date}`;
/** SK format: TIME#HH:MM#<slotId> — lets us query all slots for a date with begins_with('TIME#') */
export const slotSK = (time: string, slotId: string) => `TIME#${time}#${slotId}`;

export const bookingPK = (userId: string) => `USER#${userId}`;
export const bookingSK = (bookingId: string) => `BOOKING#${bookingId}`;

export const authSessionPK = (sessionId: string) => `AUTH_SESSION#${sessionId}`;
export const authSessionSK = () => 'REFRESH';

export const rateLimitPK = (key: string) => `RATE#${key}`;
export const rateLimitSK = () => 'WINDOW';

export const mediaPK = () => 'MEDIA';
export const mediaSK = (source: string, timestamp: string, id: string) =>
  `ITEM#${source}#${timestamp}#${id}`;

export const auditPK = () => 'AUDIT';
export const auditSK = (timestamp: string, id: string) => `EVENT#${timestamp}#${id}`;
