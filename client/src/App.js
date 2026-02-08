/**
 * App - Root Component
 * Sets up routing and auth context
 */

import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

import { AuthProvider } from './context';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Game from './pages/Game/Game';
import SinglePlayer from './pages/SinglePlayer/SinglePlayer';
import NotFound from './pages/NotFound/NotFound';

import './styles/App.css';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Switch>
                    <Route exact path="/">
                        <Redirect to="/login" />
                    </Route>

                    <Route path="/login">
                        <Login />
                    </Route>

                    <ProtectedRoute exact path="/chessgame">
                        <Home />
                    </ProtectedRoute>

                    <ProtectedRoute path="/play/ai">
                        <div className="container">
                            <SinglePlayer />
                        </div>
                    </ProtectedRoute>

                    <ProtectedRoute path="/chess/:roomId">
                        <div className="container">
                            <Game />
                        </div>
                    </ProtectedRoute>

                    <Route path="/*">
                        <NotFound />
                    </Route>
                </Switch>
            </Router>
        </AuthProvider>
    );
}

export default App;
