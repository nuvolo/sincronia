import axios from "axios";

export const snClient = (
  baseURL: string,
  username: string,
  password: string
) => {
  const client = axios.create({
    withCredentials: true,
    auth: {
      username,
      password
    },
    headers: {
      "Content-Type": "application/json"
    },
    baseURL
  });

  const updateRecord = (
    table: string,
    recordId: string,
    fields: Record<string, string>
  ) => {
    const endpoint = `api/now/table/${table}/${recordId}`;
    return client.patch(endpoint, fields);
  };
  return {};
};

const { SN_USER = "", SN_PASSWORD = "", SN_INSTANCE = "" } = process.env;
export const defaultClient = snClient(
  `https://${SN_INSTANCE}/`,
  SN_USER,
  SN_PASSWORD
);
