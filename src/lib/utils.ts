import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 通用样式合并工具函数（基于 clsx 和 tailwind-merge）
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
