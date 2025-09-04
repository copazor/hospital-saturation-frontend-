import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({ token: null, role: null });
    const [loading, setLoading] = useState(true); // New loading state

    const logout = () => {
        localStorage.removeItem('access_token');
        setAuthState({ token: null, role: null });
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setAuthState({ token, role: decoded.role });
                } else {
                    logout();
                }
            } catch (error) {
                logout();
            } finally {
                setLoading(false); // Set loading to false after check
            }
        } else {
            setLoading(false); // Set loading to false if no token
        }
    }, []);

    const login = (access_token) => {
        localStorage.setItem('access_token', access_token);
        const decoded = jwtDecode(access_token);
        setAuthState({ token: access_token, role: decoded.role });
    };

    const isTokenValid = () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            return false;
        }
        try {
            const decoded = jwtDecode(token);
            if (decoded.exp * 1000 > Date.now()) {
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            logout();
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ authState, login, logout, isTokenValid, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);