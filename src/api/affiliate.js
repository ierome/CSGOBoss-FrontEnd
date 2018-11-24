
import { Router } from 'express'
import co from 'co'
import _ from 'underscore'
import is from 'is_js'

import Campaigns, { CampaignActivities, campaignDefaultType, logCampaignActivity } from '../document/campaign'
import Players, { givePlayerBalance } from '../document/player'
import { tokensAmount } from '../lib/tokens'
import { getCSGOHours } from '../lib/steam'
import logger from '../lib/logger'
import sockets from '../lib/sockets'
import r from '../lib/database'
import { addStats } from '../document/stats'

function getCampaigns(req, res) {
  co(function* () {
    let campaigns = yield Campaigns.getAll(req.user.id, { index: 'linkedTo' })

    res.json({
      campaign: campaigns.length > 0 ? campaigns[0] : null,
      activity: campaigns.length > 0 ? yield CampaignActivities.getAll(campaigns[0].id, { index: 'campaignId' }).orderBy(r.desc('createdAt')).limit(50) : []
    })
  })

  .catch(err => {
    logger.error(`getCampaigns() ${err.stack || err}`)
    res.status(400).send('Please try again later')
  })
}

function postCreateCampaign(req, res) {
  let { code, name } = req.body

  if(!is.string(code) || !is.string(name)) {
    return res.status(400).send('Invalid request')
  }

  name = name.toUpperCase()
  code = code.toLowerCase()

  const originalCode = code.toUpperCase()

  if(name.length < 3 || name.length > 32 || !(/^[a-zA-Z0-9 ]+$/g.test(name))) {
    return res.status(400).send('Campaign name must be 3-16 characters long and can only contain letters, numbers, and spaces')
  } else if(code.length < 3 || code.length > 16 || !(/^[a-zA-Z0-9_]+$/g.test(code))) {
    return res.status(400).send('Referral code must be 3-16 characters long and can only contain letters, numbers, and underscores')
  }

  co(function* () {
    let existsCount = yield Campaigns.getAll(req.user.id, { index: 'linkedTo' }).count()
    if(existsCount > 0) {
      return res.status(400).send(`You already have created a campaign`)
    }

    existsCount = yield Campaigns.getAll(code, { index: 'code' }).count()
    if(existsCount > 0) {
      return res.status(400).send('The given code has already been taken')
    }

    const newCampaign = {
      name,
      code,

      createdAt: new Date(),
      type: campaignDefaultType,
      originalReferralCode: originalCode,
      reward: tokensAmount(0.25),
      balance: 0,
      master: false,
      linkedTo: req.user.id,
      commission: tokensAmount(0.05),
      depositComission: 0.01,

      statTotalProfit: 0,
      statTotalDepositProfit: 0,
      statTotalRedeemed: 0,
      statTotalDeposited: 0,
      statTotalDeposits: 0
    }

    const { generated_keys } = yield Campaigns.insert(newCampaign)
    newCampaign.id = generated_keys[0]

    res.json({
      campaign: newCampaign
    })
  })

  .catch(err => {
    logger.error(`postCreateCampaign() ${err.stack || err}`)
    res.status(400).send('Please try again later')
  })
}

