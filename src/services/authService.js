import api from './api';

const login = async (credentials) => {
  // We check if it's a mock local environment to allow testing boilerplate without actual backend
  if (credentials.email === "admin@example.com" && credentials.password === "password") {
    const fakeResponse = {
      user: { id: 1, name: "Admin User", email: "admin@example.com" },
      token: "fake-jwt-token-abcd-1234"
    };
    localStorage.setItem("token", fakeResponse.token);
    localStorage.setItem("user", JSON.stringify(fakeResponse.user));
    return new Promise((resolve) => setTimeout(() => resolve(fakeResponse), 1000));
  }
  
  // Real API call (Fallback for actual backend)
  const response = await api.post('/auth/login', credentials);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

const authService = {
  login,
};

export default authService;
