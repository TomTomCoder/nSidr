import { createAxios } from '@teable/openapi';

export const getAxios = () => {
  if (!process.env.BACKEND_URL && !process.env.PORT) {
    throw new Error('[SSR] Either BACKEND_URL or PORT must be set for axios baseURL');
  }
  const backendUrl = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT}`;
  const axios = createAxios();
  axios.defaults.baseURL = `${backendUrl}/api`;
  return axios;
};

export const axios = getAxios();
