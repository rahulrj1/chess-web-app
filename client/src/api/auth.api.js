/**
 * Auth API
 * All authentication-related API calls
 */

import apiClient from './client';

export const authApi = {
    /**
     * Login user
     */
    login: async (playerId, password) => {
        const response = await apiClient.post('/users/login', {
            id: playerId,
            password,
        });
        return response.data;
    },

    /**
     * Get current user profile
     */
    getMe: async () => {
        const response = await apiClient.get('/me');
        return response.data;
    },

    /**
     * Register is handled via form POST (redirect flow)
     * So we just export the URL
     */
    getRegisterUrl: () => {
        return `${apiClient.defaults.baseURL}/users/register`;
    },
};

export default authApi;
