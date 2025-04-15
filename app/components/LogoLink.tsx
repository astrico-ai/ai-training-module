import { type FC } from "react";
import Link from "next/link";

interface Props {
  href: string;
}

const LogoLink: FC<Props> = ({ href }) => {
  return (
    <></>
    // <Link href={href}>
    //   <div className="flex items-center gap-2">
    //     <span className="text-white/90 text-lg font-medium">Voice Agent</span>
    //   </div>
    // </Link>
  );
};

export default LogoLink;
