// server.js
import express from 'express';
import fetch from 'node-fetch'; // Still using node-fetch
import cors from 'cors';
import dotenv from 'dotenv';
// No need for Readable from 'stream' unless piping manually

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// --- Configuration ---
const VLLM_API_URL = process.env.VLLM_API_URL || 'https://vllm.tesslate.com/v1';
const VLLM_API_KEY = process.env.VLLM_API_KEY || 'tesslateapi';

if (!VLLM_API_KEY) {
    console.warn("Warning: VLLM_API_KEY is not set in environment variables.");
}
if (!VLLM_API_URL || VLLM_API_URL === 'https://vllm.tesslate.com/v1') {
     console.warn(`Warning: VLLM_API_URL using default: ${VLLM_API_URL}`);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Route ---
app.post('/api/chat/stream', async (req, res) => {
    // Destructure messages AND model from request body
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body: messages array is required.' });
    }
    if (!model || typeof model !== 'string') {
        console.warn('Warning: Model not provided or invalid in request, using default.');
        // Optionally add a default model here if needed, but frontend should send one
        // return res.status(400).json({ error: 'Invalid request body: model string is required.' });
    }

    const requestedModel = model || "Tesslate/UIGEN-T2-7B-3600"; // Use provided model or fallback

    console.log(`Received request for model: ${requestedModel}`);
    console.log("Messages:", messages.map(m => `${m.role}: ${m.content.substring(0, 50)}...`)); // Log snippet

    try {
        const vllmResponse = await fetch(`${VLLM_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VLLM_API_KEY}`,
            },
            body: JSON.stringify({
                model: requestedModel, // Use the model from the request
                messages: messages,
                stream: true, // *** Ensure streaming is enabled ***
                // max_tokens: 1024, // Optional
                temperature: 0.7, // Optional
                top_p: 0.9,
            }),
             // node-fetch specific option for timeout (optional)
             // timeout: 300000, // 5 minutes timeout
        });

        if (!vllmResponse.ok) {
            // Attempt to read error body for better debugging
            let errorBody = `Status Code: ${vllmResponse.status}`;
            try {
                 errorBody = await vllmResponse.text();
            } catch (e) {
                 console.error("Could not read error body:", e);
            }
            console.error(`vLLM API Error (${vllmResponse.status}): ${errorBody}`);
            // Ensure response isn't already partially sent
            if (!res.headersSent) {
                 return res.status(vllmResponse.status).json({ error: `vLLM API Error: ${errorBody}` });
            } else {
                // If headers sent, we can't change status but should stop
                console.error("Headers already sent, cannot send JSON error response.");
                res.end(); // Terminate the stream abruptly
                return;
            }
        }

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Send headers immediately

        // --- Node.js Stream Handling ---
        const stream = vllmResponse.body; // This is a Node.js Readable stream
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        stream.on('data', (chunk) => {
            // Chunk is a Buffer, decode it
            buffer += decoder.decode(chunk, { stream: true });
            // console.log("Raw Buffer Data:", buffer); // Debugging

            // Process buffer line by line (SSE format: starts with 'data:')
            let lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the potentially incomplete last line

            for (const line of lines) {
                 if (line.trim().startsWith('data:')) {
                    const jsonData = line.substring(5).trim();

                    if (jsonData === '[DONE]') {
                        console.log("Received [DONE] marker from vLLM.");
                        res.write('data: [DONE]\n\n'); // Forward the DONE marker
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(jsonData);
                        const textDelta = parsed.choices?.[0]?.delta?.content || '';
                        const finishReason = parsed.choices?.[0]?.finish_reason;

                        if (textDelta) {
                            // Send extracted text delta to client
                             res.write(`data: ${JSON.stringify({ text: textDelta })}\n\n`);
                        } else if (finishReason) {
                            console.log("Stream finished with reason:", finishReason);
                             // Optionally forward finish reason if needed by frontend
                            // res.write(`data: ${JSON.stringify({ finish_reason: finishReason })}\n\n`);
                        } else {
                            // Handle unexpected valid JSON structure within 'data:'
                             console.warn('Received data object without delta or finish reason:', parsed);
                        }
                    } catch (error) {
                        console.warn('Could not parse JSON data chunk:', jsonData, error.message);
                        // Decide if you want to forward non-JSON data lines
                        // res.write(`data: ${JSON.stringify({ text: jsonData })}\n\n`);
                    }
                } else if (line.trim()) {
                     // Handle lines that don't start with 'data:' if necessary (e.g., comments)
                     console.log("Received non-data line:", line);
                 }
            }
        });

        stream.on('end', () => {
            console.log('vLLM response stream finished.');
            // Process any remaining data in the buffer (usually none if ended cleanly)
            if (buffer.trim().startsWith('data:')) {
                 // Handle final partial data if necessary (less common with SSE)
                 console.log("Processing remaining buffer on end:", buffer);
            }
             // Ensure a final confirmation or simply close
            // res.write('data: [STREAM_END]\n\n'); // Optional custom marker
            res.end(); // Close the SSE connection to the client
        });

        stream.on('error', (error) => {
            console.error('Error reading stream from vLLM:', error);
             // Try to inform the client if possible
             if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming from vLLM API' });
             } else {
                 // End the stream if headers were already sent
                 res.write(`data: ${JSON.stringify({ error: 'Stream error from source' })}\n\n`);
                 res.end();
             }
        });

        // Handle client closing the connection prematurely
        req.on('close', () => {
            console.log('Client disconnected, aborting vLLM request (if possible).');
            // If the fetch API or underlying library supports AbortController,
            // you could potentially abort the ongoing fetch request here.
            // For basic node-fetch, destroying the source stream might be enough.
             if (stream && typeof stream.destroy === 'function') {
                 stream.destroy();
             }
            res.end(); // Ensure response stream is closed on server side
        });

    } catch (error) {
        console.error('Error in /api/chat/stream setup:', error);
        if (!res.headersSent) {
             res.status(500).json({ error: 'Internal Server Error during stream setup' });
        } else {
             res.end();
        }
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});