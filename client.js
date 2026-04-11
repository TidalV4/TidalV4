import axios from 'axios';

const BASE_URL = 'https://aniwatchtv.to';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': `${BASE_URL}/home`,
  'sec-ch-ua': '"Brave";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'X-Requested-With': 'XMLHttpRequest',
};

export const client = axios.create({
  baseURL: BASE_URL,
  headers: HEADERS,
  timeout: 12000,
});

export const pageClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    ...HEADERS,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
  },
  timeout: 12000,
});
