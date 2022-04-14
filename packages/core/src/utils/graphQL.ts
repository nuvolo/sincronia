import { map } from "lodash";

export type Pagination = { limit?: number; offset?: number };

export type QueryBody = {
  conditions?: string;
  pagination?: Pagination;
};

export type SingleQuery = {
  table: string;
  fields: string[];
  conditions?: string;
  pagination?: Pagination;
};

export const getGqlQueryParams = ({
  conditions,
  pagination,
}: QueryBody): string => {
  const param = [];
  if (conditions) {
    param.push(`queryConditions: "${conditions}"`);
  }
  if (pagination) {
    param.push(
      `pagination: { offset: ${pagination.offset || 0}, limit: ${
        pagination.limit || 20
      }}`
    );
  }
  return param.join(", ");
};

export const getSingleTableQuery = ({
  table,
  fields,
  conditions,
  pagination,
}: SingleQuery): string => {
  return `${table}: ${table}(${getGqlQueryParams({
    conditions,
    pagination,
  })}) {
        list: _results {
           ${fields.join("  { value, displayValue } ")} { value, displayValue }
        }
      }`;
};

export const getGqlQuery = (tables: SingleQuery[]): { query: string } => {
  const query = `{
    query: GlideRecord_Query {
        ${map(tables, getSingleTableQuery).join(",")}
     }
   }`;
  return { query };
};
