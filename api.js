import { AdultDVDEmpireScraper } from './scraper';

// Initialize the scraper
const scraper = new AdultDVDEmpireScraper();

// Default cache configuration
const DEFAULT_CACHE_CONFIG = {
    duration: 7200, // 2 hours in seconds
};

// Error handler
const errorHandler = (error) => {
    console.error(error);
    return new Response(JSON.stringify({
        success: false,
        error: error.message
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
};

// Search movies
const handleDiscoverMovies = async (url) => {
    try {
        const page = url.searchParams.get('page') || 1;
        const discover = await scraper.getDiscoverMovies(page, {
            key: `discover:${page}`,
            ...DEFAULT_CACHE_CONFIG
        });
        return new Response(JSON.stringify({
            success: true,
            ...discover
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorHandler(error);
    }
};

// Get movie info
const handleMovieInfo = async (movieID) => {
    try {
        const movie = await scraper.getMovieInfo(movieID, {
            key: `movie:${movieID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        return new Response(JSON.stringify({
            success: true,
            ...movie
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorHandler(error);
    }
};

// Get movie credits
const handleMovieCredits = async (movieID) => {
    try {
        const credits = await scraper.getMovieCredits(movieID, {
            key: `credits:${movieID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        return new Response(JSON.stringify({
            success: true,
            ...credits
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorHandler(error);
    }
};

// Get person info
const handlePersonInfo = async (personID) => {
    try {
        const person = await scraper.getPersonInfo(personID, {
            key: `person:${personID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        return new Response(JSON.stringify({
            success: true,
            ...person
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorHandler(error);
    }
};

// Main API handler
export default async function apiRoutes(request) {
    const url = new URL(request.url);

    // Route requests
    if (url.pathname === '/api/discover/movie') {
        return handleDiscoverMovies(url);
    } else if (url.pathname.startsWith('/api/movie/') && url.pathname.endsWith('/credits')) {
        const movieID = url.pathname.split('/')[3];
        return handleMovieCredits(movieID);
    } else if (url.pathname.startsWith('/api/movie/')) {
        const movieID = url.pathname.split('/')[3];
        return handleMovieInfo(movieID);
    } else if (url.pathname.startsWith('/api/person/')) {
        const personID = url.pathname.split('/')[3];
        return handlePersonInfo(personID);
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