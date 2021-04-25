import defaults from 'lodash/defaults';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  FieldDTO,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  dataSourceConfig: MyDataSourceOptions;
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.dataSourceConfig = instanceSettings.jsonData;
    this.url = instanceSettings.url;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      return getBackendSrv()
        .datasourceRequest({
          url: this.url + '/route' + '/rest/sql',
          method: 'POST',
          data: this.generateSql(options, query),
          headers: {
            Authorization: this.getAuthorization(),
          },
        })
        .then((response: any) => {
          let fields: FieldDTO[] = [];
          response.data.column_meta.forEach((meta: any[], index: any) => {
            const fieldName = meta[0];
            const filedTypeInt = meta[1];

            let fieldDto: FieldDTO = { name: fieldName };

            if (filedTypeInt === 1) {
              fieldDto.type = FieldType.boolean;
            } else if (filedTypeInt === 4 || filedTypeInt === 6 || filedTypeInt === 7) {
              fieldDto.type = FieldType.number;
            } else if (filedTypeInt === 9) {
              fieldDto.type = FieldType.time;
            } else if (filedTypeInt === 10) {
              fieldDto.type = FieldType.string;
            } else {
              fieldDto.type = FieldType.other;
            }

            fields.push(fieldDto);
          });

          fields.forEach((field, fieldIndex) => {
            const values: any[] = [];
            response.data.data.forEach((data: any[]) => {
              values.push(data[fieldIndex]);
            });
            field.values = values;
          });

          return new MutableDataFrame({
            refId: query.refId,
            fields: fields,
          });
        });
    });

    return Promise.all(promises)
      .then(data => ({ data }))
      .catch(err => {
        return {
          data: [],
          error: {
            message: err.data.desc,
          },
        };
      });
  }

  async testDatasource() {
    const response = await getBackendSrv().datasourceRequest({
      url: this.url + '/route' + '/grafana/heartbeat',
      method: 'GET',
      headers: {
        Authorization: this.getAuthorization(),
      },
    });

    if (response.status === 200) {
      return { status: 'success', message: 'TDengine Data source is working', title: 'Success' };
    } else {
      return { status: 'fail', message: response, title: 'Fail' };
    }
  }

  getAuthorization() {
    return 'Basic ' + btoa(this.dataSourceConfig.user + ':' + this.dataSourceConfig.password);
  }

  generateSql(options: DataQueryRequest<MyQuery>, target: Partial<MyQuery> & MyQuery) {
    var sql = target.sql;
    if (sql === null || sql === '') {
      return sql;
    }

    var queryStart = 'now-1h';
    if (options !== null && options.range !== null && options.range.from !== null) {
      queryStart = options.range.from.toISOString();
    }

    var queryEnd = 'now';
    if (options !== null && options.range !== null && options.range.to !== null) {
      queryEnd = options.range.to.toISOString();
    }
    var intervalMs = options.intervalMs + '' || '20000';

    intervalMs += 'a';
    sql = sql.replace(/^\s+|\s+$/gm, '');
    sql = sql.replace('$from', "'" + queryStart + "'");
    sql = sql.replace('$begin', "'" + queryStart + "'");
    sql = sql.replace('$to', "'" + queryEnd + "'");
    sql = sql.replace('$end', "'" + queryEnd + "'");
    sql = sql.replace('$interval', intervalMs);

    sql = getTemplateSrv().replace(sql, options.scopedVars, 'csv');

    return sql;
  }
}
