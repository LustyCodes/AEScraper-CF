// Import any necessary modules (e.g., for API documentation or routes)
import apiRoutes from './api'; // Assuming you rewrite apiRoutes to work with Workers
import apiDocs from './api-docs.json'; // Assuming this is a static JSON file

// Health check endpoint
const handleRootRequest = () => {
    return new Response(JSON.stringify({
        status: 'ok',
        message: 'AE API is running'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
};

// API Documentation (served as static JSON)
const handleDocsRequest = () => {
    return new Response(JSON.stringify(apiDocs), {
        headers: { 'Content-Type': 'application/json' }
    };
};

// Main request handler
async function handleRequest(request) {
    const url = new URL(request.url);

    // Route requests
    if (url.pathname === '/') {
        return handleRootRequest();
    } else if (url.pathname === '/docs') {
        return handleDocsRequest();
    } else if (url.pathname.startsWith('/api')) {
        return apiRoutes(request); // Rewrite apiRoutes to handle fetch requests
    } else {
        // 404 Not Found
        return new Response(JSON.stringify({
            success: false,
            error: 'Not Found'
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Cloudflare Workers event listener
addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
});