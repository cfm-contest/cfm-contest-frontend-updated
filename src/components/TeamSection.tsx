"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Teacher } from "@/lib/types/home";

type Props = { teachers: Teacher[] };

export function TeamSection({ teachers }: Props) {
  if (teachers.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16 text-center overflow-hidden">
      <h2 className="text-black text-3xl md:text-5xl font-bold tracking-tight mb-14">
        Bizning jamoa / O'qituvchilarimiz
      </h2>

      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={24}
        slidesPerView={1}
        loop={teachers.length > 3}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
          1280: { slidesPerView: 4 },
        }}
        className="pb-14 team-swiper"
      >
        {teachers.map((teacher) => (
          <SwiperSlide key={teacher.id}>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-100/80 flex flex-col p-4 text-left h-full">
              <div className="w-full aspect-[4/5] relative rounded-[24px] overflow-hidden bg-neutral-50 mb-4">
                {teacher.profile?.avatar ? (
                  <Image
                    src={teacher.profile.avatar}
                    alt={teacher.full_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 25vw, 100vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300 text-4xl font-bold">
                    {teacher.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-neutral-900 leading-tight">{teacher.full_name}</h3>
              {teacher.profile?.center && (
                <p className="text-xs font-medium text-neutral-500 mt-1.5">{teacher.profile.center.name}</p>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .team-swiper .swiper-pagination-bullet-active {
          background: #000000 !important;
          width: 20px !important;
          border-radius: 4px !important;
        }
      `}</style>
    </section>
  );
}