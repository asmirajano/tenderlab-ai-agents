/** Actual local PostgreSQL fixtures. Never opens Neon or a source database. */
import {initializeStage7Fixture} from './tendermatch-stage7.mjs';
import {createEscalationPlan,prepareEscalationPlan,automaticRequests,persistRequests} from '../../scripts/lib/tendermatch-stage7-queue.mjs';
import {HEADER_SQL,pinFromHeader} from '../../scripts/lib/tendermatch-stage8-store.mjs';
import {hash} from '../../packages/tendermatch/src/escalation-stage7.ts';
import {TENANT} from '../../scripts/lib/tendermatch-input-manifest.mjs';
export async function initializeStage8Fixture(db,c,options={}){
  const loaded=await initializeStage7Fixture(db,c,options),plan=createEscalationPlan(loaded,{hash:hash('Stage8-local-upstream-fixture')});
  await prepareEscalationPlan(c,plan);const requests=await automaticRequests(c,plan,loaded);await persistRequests(c,requests);
  await db.exec('GRANT SELECT ON tendermatch_retrieval.schema_migration TO tendermatch_result_writer');
  const [header]=(await c.query(HEADER_SQL,[TENANT,plan.planId])).rows;return {loaded,plan,requests,header,pin:pinFromHeader(TENANT,header)};
}
