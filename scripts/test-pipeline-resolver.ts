/**
 * Smoke tests for pipeline-resolver.
 * Run: node scripts/test-pipeline-resolver.mjs
 */

import { resolveCanonicalPosition, applyForwardClearing, applyOperation, applyOperations } from "../lib/pipeline-resolver";
import type { Pipeline, StageType } from "../types";

// Build a fake pipeline matching the seeded default
const stage = (id: string, name: string, order: number, type: StageType = 'normal', aggregatorOf?: 'rejection', substatuses: string[] = ['Not Started','Scheduled / Sent','Waiting','Passed']) => ({
  id, name, order, type, aggregatorOf,
  substatuses: substatuses.map((n, i) => ({ id: `${id}-${n}`, name: n, order: i, closesProcess: false })),
});

const todoId = 'todo';
const resumeId = 'resume';
const hrId = 'hr';
const techId = 'tech';
const finalId = 'final';
const rejectedId = 'rejected';
const offerId = 'offer';

const pipeline: Pipeline = {
  id: 'pipe',
  userId: 'u',
  stages: [
    stage(todoId, 'To-do', 0, 'normal', undefined, []),
    stage(resumeId, 'Resume', 1),
    stage(hrId, 'HR Interview', 2),
    stage(techId, 'Technical Interview', 3),
    stage(finalId, 'Final Interview', 4),
    stage(rejectedId, 'Rejected', 5, 'aggregator', 'rejection', []),
    stage(offerId, 'Offer', 6, 'normal', undefined, ['Pending', 'Accepted', 'Declined']),
  ],
};

let pass = 0, fail = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n    expected: ${e}\n    actual:   ${a}`); }
}

console.log('\n=== resolveCanonicalPosition ===');
eq(
  resolveCanonicalPosition({}, pipeline),
  { currentStageId: todoId, rejectedAtStageId: null },
  'empty -> To-do'
);
eq(
  resolveCanonicalPosition({ [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: 'Scheduled / Sent', [finalId]: null }, pipeline),
  { currentStageId: techId, rejectedAtStageId: null },
  'HR Passed + Tech Scheduled -> Tech'
);
eq(
  resolveCanonicalPosition({ [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: null, [finalId]: null }, pipeline),
  { currentStageId: hrId, rejectedAtStageId: null },
  'HR Passed + Tech null -> HR Passed'
);
eq(
  resolveCanonicalPosition({ [resumeId]: 'Passed', [hrId]: 'Rejected', [techId]: null }, pipeline),
  { currentStageId: rejectedId, rejectedAtStageId: hrId },
  'HR Rejected -> Rejected at HR'
);
eq(
  resolveCanonicalPosition({ [resumeId]: 'Rejected' }, pipeline),
  { currentStageId: rejectedId, rejectedAtStageId: resumeId },
  'Resume Rejected -> Rejected at Resume'
);
eq(
  resolveCanonicalPosition({ [resumeId]: 'Passed', [hrId]: 'Rejected', [techId]: 'Rejected' }, pipeline),
  { currentStageId: rejectedId, rejectedAtStageId: techId },
  'Multiple rejections -> latest by order'
);
eq(
  resolveCanonicalPosition({ [offerId]: 'Pending' }, pipeline),
  { currentStageId: offerId, rejectedAtStageId: null },
  'Offer Pending -> Offer'
);

console.log('\n=== applyForwardClearing ===');
eq(
  applyForwardClearing(
    { [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: 'Scheduled / Sent', [finalId]: 'Waiting' },
    pipeline.stages.find(s => s.id === hrId)!,
    pipeline
  ),
  { [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: null, [finalId]: null, [offerId]: null },
  'Pivot HR clears Tech/Final/Offer'
);

console.log('\n=== applyOperation ===');
eq(
  applyOperation(
    { stageStatuses: { [resumeId]: 'Passed', [hrId]: 'Waiting' } },
    { op: 'set_stage_status', stageId: techId, substatus: 'Scheduled / Sent' },
    pipeline
  ).stageStatuses,
  { [resumeId]: 'Passed', [hrId]: 'Waiting', [techId]: 'Scheduled / Sent', [finalId]: null, [offerId]: null },
  'Forward drag HR/Waiting -> Tech/Scheduled (HR not changed)'
);

const back = applyOperation(
  { stageStatuses: { [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: 'Scheduled / Sent' } },
  { op: 'set_stage_status', stageId: hrId, substatus: 'Waiting' },
  pipeline
);
eq(
  back.stageStatuses,
  { [resumeId]: 'Passed', [hrId]: 'Waiting', [techId]: null, [finalId]: null, [offerId]: null },
  'Backward drag Tech -> HR/Waiting clears Tech'
);
eq(
  back.currentStageId,
  hrId,
  'Backward drag canonical = HR'
);

const reject = applyOperation(
  { stageStatuses: { [resumeId]: 'Passed', [hrId]: 'Waiting' } },
  { op: 'move_to_aggregator', aggregatorStageId: rejectedId, sourceStageId: hrId },
  pipeline
);
eq(
  reject.stageStatuses,
  { [resumeId]: 'Passed', [hrId]: 'Rejected', [techId]: null, [finalId]: null, [offerId]: null },
  'Move to Rejected/at HR sets HR=Rejected'
);
eq(
  { currentStageId: reject.currentStageId, rejectedAtStageId: reject.rejectedAtStageId },
  { currentStageId: rejectedId, rejectedAtStageId: hrId },
  'Move to Rejected/at HR canonical = Rejected/at HR'
);

const fromRejected = applyOperation(
  { stageStatuses: { [resumeId]: 'Passed', [hrId]: 'Rejected' } },
  { op: 'set_stage_status', stageId: hrId, substatus: 'Waiting' },
  pipeline
);
eq(
  fromRejected.stageStatuses,
  { [resumeId]: 'Passed', [hrId]: 'Waiting', [techId]: null, [finalId]: null, [offerId]: null },
  'Drag from Rejected back to HR overwrites Rejected'
);
eq(
  fromRejected.currentStageId,
  hrId,
  'Drag from Rejected back to HR canonical = HR'
);

console.log('\n=== set_stage_statuses (modal Save) ===');
const bulkSave = applyOperation(
  { stageStatuses: {} },
  {
    op: 'set_stage_statuses',
    stageStatuses: { [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: 'Scheduled / Sent', [finalId]: 'Waiting' },
  },
  pipeline
);
eq(
  bulkSave.stageStatuses,
  { [resumeId]: 'Passed', [hrId]: 'Passed', [techId]: 'Scheduled / Sent', [finalId]: 'Waiting', [offerId]: null },
  'Bulk save with all stages set keeps all, clears only Offer'
);

console.log('\n=== combined ops (Save with patch_fields) ===');
const combined = applyOperations(
  { stageStatuses: { [hrId]: 'Waiting' } },
  [
    { op: 'set_stage_status', stageId: hrId, substatus: 'Scheduled / Sent' },
    { op: 'patch_fields', fields: { rejectionReason: 'Country location', hrName: 'Anna' } },
  ],
  pipeline
);
eq(combined.fieldUpdates, { rejectionReason: 'Country location', hrName: 'Anna' }, 'patch_fields collected');
eq(combined.currentStageId, hrId, 'combined canonical = HR');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
