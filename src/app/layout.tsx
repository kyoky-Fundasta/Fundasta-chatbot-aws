'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import config from '../amplifyconfiguration.json';
import './globals.css';

Amplify.configure(config, { ssr: true });

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const router = useRouter();

  return (
    <html lang="en">
      <body>
        <Authenticator>
          {({ user }) => {
            return (
              <AuthenticatedContent user={user} router={router}>
                {children}
              </AuthenticatedContent>
            );
          }}
        </Authenticator>
      </body>
    </html>
  );
}

function AuthenticatedContent({ user, router, children }: { user: any; router: any; children: ReactNode }) {
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  return user ? <>{children}</> : <div>Loading...</div>;
}