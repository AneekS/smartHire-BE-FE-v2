import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Forbidden", 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 500, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}

/**
 * Wrap a Prisma query with standardized error handling.
 * Converts Prisma-specific errors (P2021, P2022, P2007, etc.) into
 * structured AppError subclasses so callers get meaningful messages
 * instead of raw Prisma stack traces.
 */
export async function safeQuery<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const code = error.code;
      switch (code) {
        case "P2021": // Table does not exist
          console.error(`[DB P2021] Table missing in "${context}":`, error.message);
          throw new DatabaseError(`Database table not found (${context})`);
        case "P2022": // Column does not exist
          console.error(`[DB P2022] Column missing in "${context}":`, error.message);
          throw new DatabaseError(`Database column not found (${context})`);
        case "P2025": // Record not found
          throw new NotFoundError(context);
        case "P2002": // Unique constraint violation
          throw new AppError(`Duplicate entry (${context})`, 409, "DUPLICATE");
        case "P2003": // Foreign key constraint violation
          throw new ValidationError(`Related record not found (${context})`);
        case "P2007": // Invalid enum value
          console.error(`[DB P2007] Invalid data in "${context}":`, error.message);
          throw new ValidationError(`Invalid value provided (${context})`);
        default:
          console.error(`[DB ${code}] Prisma error in "${context}":`, error.message);
          throw new DatabaseError(`Database operation failed (${context})`);
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error(`[DB VALIDATION] in "${context}":`, error.message);
      throw new DatabaseError(`Invalid query in ${context}`);
    }

    console.error(`[DB UNKNOWN] in "${context}":`, error);
    throw new DatabaseError(`Unexpected database error (${context})`);
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  console.error("[UNHANDLED]", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
