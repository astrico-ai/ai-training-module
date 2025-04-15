import Image from "next/image";
import Link from "next/link";

interface LogoLinkProps {
  className?: string;
}

export const LogoLink = ({ className }: LogoLinkProps) => {
  return (
    <Link href="/">
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-white/90 text-lg font-medium">Voice Agent</span>
      </div>
    </Link>
  );
};
