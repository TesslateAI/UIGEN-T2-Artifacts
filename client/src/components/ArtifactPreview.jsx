// client/src/components/ArtifactPreview.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from '@codesandbox/sandpack-react';

// Debounce function (keep as is)
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

// SandpackUpdater (keep as is - fix was already applied)
const SandpackUpdater = ({ htmlContent }) => {
    const { sandpack } = useSandpack();
    const lastUpdatedHtml = useRef(null);

    const debouncedSandpackUpdate = useMemo(
        () => debounce((content) => {
            sandpack.updateFile('/index.html', content);
        }, 50),
        [sandpack]
    );

    useEffect(() => {
        if (sandpack && htmlContent !== lastUpdatedHtml.current) {
            const contentToUpdate = htmlContent || '<!-- Waiting for HTML artifact... -->';
            debouncedSandpackUpdate(contentToUpdate);
            lastUpdatedHtml.current = htmlContent;
        }
    }, [htmlContent, sandpack, debouncedSandpackUpdate]);

    return null;
};


function ArtifactPreview({ htmlContent }) {
  const [showCode, setShowCode] = useState(false);

  const initialFiles = useMemo(() => ({
     '/index.html': {
         code: htmlContent || '<!-- Waiting for HTML artifact... -->',
         active: true,
     },
  }), []);

  const sandpackOptions = useMemo(() => ({
      showLineNumbers: true,
      showInlineErrors: true,
      showTabs: true,
      closableTabs: false,
      editorHeight: '40%', // This might be overridden by our explicit styles below
  }), []);

  return (
    // Root element takes full height provided by App.jsx (w-4/5 flex flex-col)
    <div className="flex flex-col h-full bg-white dark:bg-gray-850">
      {/* Header */}
      <div className="p-3 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750 flex-shrink-0">
         <h2 className="text-lg font-semibold">Artifact Preview</h2>
         <button
            onClick={() => setShowCode(!showCode)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-gray-700 dark:text-gray-200 transition-colors"
            title={showCode ? "Hide Code" : "Show Code"}
         >
            {showCode ? '</> Hide Code' : '</> Show Code'}
         </button>
      </div>

      {/* Sandpack Area */}
      {/* This container needs to grow and allow SandpackLayout to fill it */}
      <div className="flex-grow relative overflow-hidden"> {/* Added overflow-hidden */}
          <SandpackProvider
              template="static"
              files={initialFiles}
              theme="auto"
              options={sandpackOptions}
          >
              <SandpackUpdater htmlContent={htmlContent} />
              {/* *** Ensure SandpackLayout takes full height of its container *** */}
              <SandpackLayout className="!bg-transparent dark:!bg-transparent h-full">
                   {/* Preview Panel */}
                   <SandpackPreview
                      showOpenInCodeSandbox={true}
                      showRefreshButton={true}
                      // *** Use flex-grow when code hidden, explicit height when shown ***
                      className={`transition-all duration-300 ease-in-out ${showCode ? 'h-[60%]' : 'flex-grow'}`} // Use flex-grow to fill space
                      style={{
                        // Only set explicit height when code is shown
                        height: showCode ? 900 : 900,
                        backgroundColor: 'white', // Keep preview bg white
                        border: 'none' // Remove any potential borders
                      }}
                    />
                    {/* Code Editor Panel (Conditional) */}
                    {showCode && (
                       <SandpackCodeEditor
                          // *** Use explicit height, ensure it doesn't grow/shrink unexpectedly ***
                          className={`flex-shrink-0 transition-all duration-300 ease-in-out h-[40%]`}
                          style={{ height: '40%' }}
                       />
                    )}
              </SandpackLayout>
          </SandpackProvider>
      </div>
    </div>
  );
}

export default ArtifactPreview;