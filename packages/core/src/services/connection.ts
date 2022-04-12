import axios from "axios";
import rateLimit from "axios-rate-limit";

const {
  SN_USER: username = "",
  SN_PASSWORD: password = "",
  SN_INSTANCE: baseURL = "",
} = process.env;

export const baseUrlGQL = `https://${baseURL}/api/now/graphql`;

export const connection = rateLimit(
  axios.create({
    withCredentials: true,
    auth: {
      username,
      password,
    },
    headers: {
      "Content-Type": "application/json",
    },
    baseURL: `https://${baseURL}/`,
  }),
  { maxRPS: 20 }
);
