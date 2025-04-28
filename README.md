# UIGEN-Demo: UI Generation Model Testing Interface

This project provides a simple web interface to interact with and test UI generation language models, specifically designed initially for `Tesslate/UIGEN-T2`, but configurable for any OpenAI-compatible API endpoint (like a local vLLM instance).

It features a chat interface to send prompts to the model and a live preview panel to render the generated HTML artifact in real-time.

## Features

*   **Chat Interface:** Send prompts and view the conversation history.
*   **Model Selection:** Choose from a predefined list of available models hosted on the backend API.
*   **Live HTML Preview:** Renders the HTML code block (` ```html ... ``` `) extracted from the model's response using Sandpack.
*   **Code Viewer:** Toggle visibility of the generated HTML source code within the preview panel.
*   **Streaming Responses:** Handles streamed responses from the backend for a more interactive experience.
*   **Backend Proxy:** A simple Express server (`server.js`) proxies requests to the target LLM API, keeping API keys and endpoint URLs secure.
*   **Configurable:** Easily configure the target API endpoint and key via environment variables.

## Tech Stack

*   **Frontend:**
    *   React 19
    *   Vite
    *   Tailwind CSS 4
    *   Sandpack (for code preview and editing)
*   **Backend:**
    *   Node.js
    *   Express 5
    *   `node-fetch` (for making requests to the LLM API)
    *   `dotenv` (for environment variable management)
    *   `cors`

## Setup and Installation

**Prerequisites:**

*   Node.js (LTS version recommended)
*   npm (usually comes with Node.js)

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd UIGEN-Demo
    ```

2.  **Install Backend Dependencies:**
    Navigate to the project root directory (`UIGEN-Demo`) and run:
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies:**
    Navigate to the client directory (`client`) and run:
    ```bash
    cd client
    npm install
    cd ..
    ```

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the **root** directory (`UIGEN-Demo`) of the project. You can copy `.env copy` to get started:
        ```bash
        copy ".env copy" .env
        ```
    *   Edit the `.env` file with your specific API details:
        ```
        # URL of your OpenAI-compatible API endpoint (e.g., vLLM server)
        VLLM_API_URL=https://your-vllm-or-openai-compatible-api/v1

        # API Key for the endpoint (if required)
        VLLM_API_KEY=your_api_key_here

        # Optional: Port for the backend server (defaults to 3001 if not set)
        # PORT=3001
        ```
    *   **Important:** The `.env` file is listed in `.gitignore` and should **not** be committed to version control.

## Running the Application

You need to run both the backend server and the frontend development server.

1.  **Start the Backend Server:**
    Open a terminal in the project's **root** directory (`UIGEN-Demo`) and run:
    ```bash
    node server.js
    ```
    The server will typically start on `http://localhost:3001` (or the port specified in your `.env` file).

2.  **Start the Frontend Development Server:**
    Open **another** terminal in the **client** directory (`client`) and run:
    ```bash
    npm run dev
    ```
    The frontend will usually be available at `http://localhost:5173` (Vite's default, check the terminal output).

3.  **Access the Application:**
    Open your web browser and navigate to the frontend URL (e.g., `http://localhost:5173`).

## Usage

1.  Select the desired language model from the dropdown menu in the top bar.
2.  Type your prompt into the chat input box at the bottom of the left panel.
3.  Press Enter (or click the Send button) to send the prompt to the model via the backend.
4.  The model's response will appear in the chat history.
5.  If the response contains a valid ` ```html ... ``` ` code block, the HTML will be rendered in the right-hand Artifact Preview panel.
6.  Use the `</> Show Code` / `</> Hide Code` button in the Artifact Preview panel to view or hide the raw HTML source.

## Configuration Details

*   **Backend API Endpoint (`VLLM_API_URL`):** Set in the root `.env` file. This is the target URL the `server.js` will forward requests to.
*   **Backend API Key (`VLLM_API_KEY`):** Set in the root `.env` file. This key is added as a Bearer token in the `Authorization` header for requests to the `VLLM_API_URL`.
*   **Backend Port (`PORT`):** Optional. Set in the root `.env` file to change the port the Express server runs on (default is 3001).
*   **Available Models:** The list of models in the dropdown is defined in `App.jsx` within the `AVAILABLE_MODELS` constant. Ensure the `id` field matches the model identifier expected by your backend API endpoint.
*   **Vite Proxy:** The frontend (`vite.config.js`) is configured to proxy requests starting with `/api` to the backend server (defaulting to `http://localhost:3001`).

## License

This project is licensed under the ISC License - see the `package.json` file for details.
```