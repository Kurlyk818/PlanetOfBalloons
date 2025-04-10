import axios from "axios";

// Fix the environment variable reference
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  withCredentials: true,
});

export default axiosInstance;

