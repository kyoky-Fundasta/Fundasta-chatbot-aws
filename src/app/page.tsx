"use client";

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { useEffect, useRef, useState } from "react";
import awsconfig from '../aws-exports';

Amplify.configure(awsconfig);

function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const connectWebSocket = async () => {
    try {
      const user = await getCurrentUser();
      const { idToken } = (await fetchAuthSession()).tokens ?? {};

      if (!idToken) {
        throw new Error('No ID token available');
      }

      socketRef.current = new WebSocket(`wss://hdo2jjkkf0.execute-api.ap-northeast-1.amazonaws.com/dev?token=${idToken.toString()}`);

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
          } 
          else if (data.error) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
            setIsTyping(false);
          } 
          else if (data.chunk) {
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
                newMessages[newMessages.length - 1].content += data.chunk;
              } 
              else {
                newMessages.push({ role: "assistant", content: data.chunk });
              }
              return newMessages;
            });
          }
        } 
        catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw message:', event.data);
          setMessages(prev => [...prev, { role: "assistant", content: "Error: Failed to parse message from server." }]);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } 
    catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    }
    return () => {
      socketRef.current?.close();
    };
  }, [isAuthenticated]);

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
      {!isAuthenticated && (
        <header className="bg-white shadow-sm p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-center text-gray-800">Welcome to FundastA AI Assistant</h1>
          </div>
        </header>
      )}
      <main className="flex-grow flex items-center justify-center p-1">
        <div className="w-full h-full flex flex-col">
          <Authenticator hideSignUp={true}>
            {({ signOut, user }) => {
              if (user && !isAuthenticated) {
                setIsAuthenticated(true);
              }
  
              return (
                <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
                  <header className="bg-white shadow-sm p-4 rounded-t-lg">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">FundastA AI Chat</h2>
                      <button 
                        onClick={signOut}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                      >
                        Logout
                      </button>
                    </div>
                  </header>
                  <div className="flex-grow overflow-auto p-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-2`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200"
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
                  <form onSubmit={handleSubmit} className="p-4 border-t">
                    <div className="flex">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your message..."
                      />
                      <button 
                        type="submit" 
                        className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              );
            }}
          </Authenticator>
        </div>
      </main>
    </div>
  );
};

export default Home;