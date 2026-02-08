/**
 * Game API
 * All game-related API calls
 */

import apiClient from './client';

export const gameApi = {
    /**
     * Delete a game board
     */
    deleteBoard: async (roomId) => {
        const response = await apiClient.post('/deleteboard', { roomId });
        return response.data;
    },
};

export default gameApi;
