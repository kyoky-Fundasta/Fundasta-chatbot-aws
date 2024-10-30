'use client';

import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useRef, useState } from 'react';

interface ChatComponentProps {
  signOut: () => Promise<void>;
}

interface Message {
  role: string;
  content: string;
}

function ChatComponent({ signOut }: ChatComponentProps) {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect WebSocket
  const connectWebSocket = async () => {
    try {
      // Get current session to retrieve the ID token
      // const session = await getCurrentUser() as any;
      // const idToken = session.getIdToken().getJwtToken();
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) {
        throw new Error('No ID token available');
      }

      socketRef.current = new WebSocket(
        `wss://hdo2jjkkf0.execute-api.ap-northeast-1.amazonaws.com/dev?token=${idToken}`
      );

      socketRef.current.onopen = () => {
        console.log('WebSocket connection established');
      };

      socketRef.current.onmessage = (event: MessageEvent) => {
        if (!event.data || event.data.trim() === '') {
          console.log('Received empty message, ignoring');
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.chunk === "[DONE]") {
            setIsTyping(false);
          } else if (data.error) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
            setIsTyping(false);
          } else if (data.chunk) {
            setMessages(prev => [
              ...prev,
              { role: "assistant", content: data.chunk }
            ]);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw message:', event.data);
          setMessages(prev => [...prev, { role: "assistant", content: "Error: Failed to parse message from server." }]);
        }
      };

      socketRef.current.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsTyping(true);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ input }));
    } else {
      console.error('WebSocket is not connected');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm not connected at the moment.",
        },
      ]);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">FundastA AI Chat</h2>
          <button
            onClick={() => {
              signOut();
              socketRef.current?.close();
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="flex-grow overflow-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {message.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-gray-200 p-3 rounded-lg">
              <span className="inline-block animate-pulse">▉</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 transition-colors">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatComponent;
