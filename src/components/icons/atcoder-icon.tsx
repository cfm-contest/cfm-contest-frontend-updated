import Image from "next/image";

/** AtCoder icon — oq fonli */
export function AtCoderIcon({ className = "h-6 w-6", ...props }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md bg-white p-1"
    >
      <Image
        src="https://thesvg.org/icons/atcoder/default.svg"
        alt="AtCoder"
        width={24}
        height={24}
        className={className}
        {...props}
      />
    </span>
  );
}
