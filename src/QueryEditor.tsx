import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onSqlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, sql: event.target.value });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { sql } = query;

    return (
      <div className="gf-form">
        <FormField value={sql || ''} onChange={this.onSqlChange} label="SQL" tooltip="Not used yet" />
      </div>
    );
  }
}
