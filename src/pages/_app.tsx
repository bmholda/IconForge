
import { Header } from "~/Component/Header";
import { api } from "~/utils/api";
import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { AppType } from "next/app";
import { Session } from "next-auth";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Header />
      <Component {...pageProps} />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
