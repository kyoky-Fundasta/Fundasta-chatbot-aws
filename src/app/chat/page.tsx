'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import ChatComponent from '../../components/ChatComponent';

export default function ChatPage() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        user ? <ChatComponent signOut={signOut as () => Promise<void>} /> : <div>Loading...</div>
      )}
    </Authenticator>
  );
}
