import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a golf course name for use as a folder name
 * Removes spaces, special characters, and converts to lowercase
 * @param name - The golf course name to sanitize
 * @returns Sanitized folder name safe for R2/filesystem use
 */
export function sanitizeGolfCourseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
    .replace(/-+/g, '-');         // Replace multiple hyphens with single
}