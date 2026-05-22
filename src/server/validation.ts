import { ZodError, type ZodType } from "zod";
import { AppError } from "@/server/errors";

export function parseServerSchema<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(error.issues[0]?.message ?? "Заполните обязательные поля.", 400);
    }
    throw error;
  }
}
