import { z } from 'zod';

export const ConnectorTypeSchema = z.enum(['CCS2', 'Type 2', 'CHAdeMO', 'GB/T']);

export const DriveModeSchema = z.enum(['eco', 'city', 'sport']);

export const UserProfileInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().email('Enter a valid email address'),
  city: z.string().trim().min(2, 'Enter a city name').max(50),
  preferredSafetyBufferPercent: z.number().min(5).max(40),
});

export const RegisterInputSchema = UserProfileInputSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const LoginInputSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  city: z.string().trim().min(2, 'Enter a city name').max(50),
  preferredSafetyBufferPercent: z.number().min(5).max(40),
});

export const VehicleInputSchema = z.object({
  make: z.string().trim().min(2, 'Make is required').max(40),
  model: z.string().trim().min(1, 'Model is required').max(50),
  variant: z.string().trim().min(1, 'Variant is required').max(50),
  year: z.number().int().min(2016).max(2027),
  registrationNumber: z.string().trim().min(4, 'Registration is required').max(20),
  usableKwh: z.number().min(12, 'Usable battery must be at least 12 kWh').max(150),
  efficiencyWhPerKm: z.number().min(90, 'Efficiency must be >= 90 Wh/km').max(350),
  connectors: z.array(ConnectorTypeSchema).min(1, 'Select at least one connector'),
  maxDcChargeKw: z.number().min(3.3).max(350),
  maxAcChargeKw: z.number().min(3.3).max(22),
});

export const CheckInInputSchema = z.object({
  stationId: z.string().min(1),
  outcome: z.enum(['worked', 'not_working']),
  issueType: z.enum([
    'none',
    'charger_offline',
    'connector_damaged',
    'payment_failed',
    'slow_speed',
    'occupied_ice',
  ]),
  comment: z.string().trim().max(240),
});

export const TripPlanInputSchema = z.object({
  source: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  startingSocPercent: z.number().min(0).max(100),
  minArrivalSocPercent: z.number().min(5).max(35).optional(),
  driveMode: DriveModeSchema.optional(),
  acOn: z.boolean().optional(),
});

export const ClaimInputSchema = z.object({
  vehicleId: z.string().min(1),
  policyNumber: z.string().trim().min(4),
  insurerName: z.string().trim().min(2),
  incidentType: z.enum([
    'battery_thermal',
    'charger_surge',
    'collision',
    'roadside_tow',
    'glass_body',
  ]),
  incidentDate: z.string().min(8),
  description: z.string().trim().min(10, 'Provide at least 10 characters').max(600),
  estimatedAmountInr: z.number().min(500).max(5000000),
  documents: z.array(z.string()),
});
