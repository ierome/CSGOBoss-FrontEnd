
import r from '../lib/database'
import redis from '../lib/redis'
import co from 'co'

const Campaigns = r.table('Campaigns')
export default Campaigns

export const campaignDefaultType = 'DEFAULT'
export const campaignPromoType = 'PROMO'

export const CampaignActivities = r.table('CampaignActivities')

export function logCampaignActivity(campaignId, amount, description, meta = {}) {
  return CampaignActivities.insert({
    campaignId,
    amount,
    description,
    meta,

    createdAt: new Date()
  })
}
