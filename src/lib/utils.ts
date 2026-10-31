import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { backendRequest } from "@/lib/api/django/backend"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// src/lib/utils.ts

// Mavjud cn funksiyasi tagidan qo'shing:

export const fetcher = async (url: string) => {
  const res = await backendRequest(url);
  
  if (!res.ok) {
    let errorDetail = "Ma'lumot yuklashda xatolik yuz berdi";
    
    try {
      const errorData = await res.json();
      // Django odatda xatolikni 'detail' yoki 'error' kalitida qaytaradi
      errorDetail = errorData.detail || errorData.error || errorDetail;
    } catch {
      // Agar backend umuman JSON qaytarmasa (masalan, 502 Bad Gateway HTML sahifasi bo'lsa)
      errorDetail = `Server xatoligi: ${res.status}`;
    }

    // Production'da loglarni chalkashtirmaslik uchun xatolik obyektini chiroyli otamiz
    const error = new Error(errorDetail);
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
};
