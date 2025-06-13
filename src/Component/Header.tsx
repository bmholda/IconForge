import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Button } from "./Button";
import { signOut } from "next-auth/react";

export function Header() {

    const session = useSession();

    const isLoggedIn = !!session.data?.user;

    return( 
        <header className="container mx-auto flex h-16 items-center px-4 justify-between dark: bg-gray-800">
            <Link href="/" className="hover:text-cyan-500">
                Icon Forge
            </Link>
            <ul>
                <li><Link href="/generate" className="hover:text-cyan-500">Generate</Link></li>

            </ul>
            <ul>
                {isLoggedIn &&<li><Button
         onClick={() => {
            signOut().catch(console.error);
        }}
        >
          Logout
        </Button></li>}
                {!isLoggedIn &&<li><Button
         onClick={() => {
            signIn().catch(console.error);
        }}
        >
          Log in
        </Button></li>}
            </ul>

        </header>
    );
}

