import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HTTPValidationError } from "@/app/openapi-client/types.gen";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: HTTPValidationError | any): string {
  let errorMessage = "An unknown error occurred";

  if (typeof error.detail === "string") {
    // If detail is a string, use it directly
    errorMessage = error.detail;
  } else if (typeof error.detail === "object" && error.detail) {
    if ("reason" in error.detail) {
      // If detail is an object with a 'reason' key, use that
      errorMessage = error.detail["reason"];
    } else if (Array.isArray(error.detail)) {
      // If it's a validation error
      errorMessage = error.detail[0]?.msg || errorMessage;
    }
  }

  return errorMessage;
}