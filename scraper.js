import { parseHTML } from 'linkedom'; // Lightweight HTML parser for Cloudflare Workers

// Define 13 random User-Agents
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/100.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/95.0.1020.44",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/604.1",
    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (X11; Linux i686; rv:92.0) Gecko/20100101 Firefox/92.0",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36"
];

// Function to get a random User-Agent
const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

// Helper function to convert runtime format to total minutes
const convertRuntimeToMinutes = (runtimeStr) => {
    const regex = /(\d+)\s*hrs?\.\s*(\d+)\s*mins?\./;
    const match = runtimeStr.match(regex);
    if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        return hours * 60 + minutes;
    }
    return 0;
};

export class AdultDVDEmpireScraper {
    baseUrl;
    headers;
    constructor(baseUrl = 'https://www.adultempire.com') {
        this.baseUrl = baseUrl;
        this.headers = {
            'User-Agent': getRandomUserAgent(),
            'Cookie': 'ageConfirmed=true'
        };
    }

    async fetchHtml(url) {
        const response = await fetch(url, { headers: this.headers });
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        return response.text();
    }

    async getDiscoverMovies(page = 1, cacheConfig) {
        try {
            const html = await this.fetchHtml(`${this.baseUrl}/all-dvds.html?page=${page}`);
            const { document } = parseHTML(html);

            const results = [];
            const total_results = document.querySelector('.list-page__results strong')?.textContent.replace(/,/g, '') || '0';
            const total_pages = document.querySelector('.pagination li a[aria-label="Go to Last Page"]')?.textContent.trim().replace(/,/g, '') || '1';

            document.querySelectorAll('.grid-item').forEach((element) => {
                const anchorTag = element.querySelector('.product-details__item-title a');
                const href = anchorTag?.getAttribute('href');
                const title = anchorTag?.textContent.trim();

                const movieID = href?.split('/')[1];
                const poster_path = element.querySelector('.boxcover-container img')?.getAttribute('src') || '';

                if (movieID && title) {
                    results.push({
                        id: movieID,
                        original_title: title,
                        poster_path,
                        title
                    });
                }
            });

            return {
                page,
                results,
                total_results,
                total_pages
            };
        } catch (error) {
            console.error('Error getting movie discover:', error);
            throw error;
        }
    }

