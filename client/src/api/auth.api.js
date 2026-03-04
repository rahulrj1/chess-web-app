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
     * Register user
     */
    register: async (name, playerId, email, password) => {
        const response = await apiClient.post('/users/register', {
            name,
            id: playerId,
            email,
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
};

export default authApi;
