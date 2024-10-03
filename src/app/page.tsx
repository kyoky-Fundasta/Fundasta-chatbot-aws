"use client";

// import { withAuthenticator } from '@aws-amplify/ui-react';
// import { Auth } from 'aws-amplify/auth'; // Updated import
import { useEffect, useRef, useState } from "react";
// import awsconfig from './aws-exports';

// Amplify.configure(awsconfig);

function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        // const session = await Auth.currentSession();
        // const idToken = session.getIdToken().getJwtToken();

        // socketRef.current = new WebSocket(`wss://hdo2jjkkf0.execute-api.ap-northeast-1.amazonaws.com/dev?token=${idToken}`);
        socketRef.current = new WebSocket(`wss://hdo2jjkkf0.execute-api.ap-northeast-1.amazonaws.com/dev`);

        socketRef.current.onopen = () => {
          console.log('WebSocket connection established');
        };

        socketRef.current.onmessage = (event) => {
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
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
                  newMessages[newMessages.length - 1].content += data.chunk;
                } else {
                  newMessages.push({ role: "assistant", content: data.chunk });
                }
                return newMessages;
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, 'Raw message:', event.data);
            setMessages(prev => [...prev, { role: "assistant", content: "Error: Failed to parse message from server." }]);
          }
        };

        socketRef.current.onclose = () => {
          console.log('WebSocket connection closed');
        };
      } 
      catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ input }));
    } else {
      console.error('WebSocket is not connected');
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm not connected at the moment." }]);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-semibold text-center">FundastA AI Assistant</h1>
      </header>
      <main className="flex-grow flex flex-col p-4 max-w-3xl mx-auto w-full">
        <div className="flex-grow overflow-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.role === "user" ? "bg-blue-500 text-white" : "bg-white"
              }`}>
                {message.content}
                {index === messages.length - 1 && message.role === "assistant" && isTyping && (
                  <span className="inline-block animate-pulse">▋</span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button type="submit" className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 transition-colors">
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

// export default withAuthenticator(Home);
export default (Home);