    async getMovieInfo(movieID, cacheConfig) {
        try {
            const html = await this.fetchHtml(`${this.baseUrl}/${movieID}`);
            const { document } = parseHTML(html);

            // Extracting the title
            const raw_title = document.querySelector('h1')?.textContent.trim() || '';
            const cleanedText = raw_title.replace(/[\n\t]+/g, ' ').trim();
            const title = cleanedText.replace(/\s*- On Sale!.*$/, '').trim();

            // Extracting the backdrop path
            const backdropPathStyle = document.querySelector('#previewContainer')?.getAttribute('style') || '';
            const backdrop_url = backdropPathStyle.match(/background-image:\s*url\(([^)]+)\)/)?.[1] || '';
            const backdrop_split = backdrop_url.split('/')[6] || '';
            const backdrop_path = `https://caps1cdn.adultempire.com/o/1920/1080/${backdrop_split}`;

            // Extracting genres
            const genres = [];
            document.querySelectorAll('.movie-page__content-tags__categories a').forEach((element) => {
                const href = element.getAttribute('href');
                const name = element.textContent.trim();
                const id = href?.split('/')[1] || '';
                genres.push({ id, name });
            });

            // Extracting overview
            const overview = document.querySelector('.synopsis-content')?.textContent.trim() || '';

            // Extracting poster path
            const poster_path = document.querySelector('.boxcover-container a')?.getAttribute('data-href') || '';

            // Extracting runtime
            const runtimeElement = Array.from(document.querySelectorAll('div.col-sm-4 ul.list-unstyled li')).find((li) =>
                li.textContent.trim().startsWith('Length:')
            );
            const runtimeStr = runtimeElement?.textContent.trim() || '';
            const runtime = convertRuntimeToMinutes(runtimeStr);

            // Extracting vote average
            const vote_average = document.querySelector('.rating-stars-avg')?.textContent.trim() || '';

            // Extracting vote count
            const vote_count = document.querySelector('e-user-actions[variant="like"]')?.getAttribute('count') || 0;

            // Extracting backdrops
            const backdrops = [];
            document.querySelectorAll('div.col-xs-6 img.img-full-responsive').forEach((element) => {
                const file_url = element.getAttribute('data-bgsrc');
                if (file_url) {
                    const file_url_split = file_url.split('/')[6] || '';
                    const file_path = `https://caps1cdn.adultempire.com/o/1920/1080/${file_url_split}`;
                    backdrops.push({ file_path });
                }
            });

            // Extracting cast
            const cast = [];
            document.querySelectorAll('.movie-page__content-tags__performers a').forEach((element) => {
                const href = element.getAttribute('href');
                const name = element.textContent.trim();
                const performerId = href?.split('/')[1] || '';
                const profile_path = performerId ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg` : '';
                cast.push({ id: performerId, name, profile_path, known_for_department: 'Acting' });
            });

            // Extracting crew
            const crew = [];
            document.querySelectorAll('.movie-page__heading__movie-info a').forEach((element) => {
                const href = element.getAttribute('href');
                const name = element.textContent.trim();
                const crewId = href?.split('/')[1] || '';
                const profile_path = crewId ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg` : '';
                if (crewId) {
                    crew.push({ id: crewId, name, profile_path, known_for_department: 'Directing', department: 'Directing' });
                }
            });

            return {
                id: movieID,
                title,
                backdrop_path,
                genres,
                overview,
                poster_path,
                runtime,
                vote_average,
                vote_count,
                images: { backdrops },
                cast,
                crew
            };
        } catch (error) {
            console.error('Error getting movie info:', error);
            throw error;
        }
    }

    async getMovieCredits(movieID, cacheConfig) {
        try {
            const html = await this.fetchHtml(`${this.baseUrl}/${movieID}`);
            const { document } = parseHTML(html);

            const cast = [];
            document.querySelectorAll('.movie-page__content-tags__performers a').forEach((element) => {
                const href = element.getAttribute('href');
                const name = element.textContent.trim();
                const performerId = href?.split('/')[1] || '';
                const profile_path = performerId ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg` : '';
                cast.push({ id: performerId, name, profile_path, known_for_department: 'Acting' });
            });

            const crew = [];
            document.querySelectorAll('.movie-page__heading__movie-info a').forEach((element) => {
                const href = element.getAttribute('href');
                const name = element.textContent.trim();
                const crewId = href?.split('/')[1] || '';
                const profile_path = crewId ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg` : '';
                if (crewId) {
                    crew.push({ id: crewId, name, profile_path, known_for_department: 'Directing', department: 'Directing' });
                }
            });

            return {
                id: movieID,
                cast,
                crew
            };
        } catch (error) {
            console.error('Error getting movie credits info:', error);
            throw error;
        }
    }

    async getPersonInfo(personID, cacheConfig) {
        try {
            const html = await this.fetchHtml(`${this.baseUrl}/${personID}`);
            const { document } = parseHTML(html);

            const adult = true;
            const imdb_id = personID;
            const known_for_department = 'Acting';

            // Extracting the name
            const name = document.querySelector('h1')?.textContent.trim() || '';

            // Extracting biography
            const biography = document.querySelector('.modal-body.text-md')?.innerHTML || '';

            // Extracting profile path
            const profile_path = personID ? `https://imgs1cdn.adultempire.com/actors/${personID}h.jpg` : '';

            return {
                adult,
                biography,
                id: personID,
                imdb_id,
                known_for_department,
                name,
                profile_path
            };
        } catch (error) {
            console.error('Error getting person info:', error);
            throw error;
        }
    }
}