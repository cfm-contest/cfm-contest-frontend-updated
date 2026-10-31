"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: "q1",
    question: "Premium obuna orqali nimaga ega bo'laman?",
    answer:
      "Premium obuna yordamida siz platformadagi barcha yopiq va eksklyuziv masalalar, ularning mukammal video va matnli yechimlari, kompaniyalar kesimidagi intervyu savollari hamda tezkor test qilish (Lightning Judge) imkoniyatiga ega bo'lasiz.",
  },
  {
    id: "q2",
    question: "To'lovni amalga oshirgandan so'ng obuna qachon faollashadi?",
    answer:
      "Telegram admini orqali to'lov tasdiqlangach, obunangiz 5-10 daqiqa ichida tizimda avtomatik ravishda faollashtiriladi. Obuna holatini ushbu sahifadagi 'Joriy obuna' bo'limida va obunalar tarixida ko'rishingiz mumkin.",
  },
  {
    id: "q3",
    question: "To'lovni qanday usullarda amalga oshirish mumkin?",
    answer:
      "Hozirda to'lovlarni Uzcard, Humo karta o'tkazmalari orqali Telegram admini bilan bog'langan holda amalga oshirishingiz mumkin. 'Sotib olish' tugmasini bossangiz, tayyor ma'lumotlar bilan adminga yo'naltirilasiz.",
  },
  {
    id: "q4",
    question: "Obunani uzaytirish yoki boshqa tarifga o'tish qanday bo'ladi?",
    answer:
      "Mavjud obunangiz muddatiga yangi sotib olingan tarif kunlari qo'shib beriladi yoki yangi tarif muddati tugagach eski tarif faollashadi. Istalgan vaqtda admin orqali obunani uzaytirishingiz mumkin.",
  },
];

export function SubscriptionFAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-16 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Chap yoki o'ng tomondagi Sarlavha (LeetCode layouti) */}
        <div className="lg:col-span-4 lg:sticky lg:top-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Ko'p beriladigan savollar
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Obuna va to'lov jarayoni haqida ma'lumot topolmadingizmi?
          </p>
        </div>

        {/* Savollar ro'yxati (Accordion) */}
        <div className="lg:col-span-8 divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
          {faqData.map((item) => {
            const isOpen = openId === item.id;

            return (
              <div key={item.id} className="py-5 transition-colors">
                <button
                  onClick={() => toggleFAQ(item.id)}
                  className="w-full flex items-center justify-between text-left gap-4 group focus:outline-none"
                >
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.question}
                  </span>
                  <span className="shrink-0 p-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    {isOpen ? (
                      <Minus className="w-5 h-5 transition-transform duration-200" />
                    ) : (
                      <Plus className="w-5 h-5 transition-transform duration-200" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-6 animate-fadeIn">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}