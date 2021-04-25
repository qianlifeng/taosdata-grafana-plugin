import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  sql: string;
}

export const defaultQuery: Partial<MyQuery> = {
  sql: '',
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  host?: string;
  user?: string;
  password?: string;
}
