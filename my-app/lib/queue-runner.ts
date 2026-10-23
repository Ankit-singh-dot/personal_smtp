import { getCampaignState, saveCampaignState, addLogEntry } from './state-manager';
import { generateEmailContent } from './spintax';
import { validateEmailMx } from './mx-validator';
import { sendEmailMessage } from './mailer';

let isWorkerActive = false;
let pauseRequested = false;
let stopRequested = false;

export function isQueueRunning(): boolean {
  return isWorkerActive;
}

export function pauseQueue(): void {
  pauseRequested = true;
  const state = getCampaignState();
  state.status = 'paused';
  saveCampaignState(state);
  addLogEntry('warning', 'Campaign dispatch paused by user.');
}

export function resumeQueue(): void {
  pauseRequested = false;
  stopRequested = false;
  const state = getCampaignState();
  state.status = 'running';
  saveCampaignState(state);
  addLogEntry('info', 'Campaign dispatch resumed.');
  startBackgroundWorker();
}

export function stopQueue(): void {
  stopRequested = true;
  pauseRequested = false;
  const state = getCampaignState();
  state.status = 'idle';
  saveCampaignState(state);
  addLogEntry('warning', 'Campaign dispatch stopped.');
}

export function startBackgroundWorker(): void {
  if (isWorkerActive) return;
  isWorkerActive = true;
  pauseRequested = false;
  stopRequested = false;

  // Run in unhandled promise chain to avoid blocking HTTP request
  (async () => {
    try {
      const state = getCampaignState();
      state.status = 'running';
      if (!state.startedAt) {
        state.startedAt = new Date().toISOString();
      }
      saveCampaignState(state);

      addLogEntry('info', `Starting dispatch loop for ${state.leads.length} leads.`);

      let consecutiveSentCount = 0;

      while (!stopRequested) {
        if (pauseRequested) {
          addLogEntry('info', 'Worker loop resting in paused state.');
          break;
        }

        const currentState = getCampaignState();
        const pendingLeadIndex = currentState.leads.findIndex((l) => l.status === 'pending');

        if (pendingLeadIndex === -1) {
          // All done!
          currentState.status = 'completed';
          currentState.completedAt = new Date().toISOString();
          saveCampaignState(currentState);
          addLogEntry(
            'success',
            `Campaign completed! Sent: ${currentState.sentCount}, Skipped: ${currentState.skippedCount}, Failed: ${currentState.failedCount}`
          );
          break;
        }

        const lead = currentState.leads[pendingLeadIndex];
        lead.status = 'validating';
        currentState.currentLeadIndex = pendingLeadIndex;
        saveCampaignState(currentState);

        // Anti-ban Step 1: MX Pre-flight verification
        if (currentState.config.settings.enableMxValidation) {
          const mxResult = await validateEmailMx(lead.email);
          if (!mxResult.isValid) {
            lead.status = 'skipped';
            lead.error = mxResult.reason;
            currentState.skippedCount += 1;
            saveCampaignState(currentState);
            addLogEntry(
              'warning',
              `Skipped [${lead.startup || 'Lead'}]: ${mxResult.reason}`,
              lead.email
            );
            continue;
          }
        }

        // Anti-ban Step 2: Spintax & Personalization
        const { subject, html, text } = generateEmailContent(
          currentState.config.template.subject,
          currentState.config.template.html,
          lead.raw,
          currentState.config.settings.enableSpintax
        );

        lead.status = 'sending';
        saveCampaignState(currentState);

        // Anti-ban Step 3: Dispatch (or simulation if test mode)
        let sendResult: { success: boolean; messageId?: string; error?: string };

        if (currentState.config.settings.testMode) {
          // Dry-run simulation
          await new Promise((r) => setTimeout(r, 1200));
          sendResult = {
            success: true,
            messageId: `<simulated.${Date.now()}@test.mode>`,
          };
        } else {
          sendResult = await sendEmailMessage(
            currentState.config.smtp,
            currentState.config.imap,
            {
              to: lead.email,
              subject,
              html,
              text: currentState.config.settings.sendPlainFallback ? text : '',
            }
          );
        }

        if (sendResult.success) {
          lead.status = 'sent';
          lead.sentAt = new Date().toLocaleTimeString();
          lead.messageId = sendResult.messageId;
          currentState.sentCount += 1;
          saveCampaignState(currentState);
          addLogEntry(
            'success',
            `Successfully delivered to ${lead.startup ? lead.startup + ' (' + lead.email + ')' : lead.email}`,
            lead.email
          );
          consecutiveSentCount++;
        } else {
          lead.status = 'failed';
          lead.error = sendResult.error;
          currentState.failedCount += 1;
          saveCampaignState(currentState);
          addLogEntry(
            'error',
            `Failed sending to ${lead.email}: ${sendResult.error}`,
            lead.email
          );
        }

        // Anti-ban Step 4: Humanized Cooldown and Jitter
        // Check if we need a periodic micro-break every 15 emails
        if (consecutiveSentCount > 0 && consecutiveSentCount % 15 === 0) {
          const cooldownSec = Math.floor(Math.random() * 60) + 90; // 90 to 150 sec pause
          addLogEntry(
            'info',
            `Anti-pattern cooldown: pausing for ${cooldownSec}s to mimic natural human batch cadence.`
          );
          await sleep(cooldownSec * 1000);
        } else {
          // Standard randomized jitter between minDelaySec and maxDelaySec
          const minDelay = Math.max(5, currentState.config.settings.minDelaySec || 35);
          const maxDelay = Math.max(minDelay, currentState.config.settings.maxDelaySec || 75);
          const jitterSec = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          addLogEntry('info', `Waiting ${jitterSec}s before dispatching next lead...`);
          await sleep(jitterSec * 1000);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      addLogEntry('error', `Queue execution encountered fatal error: ${error.message}`);
    } finally {
      isWorkerActive = false;
    }
  })();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
