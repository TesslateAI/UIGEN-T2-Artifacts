// client/src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';

function ChatInterface({ messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    // Use 'auto' for instant scroll, smoother if preferred ('smooth')
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  // Effect for scrolling: triggers on messages change or loading state change
  useEffect(() => {
     scrollToBottom();
     // Optional: Slight delay might help if rendering is slow
     // const timer = setTimeout(scrollToBottom, 50);
     // return () => clearTimeout(timer);
  }, [messages, isLoading]); // Scroll whenever messages update or loading changes

  // Effect for textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      // Consider a max-height if you haven't set one via CSS
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
       // Explicitly reset height after sending
       if (textareaRef.current) {
           textareaRef.current.style.height = 'auto';
       }
    }
  };

  const handleKeyDown = (e) => {
    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    // This component should fill the vertical space given by its parent in App.jsx
    <div className="flex flex-col flex-grow h-full overflow-hidden">
      {/* Chat Messages Area */}
      {/* Added custom-scrollbar class (ensure CSS is in index.css) */}
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4 custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* Added dark mode text color for user */}
            <div
              className={`max-w-xl lg:max-w-full px-4 py-2 rounded-lg shadow break-words ${ // Use max-w-full within this column
                msg.role === 'user'
                  ? 'bg-blue-500 text-white' // User messages remain white text
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' // Assistant messages
              }`}
            >
              {/* Render message content with preserved whitespace */}
              <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content || ' '}</pre>
               {/* Added non-breaking space for empty content to maintain bubble height */}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {/* Shows only when loading AND the last message is the empty assistant placeholder */}
        {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
           <div className="flex justify-start">
              <div className="px-4 py-2 rounded-lg shadow bg-gray-200 dark:bg-gray-700">
                 <div className="flex items-center space-x-1.5"> {/* Reduced spacing */}
                     <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce delay-150"></div>
                     <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce delay-300"></div>
                 </div>
              </div>
           </div>
         )}
         {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Area */}
      {/* Ensure it doesn't shrink and stays at the bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 flex items-end p-2 pt-1 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message (Shift+Enter for newline)..."
          className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white max-h-40 overflow-y-auto custom-scrollbar text-sm" // Explicit text size
          rows="1"
          disabled={isLoading}
          title="Type your message (Shift+Enter for newline)"
        />
        <button
          type="submit"
          className="ml-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed self-end min-h-[40px] flex items-center justify-center" // Ensure button aligns nicely
          disabled={isLoading || !input.trim()}
          title="Send Message"
        >
            {/* Simple Send Icon (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 3.105a.75.75 0 01.96-.03l13.47 8.363a.75.75 0 010 1.216l-13.47 8.364a.75.75 0 01-1.07-.608V16.44a.75.75 0 01.43-.69L10.95 12 3.53 8.25A.75.75 0 013.105 7.56V3.105z" />
            </svg>

        </button>
      </form>
    </div>
  );
}

export default ChatInterface;