import { z } from 'zod';
export const operationsSchema = z
  .object({
    signupOpen: z.boolean(),
    registrationsOpen: z.boolean(),
    gameOpen: z.boolean(),
    leaderboardVisible: z.boolean(),
    closedMessage: z.string().trim().min(5).max(240),
    membershipCapacity: z.number().int().min(1).max(100000),
    adminSessionHours: z.number().int().min(1).max(12),
    memberSessionDays: z.number().int().min(1).max(30),
    uploadMaxMB: z.number().int().min(1).max(8),
  })
  .strict();
export type Operations = z.infer<typeof operationsSchema>;
export const defaultOperations: Operations = {
  signupOpen: true,
  registrationsOpen: true,
  gameOpen: true,
  leaderboardVisible: true,
  closedMessage: 'Şu anda yeni kayıt almıyoruz. Daha sonra tekrar uğrayabilirsin.',
  membershipCapacity: 10000,
  adminSessionHours: 8,
  memberSessionDays: 14,
  uploadMaxMB: 8,
};
