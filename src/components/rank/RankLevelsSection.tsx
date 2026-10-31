"use client";
import RankLevelsList from "./RankLevelsList";
import Link from "next/link";

interface Props {
  xp: number;
  image?: string | null;
  name?: string;
}

/** Profil sahifasi pastidagi "Darajalar" bo'limi: Trophy timeline + bizning ramkali ro'yxat */
export default function RankLevelsSection({ xp, image, name }: Props) {
  return (
    <div className="space-y-6">

      <Link href="/ranks" className="block">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 flex gap-2">Darajalar <RankingIcon /></h2>
      </Link>
      <RankLevelsList xp={xp} image={image} name={name} />
    </div>
  );
}



interface RankingIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  background?: string;
  opacity?: number;
  rotation?: number;
  shadow?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
}

const RankingIcon = ({
  size = 24,
  color = "#000000",
  strokeWidth = 2,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
}: RankingIconProps) => {
  const transforms = [
    rotation !== 0 ? `rotate(${rotation}deg)` : "",
    flipHorizontal ? "scaleX(-1)" : "",
    flipVertical ? "scaleY(-1)" : "",
  ].filter(Boolean);

  const viewBoxSize = 24 + padding * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-padding} ${-padding} ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transform: transforms.join(" ") || undefined,
        filter:
          shadow > 0
            ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
            : undefined,
        backgroundColor:
          background !== "transparent" ? background : undefined,
      }}
      aria-hidden="true"
    >
      <path d="M3.5 18c0-1.414 0-2.121.44-2.56C4.378 15 5.085 15 6.5 15H7c.943 0 1.414 0 1.707.293S9 16.057 9 17v5H3.5z" />
      <path d="M15 19c0-.943 0-1.414.293-1.707S16.057 17 17 17h.5c1.414 0 2.121 0 2.56.44.44.439.44 1.146.44 2.56v2H15z" />
      <path d="M2 22h20M9 16c0-1.414 0-2.121.44-2.56C9.878 13 10.585 13 12 13s2.121 0 2.56.44c.44.439.44 1.146.44 2.56v6H9z" />
      <path d="m12.691 2.578.704 1.42a.87.87 0 0 0 .568.423l1.276.213c.816.137 1.008.734.42 1.323l-.992 1a.88.88 0 0 0-.208.73l.284 1.238c.224.98-.292 1.359-1.152.847l-1.196-.714a.86.86 0 0 0-.792 0l-1.196.714c-.856.512-1.376.129-1.152-.847l.284-1.238a.88.88 0 0 0-.208-.73l-.991-1c-.584-.589-.396-1.186.42-1.323l1.275-.213a.87.87 0 0 0 .564-.424l.704-1.42c.384-.77 1.008-.77 1.388 0" />
    </svg>
  );
};

