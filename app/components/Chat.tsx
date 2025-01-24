"use client";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image";
}

export default function Chat() {
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const messageEndRef = useRef<HTMLDivElement>(null);

  const autoScroll = () => {
    messageEndRef.current?.scrollIntoView();
  };

  useEffect(autoScroll, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: input,
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const IsmagePrompt =
      input.toLowerCase().includes("generate image") ||
      input.toLowerCase().includes("create image");

    const type = IsmagePrompt ? "image" : "text";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      if (type === "image") {
        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.url,
            type: "image",
          },
        ]);
      } else {
        const data = await response.body;

        if (!data) return;

        // get the reader
        const reader = data.getReader();

        // console.log("reader", reader);

        // decode the stream
        const decoder = new TextDecoder();

        // prepare the assistant message
        let assistantMessage: Message = {
          role: "assistant",
          content: "",
          type: "text",
        };

        // update the assistant message as we get more data
        setMessages((prev) => [...prev, assistantMessage]);

        // read the stream

        let done = false;

        //
        while (!done) {
          const { value, done: readerDone } = await reader.read();

          done = readerDone;

          const chunkValue = decoder.decode(value);

          // console.log(chunkValue);

          // update the assistant message

          assistantMessage.content += chunkValue;

          // update the assistant message
          setMessages((prev) => {
            const newMessages = [...prev];

            newMessages[newMessages.length - 1] = { ...assistantMessage };

            return newMessages;
          });
        }
      }

      console.log("message", messages);
    } catch (error) {
      console.error("error", error);
    }
  };

  // console.log("input", input);

  return (
    <main className="flex flex-col h-screen max-w-xl mx-auto p-4  border">
      <div className="flex-grow overflow-auto mb-4 space-y-4 pb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === "user" ? "bg-gray-100" : "bg-blue-100"
              }`}
            >
              <div className={`font-bold`}>
                {message.role === "user" ? "You " : "Assisant"}
              </div>
              <div
                className={`${
                  message.role === "user" ? "text-black" : "text-black"
                }`}
              >
                {message.type === "text" ? (
                  <p>{message.content}</p>
                ) : (
                  <img
                    src={message.content}
                    width={200}
                    height={200}
                    alt="message generate"
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messageEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border border-gray-300 rounded outline-blue-500"
        />
        <button className="bg-blue-600 px-4 rounded text-white hover:bg-blue-400">
          Generate
        </button>
      </form>
    </main>
  );
}
