/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useServiceMetricChartsFetcher } from '../../../hooks/use_service_metric_charts_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { MetricsChart } from '../../shared/charts/metrics_chart';

export function ServiceMetrics() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/:serviceName/metrics');

  const { data, status } = useServiceMetricChartsFetcher({
    serviceNodeName: undefined,
    environment,
    kuery,
  });
  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  return (
    <ChartPointerEventContextProvider>
      <EuiFlexGrid columns={2} gutterSize="s">
        {data.charts.map((chart) => (
          <EuiFlexItem key={chart.key}>
            <EuiPanel hasBorder={true}>
              <MetricsChart
                start={start}
                end={end}
                chart={chart}
                fetchStatus={status}
              />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="xxl" />
    </ChartPointerEventContextProvider>
  );
}
