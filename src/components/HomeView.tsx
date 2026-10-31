"use client";

import Image from "next/image";
import Link from "next/link";
import { TeamSection } from "@/components/TeamSection";
import { OpportunitiesSection } from "@/components/OpportunitiesSection";
import { Footer } from "@/components/Footer";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { CourseHero, HomeStats, Teacher } from "@/lib/types/home";

type Props = {
  courses: CourseHero[];
  teachers: Teacher[];
  stats: HomeStats;
};

export function HomeView({ courses, teachers, stats }: Props) {
  return (
    <>
      <main className="flex-1 w-full bg-slate-50/50 dark:bg-neutral-950 min-h-screen">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {courses.length > 0 && (
            <div className="relative">
              <Swiper
                modules={[Pagination, Autoplay, EffectFade]}
                spaceBetween={0}
                slidesPerView={1}
                loop={courses.length > 1}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                speed={800}
                autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                pagination={{ clickable: true, dynamicBullets: true }}
                className="hero-swiper"
              >
                {courses.map((course) => (
                  <SwiperSlide key={course.id}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[450px] py-8">
                      <div className="lg:col-span-6 flex flex-col justify-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight leading-[1.15]">
                          <span className="text-blue-600 block mb-2">{course.title}</span>
                          <span className="block text-neutral-800 dark:text-neutral-200">
                            {course.teacher.full_name} bilan
                          </span>
                        </h1>

                        <div className="mt-10">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex items-center justify-center bg-[#0d1527] text-white px-8 py-4 rounded-xl font-semibold text-sm hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-sm hover:shadow-lg"
                          >
                            Sinab ko'rish
                            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      <div className="lg:col-span-6 flex justify-center lg:justify-end w-full">
                        <div className="relative w-full max-w-[540px] aspect-[1.25/1] bg-[#090b0f] rounded-[32px] overflow-hidden shadow-xl border border-neutral-800/40">
                          {course.image ? (
                            <Image
                              src={course.image}
                              alt={course.title}
                              fill
                              priority
                              sizes="(max-width: 768px) 100vw, 540px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">
                              Rasm mavjud emas
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </div>

        <section className="mt-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl md:text-5xl font-extrabold text-neutral-900">{stats.s.toLocaleString()}+</div>
              <div className="text-sm text-neutral-500 mt-2">Talabalar</div>
            </div>
            <div>
              <div className="text-3xl md:text-5xl font-extrabold text-neutral-900">{stats.l.toLocaleString()}+</div>
              <div className="text-sm text-neutral-500 mt-2">Darslar</div>
            </div>
            <div>
              <div className="text-3xl md:text-5xl font-extrabold text-neutral-900">{stats.p.toLocaleString()}+</div>
              <div className="text-sm text-neutral-500 mt-2">Masalalar</div>
            </div>
          </div>
        </section>

        <OpportunitiesSection />
        <TeamSection teachers={teachers} />
      </main>

      <Footer />

      <style jsx global>{`
        .hero-swiper { overflow: hidden; }
        .hero-swiper .swiper-slide { opacity: 0 !important; transition: opacity 0.8s ease !important; }
        .hero-swiper .swiper-slide-active { opacity: 1 !important; }
        .hero-swiper .swiper-pagination {
          position: relative; margin-top: 2rem; display: flex;
          justify-content: center; gap: 0.5rem; z-index: 10;
        }
        .hero-swiper .swiper-pagination-bullet {
          width: 40px; height: 4px; border-radius: 4px;
          background: #d1d5db; opacity: 1; transition: all 0.5s ease; cursor: pointer;
        }
        .hero-swiper .swiper-pagination-bullet-active { background: #0d1527; width: 60px; }
      `}</style>
    </>
  );
}