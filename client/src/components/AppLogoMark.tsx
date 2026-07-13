import { APP_ICON_SRC, APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

type AppLogoMarkProps = {
  className?: string;
};

export function AppLogoMark({ className }: AppLogoMarkProps) {
  return (
    <img
      src={APP_ICON_SRC}
      alt={APP_NAME}
      className={cn("rounded-xl shadow-sm", className)}
    />
  );
}
