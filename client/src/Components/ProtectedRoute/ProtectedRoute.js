/**
 * ProtectedRoute Component
 * Redirects to login if user is not authenticated
 */

import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../../context';

export default function ProtectedRoute({ children, ...rest }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.5rem',
                color: '#fff',
            }}>
                Loading...
            </div>
        );
    }

    return (
        <Route
            {...rest}
            render={() =>
                isAuthenticated ? children : <Redirect to="/login" />
            }
        />
    );
}
