import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(6,'Password must be atleast 6 characters long.')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6,'Password must be atleast 6 characters long.')
});

export const googleUserSchema = z.object({
  firstName: z.string().min(3, {message: "First name must be atleast 6 characters long"}),
  lastName: z.string().optional(),
  email: z.string().email({ message: "Invalid email format" })
});
