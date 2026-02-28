import { z } from "zod";

export const SignupSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+91[0-9]{10}$/).optional(),
    password: z.string().min(6),
    name: z.string().min(2),
  })
  .refine((d) => d.email || d.phone, {
    message: "Email or phone required",
  });

export const LoginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

export const OTPVerifySchema = z.object({
  phone: z.string().regex(/^\+91[0-9]{10}$/),
  code: z.string().length(6),
});

export const OTPSendSchema = z.object({
  phone: z.string().regex(/^\+91[0-9]{10}$/),
});
