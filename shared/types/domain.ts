import { z } from 'zod';

export const DomainIdSchema = z.string().uuid();
export const DomainUserIdSchema = z.string().uuid();
export const DomainTimestampSchema = z.string().min(1).max(100);
export const JsonObjectSchema = z.record(z.unknown());

export type DomainId = z.infer<typeof DomainIdSchema>;
export type JsonObject = z.infer<typeof JsonObjectSchema>;