function postAffiliateRedeem(req, res) {
  let { code } = req.body

  if(!is.string(code)) {
    return res.status(400).send('Invalid request')
  }

  code = code.trim().toLowerCase()
  if(code.length <= 0) {
    return res.status(400).send('Invalid code was given')
  } else if(!!req.user.redeemedCodes && req.user.redeemedCodes.indexOf(code) >= 0) {
    return res.status(400).send('You have already redeemed this code before')
  }

  co(function* () {
    if(!req.user.redeemedCodes || req.user.redeemedCodes.length <= 0) {
      const hours = yield getCSGOHours(req.user.id)
      if(hours < 10) {
        return res.status(400).send('You must have at least 10 hours of CS:GO to claim this reward')
      }
    }

    const [ campaign ] = yield Campaigns.getAll(code, { index: 'code' })
    if(!campaign) {
      return res.status(400).send('That code is invalid or does not exist anymore')
    } else if(req.user.hasRedeemed && !campaign.master) {
      return res.status(400).send('You have already redeemed a referral code before')
    }

  	if(campaign.master) {
      const { replaced, changes } = yield Campaigns.get(campaign.id).update(r.branch(
        r.row('maxUsages').default(0).eq(0).or(r.row('statTotalRedeemed').lt(r.row('maxUsages'))), {
          statTotalRedeemed: r.row('statTotalRedeemed').add(1)
        }, {}
      ))

      if(replaced === 0) {
        return res.status(400).send('An invalid or expired code was given')
      }
  	}

    const { replaced, changes } = yield Players
      .get(req.user.id)
      .update(t => r.branch(
        t('redeemedCodes').default([]).contains(code).and(t('hasRedeemed').default(false).eq(false)),
        {},
        {
          hasRedeemed: campaign.master ? t('hasRedeemed') : true,
          redeemedCode: campaign.master ? t('redeemedCode') : code,
          redeemedCodes:t('redeemedCodes').default([]).append(code)
        }
      ))

    if(replaced <= 0) {
      return res.status(400).send('Please try again later')
    }

  	if(!campaign.master) {
      const { replaced } = yield Campaigns.getAll(code, { index: 'code' }).update({
        balance: r.row('balance').default(0).add(r.row('commission')),
        statTotalRedeemed: r.row('statTotalRedeemed').add(1)
      })

      yield logCampaignActivity(campaign.id, campaign.commission, `${req.user.displayName} redeemed your affiliate code`, {
        steamId: req.user.id
      })
  	}

    yield addStats({
      counters: {
        totalProfit: -campaign.reward,
        totalCodesRedeemed: 1,
        totalCodesProfit: -campaign.reward,
        [campaign.master ? 'totalPromoCodeRedeemed' : 'totalReferralCodeRedeemed']: 1,
        [campaign.master ? 'totalPromoCodeProfit' : 'totalReferralCodeProfit']: -campaign.reward
      }
    })

    yield givePlayerBalance(req.user.id, campaign.reward, {
      meta: {
        description: 'Affiliate: Redeem',
        campaignId: campaign.id,
        code: campaign.code
      }
    })

    res.json({
      code
    })
  })

  .catch(err => {
    logger.error(`postAffiliateRedeem() ${err.stack || err}`)
    res.status(400).send('Please try again later')
  })
}

function postAffiliateWithdraw(req, res) {
  co(function* () {
    const [ campaign ] = yield Campaigns.getAll(req.user.id, { index: 'linkedTo' })
    if(!campaign) {
      return res.status(400).send('Please try again later')
    }

    const { replaced, changes } = yield Campaigns.get(campaign.id).update(r.branch(
      r.row('balance').ge(tokensAmount(0.50)), {
        balance: 0,
        statsGrossProfit: r.row('statsGrossProfit').default(0).add(r.row('balance'))
      }, {}
    ), { returnChanges: true })

    if(replaced <= 0) {
      return res.status(400).send('You must have a balance of at least 0.50T before withdrawing')
    }

    const balance = changes[0].old_val.balance

    yield givePlayerBalance(req.user.id, balance, {
      meta: {
        description: 'Campaign: Withdraw'
      }
    })

    res.json({
      statsGrossProfit: balance,
      statTotalDeposited: changes[0].old_val.statTotalDeposited,
      statTotalDeposits: changes[0].old_val.statTotalDeposits,
      statTotalRedeemed: changes[0].old_val.statTotalRedeemed
    })
  })

  .catch(err => {
    logger.error(`postAffiliateWithdraw() ${err.stack || err}`)
    res.status(400).send('Please try again later')
  })
}

export default () => {
  const router = Router()
  router.get('/', getCampaigns)
  router.post('/create', postCreateCampaign)
  router.post('/redeem', postAffiliateRedeem)
  router.post('/withdraw', postAffiliateWithdraw)
  return router
}
