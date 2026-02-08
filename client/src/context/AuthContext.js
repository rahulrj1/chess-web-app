/**
 * Auth Context
 * Provides authentication state globally across the app
 * No more fetching user in every component!
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /**
     * Fetch current user from API
     */
    const fetchUser = useCallback(async () => {
        const token = Cookies.get('jwt');
        
        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        try {
            const data = await authApi.getMe();
            setUser(data.user);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setUser(null);
            setIsAuthenticated(false);
            Cookies.remove('jwt');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Login - save token and fetch user
     */
    const login = useCallback(async (playerId, password) => {
        const data = await authApi.login(playerId, password);
        
        if (data.msg === 'logsuc' && data.token) {
            Cookies.set('jwt', data.token);
            setUser(data.user);
            setIsAuthenticated(true);
            return { success: true };
        }
        
        return { success: false, message: data.msg };
    }, []);

    /**
     * Logout - clear token and state
     */
    const logout = useCallback(() => {
        Cookies.remove('jwt');
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    // Fetch user on mount
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        refreshUser: fetchUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
}

export default AuthContext;
