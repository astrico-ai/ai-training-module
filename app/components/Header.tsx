import { type FC, Suspense } from "react";
import LogoLink from "app/components/LogoLink";
import VoiceSelector from "app/components/VoiceSelector/VoiceSelector";

interface Props {
  logoHref: string;
}

const Header: FC<Props> = ({ logoHref }) => {
  return (
    <header className="flex items-center justify-between px-4 py-2">
      <LogoLink href={logoHref} />
      <Suspense>
        <VoiceSelector showLabel collapsible />
      </Suspense>
    </header>
  );
};

export default Header;
