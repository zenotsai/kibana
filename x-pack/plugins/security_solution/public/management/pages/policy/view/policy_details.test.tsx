/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { PolicyDetails } from './policy_details';
import '../../../../common/mock/match_media.ts';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getPolicyDetailPath, getEndpointListPath } from '../../../common/routing';
import { policyListApiPathHandlers } from '../store/test_mock_utils';
import { licenseService } from '../../../../common/hooks/use_license';

jest.mock('../../../../common/hooks/use_license');

describe('Policy Details', () => {
  type FindReactWrapperResponse = ReturnType<ReturnType<typeof render>['find']>;

  const policyDetailsPathUrl = getPolicyDetailPath('1');
  const endpointListPath = getEndpointListPath({ name: 'endpointList' });
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let http: typeof coreStart.http;
  let render: (ui: Parameters<typeof mount>[0]) => ReturnType<typeof mount>;
  let policyPackagePolicy: ReturnType<typeof generator.generatePolicyPackagePolicy>;
  let policyView: ReturnType<typeof render>;

  beforeEach(() => {
    const appContextMockRenderer = createAppRootMockRenderer();
    const AppWrapper = appContextMockRenderer.AppWrapper;

    ({ history, coreStart, middlewareSpy } = appContextMockRenderer);
    render = (ui) => mount(ui, { wrappingComponent: AppWrapper });
    http = coreStart.http;
  });

  afterEach(() => {
    if (policyView) {
      policyView.unmount();
    }
    jest.clearAllMocks();
  });

  describe('when displayed with invalid id', () => {
    let releaseApiFailure: () => void;
    beforeEach(() => {
      http.get.mockImplementation(async () => {
        await new Promise((_, reject) => {
          releaseApiFailure = reject.bind(null, new Error('policy not found'));
        });
      });
      history.push(policyDetailsPathUrl);
      policyView = render(<PolicyDetails />);
    });

    it('should NOT display timeline', async () => {
      expect(policyView.find('flyoutOverlay')).toHaveLength(0);
    });

    it('should show loader followed by error message', async () => {
      expect(policyView.find('EuiLoadingSpinner').length).toBe(1);
      releaseApiFailure();
      await middlewareSpy.waitForAction('serverFailedToReturnPolicyDetailsData');
      policyView.update();
      const callout = policyView.find('EuiCallOut');
      expect(callout).toHaveLength(1);
      expect(callout.prop('color')).toEqual('danger');
      expect(callout.text()).toEqual('policy not found');
    });
  });
  describe('when displayed with valid id', () => {
    let asyncActions: Promise<unknown> = Promise.resolve();

    beforeEach(() => {
      policyPackagePolicy = generator.generatePolicyPackagePolicy();
      policyPackagePolicy.id = '1';

      const policyListApiHandlers = policyListApiPathHandlers();

      http.get.mockImplementation((...args) => {
        const [path] = args;
        if (typeof path === 'string') {
          // GET datasouce
          if (path === '/api/fleet/package_policies/1') {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyPackagePolicy,
              success: true,
            });
          }

          // GET Agent status for agent policy
          if (path === '/api/fleet/agent-status') {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve({
              results: { events: 0, total: 5, online: 3, error: 1, offline: 1 },
              success: true,
            });
          }

          // Get package data
          // Used in tests that route back to the list
          if (policyListApiHandlers[path]) {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve(policyListApiHandlers[path]());
          }
        }

        return Promise.reject(new Error(`unknown API call (not MOCKED): ${path}`));
      });
      history.push(policyDetailsPathUrl);
      policyView = render(<PolicyDetails />);
    });

    it('should NOT display timeline', async () => {
      expect(policyView.find('flyoutOverlay')).toHaveLength(0);
    });

    it('should display back to list button and policy title', () => {
      policyView.update();

      const backToListLink = policyView.find('LinkIcon[dataTestSubj="policyDetailsBackLink"]');
      expect(backToListLink.prop('iconType')).toBe('arrowLeft');
      expect(backToListLink.prop('href')).toBe(`/app/security${endpointListPath}`);
      expect(backToListLink.text()).toBe('Back to endpoint hosts');

      const pageTitle = policyView.find('span[data-test-subj="header-page-title"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyPackagePolicy.name);
    });
    it('should navigate to list if back to link is clicked', async () => {
      policyView.update();

      const backToListLink = policyView.find('a[data-test-subj="policyDetailsBackLink"]');
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      backToListLink.simulate('click', { button: 0 });
      expect(history.location.pathname).toEqual(endpointListPath);
    });
    it('should display agent stats', async () => {
      await asyncActions;
      policyView.update();

      const agentsSummary = policyView.find('EuiFlexGroup[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary).toHaveLength(1);
      expect(agentsSummary.text()).toBe('Total agents5Healthy3Unhealthy1Offline1');
    });
    it('should display cancel button', async () => {
      await asyncActions;
      policyView.update();
      const cancelbutton = policyView.find(
        'EuiButtonEmpty[data-test-subj="policyDetailsCancelButton"]'
      );
      expect(cancelbutton).toHaveLength(1);
      expect(cancelbutton.text()).toEqual('Cancel');
    });
    it('should redirect to policy list when cancel button is clicked', async () => {
      await asyncActions;
      policyView.update();
      const cancelbutton = policyView.find(
        'EuiButtonEmpty[data-test-subj="policyDetailsCancelButton"]'
      );
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      cancelbutton.simulate('click', { button: 0 });
      const navigateToAppMockedCalls = coreStart.application.navigateToApp.mock.calls;
      expect(navigateToAppMockedCalls[navigateToAppMockedCalls.length - 1]).toEqual([
        'securitySolution',
        { path: endpointListPath },
      ]);
    });
    it('should display save button', async () => {
      await asyncActions;
      policyView.update();
      const saveButton = policyView.find('EuiButton[data-test-subj="policyDetailsSaveButton"]');
      expect(saveButton).toHaveLength(1);
      expect(saveButton.text()).toEqual('Save');
    });
    describe('when the save button is clicked', () => {
      let saveButton: FindReactWrapperResponse;
      let confirmModal: FindReactWrapperResponse;
      let modalCancelButton: FindReactWrapperResponse;
      let modalConfirmButton: FindReactWrapperResponse;

      beforeEach(async () => {
        await asyncActions;
        policyView.update();
        saveButton = policyView.find('EuiButton[data-test-subj="policyDetailsSaveButton"]');
        saveButton.simulate('click');
        policyView.update();
        confirmModal = policyView.find(
          'EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]'
        );
        modalCancelButton = confirmModal.find('button[data-test-subj="confirmModalCancelButton"]');
        modalConfirmButton = confirmModal.find(
          'button[data-test-subj="confirmModalConfirmButton"]'
        );
        http.put.mockImplementation((...args) => {
          asyncActions = asyncActions.then(async () => sleep());
          const [path] = args;
          if (typeof path === 'string') {
            if (path === '/api/fleet/package_policies/1') {
              return Promise.resolve({
                item: policyPackagePolicy,
                success: true,
              });
            }
          }

          return Promise.reject(new Error('unknown PUT path!'));
        });
      });

      it('should show a modal confirmation', () => {
        expect(confirmModal).toHaveLength(1);
        expect(confirmModal.find('div[data-test-subj="confirmModalTitleText"]').text()).toEqual(
          'Save and deploy changes'
        );
        expect(modalCancelButton.text()).toEqual('Cancel');
        expect(modalConfirmButton.text()).toEqual('Save and deploy changes');
      });
      it('should show info callout if policy is in use', () => {
        const warningCallout = confirmModal.find(
          'EuiCallOut[data-test-subj="policyDetailsWarningCallout"]'
        );
        expect(warningCallout).toHaveLength(1);
        expect(warningCallout.text()).toEqual(
          'This action will update 5 hostsSaving these changes will apply updates to all endpoints assigned to this agent policy.'
        );
      });
      it('should close dialog if cancel button is clicked', () => {
        modalCancelButton.simulate('click');
        expect(
          policyView.find('EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]')
        ).toHaveLength(0);
      });
      it('should update policy and show success notification when confirm button is clicked', async () => {
        modalConfirmButton.simulate('click');
        policyView.update();
        // Modal should be closed
        expect(
          policyView.find('EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]')
        ).toHaveLength(0);

        // API should be called
        await asyncActions;
        expect(http.put.mock.calls[0][0]).toEqual(`/api/fleet/package_policies/1`);
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.addSuccess.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          title: 'Success!',
          text: expect.any(Function),
        });
      });
      it('should show an error notification toast if update fails', async () => {
        policyPackagePolicy.id = 'invalid';
        modalConfirmButton.simulate('click');

        await asyncActions;
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.addDanger.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          title: 'Failed!',
          text: expect.any(String),
        });
      });
    });
    describe('when the subscription tier is platinum or higher', () => {
      beforeEach(() => {
        (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
        policyView = render(<PolicyDetails />);
      });

      it('malware popup, message customization options and tooltip are shown', () => {
        // use query for finding stuff, if it doesn't find it, just returns null
        const userNotificationCheckbox = policyView.find(
          'EuiCheckbox[data-test-subj="malwareUserNotificationCheckbox"]'
        );
        const userNotificationCustomMessageTextArea = policyView.find(
          'EuiTextArea[data-test-subj="malwareUserNotificationCustomMessage"]'
        );
        const tooltip = policyView.find('EuiIconTip[data-test-subj="malwareTooltip"]');
        expect(userNotificationCheckbox).toHaveLength(1);
        expect(userNotificationCustomMessageTextArea).toHaveLength(1);
        expect(tooltip).toHaveLength(1);
      });

      it('memory protection card and user notification checkbox are shown', () => {
        const memory = policyView.find('EuiPanel[data-test-subj="memoryProtectionsForm"]');
        const userNotificationCheckbox = policyView.find(
          'EuiCheckbox[data-test-subj="memory_protectionUserNotificationCheckbox"]'
        );

        expect(memory).toHaveLength(1);
        expect(userNotificationCheckbox).toHaveLength(1);
      });

      it('behavior protection card and user notification checkbox are shown', () => {
        const behavior = policyView.find('EuiPanel[data-test-subj="behaviorProtectionsForm"]');
        const userNotificationCheckbox = policyView.find(
          'EuiCheckbox[data-test-subj="behavior_protectionUserNotificationCheckbox"]'
        );

        expect(behavior).toHaveLength(1);
        expect(userNotificationCheckbox).toHaveLength(1);
      });

      it('ransomware card is shown', () => {
        const ransomware = policyView.find('EuiPanel[data-test-subj="ransomwareProtectionsForm"]');
        expect(ransomware).toHaveLength(1);
      });
    });
    describe('when the subscription tier is gold or lower', () => {
      beforeEach(() => {
        (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
        policyView = render(<PolicyDetails />);
      });

      it('malware popup, message customization options, and tooltip are hidden', () => {
        const userNotificationCheckbox = policyView.find(
          'EuiCheckbox[data-test-subj="malwareUserNotificationCheckbox"]'
        );
        const userNotificationCustomMessageTextArea = policyView.find(
          'EuiTextArea[data-test-subj="malwareUserNotificationCustomMessage"]'
        );
        const tooltip = policyView.find('EuiIconTip[data-test-subj="malwareTooltip"]');
        expect(userNotificationCheckbox).toHaveLength(0);
        expect(userNotificationCustomMessageTextArea).toHaveLength(0);
        expect(tooltip).toHaveLength(0);
      });

      it('memory protection card, and user notification checkbox are hidden', () => {
        const memory = policyView.find('EuiPanel[data-test-subj="memoryProtectionsForm"]');
        expect(memory).toHaveLength(0);
        const userNotificationCheckbox = policyView.find(
          'EuiCheckbox[data-test-subj="memoryUserNotificationCheckbox"]'
        );
        expect(userNotificationCheckbox).toHaveLength(0);
      });

      it('ransomware card is hidden', () => {
        const ransomware = policyView.find('EuiPanel[data-test-subj="ransomwareProtectionsForm"]');
        expect(ransomware).toHaveLength(0);
      });

      it('shows the locked card in place of 1 paid feature', () => {
        const lockedCard = policyView.find('EuiCard[data-test-subj="lockedPolicyCard"]');
        expect(lockedCard).toHaveLength(3);
      });
    });
  });
});
