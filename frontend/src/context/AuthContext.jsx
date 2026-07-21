import React, { createContext, useContext, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("lm_token"));
  const [username, setUsername] = useState(() => localStorage.getItem("lm_username"));

  const login = async (user, password) => {
    const data = await api.login(user, password);
    setToken(data.token);
    setUsername(data.username);
    localStorage.setItem("lm_token", data.token);
    localStorage.setItem("lm_username", data.username);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem("lm_token");
    localStorage.removeItem("lm_username");
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
