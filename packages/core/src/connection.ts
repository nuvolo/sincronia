import axios from "axios";

const {
  SN_USER: username = "",
  SN_PASSWORD: password = "",
  SN_INSTANCE: baseURL = "",
} = process.env;

export const baseUrlGQL = `https://${baseURL}/api/now/graphql`;

export const connGQL = axios.create({
  auth: {
    username,
    password,
  },
  baseURL: baseUrlGQL,
  timeout: 60000,
});
