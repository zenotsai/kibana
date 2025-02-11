/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps, EuiPageTemplateProps } from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { ApmEnvironmentFilter } from '../../shared/EnvironmentFilter';

/*
 * This template contains:
 *  - The Shared Observability Nav (https://github.com/elastic/kibana/blob/f7698bd8aa8787d683c728300ba4ca52b202369c/x-pack/plugins/observability/public/components/shared/page_template/README.md)
 *  - The APM Header Action Menu
 *  - Page title
 *
 *  Optionally:
 *   - EnvironmentFilter
 */
export function ApmMainTemplate({
  pageTitle,
  pageHeader,
  children,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
} & EuiPageTemplateProps) {
  const { services } = useKibana<ApmPluginStartDeps>();

  const ObservabilityPageTemplate =
    services.observability.navigation.PageTemplate;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle,
        rightSideItems: [<ApmEnvironmentFilter />],
        ...pageHeader,
      }}
      {...pageTemplateProps}
    >
      {children}
    </ObservabilityPageTemplate>
  );
}
