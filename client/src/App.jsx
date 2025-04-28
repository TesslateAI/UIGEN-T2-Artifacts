// client/src/App.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import ArtifactPreview from './components/ArtifactPreview';
import './index.css'; // Ensure Tailwind is imported

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- Available Models ---
// DEFINE YOUR ACTUAL AVAILABLE MODELS HERE
const AVAILABLE_MODELS = [
    { id: "Tesslate/UIGEN-T2-7B-3600", name: "Tesslate/UIGEN" },
    { id: "NousResearch/Meta-Llama-3-8B-Instruct", name: "Llama 3 8B Instruct" },
    { id: "mistralai/Mistral-7B-Instruct-v0.1", name: "Mistral 7B Instruct" },
    // Add other models supported by vllm.tesslate.com/v1
];

function App() {
  const [messages, setMessages] = useState([
    { role: 'system', content: "You are Tesslate, a helpful assistant specialized in UI generation." }
  ]);
  const [currentArtifactHtml, setCurrentArtifactHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const currentAssistantMessageRef = useRef('');
  const htmlRegex = /```html\s*([\s\S]*?)\s*```/g; // Find ```html ... ``` blocks
  const isProcessingDone = useRef(true); // Track if stream processing is finished

  // Debounced function to update the artifact state in App
  // Use a shorter debounce time for faster feedback during streaming
  const debouncedSetArtifactHtml = useCallback(debounce((html) => {
    // console.log("Debounced Set Artifact:", html.substring(0, 50) + "..."); // Debug
    setCurrentArtifactHtml(html);
  }, 150), []); // 150ms debounce

  // Extracts the *last* complete HTML block and calls the debounced state setter
  const extractAndSetArtifact = useCallback((text) => {
    let lastMatch = null;
    let match;
    htmlRegex.lastIndex = 0; // Reset regex state

    while ((match = htmlRegex.exec(text)) !== null) {
        lastMatch = match[1]; // Group 1 contains the code
    }

    // console.log("Attempting artifact extraction. Found:", lastMatch ? lastMatch.substring(0, 50)+"..." : "null"); // Debug

    if (lastMatch !== null) {
        debouncedSetArtifactHtml(lastMatch);
    } else {
        // If the *final* message has no HTML, clear the artifact preview
        if (isProcessingDone.current && currentArtifactHtml !== '') {
             // console.log("Clearing artifact as final message has no HTML"); // Debug
             debouncedSetArtifactHtml(''); // Use the debounced setter to clear
        }
    }
  }, [debouncedSetArtifactHtml, currentArtifactHtml]); // Dependency needed for clearing logic

  const handleSendMessage = async (userInput) => {
    if (!userInput.trim() || isLoading) return; // Prevent multiple sends

    const userMessage = { role: 'user', content: userInput };
    // Keep history, add new user message
    // Limit history length if needed: e.g., const history = messages.slice(-10);
    const messageHistory = [...messages, userMessage];
    setMessages(messageHistory); // Show user message immediately
    setIsLoading(true);
    isProcessingDone.current = false;
    currentAssistantMessageRef.current = '';
    setCurrentArtifactHtml(''); // Clear artifact preview for new request

    // Add placeholder for assistant response *after* user message is shown
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
             // Send appropriate history (e.g., all messages for context)
             messages: messageHistory.map(({ role, content }) => ({ role, content })),
             model: selectedModel
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorText;
        } catch {
            errorMessage = errorText || errorMessage;
        }
         if (!response.body) errorMessage += " (No response body)";
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // console.log("Frontend stream processing finished."); // Debug
          isProcessingDone.current = true;
          // Final check to clear artifact if needed
          extractAndSetArtifact(currentAssistantMessageRef.current);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const eventLines = chunk.split('\n\n');

         for (const eventLine of eventLines) {
             if (eventLine.startsWith('data:')) {
                 const jsonData = eventLine.substring(5).trim();

                 if (jsonData === '[DONE]') {
                    // console.log("Received [DONE] marker."); // Debug
                    isProcessingDone.current = true;
                    // Final check to clear artifact if needed
                    extractAndSetArtifact(currentAssistantMessageRef.current);
                    continue; // Don't break, wait for reader.read() to be done
                 }

                 try {
                     const parsed = JSON.parse(jsonData);
                     if (parsed.error) {
                         console.error("Received error via stream:", parsed.error);
                         throw new Error(parsed.error);
                     }

                     const textDelta = parsed.text || '';

                     if (textDelta) {
                          currentAssistantMessageRef.current += textDelta;

                          // Update the last message (assistant's streaming response)
                          setMessages(prev => {
                            const updatedMessages = [...prev];
                            if (updatedMessages.length > 0) {
                                updatedMessages[updatedMessages.length - 1] = {
                                  role: 'assistant',
                                  content: currentAssistantMessageRef.current
                                };
                            }
                            return updatedMessages;
                          });

                          // Extract artifact from the *accumulated* text in real-time
                          extractAndSetArtifact(currentAssistantMessageRef.current);
                      }
                 } catch (error) {
                     console.warn("Error parsing stream data or backend error:", jsonData, error);
                     // Stop processing and display error in chat
                     isProcessingDone.current = true;
                     throw new Error(`Stream processing error: ${error.message}`); // Throw to outer catch
                 }
             }
         }
      } // End while loop

    } catch (error) {
      console.error("Error sending message or processing stream:", error);
      isProcessingDone.current = true; // Ensure this is set on error too
      // Update the last message (placeholder or partial) with the error
      setMessages(prev => {
           const updatedMessages = [...prev];
           const lastMsgIndex = updatedMessages.length - 1;
           if(lastMsgIndex >= 0) {
                const lastMsg = updatedMessages[lastMsgIndex];
                // Append error, preserving existing content if any
                updatedMessages[lastMsgIndex] = {
                    ...lastMsg, // Keep role: 'assistant'
                    content: (lastMsg.content ? lastMsg.content + "\n\n" : "") + `[Error: ${error.message}]`
                 };
           } else {
               // Fallback if message list somehow got empty
               updatedMessages.push({ role: 'assistant', content: `[Error: ${error.message}]` });
           }
           return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left Side: Chat (2/5 width) */}
      {/* Removed max-w-..., mx-auto */}
      <div className="w-2/5 flex flex-col p-4 pb-0 overflow-y-hidden border-r border-gray-300 dark:border-gray-700">
         {/* Model Selector */}
         <div className="mb-4 px-2 flex-shrink-0"> {/* Added flex-shrink-0 */}
             <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Model:
             </label>
             <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-70"
             >
                {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                        {model.name}
                    </option>
                ))}
             </select>
         </div>

         {/* Chat Interface takes remaining space */}
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Right Side: Artifact Preview (3/5 width) */}
       {/* Adjusted width, removed lg/xl breakpoints for simplicity */}
       {/* Removed internal padding if ArtifactPreview handles its own */}
      <div className="w-3/5 flex flex-col bg-white dark:bg-gray-800">
         <ArtifactPreview htmlContent={currentArtifactHtml} />
      </div>
    </div>
  );
}

export default App;