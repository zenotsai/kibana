/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiPageContent, EuiPage } from '@elastic/eui';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { getServices } from '../../../../kibana_services';
import { DocViewer } from '../../../components/doc_viewer/doc_viewer';
import { ElasticRequestState } from '../types';
import { useEsDocSearch } from '../../../services/use_es_doc_search';

export interface DocProps {
  /**
   * Id of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string;
  /**
   * IndexPattern ID used to get IndexPattern entity
   * that's used for adding additional fields (stored_fields, script_fields, docvalue_fields)
   */
  indexPatternId: string;
  /**
   * IndexPatternService to get a given index pattern by ID
   */
  indexPatternService: IndexPatternsContract;
  /**
   * If set, will always request source, regardless of the global `fieldsFromSource` setting
   */
  requestSource?: boolean;
}

export function Doc(props: DocProps) {
  const [reqState, hit, indexPattern] = useEsDocSearch(props);
  const indexExistsLink = getServices().docLinks.links.apis.indexExists;
  return (
    <I18nProvider>
      <EuiPage>
        <EuiPageContent>
          {reqState === ElasticRequestState.NotFoundIndexPattern && (
            <EuiCallOut
              color="danger"
              data-test-subj={`doc-msg-notFoundIndexPattern`}
              iconType="alert"
              title={
                <FormattedMessage
                  id="discover.doc.failedToLocateIndexPattern"
                  defaultMessage="No index pattern matches ID {indexPatternId}."
                  values={{ indexPatternId: props.indexPatternId }}
                />
              }
            />
          )}
          {reqState === ElasticRequestState.NotFound && (
            <EuiCallOut
              color="danger"
              data-test-subj={`doc-msg-notFound`}
              iconType="alert"
              title={
                <FormattedMessage
                  id="discover.doc.failedToLocateDocumentDescription"
                  defaultMessage="Cannot find document"
                />
              }
            >
              <FormattedMessage
                id="discover.doc.couldNotFindDocumentsDescription"
                defaultMessage="No documents match that ID."
              />
            </EuiCallOut>
          )}

          {reqState === ElasticRequestState.Error && (
            <EuiCallOut
              color="danger"
              data-test-subj={`doc-msg-error`}
              iconType="alert"
              title={
                <FormattedMessage
                  id="discover.doc.failedToExecuteQueryDescription"
                  defaultMessage="Cannot run search"
                />
              }
            >
              <FormattedMessage
                id="discover.doc.somethingWentWrongDescription"
                defaultMessage="{indexName} is missing."
                values={{ indexName: props.index }}
              />{' '}
              <EuiLink href={indexExistsLink} target="_blank">
                <FormattedMessage
                  id="discover.doc.somethingWentWrongDescriptionAddon"
                  defaultMessage="Please ensure the index exists."
                />
              </EuiLink>
            </EuiCallOut>
          )}

          {reqState === ElasticRequestState.Loading && (
            <EuiCallOut data-test-subj={`doc-msg-loading`}>
              <EuiLoadingSpinner size="m" />{' '}
              <FormattedMessage id="discover.doc.loadingDescription" defaultMessage="Loading…" />
            </EuiCallOut>
          )}

          {reqState === ElasticRequestState.Found && hit !== null && indexPattern && (
            <div data-test-subj="doc-hit">
              <DocViewer hit={hit} indexPattern={indexPattern} />
            </div>
          )}
        </EuiPageContent>
      </EuiPage>
    </I18nProvider>
  );
}
