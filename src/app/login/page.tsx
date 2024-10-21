'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import './LoginPage.css';

// Define the type for the user object
type User = {
  // Add properties that you expect the user object to have
  // For example:
  username?: string;
  // Add other properties as needed
};

// Define the props type for AuthenticatedContent
type AuthenticatedContentProps = {
  user: User | undefined;
  router: ReturnType<typeof useRouter>;
};

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className='login-container'>
      <div className = 'cognito-ui-container'>
        <h1 className='login-title'>Fundasta Chatbot Log-in</h1>
        <Authenticator hideSignUp={false}>
          {({ user }) => (
            <AuthenticatedContent user={user as User} router={router} />
          )}
        </Authenticator>
      </div>
    </div>
  );
}

// Separate component to handle authenticated content
function AuthenticatedContent({ user, router }: AuthenticatedContentProps) {
  useEffect(() => {
    if (user) {
      router.push('/chat');
    }
  }, [user, router]);

  return (
    <main>
      {user ? (
        <div>Redirecting to chat...</div>
      ) : (
        <div>Please log in.</div>
      )}
    </main>
  );
}