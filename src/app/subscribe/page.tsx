"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  getSubscriptionPlans,
  getMySubscription,
  getSubscriptionHistory,
} from "@/lib/subscriptions/api";
import { SubscriptionPlan } from "@/lib/subscriptions/types";
import { TelegramModal } from "@/components/subscriptions/TelegramModal";
import {
  Check,
  Zap,
  ShieldCheck,
  History,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { SubscriptionFAQ } from "@/components/subscriptions/SubscriptionFAQ";

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // SWR orqali API so'rovlari
  const { data: plans, isLoading: plansLoading } = useSWR(
    "/api/subscriptions/plans/",
    getSubscriptionPlans
  );

  const { data: mySub } = useSWR(
    "/api/subscriptions/me/",
    getMySubscription
  );

  const { data: history } = useSWR(
    "/api/subscriptions/me/history/",
    getSubscriptionHistory
  );

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  // Narxni so'mda formatlash
  const formatPrice = (priceStr: string) => {
    const amount = Number(priceStr);
    return new Intl.NumberFormat("uz-UZ").format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Premium Imkoniyatlar
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Bilimingizni oshirish uchun mos rejani tanlang
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Barcha masalalar va yechimlarga to'liq kirish huquqini qo'lga kiriting.
          </p>
        </div>

        {/* Joriy obuna holati (Active Subscription Banner) */}
        {mySub?.is_premium && mySub.subscription && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Sizda faol Premium obuna mavjud!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tarif: <span className="font-semibold">{mySub.subscription.plan.name}</span> | Tugash muddati:{" "}
                  <span className="font-semibold">
                    {new Date(mySub.subscription.expires_at).toLocaleDateString("uz-UZ")}
                  </span>
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-full border border-emerald-500/30">
              Faol
            </span>
          </div>
        )}

        {/* Tariflar (Plans List) */}
        {plansLoading ? (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {plans?.map((plan) => {
              const isPopular = plan.duration_days >= 180; // Misol uchun uzoq muddatli tariflarni ajratish
              const isCurrentPlan = mySub?.subscription?.plan.id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-lg transition-all border ${
                    isPopular
                      ? "border-amber-500/50 shadow-amber-500/10 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      Eng ommabop
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {plan.duration_days} kunlik to'liq kirish
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="my-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          UZS
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Bir martalik to'lov
                      </p>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-3 my-6 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Barcha eksklyuziv masalalarga kirish</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Mukammal video va matnli yechimlar</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Tezkor avtomatik test tizimi (Lightning Judge)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Kompaniya intervyu savollari to'plami</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                        : isPopular
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md"
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {isCurrentPlan ? "Joriy tarifingiz" : "Sotib olish"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Obunalar Tarixi (Subscription History) */}
        {history && history.length > 0 && (
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Obuna tarixi
              </h2>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 font-medium">Tarif</th>
                    <th className="p-4 font-medium">Boshlangan vaqti</th>
                    <th className="p-4 font-medium">Tugash vaqti</th>
                    <th className="p-4 font-medium">Narxi</th>
                    <th className="p-4 font-medium">Holati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {item.plan.name}
                      </td>
                      <td className="p-4">
                        {new Date(item.started_at).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="p-4">
                        {new Date(item.expires_at).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="p-4 font-medium">
                        {formatPrice(item.plan.price)} UZS
                      </td>
                      <td className="p-4">
                        {item.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Faol
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Tugagan
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Telegram Modal */}
        <TelegramModal
          plan={selectedPlan}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          adminUsername="@cfm_admin" // Bu yerga telegram adminining foydalanuvchi nomini yozing
        />

        <SubscriptionFAQ />
      </div>
    </div>
  );
}